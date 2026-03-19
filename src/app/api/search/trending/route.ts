import { NextResponse } from "next/server";

import { dbConnect } from "@/lib/db";
import Product from "@/models/Product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await dbConnect();

  const raw = await Product.find({ isActive: true })
    .select("title")
    .sort({ soldCount: -1, createdAt: -1 })
    .limit(12)
    .lean();

  const queries = (raw ?? [])
    .map((p) => String((p as unknown as { title?: unknown }).title ?? "").trim())
    .filter(Boolean)
    .slice(0, 10);

  return NextResponse.json(
    { queries },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=600" } }
  );
}
