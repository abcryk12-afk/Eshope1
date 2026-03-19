import { NextResponse } from "next/server";

import { dbConnect } from "@/lib/db";
import { buildCategoryTree } from "@/lib/mobileMenu";
import Category from "@/models/Category";
import Product from "@/models/Product";
import SiteSetting from "@/models/SiteSetting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await dbConnect();

  const perfDoc = (await SiteSetting.findOne({ key: "global" })
    .select("performance")
    .lean()) as unknown;
  const perfRoot = perfDoc && typeof perfDoc === "object" ? (perfDoc as Record<string, unknown>) : {};
  const perf =
    perfRoot && typeof perfRoot.performance === "object" && perfRoot.performance
      ? (perfRoot.performance as Record<string, unknown>)
      : {};

  const cacheEnabled = typeof perf.apiCacheEnabled === "boolean" ? perf.apiCacheEnabled : false;
  const sMaxAge =
    typeof perf.apiCacheSMaxAgeSeconds === "number" && Number.isFinite(perf.apiCacheSMaxAgeSeconds)
      ? Math.max(0, Math.min(3600, Math.trunc(perf.apiCacheSMaxAgeSeconds)))
      : 60;
  const swr =
    typeof perf.apiCacheStaleWhileRevalidateSeconds === "number" &&
    Number.isFinite(perf.apiCacheStaleWhileRevalidateSeconds)
      ? Math.max(0, Math.min(86400, Math.trunc(perf.apiCacheStaleWhileRevalidateSeconds)))
      : 300;

  const cacheControl = cacheEnabled
    ? `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`
    : "no-store, max-age=0";

  const [categories, priceStats] = await Promise.all([
    Category.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .select("name slug parentId icon menuLabel isActive sortOrder")
      .lean(),
    Product.aggregate([
      { $match: { isActive: true } },
      {
        $project: {
          basePrice: 1,
          variantPrices: "$variants.price",
        },
      },
      {
        $project: {
          allPrices: {
            $concatArrays: [
              [{ $ifNull: ["$basePrice", 0] }],
              { $ifNull: ["$variantPrices", []] },
            ],
          },
        },
      },
      { $unwind: "$allPrices" },
      {
        $group: {
          _id: null,
          min: { $min: "$allPrices" },
          max: { $max: "$allPrices" },
        },
      },
    ]),
  ]);

  const min = priceStats?.[0]?.min ?? 0;
  const max = priceStats?.[0]?.max ?? 0;

  const categoryTree = buildCategoryTree(categories ?? []);

  return NextResponse.json(
    {
      categories: (categories ?? []).map((c) => ({ name: c.name, slug: c.slug })),
      categoryTree,
      price: { min, max },
    },
    {
      headers: {
        "Cache-Control": cacheControl,
      },
    }
  );
}
