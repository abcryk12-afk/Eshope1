import { NextResponse } from "next/server";

import { dbConnect } from "@/lib/db";
import { buildDealLabel, computeDealPrice } from "@/lib/deals";
import Deal from "@/models/Deal";
import Product from "@/models/Product";
import SiteSetting from "@/models/SiteSetting";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

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

  const product = await Product.findOne({ slug, isActive: true }).lean();

  if (!product) {
    return NextResponse.json(
      { message: "Not found" },
      { status: 404, headers: { "Cache-Control": cacheControl } }
    );
  }

  const now = new Date();

  const dealDoc = await Deal.findOne({
    isActive: true,
    startsAt: { $lte: now },
    expiresAt: { $gt: now },
    productIds: { $in: [String((product as unknown as { _id?: unknown })._id ?? "")] },
  })
    .sort({ priority: -1, createdAt: -1 })
    .select("name type value priority expiresAt")
    .lean();

  if (!dealDoc) {
    return NextResponse.json({ product }, { headers: { "Cache-Control": cacheControl } });
  }

  const type = dealDoc.type === "fixed" ? "fixed" : "percent";
  const value = Number(dealDoc.value ?? 0);

  const basePrice = Number((product as unknown as { basePrice?: number }).basePrice ?? 0);
  const nextBasePrice = computeDealPrice({ original: basePrice, type, value });

  const variantsRaw = (product as unknown as { variants?: unknown[] }).variants;
  const variants = Array.isArray(variantsRaw) ? variantsRaw : [];

  const nextVariants = variants.map((v) => {
    if (typeof v !== "object" || v === null) return v;
    const rec = v as Record<string, unknown>;
    const price = Number(rec.price ?? 0);
    const nextPrice = computeDealPrice({ original: price, type, value });
    return { ...rec, price: nextPrice };
  });

  const deal = {
    id: String(dealDoc._id),
    name: String(dealDoc.name ?? ""),
    type,
    value,
    priority: Number(dealDoc.priority ?? 0),
    expiresAt: dealDoc.expiresAt ? new Date(dealDoc.expiresAt as unknown as string).toISOString() : null,
    label: buildDealLabel({ type, value }),
  };

  return NextResponse.json(
    {
      product: {
        ...(product as Record<string, unknown>),
        basePrice: nextBasePrice,
        variants: nextVariants,
        deal,
      },
    },
    { headers: { "Cache-Control": cacheControl } }
  );
}
