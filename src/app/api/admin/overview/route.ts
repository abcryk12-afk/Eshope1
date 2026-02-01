import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import Product from "@/models/Product";
import User from "@/models/User";

export const runtime = "nodejs";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

const QuerySchema = z.object({
  range: z.enum(["7d", "30d", "90d"]).default("30d"),
});

function daysForRange(range: "7d" | "30d" | "90d") {
  if (range === "7d") return 7;
  if (range === "90d") return 90;
  return 30;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!ADMIN_ROLE_SET.has(session.user.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    range: url.searchParams.get("range") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid query" }, { status: 400 });
  }

  const days = daysForRange(parsed.data.range);
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  await dbConnect();

  const [totalUsers, totalProducts, totalOrders, totalSalesAgg] = await Promise.all([
    User.countDocuments({}),
    Product.countDocuments({ isActive: true }),
    Order.countDocuments({}),
    Order.aggregate([
      { $match: { isPaid: true, orderStatus: { $ne: "Cancelled" } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
  ]);

  const totalSales = totalSalesAgg?.[0]?.total ?? 0;

  const salesSeriesRaw = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: start },
        isPaid: true,
        orderStatus: { $ne: "Cancelled" },
      },
    },
    {
      $group: {
        _id: {
          y: { $year: "$createdAt" },
          m: { $month: "$createdAt" },
          d: { $dayOfMonth: "$createdAt" },
        },
        sales: { $sum: "$totalAmount" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { "_id.y": 1, "_id.m": 1, "_id.d": 1 } },
  ]);

  const salesMap = new Map<string, { sales: number; orders: number }>();

  for (const row of salesSeriesRaw) {
    const y = row?._id?.y as number;
    const m = row?._id?.m as number;
    const d = row?._id?.d as number;

    const key = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    salesMap.set(key, {
      sales: Number(row.sales ?? 0),
      orders: Number(row.orders ?? 0),
    });
  }

  const salesSeries: Array<{ date: string; sales: number; orders: number }> = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const val = salesMap.get(key);
    salesSeries.push({ date: key, sales: val?.sales ?? 0, orders: val?.orders ?? 0 });
  }

  const recentOrdersRaw = await Order.find({})
    .sort({ createdAt: -1 })
    .limit(8)
    .populate("userId", "email")
    .select("totalAmount orderStatus isPaid createdAt userId")
    .lean();

  const recentOrders = recentOrdersRaw.map((o) => {
    const user = o.userId as unknown as { email?: string };

    return {
      id: String(o._id),
      createdAt: new Date(o.createdAt as unknown as string).toISOString(),
      totalAmount: Number(o.totalAmount ?? 0),
      orderStatus: String(o.orderStatus ?? ""),
      isPaid: Boolean(o.isPaid),
      customerEmail: user?.email,
    };
  });

  const lowStockRaw = await Product.aggregate([
    { $match: { isActive: true } },
    {
      $project: {
        title: 1,
        slug: 1,
        baseStock: { $ifNull: ["$stock", 999999] },
        minVariantStock: { $min: "$variants.stock" },
      },
    },
    {
      $addFields: {
        stockLevel: {
          $min: [
            "$baseStock",
            { $ifNull: ["$minVariantStock", 999999] },
          ],
        },
      },
    },
    { $match: { stockLevel: { $lte: 10 } } },
    { $sort: { stockLevel: 1 } },
    { $limit: 10 },
  ]);

  const lowStock = lowStockRaw.map((p) => ({
    id: String(p._id),
    title: String(p.title ?? ""),
    slug: String(p.slug ?? ""),
    stockLevel: Number(p.stockLevel ?? 0),
  }));

  return NextResponse.json({
    cards: {
      totalSales,
      totalOrders,
      totalProducts,
      totalUsers,
    },
    salesSeries,
    recentOrders,
    lowStock,
  });
}
