import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import VisitorEvent from "@/models/VisitorEvent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

const QuerySchema = z.object({
  range: z.enum(["7d", "30d", "90d"]).default("30d"),
});

function daysForRange(range: "7d" | "30d" | "90d") {
  if (range === "7d") return 7;
  if (range === "90d") return 90;
  return 30;
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

  const days = daysForRange(parsed.data.range);
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  await dbConnect();

  const [visitorsRaw, ordersRaw] = await Promise.all([
    VisitorEvent.aggregate([
      { $match: { createdAt: { $gte: start } } },
      {
        $group: {
          _id: {
            y: { $year: "$createdAt" },
            m: { $month: "$createdAt" },
            d: { $dayOfMonth: "$createdAt" },
          },
          visitors: { $addToSet: "$sessionId" },
          pageViews: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 1,
          visitors: { $size: "$visitors" },
          pageViews: 1,
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1, "_id.d": 1 } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: start }, orderStatus: { $ne: "Cancelled" } } },
      {
        $group: {
          _id: {
            y: { $year: "$createdAt" },
            m: { $month: "$createdAt" },
            d: { $dayOfMonth: "$createdAt" },
          },
          orders: { $sum: 1 },
          revenue: { $sum: "$totalAmount" },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1, "_id.d": 1 } },
    ]),
  ]);

  const keyFor = (y: number, m: number, d: number) =>
    `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const visitorsMap = new Map<string, { visitors: number; pageViews: number }>();
  for (const row of visitorsRaw) {
    const y = row?._id?.y as number;
    const m = row?._id?.m as number;
    const d = row?._id?.d as number;
    visitorsMap.set(keyFor(y, m, d), {
      visitors: Number(row.visitors ?? 0),
      pageViews: Number(row.pageViews ?? 0),
    });
  }

  const ordersMap = new Map<string, { orders: number; revenue: number }>();
  for (const row of ordersRaw) {
    const y = row?._id?.y as number;
    const m = row?._id?.m as number;
    const d = row?._id?.d as number;
    ordersMap.set(keyFor(y, m, d), {
      orders: Number(row.orders ?? 0),
      revenue: Number(row.revenue ?? 0),
    });
  }

  const series: Array<{ date: string; visitors: number; pageViews: number; orders: number; revenue: number }> = [];

  for (let i = 0; i < days; i++) {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);
    const key = dt.toISOString().slice(0, 10);
    const v = visitorsMap.get(key);
    const o = ordersMap.get(key);
    series.push({
      date: key,
      visitors: v?.visitors ?? 0,
      pageViews: v?.pageViews ?? 0,
      orders: o?.orders ?? 0,
      revenue: o?.revenue ?? 0,
    });
  }

  return NextResponse.json(
    {
      range: parsed.data.range,
      series,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
