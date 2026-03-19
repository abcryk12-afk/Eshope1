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

  const [visitorsAgg, viewItemAgg, addToCartAgg, beginCheckoutAgg, purchaseAgg] = await Promise.all([
    VisitorEvent.aggregate([
      { $match: { createdAt: { $gte: start } } },
      { $group: { _id: "$sessionId" } },
      { $count: "count" },
    ]),
    VisitorEvent.aggregate([
      { $match: { createdAt: { $gte: start }, eventType: "view_item" } },
      { $group: { _id: "$sessionId" } },
      { $count: "count" },
    ]),
    VisitorEvent.aggregate([
      { $match: { createdAt: { $gte: start }, eventType: "add_to_cart" } },
      { $group: { _id: "$sessionId" } },
      { $count: "count" },
    ]),
    VisitorEvent.aggregate([
      { $match: { createdAt: { $gte: start }, eventType: "begin_checkout" } },
      { $group: { _id: "$sessionId" } },
      { $count: "count" },
    ]),
    VisitorEvent.aggregate([
      { $match: { createdAt: { $gte: start }, eventType: "purchase" } },
      { $group: { _id: "$sessionId" } },
      { $count: "count" },
    ]),
  ]);

  const visitors = Number(visitorsAgg?.[0]?.count ?? 0);
  const viewItem = Number(viewItemAgg?.[0]?.count ?? 0);
  const addToCart = Number(addToCartAgg?.[0]?.count ?? 0);
  const beginCheckout = Number(beginCheckoutAgg?.[0]?.count ?? 0);
  const purchase = Number(purchaseAgg?.[0]?.count ?? 0);

  return NextResponse.json(
    {
      range: parsed.data.range,
      start: start.toISOString(),
      steps: {
        visitors,
        viewItem,
        addToCart,
        beginCheckout,
        purchase,
      },
      rates: {
        viewItemRate: visitors > 0 ? viewItem / visitors : 0,
        addToCartRate: viewItem > 0 ? addToCart / viewItem : 0,
        beginCheckoutRate: addToCart > 0 ? beginCheckout / addToCart : 0,
        purchaseRate: beginCheckout > 0 ? purchase / beginCheckout : 0,
        overallConversionRate: visitors > 0 ? purchase / visitors : 0,
      },
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
