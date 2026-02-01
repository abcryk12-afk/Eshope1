import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { slugify } from "@/lib/slug";
import Category from "@/models/Category";

export const runtime = "nodejs";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

const UpsertSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(120).optional(),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
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

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  await dbConnect();

  const items = await Category.find({})
    .sort({ sortOrder: 1, name: 1 })
    .select("name slug isActive sortOrder createdAt")
    .lean();

  return NextResponse.json({ items });
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

  const slug = slugify(parsed.data.slug ?? parsed.data.name);

  if (!slug) {
    return NextResponse.json({ message: "Invalid slug" }, { status: 400 });
  }

  const existing = await Category.findOne({ slug }).select("_id").lean();
  if (existing) {
    return NextResponse.json({ message: "Slug already exists" }, { status: 409 });
  }

  const doc = await Category.create({
    name: parsed.data.name,
    slug,
    isActive: parsed.data.isActive,
    sortOrder: parsed.data.sortOrder,
  });

  return NextResponse.json({ id: doc._id.toString() }, { status: 201 });
}
