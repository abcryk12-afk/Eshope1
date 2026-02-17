import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  orderId: z.string().trim().max(64).optional(),
  phone: z.string().trim().max(30).optional(),
});

function digitsOnly(raw: string) {
  return raw.replace(/[^0-9]/g, "");
}

function phoneMatches(input: string, stored: string) {
  const a = digitsOnly(String(input ?? ""));
  const b = digitsOnly(String(stored ?? ""));
  if (!a || !b) return false;
  if (a === b) return true;

  const minLen = Math.min(a.length, b.length);
  if (minLen < 8) return false;

  return a.endsWith(b) || b.endsWith(a);
}

function isObjectId(v: string) {
  return /^[a-fA-F0-9]{24}$/.test(v);
}

function toTrackResponse(order: unknown, fallbackId: string) {
  return {
    order: {
      id: String((order as { _id?: unknown })._id ?? fallbackId),
      orderStatus: String((order as { orderStatus?: unknown }).orderStatus ?? ""),
      shippingStatus: String((order as { shippingStatus?: unknown }).shippingStatus ?? ""),
      paymentStatus: String((order as { paymentStatus?: unknown }).paymentStatus ?? ""),
      isPaid: Boolean((order as { isPaid?: unknown }).isPaid),
      trackingUrl: String((order as { trackingUrl?: unknown }).trackingUrl ?? ""),
      trackingAddedAt: (() => {
        const v = (order as { trackingAddedAt?: string | Date }).trackingAddedAt;
        if (!v) return null;
        const d = v instanceof Date ? v : new Date(String(v));
        return Number.isFinite(d.getTime()) ? d.toISOString() : null;
      })(),
      createdAt: (() => {
        const v = (order as { createdAt?: string | Date }).createdAt;
        const d = v instanceof Date ? v : new Date(String(v ?? ""));
        return Number.isFinite(d.getTime()) ? d.toISOString() : new Date().toISOString();
      })(),
      updatedAt: (() => {
        const v = (order as { updatedAt?: string | Date }).updatedAt;
        const d = v instanceof Date ? v : new Date(String(v ?? ""));
        return Number.isFinite(d.getTime()) ? d.toISOString() : null;
      })(),
    },
  };
}

export async function POST(req: NextRequest) {
  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = BodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const orderId = String(parsed.data.orderId ?? "").trim();
  const phone = String(parsed.data.phone ?? "").trim();

  if (!orderId && !phone) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  await dbConnect();

  if (orderId) {
    if (!isObjectId(orderId)) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const order = await Order.findById(orderId)
      .select(
        "shippingAddress.phone orderStatus shippingStatus paymentStatus isPaid trackingUrl trackingAddedAt createdAt updatedAt"
      )
      .lean();

    if (!order) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    if (phone) {
      const storedPhone = String((order as { shippingAddress?: { phone?: string } }).shippingAddress?.phone ?? "");
      if (!phoneMatches(phone, storedPhone)) {
        return NextResponse.json({ message: "Not found" }, { status: 404 });
      }
    }

    return NextResponse.json(toTrackResponse(order, orderId));
  }

  const recent = await Order.find({ "shippingAddress.phone": { $exists: true, $ne: "" } })
    .sort({ createdAt: -1 })
    .limit(200)
    .select(
      "shippingAddress.phone orderStatus shippingStatus paymentStatus isPaid trackingUrl trackingAddedAt createdAt updatedAt"
    )
    .lean();

  for (const o of recent) {
    const storedPhone = String((o as { shippingAddress?: { phone?: string } }).shippingAddress?.phone ?? "");
    if (!storedPhone) continue;
    if (!phoneMatches(phone, storedPhone)) continue;
    return NextResponse.json(toTrackResponse(o, ""));
  }

  return NextResponse.json({ message: "Not found" }, { status: 404 });
}
