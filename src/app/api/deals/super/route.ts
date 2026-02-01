import { NextResponse } from "next/server";
import { z } from "zod";

import { dbConnect } from "@/lib/db";
import Deal from "@/models/Deal";
import Product from "@/models/Product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(24).default(12),
  category: z.string().trim().max(120).optional(),
});

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function computeDealPrice(args: { original: number; type: "percent" | "fixed"; value: number }) {
  const original = Math.max(0, Number(args.original) || 0);
  const value = Math.max(0, Number(args.value) || 0);

  if (args.type === "percent") {
    const pct = Math.min(100, value);
    return round2(Math.max(0, original * (1 - pct / 100)));
  }

  return round2(Math.max(0, original - value));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ items: [] }, { status: 400 });
  }

  await dbConnect();

  const now = new Date();

  const deals = await Deal.find({
    isActive: true,
    startsAt: { $lte: now },
    expiresAt: { $gt: now },
  })
    .sort({ priority: -1, createdAt: -1 })
    .limit(50)
    .select("name type value priority startsAt expiresAt productIds")
    .lean();

  const bestDealByProductId = new Map<string, unknown>();
  const productIdSet = new Set<string>();

  for (const d of deals) {
    const ids = Array.isArray(d.productIds) ? (d.productIds as unknown[]) : [];
    for (const rawId of ids) {
      const pid = String(rawId);
      if (!pid) continue;
      productIdSet.add(pid);
      if (!bestDealByProductId.has(pid)) {
        bestDealByProductId.set(pid, d);
      }
    }
  }

  const productIds = Array.from(productIdSet);
  if (productIds.length === 0) {
    return NextResponse.json({ items: [] }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  const categorySlug = parsed.data.category?.trim() ?? "";

  const products = await Product.find({
    _id: { $in: productIds },
    isActive: true,
    ...(categorySlug ? { categorySlug } : {}),
  })
    .select("title slug images basePrice compareAtPrice ratingAvg ratingCount soldCount category")
    .lean();

  const items = products
    .map((p) => {
      const id = String(p._id);
      const deal = bestDealByProductId.get(id) as
        | {
            _id: unknown;
            name?: string;
            type?: "percent" | "fixed";
            value?: number;
            priority?: number;
            expiresAt?: string | Date;
          }
        | undefined;

      if (!deal?.type || deal.value == null) return null;

      const original = Number(p.basePrice ?? 0);
      const dealPrice = computeDealPrice({ original, type: deal.type, value: Number(deal.value) });

      const label =
        deal.type === "percent"
          ? `${Math.round(Number(deal.value))}% OFF`
          : `PKR ${Math.round(Number(deal.value))} OFF`;

      const compareAt =
        typeof p.compareAtPrice === "number" && p.compareAtPrice > original
          ? p.compareAtPrice
          : original;

      return {
        _id: id,
        title: String(p.title ?? ""),
        slug: String(p.slug ?? ""),
        images: Array.isArray(p.images) ? (p.images as unknown[]).filter((x) => typeof x === "string") : [],
        basePrice: dealPrice,
        compareAtPrice: compareAt,
        ratingAvg: Number(p.ratingAvg ?? 0),
        ratingCount: Number(p.ratingCount ?? 0),
        soldCount: Number(p.soldCount ?? 0),
        category: String(p.category ?? ""),
        deal: {
          id: String(deal._id),
          name: String(deal.name ?? ""),
          type: deal.type,
          value: Number(deal.value ?? 0),
          priority: Number(deal.priority ?? 0),
          expiresAt: deal.expiresAt ? new Date(deal.expiresAt).toISOString() : null,
          label,
        },
      };
    })
    .filter(Boolean)
    .slice(0, parsed.data.limit);

  return NextResponse.json(
    { items },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
