import { NextResponse } from "next/server";
import { z } from "zod";

import { dbConnect } from "@/lib/db";
import Product from "@/models/Product";

export const runtime = "nodejs";

const QuerySchema = z.object({
  q: z.string().trim().min(1).max(80),
});

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
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const items = await Product.find({
    isActive: true,
    $or: [{ title: regex }, { category: regex }, { slug: regex }],
  })
    .select("title slug category")
    .limit(8)
    .lean();

  return NextResponse.json({ items });
}
