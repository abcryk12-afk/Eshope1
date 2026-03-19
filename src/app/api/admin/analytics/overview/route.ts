import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import VisitorEvent from "@/models/VisitorEvent";
import Order from "@/models/Order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

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

  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);

  const start30d = new Date(startToday);
  start30d.setDate(start30d.getDate() - 29);

  const activeWindowStart = new Date(now);
  activeWindowStart.setMinutes(activeWindowStart.getMinutes() - 5);

  const start7d = new Date(startToday);
  start7d.setDate(start7d.getDate() - 6);

  const [
    dailyVisitorsAgg,
    totalVisitorsAgg,
    uniqueVisitorsAgg,
    activeUsersAgg,
    pageViewsToday,
    ordersToday,
    revenueTodayAgg,
    visitors7dAgg,
    purchasers7dAgg,
  ] = await Promise.all([
    VisitorEvent.aggregate([
      { $match: { createdAt: { $gte: startToday } } },
      { $group: { _id: "$sessionId" } },
      { $count: "count" },
    ]),
    VisitorEvent.aggregate([
      { $group: { _id: "$sessionId" } },
      { $count: "count" },
    ]),
    VisitorEvent.aggregate([
      { $match: { createdAt: { $gte: start30d } } },
      { $group: { _id: "$sessionId" } },
      { $count: "count" },
    ]),
    VisitorEvent.aggregate([
      { $match: { createdAt: { $gte: activeWindowStart } } },
      { $group: { _id: "$sessionId" } },
      { $count: "count" },
    ]),
    VisitorEvent.countDocuments({ createdAt: { $gte: startToday } }),
    Order.countDocuments({ createdAt: { $gte: startToday }, orderStatus: { $ne: "Cancelled" } }),
    Order.aggregate([
      { $match: { createdAt: { $gte: startToday }, orderStatus: { $ne: "Cancelled" } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    VisitorEvent.aggregate([
      { $match: { createdAt: { $gte: start7d } } },
      { $group: { _id: "$sessionId" } },
      { $count: "count" },
    ]),
    VisitorEvent.aggregate([
      { $match: { createdAt: { $gte: start7d }, eventType: "purchase" } },
      { $group: { _id: "$sessionId" } },
      { $count: "count" },
    ]),
  ]);

  const dailyVisitors = Number(dailyVisitorsAgg?.[0]?.count ?? 0);
  const totalVisitors = Number(totalVisitorsAgg?.[0]?.count ?? 0);
  const uniqueVisitors = Number(uniqueVisitorsAgg?.[0]?.count ?? 0);
  const activeUsers = Number(activeUsersAgg?.[0]?.count ?? 0);

  const orders = Number(ordersToday ?? 0);
  const revenue = Number(revenueTodayAgg?.[0]?.total ?? 0);

  const visitors7d = Number(visitors7dAgg?.[0]?.count ?? 0);
  const purchasers7d = Number(purchasers7dAgg?.[0]?.count ?? 0);
  const conversionRate7d = visitors7d > 0 ? purchasers7d / visitors7d : 0;

  return NextResponse.json(
    {
      cards: {
        dailyVisitors,
        totalVisitors,
        uniqueVisitors,
        activeUsers,
        pageViews: Number(pageViewsToday ?? 0),
        orders,
        revenue,
        conversionRate7d,
      },
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
