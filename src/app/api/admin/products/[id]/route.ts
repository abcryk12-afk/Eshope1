import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { slugify } from "@/lib/slug";
import Category from "@/models/Category";
import Product from "@/models/Product";

export const runtime = "nodejs";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

function stripHtmlText(html: string) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isValidImageRef(v: string) {
  if (v.startsWith("/uploads/")) return true;
  try {
    new URL(v);
    return true;
  } catch {
    return false;
  }
}

function isObjectId(v: string) {
  return /^[a-fA-F0-9]{24}$/.test(v);
}

const VariantSchema = z.object({
  sku: z.string().trim().min(1).max(80),
  size: z.string().trim().min(1).max(40),
  color: z.string().trim().min(1).max(40),
  price: z.number().min(0),
  stock: z.number().int().min(0),
  images: z
    .array(z.string().trim().min(1).max(400).refine(isValidImageRef, "Invalid image URL"))
    .optional()
    .default([]),
});

const ProductUpsertSchema = z.object({
  title: z.string().trim().min(2).max(140),
  description: z
    .string()
    .trim()
    .min(1)
    .max(20000)
    .refine((v) => stripHtmlText(v).length >= 20, "Description must be at least 20 characters"),
  categoryId: z.string().trim().refine(isObjectId, "Invalid category"),
  storeName: z.string().trim().max(80).optional(),
  brand: z.string().trim().max(80).optional(),
  images: z
    .array(z.string().trim().min(1).max(400).refine(isValidImageRef, "Invalid image URL"))
    .optional()
    .default([]),
  basePrice: z.number().min(0),
  compareAtPrice: z.number().min(0).optional(),
  stock: z.number().int().min(0).optional(),
  variants: z.array(VariantSchema).optional().default([]),
  isDigital: z.boolean().optional().default(false),
  isNonReturnable: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  slug: z.string().trim().min(2).max(160).optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { ok: false as const, res: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }

  if (!ADMIN_ROLE_SET.has(session.user.role)) {
    return { ok: false as const, res: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true as const, session };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const { id } = await params;

  await dbConnect();

  const product = await Product.findById(id).lean();

  if (!product) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ product });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const { id } = await params;

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = ProductUpsertSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  await dbConnect();

  const category = await Category.findById(parsed.data.categoryId)
    .select("name slug")
    .lean();

  if (!category) {
    return NextResponse.json({ message: "Category not found" }, { status: 400 });
  }

  const slug = slugify(parsed.data.slug ?? parsed.data.title);

  if (!slug) {
    return NextResponse.json({ message: "Invalid slug" }, { status: 400 });
  }

  const existing = await Product.findOne({ slug, _id: { $ne: id } });

  if (existing) {
    return NextResponse.json({ message: "Slug already exists" }, { status: 409 });
  }

  const product = await Product.findByIdAndUpdate(
    id,
    { $set: { ...parsed.data, slug, category: category.name, categorySlug: category.slug } },
    { new: true }
  ).lean();

  if (!product) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ product });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const { id } = await params;

  await dbConnect();

  const res = await Product.findByIdAndDelete(id);

  if (!res) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
