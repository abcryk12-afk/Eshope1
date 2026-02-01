import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import type { SortOrder } from "mongoose";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Promotion from "@/models/Promotion";

export const runtime = "nodejs";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

function isObjectId(v: string) {
  return /^[a-fA-F0-9]{24}$/.test(v);
}

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().max(80).optional(),
  status: z.enum(["all", "active", "inactive", "expired"]).default("all"),
  sort: z.enum(["priority", "newest", "oldest"]).default("priority"),
});

const UpsertSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(["percent", "fixed"]),
  value: z.number().min(0),
  minOrderAmount: z.number().min(0).optional(),
  maxDiscountAmount: z.number().min(0).optional(),
  priority: z.number().int().min(-100000).max(100000).optional(),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  appliesTo: z.enum(["all", "categories", "products"]).optional(),
  categoryIds: z.array(z.string().trim().refine(isObjectId, "Invalid category id")).optional().default([]),
  productIds: z.array(z.string().trim().refine(isObjectId, "Invalid product id")).optional().default([]),
  isActive: z.boolean().optional().default(true),
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
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid query" }, { status: 400 });
  }

  const { page, limit, q, status, sort } = parsed.data;

  await dbConnect();

  const now = new Date();

  const filter: Record<string, unknown> = {};

  const query = (q ?? "").trim();
  if (query) {
    filter.name = { $regex: query, $options: "i" };
  }

  if (status === "active") {
    filter.isActive = true;
    filter.$and = [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
    ];
  }

  if (status === "inactive") {
    filter.isActive = false;
  }

  if (status === "expired") {
    filter.expiresAt = { $lte: now };
  }

  const sortSpec: Record<string, SortOrder> =
    sort === "newest"
      ? { createdAt: -1 }
      : sort === "oldest"
        ? { createdAt: 1 }
        : { priority: -1, createdAt: -1 };

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Promotion.find(filter)
      .sort(sortSpec)
      .skip(skip)
      .limit(limit)
      .select(
        "name type value minOrderAmount maxDiscountAmount priority startsAt expiresAt appliesTo categoryIds productIds isActive createdAt"
      )
      .lean(),
    Promotion.countDocuments(filter),
  ]);

  const mapped = items.map((p) => ({
    id: String(p._id),
    name: String(p.name ?? ""),
    type: (p.type === "fixed" ? "fixed" : "percent") as "percent" | "fixed",
    value: Number(p.value ?? 0),
    minOrderAmount: Number(p.minOrderAmount ?? 0),
    maxDiscountAmount: p.maxDiscountAmount == null ? null : Number(p.maxDiscountAmount),
    priority: Number(p.priority ?? 0),
    startsAt: p.startsAt ? new Date(p.startsAt as unknown as string).toISOString() : null,
    expiresAt: p.expiresAt ? new Date(p.expiresAt as unknown as string).toISOString() : null,
    isStarted: p.startsAt ? new Date(p.startsAt as unknown as string).getTime() <= now.getTime() : true,
    isExpired: p.expiresAt ? new Date(p.expiresAt as unknown as string).getTime() <= now.getTime() : false,
    appliesTo: (p.appliesTo ?? "all") as "all" | "categories" | "products",
    categoryIds: Array.isArray(p.categoryIds) ? (p.categoryIds as unknown[]).map((id) => String(id)) : [],
    productIds: Array.isArray(p.productIds) ? (p.productIds as unknown[]).map((id) => String(id)) : [],
    isActive: Boolean(p.isActive),
    createdAt: new Date(p.createdAt as unknown as string).toISOString(),
  }));

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

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = UpsertSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  await dbConnect();

  const startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : undefined;
  const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined;

  const promo = await Promotion.create({
    name: parsed.data.name,
    type: parsed.data.type,
    value: parsed.data.value,
    minOrderAmount: parsed.data.minOrderAmount ?? 0,
    maxDiscountAmount: parsed.data.maxDiscountAmount,
    priority: parsed.data.priority ?? 0,
    startsAt,
    expiresAt,
    appliesTo: parsed.data.appliesTo ?? "all",
    categoryIds: parsed.data.categoryIds ?? [],
    productIds: parsed.data.productIds ?? [],
    isActive: parsed.data.isActive ?? true,
  });

  return NextResponse.json({ id: promo._id.toString() }, { status: 201 });
}
