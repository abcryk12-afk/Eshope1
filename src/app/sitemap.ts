import type { MetadataRoute } from "next";

import { dbConnect } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo";
import Category from "@/models/Category";
import CmsPage from "@/models/CmsPage";
import Product from "@/models/Product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await dbConnect();

  const [products, categories, pages] = await Promise.all([
    Product.find({ isActive: true }).select("slug updatedAt").sort({ updatedAt: -1 }).lean(),
    Category.find({ isActive: true }).select("slug updatedAt").sort({ updatedAt: -1 }).lean(),
    CmsPage.find({ isPublished: true }).select("slug updatedAt").sort({ updatedAt: -1 }).lean(),
  ]);

  const latestUpdatedAt = Math.max(
    0,
    ...products
      .map((p) => new Date((p as unknown as { updatedAt?: string | Date }).updatedAt ?? 0).getTime())
      .filter((t) => Number.isFinite(t)),
    ...categories
      .map((c) => new Date((c as unknown as { updatedAt?: string | Date }).updatedAt ?? 0).getTime())
      .filter((t) => Number.isFinite(t)),
    ...pages
      .map((p) => new Date((p as unknown as { updatedAt?: string | Date }).updatedAt ?? 0).getTime())
      .filter((t) => Number.isFinite(t))
  );

  const items: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: latestUpdatedAt > 0 ? new Date(latestUpdatedAt) : undefined,
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  for (const p of products) {
    const slug = String((p as unknown as { slug?: string }).slug ?? "").trim();
    if (!slug) continue;

    const updatedAt = (p as unknown as { updatedAt?: string | Date }).updatedAt;
    const lastModified = updatedAt ? new Date(updatedAt) : undefined;

    items.push({
      url: absoluteUrl(`/product/${encodeURIComponent(slug)}`),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  for (const c of categories) {
    const slug = String((c as unknown as { slug?: string }).slug ?? "").trim();
    if (!slug) continue;

    const updatedAt = (c as unknown as { updatedAt?: string | Date }).updatedAt;
    const lastModified = updatedAt ? new Date(updatedAt) : undefined;

    items.push({
      url: absoluteUrl(`/category/${encodeURIComponent(slug)}`),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  for (const page of pages) {
    const slug = String((page as unknown as { slug?: string }).slug ?? "").trim();
    if (!slug) continue;

    const updatedAt = (page as unknown as { updatedAt?: string | Date }).updatedAt;
    const lastModified = updatedAt ? new Date(updatedAt) : undefined;

    items.push({
      url: absoluteUrl(`/p/${encodeURIComponent(slug)}`),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    });
  }

  return items;
}
