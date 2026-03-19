import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import VisitorEvent from "@/models/VisitorEvent";

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
  const windowStart = new Date(now);
  windowStart.setMinutes(windowStart.getMinutes() - 5);

  const activityWindowStart = new Date(now);
  activityWindowStart.setHours(activityWindowStart.getHours() - 24);

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const [activeUsersAgg, events, ordersToday, revenueTodayAgg] = await Promise.all([
    VisitorEvent.aggregate([
      { $match: { createdAt: { $gte: windowStart } } },
      { $group: { _id: "$sessionId" } },
      { $count: "count" },
    ]),
    VisitorEvent.find({ createdAt: { $gte: activityWindowStart } })
      .sort({ createdAt: -1 })
      .limit(25)
      .select("eventType path url sourceType deviceType createdAt sessionId")
      .lean(),
    Order.countDocuments({ createdAt: { $gte: todayStart }, orderStatus: { $ne: "Cancelled" } }),
    Order.aggregate([
      { $match: { createdAt: { $gte: todayStart }, orderStatus: { $ne: "Cancelled" } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
  ]);

  const activeUsers = Number(activeUsersAgg?.[0]?.count ?? 0);
  const revenueToday = Number(revenueTodayAgg?.[0]?.total ?? 0);

  const activity = events.map((e) => ({
    id: String(e._id),
    createdAt: new Date(e.createdAt as unknown as string).toISOString(),
    eventType: typeof (e as unknown as { eventType?: unknown }).eventType === "string" ? String((e as unknown as { eventType?: unknown }).eventType) : "page_view",
    path: typeof e.path === "string" ? e.path : "",
    url: typeof e.url === "string" ? e.url : "",
    sourceType: typeof (e as unknown as { sourceType?: unknown }).sourceType === "string" ? String((e as unknown as { sourceType?: unknown }).sourceType) : null,
    deviceType: typeof (e as unknown as { deviceType?: unknown }).deviceType === "string" ? String((e as unknown as { deviceType?: unknown }).deviceType) : null,
  }));

  return NextResponse.json(
    {
      activeUsers,
      ordersToday: Number(ordersToday ?? 0),
      revenueToday,
      activity,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
