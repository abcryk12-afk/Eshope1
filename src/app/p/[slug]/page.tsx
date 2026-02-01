import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { dbConnect } from "@/lib/db";
import { absoluteUrl, safeJsonLdStringify, stripHtmlToText, truncate } from "@/lib/seo";
import CmsPage from "@/models/CmsPage";
import SiteSetting from "@/models/SiteSetting";

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

async function getPage(slug: string) {
  await dbConnect();
  const doc = await CmsPage.findOne({ slug, isPublished: true })
    .select("title slug content seoTitle seoDescription updatedAt")
    .lean();
  return doc as unknown;
}

function escapeHtmlText(s: string) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const [settings, page] = await Promise.all([getGlobalSeoSettings(), getPage(slug)]);

  const siteName = settings.globalSeoTitle?.trim() || "Shop";
  const canonical = absoluteUrl(`/p/${encodeURIComponent(slug)}`);

  const p = page as
    | {
        title?: string;
        seoTitle?: string;
        seoDescription?: string;
        content?: string;
      }
    | null;

  if (!p?.title) {
    return {
      title: siteName,
      alternates: { canonical },
      robots: { index: false, follow: false },
    };
  }

  const title = (p.seoTitle?.trim() || p.title).trim();
  const finalTitle = `${title} | ${siteName}`;

  const description = p.seoDescription?.trim()
    ? p.seoDescription.trim()
    : truncate(stripHtmlToText(p.content ?? ""), 160) || settings.globalSeoDescription?.trim() || "";

  return {
    title: finalTitle,
    description,
    alternates: { canonical },
    openGraph: {
      title: finalTitle,
      description,
      url: canonical,
      siteName,
      type: "article",
    },
    twitter: {
      card: "summary",
      title: finalTitle,
      description,
    },
  };
}

export default async function CmsPublicPage({ params }: PageProps) {
  const { slug } = await params;

  const page = await getPage(slug);
  const p = page as { title?: string; content?: string; slug?: string } | null;

  if (!p?.title) {
    notFound();
  }

  const safe = escapeHtmlText(stripHtmlToText(p.content ?? ""));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: p.title,
    url: absoluteUrl(`/p/${encodeURIComponent(p.slug ?? slug)}`),
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(jsonLd) }}
      />
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">{p.title}</h1>
        <div className="prose prose-zinc mt-6 max-w-none whitespace-pre-wrap dark:prose-invert">{safe}</div>
      </div>
    </div>
  );
}
