import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Coupon from "@/models/Coupon";

export const runtime = "nodejs";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

function isObjectId(v: string) {
  return /^[a-fA-F0-9]{24}$/.test(v);
}

const UpsertSchema = z.object({
  code: z.string().trim().min(2).max(40),
  type: z.enum(["percent", "fixed"]),
  value: z.number().min(0),
  minOrderAmount: z.number().min(0).optional(),
  maxDiscountAmount: z.number().min(0).optional(),
  startsAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  usageLimit: z.number().int().min(1).optional().nullable(),
  usageLimitPerCustomer: z.number().int().min(1).optional().nullable(),
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

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const { id } = await params;

  await dbConnect();

  const now = new Date();

  const coupon = await Coupon.findById(id)
    .select(
      "code type value minOrderAmount maxDiscountAmount startsAt expiresAt usageLimit usageLimitPerCustomer usedCount appliesTo categoryIds productIds isActive createdAt"
    )
    .lean();

  if (!coupon) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    coupon: {
      id: String(coupon._id),
      code: String(coupon.code ?? ""),
      type: String(coupon.type ?? ""),
      value: Number(coupon.value ?? 0),
      minOrderAmount: Number(coupon.minOrderAmount ?? 0),
      maxDiscountAmount: coupon.maxDiscountAmount == null ? null : Number(coupon.maxDiscountAmount),
      startsAt: coupon.startsAt ? new Date(coupon.startsAt as unknown as string).toISOString() : null,
      expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt as unknown as string).toISOString() : null,
      isStarted: coupon.startsAt
        ? new Date(coupon.startsAt as unknown as string).getTime() <= now.getTime()
        : true,
      isExpired: coupon.expiresAt
        ? new Date(coupon.expiresAt as unknown as string).getTime() <= now.getTime()
        : false,
      usageLimit: coupon.usageLimit == null ? null : Number(coupon.usageLimit),
      usageLimitPerCustomer: coupon.usageLimitPerCustomer == null ? null : Number(coupon.usageLimitPerCustomer),
      usedCount: Number(coupon.usedCount ?? 0),
      appliesTo: (coupon.appliesTo ?? "all") as "all" | "categories" | "products",
      categoryIds: Array.isArray(coupon.categoryIds)
        ? (coupon.categoryIds as unknown[]).map((id) => String(id))
        : [],
      productIds: Array.isArray(coupon.productIds)
        ? (coupon.productIds as unknown[]).map((id) => String(id))
        : [],
      isActive: Boolean(coupon.isActive),
      createdAt: new Date(coupon.createdAt as unknown as string).toISOString(),
    },
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const { id } = await params;

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = UpsertSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  await dbConnect();

  const code = normalizeCode(parsed.data.code);

  const existing = await Coupon.findOne({ code, _id: { $ne: id } }).select("_id").lean();
  if (existing) {
    return NextResponse.json({ message: "Code already exists" }, { status: 409 });
  }

  const startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : null;
  const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
  const usageLimit = parsed.data.usageLimit == null ? null : parsed.data.usageLimit;
  const usageLimitPerCustomer =
    parsed.data.usageLimitPerCustomer == null ? null : parsed.data.usageLimitPerCustomer;

  const coupon = await Coupon.findByIdAndUpdate(
    id,
    {
      $set: {
        code,
        type: parsed.data.type,
        value: parsed.data.value,
        minOrderAmount: parsed.data.minOrderAmount ?? 0,
        maxDiscountAmount: parsed.data.maxDiscountAmount,
        startsAt,
        expiresAt,
        usageLimit,
        usageLimitPerCustomer,
        appliesTo: parsed.data.appliesTo ?? "all",
        categoryIds: parsed.data.categoryIds ?? [],
        productIds: parsed.data.productIds ?? [],
        isActive: parsed.data.isActive ?? true,
      },
    },
    { new: true }
  )
    .select(
      "code type value minOrderAmount maxDiscountAmount startsAt expiresAt usageLimit usageLimitPerCustomer usedCount appliesTo categoryIds productIds isActive createdAt"
    )
    .lean();

  if (!coupon) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    coupon: {
      id: String(coupon._id),
      code: String(coupon.code ?? ""),
      type: String(coupon.type ?? ""),
      value: Number(coupon.value ?? 0),
      minOrderAmount: Number(coupon.minOrderAmount ?? 0),
      maxDiscountAmount: coupon.maxDiscountAmount == null ? null : Number(coupon.maxDiscountAmount),
      startsAt: coupon.startsAt ? new Date(coupon.startsAt as unknown as string).toISOString() : null,
      expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt as unknown as string).toISOString() : null,
      usageLimit: coupon.usageLimit == null ? null : Number(coupon.usageLimit),
      usageLimitPerCustomer: coupon.usageLimitPerCustomer == null ? null : Number(coupon.usageLimitPerCustomer),
      usedCount: Number(coupon.usedCount ?? 0),
      appliesTo: (coupon.appliesTo ?? "all") as "all" | "categories" | "products",
      categoryIds: Array.isArray(coupon.categoryIds)
        ? (coupon.categoryIds as unknown[]).map((id) => String(id))
        : [],
      productIds: Array.isArray(coupon.productIds)
        ? (coupon.productIds as unknown[]).map((id) => String(id))
        : [],
      isActive: Boolean(coupon.isActive),
      createdAt: new Date(coupon.createdAt as unknown as string).toISOString(),
    },
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const { id } = await params;

  await dbConnect();

  const res = await Coupon.findByIdAndDelete(id);

  if (!res) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
