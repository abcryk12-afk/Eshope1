import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { pingSitemapIfEnabled } from "@/lib/sitemapPing";
import { slugify } from "@/lib/slug";
import Category from "@/models/Category";
import Product from "@/models/Product";

export const runtime = "nodejs";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

const UpsertSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(120).optional(),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
  parentId: z.string().trim().min(1).optional().nullable().default(null),
});

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readParentId(v: unknown): string {
  if (!isRecord(v)) return "";
  const raw = v.parentId;
  return raw ? String(raw) : "";
}

function readLevel(v: unknown): number {
  if (!isRecord(v)) return 0;
  const raw = v.level;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
}

async function wouldCreateCycle(id: string, parentId: string | null) {
  if (!parentId) return false;
  if (parentId === id) return true;

  let cur: string | null = parentId;
  for (let i = 0; i < 30; i++) {
    const doc = (await Category.findById(cur).select("parentId").lean()) as unknown;
    const pid = readParentId(doc);
    if (!pid) return false;
    if (pid === id) return true;
    cur = pid;
  }

  return true;
}

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

  const doc = await Category.findById(id).lean();

  if (!doc) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ category: doc });
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

  const nextParentId = parsed.data.parentId || null;
  if (await wouldCreateCycle(id, nextParentId)) {
    return NextResponse.json({ message: "Invalid parent category" }, { status: 400 });
  }

  let level = 0;
  if (nextParentId) {
    const parent = (await Category.findById(nextParentId).select("level").lean()) as unknown;
    const parentLevel = readLevel(parent);
    level = Math.max(0, Math.min(20, Math.trunc(parentLevel + 1)));
  }

  const slug = slugify(parsed.data.slug ?? parsed.data.name);

  if (!slug) {
    return NextResponse.json({ message: "Invalid slug" }, { status: 400 });
  }

  const existing = await Category.findOne({ slug, _id: { $ne: id } }).select("_id").lean();
  if (existing) {
    return NextResponse.json({ message: "Slug already exists" }, { status: 409 });
  }

  const doc = await Category.findByIdAndUpdate(
    id,
    {
      $set: {
        name: parsed.data.name,
        slug,
        isActive: parsed.data.isActive,
        sortOrder: parsed.data.sortOrder,
        parentId: nextParentId,
        level,
      },
    },
    { new: true }
  ).lean();

  if (!doc) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  await Product.updateMany(
    { categoryId: id },
    { $set: { category: doc.name, categorySlug: doc.slug } }
  );

  void pingSitemapIfEnabled();

  return NextResponse.json({ category: doc });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const { id } = await params;

  await dbConnect();

  const category = await Category.findById(id).select("name slug").lean();
  if (!category) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const used = await Product.countDocuments({
    $or: [{ categoryId: id }, { categorySlug: category.slug }, { category: category.name }],
  });
  if (used > 0) {
    return NextResponse.json(
      { message: "Category is in use by products" },
      { status: 409 }
    );
  }

  const doc = await Category.findByIdAndDelete(id);

  if (!doc) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  void pingSitemapIfEnabled();

  return NextResponse.json({ ok: true });
}
