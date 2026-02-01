import type { Metadata } from "next";

import { dbConnect } from "@/lib/db";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildProductJsonLd,
  normalizeImageUrl,
  safeJsonLdStringify,
  stripHtmlToText,
  truncate,
} from "@/lib/seo";
import Product from "@/models/Product";
import SiteSetting from "@/models/SiteSetting";

import ProductDetailClient from "./ProductDetailClient";

export const runtime = "nodejs";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type GlobalSeoSettings = {
  globalSeoTitle?: string;
  globalSeoDescription?: string;
};

async function getGlobalSeoSettings(): Promise<GlobalSeoSettings> {
  await dbConnect();

  const settings = (await SiteSetting.findOne({ key: "global" })
    .select("globalSeoTitle globalSeoDescription")
    .lean()) as unknown;

  const root = settings as Record<string, unknown> | null;

  return {
    globalSeoTitle: typeof root?.globalSeoTitle === "string" ? root.globalSeoTitle : undefined,
    globalSeoDescription:
      typeof root?.globalSeoDescription === "string" ? root.globalSeoDescription : undefined,
  };
}

async function getProductForSeo(slug: string) {
  await dbConnect();

  const doc = await Product.findOne({ slug, isActive: true })
    .select(
      "title slug description images basePrice compareAtPrice stock variants brand storeName ratingAvg ratingCount category categorySlug"
    )
    .lean();

  return doc as unknown;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const [settings, product] = await Promise.all([getGlobalSeoSettings(), getProductForSeo(slug)]);

  const siteName = settings.globalSeoTitle?.trim() || "Shop";
  const canonical = absoluteUrl(`/product/${encodeURIComponent(slug)}`);

  const p = product as
    | {
        title?: string;
        description?: string;
        images?: string[];
      }
    | null;

  const title = p?.title?.trim() ? `${p.title} | ${siteName}` : siteName;
  const description = p?.description
    ? truncate(stripHtmlToText(p.description), 160)
    : settings.globalSeoDescription?.trim() || "";

  const ogImages = (Array.isArray(p?.images) ? p?.images : [])
    .map(normalizeImageUrl)
    .filter(Boolean)
    .slice(0, 5)
    .map((url) => ({ url }));

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName,
      type: "website",
      images: ogImages.length ? ogImages : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImages.length ? ogImages.map((i) => i.url) : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;

  const product = await getProductForSeo(slug);

  const p = product as
    | {
        title: string;
        slug: string;
        description: string;
        images?: string[];
        basePrice?: number;
        compareAtPrice?: number;
        stock?: number;
        variants?: Array<{ _id: string; sku: string; price: number; stock: number; images?: string[] }>;
        brand?: string;
        storeName?: string;
        ratingAvg?: number;
        ratingCount?: number;
        category?: string;
        categorySlug?: string;
        _id: unknown;
      }
    | null;

  const productJsonLd = p ? buildProductJsonLd({ ...p, _id: String(p._id) }) : null;
  const breadcrumbJsonLd = p
    ? buildBreadcrumbJsonLd(
        [
          { name: "Home", url: absoluteUrl("/") },
          p.categorySlug
            ? {
                name: p.category || "Category",
                url: absoluteUrl(`/category/${encodeURIComponent(p.categorySlug)}`),
              }
            : null,
          { name: p.title, url: absoluteUrl(`/product/${encodeURIComponent(p.slug)}`) },
        ].filter(Boolean) as Array<{ name: string; url: string }>
      )
    : null;

  return (
    <>
      {productJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(productJsonLd) }}
        />
      ) : null}
      {breadcrumbJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(breadcrumbJsonLd) }}
        />
      ) : null}
      <ProductDetailClient slug={slug} />
    </>
  );
}
