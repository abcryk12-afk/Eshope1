import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import type { SortOrder } from "mongoose";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Deal from "@/models/Deal";

export const runtime = "nodejs";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

function isObjectId(v: string) {
  return /^[a-fA-F0-9]{24}$/.test(v);
}

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().max(80).optional(),
  status: z.enum(["all", "active", "inactive", "expired", "scheduled"]).default("all"),
  sort: z.enum(["priority", "newest", "oldest"]).default("priority"),
});

const UpsertSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    type: z.enum(["percent", "fixed"]),
    value: z.number().min(0),
    priority: z.number().int().min(-100000).max(100000).optional(),
    startsAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    productIds: z.array(z.string().trim().refine(isObjectId, "Invalid product id")).optional().default([]),
    isActive: z.boolean().optional().default(true),
  })
  .refine((d) => new Date(d.startsAt).getTime() < new Date(d.expiresAt).getTime(), {
    message: "Expires must be after start",
    path: ["expiresAt"],
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
    filter.startsAt = { $lte: now };
    filter.expiresAt = { $gt: now };
  }

  if (status === "scheduled") {
    filter.isActive = true;
    filter.startsAt = { $gt: now };
  }

  if (status === "expired") {
    filter.expiresAt = { $lte: now };
  }

  if (status === "inactive") {
    filter.isActive = false;
  }

  const sortSpec: Record<string, SortOrder> =
    sort === "newest" ? { createdAt: -1 } : sort === "oldest" ? { createdAt: 1 } : { priority: -1, createdAt: -1 };

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Deal.find(filter)
      .sort(sortSpec)
      .skip(skip)
      .limit(limit)
      .select("name type value priority startsAt expiresAt productIds isActive createdAt")
      .lean(),
    Deal.countDocuments(filter),
  ]);

  const mapped = items.map((d) => {
    const startsAt = d.startsAt ? new Date(d.startsAt as unknown as string).toISOString() : null;
    const expiresAt = d.expiresAt ? new Date(d.expiresAt as unknown as string).toISOString() : null;

    const startsMs = startsAt ? new Date(startsAt).getTime() : 0;
    const expiresMs = expiresAt ? new Date(expiresAt).getTime() : 0;

    return {
      id: String(d._id),
      name: String(d.name ?? ""),
      type: (d.type === "fixed" ? "fixed" : "percent") as "percent" | "fixed",
      value: Number(d.value ?? 0),
      priority: Number(d.priority ?? 0),
      startsAt,
      expiresAt,
      isStarted: startsMs ? startsMs <= now.getTime() : false,
      isExpired: expiresMs ? expiresMs <= now.getTime() : false,
      productCount: Array.isArray(d.productIds) ? d.productIds.length : 0,
      isActive: Boolean(d.isActive),
      createdAt: new Date(d.createdAt as unknown as string).toISOString(),
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

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = UpsertSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  await dbConnect();

  const deal = await Deal.create({
    name: parsed.data.name,
    type: parsed.data.type,
    value: parsed.data.value,
    priority: parsed.data.priority ?? 0,
    startsAt: new Date(parsed.data.startsAt),
    expiresAt: new Date(parsed.data.expiresAt),
    productIds: parsed.data.productIds ?? [],
    isActive: parsed.data.isActive ?? true,
  });

  return NextResponse.json({ id: deal._id.toString() }, { status: 201 });
}
