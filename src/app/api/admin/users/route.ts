import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import type { SortOrder } from "mongoose";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";

export const runtime = "nodejs";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().max(120).optional(),
  role: z.enum(["all", "user", "staff", "admin", "super_admin"]).default("all"),
  blocked: z.enum(["all", "blocked", "active"]).default("all"),
  sort: z.enum(["newest", "oldest"]).default("newest"),
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

function isHexObjectId(v: string) {
  return /^[a-f0-9]{24}$/i.test(v);
}

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    role: url.searchParams.get("role") ?? undefined,
    blocked: url.searchParams.get("blocked") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid query" }, { status: 400 });
  }

  const { page, limit, q, role, blocked, sort } = parsed.data;

  await dbConnect();

  const filter: Record<string, unknown> = {};

  const query = (q ?? "").trim();
  if (query) {
    if (isHexObjectId(query)) {
      filter._id = query;
    } else {
      filter.$or = [
        { email: { $regex: query, $options: "i" } },
        { name: { $regex: query, $options: "i" } },
      ];
    }
  }

  if (role !== "all") {
    filter.role = role;
  }

  if (blocked !== "all") {
    filter.isBlocked = blocked === "blocked";
  }

  const sortSpec: { createdAt: SortOrder } =
    sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    User.find(filter)
      .sort(sortSpec)
      .skip(skip)
      .limit(limit)
      .select("name email role isBlocked createdAt")
      .lean(),
    User.countDocuments(filter),
  ]);

  const mapped = items.map((u) => ({
    id: String(u._id),
    name: u.name as string,
    email: u.email as string,
    role: u.role as string,
    isBlocked: Boolean(u.isBlocked),
    createdAt: new Date(u.createdAt as unknown as string).toISOString(),
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
