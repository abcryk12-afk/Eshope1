import type { Metadata } from "next";
import { notFound } from "next/navigation";

import StorefrontClient from "@/app/StorefrontClient";
import { dbConnect } from "@/lib/db";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  safeJsonLdStringify,
  stripHtmlToText,
  truncate,
} from "@/lib/seo";
import Category from "@/models/Category";
import SiteSetting from "@/models/SiteSetting";

export const runtime = "nodejs";

type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: SearchParams | Promise<SearchParams>;
};

type GlobalSeoSettings = {
  globalSeoTitle?: string;
  globalSeoDescription?: string;
};

function readString(v: string | string[] | undefined) {
  if (!v) return "";
  return Array.isArray(v) ? v[0] ?? "" : v;
}

function readNumber(v: string | string[] | undefined) {
  const s = readString(v);
  if (!s) return undefined;
  const n = Number(s);
  if (Number.isNaN(n)) return undefined;
  return n;
}

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

async function getCategoryBySlug(slug: string) {
  await dbConnect();

  const doc = await Category.findOne({ slug, isActive: true })
    .select("name slug updatedAt")
    .lean();

  return doc as unknown;
}

function computeCategorySeoState(slug: string, searchParams: SearchParams) {
  const page = readNumber(searchParams.page) ?? 1;

  const q = readString(searchParams.q);
  const priceMin = readString(searchParams.priceMin);
  const priceMax = readString(searchParams.priceMax);
  const ratingMin = readString(searchParams.ratingMin);
  const inStock = readString(searchParams.inStock);
  const sort = readString(searchParams.sort);

  const hasSortFacet = sort.trim().length > 0 && sort.trim() !== "relevance";

  const hasFacets = Boolean(
    q.trim() ||
      priceMin.trim() ||
      priceMax.trim() ||
      ratingMin.trim() ||
      inStock.trim() ||
      hasSortFacet
  );

  const baseCanonical = absoluteUrl(`/category/${encodeURIComponent(slug)}`);

  const canonical = hasFacets
    ? baseCanonical
    : page > 1
      ? absoluteUrl(`/category/${encodeURIComponent(slug)}?page=${page}`)
      : baseCanonical;

  const indexable = !hasFacets;

  return { canonical, indexable, hasFacets, page };
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const sp = await Promise.resolve(searchParams);

  const [settings, category] = await Promise.all([getGlobalSeoSettings(), getCategoryBySlug(slug)]);

  const siteName = settings.globalSeoTitle?.trim() || "Shop";
  const cat = category as { name?: string; slug?: string } | null;

  const seoState = computeCategorySeoState(slug, sp);

  const titleBase = cat?.name?.trim() || "Category";
  const title = `${titleBase} | ${siteName}`;

  const description = truncate(
    stripHtmlToText(settings.globalSeoDescription?.trim() || `Browse ${titleBase} products.`),
    160
  );

  return {
    title,
    description,
    alternates: {
      canonical: seoState.canonical,
    },
    robots: {
      index: seoState.indexable,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: seoState.canonical,
      siteName,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await Promise.resolve(searchParams);

  const category = await getCategoryBySlug(slug);
  const cat = category as { name?: string; slug?: string } | null;

  if (!cat?.slug) {
    notFound();
  }

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: cat.name ?? "Category", url: absoluteUrl(`/category/${encodeURIComponent(cat.slug)}`) },
  ]);

  const initialSearchParams: SearchParams = {
    q: sp.q,
    priceMin: sp.priceMin,
    priceMax: sp.priceMax,
    ratingMin: sp.ratingMin,
    inStock: sp.inStock,
    sort: sp.sort,
    page: sp.page,
    category: cat.slug,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(breadcrumbJsonLd) }}
      />
      <StorefrontClient
        key={JSON.stringify({ slug: cat.slug, ...initialSearchParams })}
        initialSearchParams={initialSearchParams}
        basePath={`/category/${cat.slug}`}
        forcedCategory={cat.slug}
        pageTitle={cat.name ?? "Products"}
      />
    </>
  );
}
