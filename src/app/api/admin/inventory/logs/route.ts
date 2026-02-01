import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import type { SortOrder } from "mongoose";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import InventoryAdjustment from "@/models/InventoryAdjustment";

export const runtime = "nodejs";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  productId: z.string().optional(),
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

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    productId: url.searchParams.get("productId") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid query" }, { status: 400 });
  }

  const { page, limit, productId } = parsed.data;

  await dbConnect();

  const filter: Record<string, unknown> = {};
  if (productId) filter.productId = productId;

  const sortSpec: { createdAt: SortOrder } = { createdAt: -1 };
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    InventoryAdjustment.find(filter)
      .sort(sortSpec)
      .skip(skip)
      .limit(limit)
      .populate("productId", "title slug")
      .select("productId variantId delta previousStock newStock reason actorEmail actorRole createdAt")
      .lean(),
    InventoryAdjustment.countDocuments(filter),
  ]);

  const mapped = items.map((i) => {
    const p = i.productId as unknown as { title?: string; slug?: string };

    return {
      id: String(i._id),
      productId: String((i.productId as unknown as { _id: string })._id ?? ""),
      productTitle: p?.title ?? "",
      productSlug: p?.slug ?? "",
      variantId: i.variantId ? String(i.variantId) : null,
      delta: Number(i.delta ?? 0),
      previousStock: Number(i.previousStock ?? 0),
      newStock: Number(i.newStock ?? 0),
      reason: String(i.reason ?? ""),
      actorEmail: String(i.actorEmail ?? ""),
      actorRole: String(i.actorRole ?? ""),
      createdAt: new Date(i.createdAt as unknown as string).toISOString(),
    };
  });

  return NextResponse.json({
    items: mapped,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}
