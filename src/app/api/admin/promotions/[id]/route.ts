import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Promotion from "@/models/Promotion";

export const runtime = "nodejs";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

function isObjectId(v: string) {
  return /^[a-fA-F0-9]{24}$/.test(v);
}

const UpsertSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(["percent", "fixed"]),
  value: z.number().min(0),
  minOrderAmount: z.number().min(0).optional(),
  maxDiscountAmount: z.number().min(0).optional(),
  priority: z.number().int().min(-100000).max(100000).optional(),
  startsAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
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

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const { id } = await params;

  await dbConnect();

  const now = new Date();

  const promo = await Promotion.findById(id)
    .select(
      "name type value minOrderAmount maxDiscountAmount priority startsAt expiresAt appliesTo categoryIds productIds isActive createdAt"
    )
    .lean();

  if (!promo) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    promotion: {
      id: String(promo._id),
      name: String(promo.name ?? ""),
      type: (promo.type === "fixed" ? "fixed" : "percent") as "percent" | "fixed",
      value: Number(promo.value ?? 0),
      minOrderAmount: Number(promo.minOrderAmount ?? 0),
      maxDiscountAmount: promo.maxDiscountAmount == null ? null : Number(promo.maxDiscountAmount),
      priority: Number(promo.priority ?? 0),
      startsAt: promo.startsAt ? new Date(promo.startsAt as unknown as string).toISOString() : null,
      expiresAt: promo.expiresAt ? new Date(promo.expiresAt as unknown as string).toISOString() : null,
      isStarted: promo.startsAt ? new Date(promo.startsAt as unknown as string).getTime() <= now.getTime() : true,
      isExpired: promo.expiresAt ? new Date(promo.expiresAt as unknown as string).getTime() <= now.getTime() : false,
      appliesTo: (promo.appliesTo ?? "all") as "all" | "categories" | "products",
      categoryIds: Array.isArray(promo.categoryIds) ? (promo.categoryIds as unknown[]).map((id) => String(id)) : [],
      productIds: Array.isArray(promo.productIds) ? (promo.productIds as unknown[]).map((id) => String(id)) : [],
      isActive: Boolean(promo.isActive),
      createdAt: new Date(promo.createdAt as unknown as string).toISOString(),
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

  const startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : null;
  const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;

  const promo = await Promotion.findByIdAndUpdate(
    id,
    {
      $set: {
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
      },
    },
    { new: true }
  )
    .select(
      "name type value minOrderAmount maxDiscountAmount priority startsAt expiresAt appliesTo categoryIds productIds isActive createdAt"
    )
    .lean();

  if (!promo) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const now = new Date();

  return NextResponse.json({
    promotion: {
      id: String(promo._id),
      name: String(promo.name ?? ""),
      type: (promo.type === "fixed" ? "fixed" : "percent") as "percent" | "fixed",
      value: Number(promo.value ?? 0),
      minOrderAmount: Number(promo.minOrderAmount ?? 0),
      maxDiscountAmount: promo.maxDiscountAmount == null ? null : Number(promo.maxDiscountAmount),
      priority: Number(promo.priority ?? 0),
      startsAt: promo.startsAt ? new Date(promo.startsAt as unknown as string).toISOString() : null,
      expiresAt: promo.expiresAt ? new Date(promo.expiresAt as unknown as string).toISOString() : null,
      isStarted: promo.startsAt ? new Date(promo.startsAt as unknown as string).getTime() <= now.getTime() : true,
      isExpired: promo.expiresAt ? new Date(promo.expiresAt as unknown as string).getTime() <= now.getTime() : false,
      appliesTo: (promo.appliesTo ?? "all") as "all" | "categories" | "products",
      categoryIds: Array.isArray(promo.categoryIds) ? (promo.categoryIds as unknown[]).map((id) => String(id)) : [],
      productIds: Array.isArray(promo.productIds) ? (promo.productIds as unknown[]).map((id) => String(id)) : [],
      isActive: Boolean(promo.isActive),
      createdAt: new Date(promo.createdAt as unknown as string).toISOString(),
    },
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const { id } = await params;

  await dbConnect();

  const res = await Promotion.findByIdAndDelete(id);

  if (!res) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
