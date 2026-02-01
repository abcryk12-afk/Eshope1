import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const items = await Order.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .select("totalAmount currency pkrPerUsd orderStatus paymentStatus paymentMethod isPaid createdAt items")
    .lean();

  const mapped = items.map((o) => ({
    id: String(o._id),
    createdAt: new Date(o.createdAt as unknown as string).toISOString(),
    totalAmount: Number(o.totalAmount ?? 0),
    currency: String((o as unknown as { currency?: string }).currency ?? "PKR"),
    pkrPerUsd: Number((o as unknown as { pkrPerUsd?: number }).pkrPerUsd ?? 0) || undefined,
    orderStatus: String(o.orderStatus ?? ""),
    paymentStatus: String((o as unknown as { paymentStatus?: string }).paymentStatus ?? ""),
    paymentMethod: String((o as unknown as { paymentMethod?: string }).paymentMethod ?? ""),
    isPaid: Boolean(o.isPaid),
    itemsCount: Array.isArray(o.items) ? o.items.length : 0,
  }));

  return NextResponse.json({ items: mapped });
}
