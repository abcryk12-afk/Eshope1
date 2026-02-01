import { NextResponse } from "next/server";

import { dbConnect } from "@/lib/db";
import Category from "@/models/Category";
import Product from "@/models/Product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await dbConnect();

  const [categories, priceStats] = await Promise.all([
    Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).select("name slug").lean(),
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

  return NextResponse.json(
    {
      categories: (categories ?? []).map((c) => ({ name: c.name, slug: c.slug })),
      price: { min, max },
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
