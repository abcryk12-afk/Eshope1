import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { slugify } from "@/lib/slug";
import CmsPage from "@/models/CmsPage";

export const runtime = "nodejs";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

const UpsertSchema = z.object({
  title: z.string().trim().min(2).max(140),
  slug: z.string().trim().min(2).max(160).optional(),
  content: z.string().trim().min(2).max(200000),
  isPublished: z.boolean().optional().default(false),
  seoTitle: z.string().trim().max(160).optional(),
  seoDescription: z.string().trim().max(320).optional(),
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

  const page = await CmsPage.findById(id)
    .select("title slug content isPublished seoTitle seoDescription createdAt")
    .lean();

  if (!page) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    page: {
      id: String(page._id),
      title: String(page.title ?? ""),
      slug: String(page.slug ?? ""),
      content: String(page.content ?? ""),
      isPublished: Boolean(page.isPublished),
      seoTitle: page.seoTitle ? String(page.seoTitle) : "",
      seoDescription: page.seoDescription ? String(page.seoDescription) : "",
      createdAt: new Date(page.createdAt as unknown as string).toISOString(),
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

  const slug = slugify(parsed.data.slug ?? parsed.data.title);

  if (!slug) {
    return NextResponse.json({ message: "Invalid slug" }, { status: 400 });
  }

  const existing = await CmsPage.findOne({ slug, _id: { $ne: id } }).select("_id").lean();
  if (existing) {
    return NextResponse.json({ message: "Slug already exists" }, { status: 409 });
  }

  const page = await CmsPage.findByIdAndUpdate(
    id,
    {
      $set: {
        title: parsed.data.title,
        slug,
        content: parsed.data.content,
        isPublished: parsed.data.isPublished ?? false,
        seoTitle: parsed.data.seoTitle,
        seoDescription: parsed.data.seoDescription,
      },
    },
    { new: true }
  )
    .select("title slug content isPublished seoTitle seoDescription createdAt")
    .lean();

  if (!page) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    page: {
      id: String(page._id),
      title: String(page.title ?? ""),
      slug: String(page.slug ?? ""),
      content: String(page.content ?? ""),
      isPublished: Boolean(page.isPublished),
      seoTitle: page.seoTitle ? String(page.seoTitle) : "",
      seoDescription: page.seoDescription ? String(page.seoDescription) : "",
      createdAt: new Date(page.createdAt as unknown as string).toISOString(),
    },
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const { id } = await params;

  await dbConnect();

  const res = await CmsPage.findByIdAndDelete(id);

  if (!res) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
