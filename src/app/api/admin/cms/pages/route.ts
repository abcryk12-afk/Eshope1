import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import type { SortOrder } from "mongoose";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { slugify } from "@/lib/slug";
import CmsPage from "@/models/CmsPage";

export const runtime = "nodejs";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().max(120).optional(),
});

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

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid query" }, { status: 400 });
  }

  const { page, limit, q } = parsed.data;

  await dbConnect();

  const filter: Record<string, unknown> = {};
  const query = (q ?? "").trim();
  if (query) {
    filter.$or = [
      { title: { $regex: query, $options: "i" } },
      { slug: { $regex: query, $options: "i" } },
    ];
  }

  const sortSpec: { createdAt: SortOrder } = { createdAt: -1 };
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    CmsPage.find(filter)
      .sort(sortSpec)
      .skip(skip)
      .limit(limit)
      .select("title slug isPublished createdAt")
      .lean(),
    CmsPage.countDocuments(filter),
  ]);

  const mapped = items.map((p) => ({
    id: String(p._id),
    title: String(p.title ?? ""),
    slug: String(p.slug ?? ""),
    isPublished: Boolean(p.isPublished),
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

  const slug = slugify(parsed.data.slug ?? parsed.data.title);

  if (!slug) {
    return NextResponse.json({ message: "Invalid slug" }, { status: 400 });
  }

  const existing = await CmsPage.findOne({ slug }).select("_id").lean();
  if (existing) {
    return NextResponse.json({ message: "Slug already exists" }, { status: 409 });
  }

  const page = await CmsPage.create({
    title: parsed.data.title,
    slug,
    content: parsed.data.content,
    isPublished: parsed.data.isPublished ?? false,
    seoTitle: parsed.data.seoTitle,
    seoDescription: parsed.data.seoDescription,
  });

  return NextResponse.json({ id: page._id.toString(), slug: page.slug }, { status: 201 });
}
