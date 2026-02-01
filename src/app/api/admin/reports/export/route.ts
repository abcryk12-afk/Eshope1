import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";

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

  const orders = await Order.find({
    createdAt: { $gte: start },
    isPaid: true,
    orderStatus: { $ne: "Cancelled" },
  })
    .sort({ createdAt: -1 })
    .select("createdAt totalAmount orderStatus isPaid paymentMethod")
    .lean();

  const header = ["id", "createdAt", "totalAmount", "orderStatus", "isPaid", "paymentMethod"].join(",");

  const rows = orders.map((o) => {
    const cols = [
      String(o._id),
      new Date(o.createdAt as unknown as string).toISOString(),
      String(o.totalAmount ?? 0),
      String(o.orderStatus ?? ""),
      String(Boolean(o.isPaid)),
      String(o.paymentMethod ?? ""),
    ];

    return cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",");
  });

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename=orders_${parsed.data.range}.csv`,
    },
  });
}
