import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Product from "@/models/Product";

export const runtime = "nodejs";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

const QuerySchema = z.object({
  threshold: z.coerce.number().int().min(0).max(9999).default(10),
  onlyLow: z.coerce.boolean().default(true),
  q: z.string().trim().max(120).optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { ok: false as const, res: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }

  if (!ADMIN_ROLE_SET.has(session.user.role)) {
    return { ok: false as const, res: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true as const };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

type VariantStock = {
  id: string;
  sku: string;
  size: string;
  color: string;
  stock: number;
};

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const url = new URL(req.url);

  const parsed = QuerySchema.safeParse({
    threshold: url.searchParams.get("threshold") ?? undefined,
    onlyLow: url.searchParams.get("onlyLow") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid query" }, { status: 400 });
  }

  const { threshold, onlyLow, q } = parsed.data;

  await dbConnect();

  const filter: Record<string, unknown> = {};

  const query = (q ?? "").trim();
  if (query) {
    filter.$or = [
      { title: { $regex: query, $options: "i" } },
      { slug: { $regex: query, $options: "i" } },
      { category: { $regex: query, $options: "i" } },
    ];
  }

  const products = await Product.find(filter)
    .sort({ createdAt: -1 })
    .select("title slug category isActive stock variants")
    .lean();

  const mapped = products.map((p) => {
    const variants: unknown[] = Array.isArray(p.variants) ? (p.variants as unknown[]) : [];
    const hasVariants = variants.length > 0;

    const variantStocks: VariantStock[] = variants
      .map((v: unknown): VariantStock => {
        const rec = isRecord(v) ? v : {};

        return {
          id: String(rec._id ?? ""),
          sku: readString(rec.sku),
          size: readString(rec.size),
          color: readString(rec.color),
          stock: Number(rec.stock ?? 0),
        };
      })
      .sort((a, b) => a.stock - b.stock);

    const baseStock = Number(p.stock ?? 0);
    const stockLevel = hasVariants
      ? Math.min(...variantStocks.map((v) => v.stock))
      : baseStock;

    return {
      id: String(p._id),
      title: String(p.title ?? ""),
      slug: String(p.slug ?? ""),
      category: String(p.category ?? ""),
      isActive: Boolean(p.isActive),
      hasVariants,
      stockLevel,
      baseStock,
      variants: variantStocks,
    };
  });

  const items = onlyLow ? mapped.filter((p) => p.stockLevel <= threshold) : mapped;

  return NextResponse.json({ items, threshold });
}
