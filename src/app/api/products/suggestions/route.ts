import { NextResponse } from "next/server";
import { z } from "zod";

import { dbConnect } from "@/lib/db";
import { buildDealLabel, computeDealPrice } from "@/lib/deals";
import Deal from "@/models/Deal";
import Product from "@/models/Product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  q: z.string().trim().min(1).max(80),
});

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type SuggestionItem = {
  title: string;
  slug: string;
  category: string;
  image: string;
  pricePkr: number;
  compareAtPricePkr: number | null;
  dealLabel: string | null;
};

export async function GET(req: Request) {
  const url = new URL(req.url);

  const parsed = QuerySchema.safeParse({
    q: url.searchParams.get("q") ?? "",
  });

  if (!parsed.success) {
    return NextResponse.json({ items: [] });
  }

  await dbConnect();

  const q = parsed.data.q;
  const query = q.trim();
  const isTextSearch = query.length >= 3;

  const filter: Record<string, unknown> = { isActive: true };
  const select: Record<string, 0 | 1 | { $meta: "textScore" }> = {
    title: 1,
    slug: 1,
    category: 1,
    images: 1,
    basePrice: 1,
    compareAtPrice: 1,
  };

  let sortSpec: Record<string, 1 | -1 | { $meta: "textScore" }> = { createdAt: -1 };

  if (isTextSearch) {
    filter.$text = { $search: query };
    select.score = { $meta: "textScore" };
    sortSpec = { score: { $meta: "textScore" } };
  } else {
    const safe = escapeRegex(query);
    const re = new RegExp(safe, "i");
    filter.$or = [{ title: re }, { slug: re }, { category: re }];
  }

  const raw = await Product.find(filter)
    .select(select)
    .sort(sortSpec)
    .limit(8)
    .lean();

  const productIds = raw
    .map((p) => String((p as unknown as { _id?: unknown })._id ?? ""))
    .filter(Boolean);

  const now = new Date();
  const deals = productIds.length
    ? await Deal.find({
        isActive: true,
        startsAt: { $lte: now },
        expiresAt: { $gt: now },
        productIds: { $in: productIds },
      })
        .sort({ priority: -1, createdAt: -1 })
        .limit(100)
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

  const items: SuggestionItem[] = raw.map((p) => {
    const pid = String((p as unknown as { _id?: unknown })._id ?? "");

    const title = String((p as unknown as { title?: unknown }).title ?? "");
    const slug = String((p as unknown as { slug?: unknown }).slug ?? "");
    const category = String((p as unknown as { category?: unknown }).category ?? "");

    const images = Array.isArray((p as unknown as { images?: unknown }).images)
      ? ((p as unknown as { images?: unknown[] }).images as unknown[])
          .filter((v) => typeof v === "string" && v.trim())
          .map((v) => String(v))
      : [];

    const basePrice = Number((p as unknown as { basePrice?: unknown }).basePrice ?? 0);
    const compareAtRaw = (p as unknown as { compareAtPrice?: unknown }).compareAtPrice;
    const compareAt = typeof compareAtRaw === "number" && Number.isFinite(compareAtRaw) ? compareAtRaw : null;

    const deal = bestDealByProductId.get(pid) as
      | {
          _id: unknown;
          type?: "percent" | "fixed";
          value?: number;
        }
      | undefined;

    const hasDeal = Boolean(deal?.type && typeof deal.value === "number" && Number.isFinite(deal.value));
    const finalPrice = hasDeal
      ? computeDealPrice({ original: basePrice, type: deal!.type!, value: Number(deal!.value) })
      : basePrice;

    const compareAtFinal = hasDeal
      ? Math.max(basePrice, compareAt ?? 0) || basePrice
      : compareAt && compareAt > finalPrice
        ? compareAt
        : null;

    return {
      title,
      slug,
      category,
      image: images[0] ?? "",
      pricePkr: Number.isFinite(finalPrice) ? finalPrice : 0,
      compareAtPricePkr: compareAtFinal,
      dealLabel: hasDeal ? buildDealLabel({ type: deal!.type!, value: Number(deal!.value) }) : null,
    };
  });

  return NextResponse.json({ items });
}
