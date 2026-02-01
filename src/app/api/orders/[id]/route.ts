import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";

export const runtime = "nodejs";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readString(v: unknown) {
  return typeof v === "string" ? v : "";
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  const url = new URL(req.url);
  const emailRaw = url.searchParams.get("email");
  const email = emailRaw ? emailRaw.trim().toLowerCase() : "";

  if (!session?.user?.id && !email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const filter: Record<string, unknown> = { _id: id };

  if (session?.user?.id) {
    filter.userId = session.user.id;
  } else {
    filter.guestEmail = email;
  }

  const order = await Order.findOne(filter)
    .select(
      "userId guestEmail items shippingAddress paymentMethod paymentStatus paymentReceiptUrl paymentReceiptUploadedAt paymentReceiptRejectedReason currency pkrPerUsd couponCode couponDiscountAmount promotionId promotionName promotionDiscountAmount discountAmount itemsSubtotal shippingAmount taxAmount totalAmount orderStatus isPaid trackingUrl trackingAddedAt createdAt"
    )
    .lean();

  if (!order) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const mappedItems = Array.isArray(order.items)
    ? order.items.map((it: unknown) => {
        const r = isRecord(it) ? it : {};
        return {
          productId: r.productId ? String(r.productId) : "",
          variantId: r.variantId ? String(r.variantId) : "",
          title: readString(r.title),
          slug: readString(r.slug),
          image: readString(r.image),
          quantity: Number(r.quantity ?? 0),
          unitPrice: Number(r.unitPrice ?? 0),
        };
      })
    : [];

  return NextResponse.json({
    order: {
      id: String(order._id),
      customerEmail: session?.user?.email ?? readString((order as unknown as { guestEmail?: string }).guestEmail),
      items: mappedItems,
      shippingAddress: order.shippingAddress,
      paymentMethod: readString((order as unknown as { paymentMethod?: string }).paymentMethod),
      paymentStatus: readString((order as unknown as { paymentStatus?: string }).paymentStatus),
      paymentReceiptUrl: readString((order as unknown as { paymentReceiptUrl?: string }).paymentReceiptUrl),
      paymentReceiptRejectedReason: readString(
        (order as unknown as { paymentReceiptRejectedReason?: string }).paymentReceiptRejectedReason
      ),
      paymentReceiptUploadedAt: (() => {
        const v = (order as unknown as { paymentReceiptUploadedAt?: string | Date }).paymentReceiptUploadedAt;
        if (!v) return null;
        const d = v instanceof Date ? v : new Date(String(v));
        return Number.isFinite(d.getTime()) ? d.toISOString() : null;
      })(),
      currency: readString((order as unknown as { currency?: string }).currency) || "PKR",
      pkrPerUsd: Number((order as unknown as { pkrPerUsd?: number }).pkrPerUsd ?? 0) || undefined,
      couponCode: readString((order as unknown as { couponCode?: string }).couponCode),
      couponDiscountAmount: Number((order as unknown as { couponDiscountAmount?: number }).couponDiscountAmount ?? 0),
      promotionId: (order as unknown as { promotionId?: unknown }).promotionId
        ? String((order as unknown as { promotionId?: unknown }).promotionId)
        : undefined,
      promotionName: readString((order as unknown as { promotionName?: string }).promotionName),
      promotionDiscountAmount: Number(
        (order as unknown as { promotionDiscountAmount?: number }).promotionDiscountAmount ?? 0
      ),
      discountAmount: Number((order as unknown as { discountAmount?: number }).discountAmount ?? 0),
      itemsSubtotal: Number((order as unknown as { itemsSubtotal?: number }).itemsSubtotal ?? 0),
      shippingAmount: Number((order as unknown as { shippingAmount?: number }).shippingAmount ?? 0),
      taxAmount: Number((order as unknown as { taxAmount?: number }).taxAmount ?? 0),
      totalAmount: Number((order as unknown as { totalAmount?: number }).totalAmount ?? 0),
      orderStatus: readString((order as unknown as { orderStatus?: string }).orderStatus),
      isPaid: Boolean((order as unknown as { isPaid?: boolean }).isPaid),
      trackingUrl: readString((order as unknown as { trackingUrl?: string }).trackingUrl),
      trackingAddedAt: (() => {
        const v = (order as unknown as { trackingAddedAt?: string | Date }).trackingAddedAt;
        if (!v) return null;
        const d = v instanceof Date ? v : new Date(String(v));
        return Number.isFinite(d.getTime()) ? d.toISOString() : null;
      })(),
      createdAt: new Date((order as unknown as { createdAt?: string }).createdAt ?? new Date()).toISOString(),
    },
  });
}
