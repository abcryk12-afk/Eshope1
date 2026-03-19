import { NextResponse } from "next/server";
import { z } from "zod";
import Fuse from "fuse.js";

import { dbConnect } from "@/lib/db";
import Category from "@/models/Category";
import Product from "@/models/Product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  q: z.string().trim().min(1).max(80),
  limit: z.coerce.number().int().min(1).max(10).default(8),
});

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type ProductHit = {
  id: string;
  title: string;
  slug: string;
  category: string;
  image: string;
  price: number;
  score?: number;
};

type CategoryHit = {
  id: string;
  name: string;
  slug: string;
  score?: number;
};

export async function GET(req: Request) {
  const url = new URL(req.url);

  const parsed = QuerySchema.safeParse({
    q: url.searchParams.get("q") ?? "",
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { products: [], categories: [], suggestions: [] },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  const q = parsed.data.q.trim();
  const limit = parsed.data.limit;

  await dbConnect();

  const isTextSearch = q.length >= 3;
  const safe = escapeRegex(q);
  const re = new RegExp(safe, "i");

  const [rawProducts, rawCategories] = await Promise.all([
    Product.find(
      isTextSearch
        ? { isActive: true, $text: { $search: q } }
        : { isActive: true, $or: [{ title: re }, { slug: re }, { category: re }] }
    )
      .select("title slug images basePrice category")
      .sort(
        isTextSearch
          ? ({ score: { $meta: "textScore" } } as unknown as Record<string, 1 | -1 | { $meta: "textScore" }> )
          : { soldCount: -1, createdAt: -1 }
      )
      .limit(Math.max(20, limit * 4))
      .lean(),
    Category.find({ isActive: true, $or: [{ name: re }, { slug: re }, { menuLabel: re }] })
      .select("name slug")
      .sort({ sortOrder: 1 })
      .limit(Math.max(20, limit * 2))
      .lean(),
  ]);

  const productsBase: ProductHit[] = (rawProducts ?? []).map((p) => {
    const id = String((p as unknown as { _id?: unknown })._id ?? "");
    const title = String((p as unknown as { title?: unknown }).title ?? "");
    const slug = String((p as unknown as { slug?: unknown }).slug ?? "");
    const category = String((p as unknown as { category?: unknown }).category ?? "");
    const basePrice = Number((p as unknown as { basePrice?: unknown }).basePrice ?? 0);

    const images = Array.isArray((p as unknown as { images?: unknown }).images)
      ? ((p as unknown as { images?: unknown[] }).images as unknown[])
          .filter((v) => typeof v === "string" && v.trim())
          .map((v) => String(v))
      : [];

    return {
      id,
      title,
      slug,
      category,
      image: images[0] ?? "",
      price: Number.isFinite(basePrice) ? basePrice : 0,
    };
  });

  const categoriesBase: CategoryHit[] = (rawCategories ?? []).map((c) => {
    const id = String((c as unknown as { _id?: unknown })._id ?? "");
    const name = String((c as unknown as { name?: unknown }).name ?? "");
    const slug = String((c as unknown as { slug?: unknown }).slug ?? "");
    return { id, name, slug };
  });

  const fuseProducts = new Fuse(productsBase, {
    keys: ["title", "slug", "category"],
    includeScore: true,
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });

  const fuseCategories = new Fuse(categoriesBase, {
    keys: ["name", "slug"],
    includeScore: true,
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });

  const fuzzyProducts = fuseProducts.search(q).slice(0, limit).map((r) => ({ ...r.item, score: r.score }));
  const fuzzyCategories = fuseCategories.search(q).slice(0, Math.min(limit, 6)).map((r) => ({ ...r.item, score: r.score }));

  const suggestions = Array.from(
    new Set([
      ...fuzzyProducts.map((p) => p.title).filter(Boolean),
      ...fuzzyCategories.map((c) => c.name).filter(Boolean),
    ])
  ).slice(0, 10);

  return NextResponse.json(
    {
      q,
      products: fuzzyProducts,
      categories: fuzzyCategories,
      suggestions,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
