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
  range: z.enum(["today", "7d", "30d"]).default("7d"),
});

function startForRange(range: "today" | "7d" | "30d") {
  const now = new Date();
  const start = new Date(now);
  if (range === "today") {
    start.setHours(0, 0, 0, 0);
    return start;
  }

  const days = range === "7d" ? 7 : 30;
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return start;
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

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({ range: url.searchParams.get("range") ?? undefined });

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid query" }, { status: 400 });
  }

  const start = startForRange(parsed.data.range);

  await dbConnect();

  const [deviceRaw, sourceRaw] = await Promise.all([
    VisitorEvent.aggregate([
      { $match: { createdAt: { $gte: start } } },
      { $group: { _id: "$deviceType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    VisitorEvent.aggregate([
      { $match: { createdAt: { $gte: start } } },
      { $group: { _id: "$sourceType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const device = deviceRaw.map((r) => ({
    key: r?._id ? String(r._id) : "unknown",
    count: Number(r?.count ?? 0),
  }));

  const source = sourceRaw.map((r) => ({
    key: r?._id ? String(r._id) : "unknown",
    count: Number(r?.count ?? 0),
  }));

  return NextResponse.json(
    {
      range: parsed.data.range,
      start: start.toISOString(),
      device,
      source,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
