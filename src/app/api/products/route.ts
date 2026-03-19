import { NextResponse } from "next/server";
import { z } from "zod";
import type { SortOrder } from "mongoose";

import { dbConnect } from "@/lib/db";
import { buildDealLabel, computeDealPrice } from "@/lib/deals";
import Category from "@/models/Category";
import Deal from "@/models/Deal";
import Product from "@/models/Product";
import SiteSetting from "@/models/SiteSetting";

export const runtime = "nodejs";

type TextScore = { $meta: "textScore" };
type ProductListSelect = Record<string, 0 | 1 | TextScore>;
type ProductListSort = Record<string, SortOrder | TextScore>;

const QuerySchema = z.object({
  q: z.string().trim().min(1).max(200).optional(),
  category: z.string().trim().min(1).max(80).optional(),
  tag: z.enum(["super-deals"]).optional(),
  priceMin: z.coerce.number().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
  ratingMin: z.coerce.number().min(0).max(5).optional(),
  inStock: z.coerce.boolean().optional(),
  sort: z
    .enum(["relevance", "newest", "new_arrivals", "best_selling", "price_asc", "price_desc", "rating"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

export async function GET(req: Request) {
  const url = new URL(req.url);

  const parsed = QuerySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    tag: url.searchParams.get("tag") ?? undefined,
    priceMin: url.searchParams.get("priceMin") ?? undefined,
    priceMax: url.searchParams.get("priceMax") ?? undefined,
    ratingMin: url.searchParams.get("ratingMin") ?? undefined,
    inStock: url.searchParams.get("inStock") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid query" }, { status: 400 });
  }

  const { q, category, tag, priceMin, priceMax, ratingMin, inStock, sort, page, limit } =
    parsed.data;

  await dbConnect();

  const perfDoc = (await SiteSetting.findOne({ key: "global" }).select("performance").lean()) as unknown;
  const perfRoot = perfDoc && typeof perfDoc === "object" ? (perfDoc as Record<string, unknown>) : {};
  const perf =
    perfRoot && typeof perfRoot.performance === "object" && perfRoot.performance
      ? (perfRoot.performance as Record<string, unknown>)
      : {};

  const cacheEnabled = typeof perf.productApiCacheEnabled === "boolean" ? perf.productApiCacheEnabled : false;
  const sMaxAge =
    typeof perf.productApiCacheSMaxAgeSeconds === "number" && Number.isFinite(perf.productApiCacheSMaxAgeSeconds)
      ? Math.max(0, Math.min(600, Math.trunc(perf.productApiCacheSMaxAgeSeconds)))
      : 20;
  const swr =
    typeof perf.productApiCacheStaleWhileRevalidateSeconds === "number" &&
    Number.isFinite(perf.productApiCacheStaleWhileRevalidateSeconds)
      ? Math.max(0, Math.min(3600, Math.trunc(perf.productApiCacheStaleWhileRevalidateSeconds)))
      : 60;

  const cacheControl = cacheEnabled
    ? `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`
    : "no-store, max-age=0";

  const filter: Record<string, unknown> = {
    isActive: true,
  };

  if (tag === "super-deals") {
    const now = new Date();
    const dealDocs = await Deal.find({
      isActive: true,
      startsAt: { $lte: now },
      expiresAt: { $gt: now },
    })
      .select("productIds")
      .limit(500)
      .lean();

    const dealProductIds = new Set<string>();
    for (const d of dealDocs ?? []) {
      const ids = Array.isArray((d as unknown as { productIds?: unknown[] }).productIds)
        ? ((d as unknown as { productIds?: unknown[] }).productIds as unknown[])
        : [];
      for (const raw of ids) {
        const id = String(raw ?? "").trim();
        if (id) dealProductIds.add(id);
      }
    }

    if (dealProductIds.size === 0) {
      return NextResponse.json(
        {
          items: [],
          pagination: { page: 1, pages: 1, total: 0, limit },
        },
        { headers: { "Cache-Control": cacheControl } }
      );
    }

    filter._id = { $in: Array.from(dealProductIds) };
  }

  if (category) {
    const cat = await Category.findOne({ slug: category, isActive: true })
      .select("_id name slug")
      .lean();
    if (cat?._id) {
      filter.$or = [
        { categoryId: cat._id },
        { categorySlug: cat.slug },
        { category: cat.name },
      ];
    } else {
      filter.category = category;
    }
  }

  if (typeof ratingMin === "number") {
    filter.ratingAvg = { $gte: ratingMin };
  }

  if (inStock === true) {
    filter.$or = [{ stock: { $gt: 0 } }, { "variants.stock": { $gt: 0 } }];
  }

  if (typeof priceMin === "number" || typeof priceMax === "number") {
    const min = typeof priceMin === "number" ? priceMin : 0;
    const max = typeof priceMax === "number" ? priceMax : Number.MAX_SAFE_INTEGER;

    filter.$and = [
      {
        $or: [
          { basePrice: { $gte: min, $lte: max } },
          { "variants.price": { $gte: min, $lte: max } },
        ],
      },
    ];
  }

  if (q) {
    filter.$text = { $search: q };
  }

  const skip = (page - 1) * limit;

  let sortSpec: ProductListSort = { createdAt: -1 };

  if (q && (sort === "relevance" || !sort)) {
    sortSpec = { score: { $meta: "textScore" } };
  } else if (sort === "price_asc") {
    sortSpec = { basePrice: 1 };
  } else if (sort === "price_desc") {
    sortSpec = { basePrice: -1 };
  } else if (sort === "best_selling") {
    sortSpec = { soldCount: -1, createdAt: -1 };
  } else if (sort === "rating") {
    sortSpec = { ratingAvg: -1, ratingCount: -1 };
  } else if (sort === "newest") {
    sortSpec = { createdAt: -1 };
  } else if (sort === "new_arrivals") {
    sortSpec = { createdAt: -1 };
  }

  const select: ProductListSelect = {
    title: 1,
    slug: 1,
    images: 1,
    basePrice: 1,
    compareAtPrice: 1,
    ratingAvg: 1,
    ratingCount: 1,
    soldCount: 1,
    category: 1,
    categoryId: 1,
    categorySlug: 1,
  };

  if (q) {
    select.score = { $meta: "textScore" };
  }

  const [items, total] = await Promise.all([
    Product.find(filter)
      .select(select)
      .sort(sortSpec)
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  const now = new Date();
  const productIds = (items ?? []).map((p) => String((p as unknown as { _id?: unknown })._id ?? "")).filter(Boolean);

  const deals = productIds.length
    ? await Deal.find({
        isActive: true,
        startsAt: { $lte: now },
        expiresAt: { $gt: now },
        productIds: { $in: productIds },
      })
        .sort({ priority: -1, createdAt: -1 })
        .limit(200)
        .select("name type value priority expiresAt productIds")
        .lean()
    : [];

  const bestDealByProductId = new Map<string, unknown>();
  for (const d of deals) {
    const ids = Array.isArray((d as unknown as { productIds?: unknown[] }).productIds)
      ? ((d as unknown as { productIds?: unknown[] }).productIds as unknown[])
      : [];
    for (const rawId of ids) {
      const pid = String(rawId);
      if (!pid) continue;
      if (!bestDealByProductId.has(pid)) bestDealByProductId.set(pid, d);
    }
  }

  const mappedItems = (items ?? []).map((p) => {
    const pid = String((p as unknown as { _id?: unknown })._id ?? "");
    const deal = bestDealByProductId.get(pid) as
      | {
          _id: unknown;
          name?: string;
          type?: "percent" | "fixed";
          value?: number;
          priority?: number;
          expiresAt?: string | Date;
        }
      | undefined;

    if (!deal?.type || deal.value == null) return p;

    const basePrice = Number((p as unknown as { basePrice?: number }).basePrice ?? 0);
    const dealPrice = computeDealPrice({ original: basePrice, type: deal.type, value: Number(deal.value) });

    const compareAtRaw = (p as unknown as { compareAtPrice?: number }).compareAtPrice;
    const compareAt = typeof compareAtRaw === "number" && compareAtRaw > basePrice ? compareAtRaw : basePrice;

    return {
      ...p,
      basePrice: dealPrice,
      compareAtPrice: compareAt,
      deal: {
        id: String(deal._id),
        name: String(deal.name ?? ""),
        type: deal.type,
        value: Number(deal.value ?? 0),
        priority: Number(deal.priority ?? 0),
        expiresAt: deal.expiresAt ? new Date(deal.expiresAt).toISOString() : null,
        label: buildDealLabel({ type: deal.type, value: Number(deal.value ?? 0) }),
      },
    };
  });

  const pages = Math.max(1, Math.ceil(total / limit));

  return NextResponse.json(
    {
      items: mappedItems,
      pagination: { page, pages, total, limit },
    },
    { headers: { "Cache-Control": cacheControl } }
  );
}
