import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import type { SortOrder } from "mongoose";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Coupon from "@/models/Coupon";

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
  sort: z.enum(["newest", "oldest"]).default("newest"),
});

const UpsertSchema = z.object({
  code: z.string().trim().min(2).max(40),
  type: z.enum(["percent", "fixed"]),
  value: z.number().min(0),
  minOrderAmount: z.number().min(0).optional(),
  maxDiscountAmount: z.number().min(0).optional(),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  usageLimit: z.number().int().min(1).optional(),
  usageLimitPerCustomer: z.number().int().min(1).optional(),
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

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
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
    filter.code = { $regex: query.toUpperCase(), $options: "i" };
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

  const sortSpec: { createdAt: SortOrder } =
    sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Coupon.find(filter)
      .sort(sortSpec)
      .skip(skip)
      .limit(limit)
      .select(
        "code type value minOrderAmount maxDiscountAmount startsAt expiresAt usageLimit usageLimitPerCustomer usedCount appliesTo categoryIds productIds isActive createdAt"
      )
      .lean(),
    Coupon.countDocuments(filter),
  ]);

  const mapped = items.map((c) => ({
    id: String(c._id),
    code: String(c.code ?? ""),
    type: String(c.type ?? ""),
    value: Number(c.value ?? 0),
    minOrderAmount: Number(c.minOrderAmount ?? 0),
    maxDiscountAmount: c.maxDiscountAmount == null ? null : Number(c.maxDiscountAmount),
    startsAt: c.startsAt ? new Date(c.startsAt as unknown as string).toISOString() : null,
    expiresAt: c.expiresAt ? new Date(c.expiresAt as unknown as string).toISOString() : null,
    isStarted: c.startsAt ? new Date(c.startsAt as unknown as string).getTime() <= now.getTime() : true,
    isExpired: c.expiresAt ? new Date(c.expiresAt as unknown as string).getTime() <= now.getTime() : false,
    usageLimit: c.usageLimit == null ? null : Number(c.usageLimit),
    usageLimitPerCustomer: c.usageLimitPerCustomer == null ? null : Number(c.usageLimitPerCustomer),
    usedCount: Number(c.usedCount ?? 0),
    appliesTo: (c.appliesTo ?? "all") as "all" | "categories" | "products",
    categoryIds: Array.isArray(c.categoryIds) ? (c.categoryIds as unknown[]).map((id) => String(id)) : [],
    productIds: Array.isArray(c.productIds) ? (c.productIds as unknown[]).map((id) => String(id)) : [],
    isActive: Boolean(c.isActive),
    createdAt: new Date(c.createdAt as unknown as string).toISOString(),
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

  const code = normalizeCode(parsed.data.code);

  const existing = await Coupon.findOne({ code }).select("_id").lean();
  if (existing) {
    return NextResponse.json({ message: "Code already exists" }, { status: 409 });
  }

  const startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : undefined;
  const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined;

  const coupon = await Coupon.create({
    code,
    type: parsed.data.type,
    value: parsed.data.value,
    minOrderAmount: parsed.data.minOrderAmount ?? 0,
    maxDiscountAmount: parsed.data.maxDiscountAmount,
    startsAt,
    expiresAt,
    usageLimit: parsed.data.usageLimit,
    usageLimitPerCustomer: parsed.data.usageLimitPerCustomer,
    appliesTo: parsed.data.appliesTo ?? "all",
    categoryIds: parsed.data.categoryIds ?? [],
    productIds: parsed.data.productIds ?? [],
    isActive: parsed.data.isActive ?? true,
  });

  return NextResponse.json({ id: coupon._id.toString() }, { status: 201 });
}
