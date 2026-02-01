import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import type { SortOrder } from "mongoose";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import AdminLog from "@/models/AdminLog";

export const runtime = "nodejs";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  action: z.string().trim().max(80).optional(),
  entityType: z.string().trim().max(80).optional(),
  entityId: z.string().trim().max(80).optional(),
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
    action: url.searchParams.get("action") ?? undefined,
    entityType: url.searchParams.get("entityType") ?? undefined,
    entityId: url.searchParams.get("entityId") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid query" }, { status: 400 });
  }

  const { page, limit, action, entityType, entityId } = parsed.data;

  await dbConnect();

  const filter: Record<string, unknown> = {};
  if (action) filter.action = action;
  if (entityType) filter.entityType = entityType;
  if (entityId) filter.entityId = entityId;

  const sortSpec: { createdAt: SortOrder } = { createdAt: -1 };
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    AdminLog.find(filter)
      .sort(sortSpec)
      .skip(skip)
      .limit(limit)
      .select("actorEmail actorRole action entityType entityId message createdAt")
      .lean(),
    AdminLog.countDocuments(filter),
  ]);

  const mapped = items.map((l) => ({
    id: String(l._id),
    actorEmail: String(l.actorEmail ?? ""),
    actorRole: String(l.actorRole ?? ""),
    action: String(l.action ?? ""),
    entityType: String(l.entityType ?? ""),
    entityId: l.entityId ? String(l.entityId) : null,
    message: l.message ? String(l.message) : "",
    createdAt: new Date(l.createdAt as unknown as string).toISOString(),
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
