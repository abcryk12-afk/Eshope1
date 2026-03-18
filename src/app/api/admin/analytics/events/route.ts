import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import VisitorEvent from "@/models/VisitorEvent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
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
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid query" }, { status: 400 });
  }

  const { page, limit } = parsed.data;
  const skip = (page - 1) * limit;

  await dbConnect();

  const [items, total] = await Promise.all([
    VisitorEvent.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("sessionId userId ip userAgent url path createdAt")
      .lean(),
    VisitorEvent.countDocuments({}),
  ]);

  const mapped = items.map((e) => ({
    id: String(e._id),
    createdAt: new Date(e.createdAt as unknown as string).toISOString(),
    sessionId: String((e as unknown as { sessionId?: unknown }).sessionId ?? ""),
    userId: (e as unknown as { userId?: unknown }).userId ? String((e as unknown as { userId?: unknown }).userId) : null,
    ip: e.ip ? String(e.ip) : null,
    userAgent: e.userAgent ? String(e.userAgent) : "",
    url: e.url ? String(e.url) : "",
    path: e.path ? String(e.path) : "",
  }));

  return NextResponse.json(
    {
      items: mapped,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
