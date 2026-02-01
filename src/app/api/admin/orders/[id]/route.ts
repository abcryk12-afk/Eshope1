import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { createUserMessage } from "@/lib/messages";
import { recomputeProductSoldCount } from "@/lib/sales";
import Order from "@/models/Order";
import SiteSetting from "@/models/SiteSetting";

export const runtime = "nodejs";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

const UpdateSchema = z
  .object({
    orderStatus: z
      .enum(["Pending", "Processing", "Shipped", "Delivered", "Cancelled"])
      .optional(),
    isPaid: z.boolean().optional(),
    trackingUrl: z.string().trim().max(800).optional(),
    paymentProofAction: z.enum(["approve", "reject"]).optional(),
    paymentRejectReason: z.string().trim().max(400).optional(),
  })
  .strict();

function isSafeTrackingUrl(raw: string) {
  const v = String(raw || "").trim();
  if (!v) return true;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { ok: false as const, res: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }

  if (!ADMIN_ROLE_SET.has(session.user.role)) {
    return { ok: false as const, res: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true as const, session };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const { id } = await params;

  await dbConnect();

  const settingsDoc = await SiteSetting.findOne({ key: "global" })
    .select("globalSeoTitle whatsAppOrderTemplate")
    .lean();
  const root = settingsDoc as Record<string, unknown> | null;
  const storeName = typeof root?.globalSeoTitle === "string" ? root.globalSeoTitle.trim() : "";
  const whatsAppOrderTemplate =
    typeof root?.whatsAppOrderTemplate === "string" ? root.whatsAppOrderTemplate.trim() : "";

  const order = await Order.findById(id)
    .select(
      "userId guestEmail items shippingAddress paymentMethod paymentStatus paymentReceiptUrl paymentReceiptUploadedAt paymentReceiptRejectedReason paymentReceiptReviewedAt paymentReceiptReviewedBy currency pkrPerUsd couponCode couponDiscountAmount promotionId promotionName promotionDiscountAmount discountAmount itemsSubtotal shippingAmount taxAmount totalAmount orderStatus shippingStatus trackingUrl trackingAddedAt isPaid paidAt isDelivered deliveredAt createdAt"
    )
    .populate("userId", "email name")
    .lean();

  if (!order) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    order,
    storeName: storeName || "Shop",
    whatsAppOrderTemplate: whatsAppOrderTemplate || undefined,
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const { id } = await params;

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = UpdateSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  await dbConnect();

  const current = await Order.findById(id)
    .select("userId orderStatus trackingUrl paymentMethod paymentStatus paymentReceiptUrl")
    .lean();
  if (!current) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const currentUserId = (current as unknown as { userId?: unknown }).userId ? String((current as unknown as { userId?: unknown }).userId) : "";
  const prevOrderStatus = String((current as unknown as { orderStatus?: string }).orderStatus ?? "");
  const prevTrackingUrl = String((current as unknown as { trackingUrl?: string }).trackingUrl ?? "").trim();
  const prevPaymentStatus = String((current as unknown as { paymentStatus?: string }).paymentStatus ?? "");

  const update: Record<string, unknown> = {};

  if (parsed.data.orderStatus) {
    update.orderStatus = parsed.data.orderStatus;

    update.shippingStatus =
      parsed.data.orderStatus === "Delivered"
        ? "Delivered"
        : parsed.data.orderStatus === "Shipped"
          ? "Shipped"
          : "Pending";

    if (parsed.data.orderStatus === "Delivered") {
      update.isDelivered = true;
      update.deliveredAt = new Date();
    }

    if (parsed.data.orderStatus !== "Delivered") {
      update.isDelivered = false;
      update.deliveredAt = null;
    }

    if (parsed.data.orderStatus === "Cancelled") {
      update.isDelivered = false;
      update.deliveredAt = null;
      update.shippingStatus = "Pending";
    }
  }

  if (typeof parsed.data.trackingUrl === "string") {
    const v = parsed.data.trackingUrl.trim();

    if (!isSafeTrackingUrl(v)) {
      return NextResponse.json({ message: "Invalid tracking URL" }, { status: 400 });
    }

    const effectiveStatus = (parsed.data.orderStatus ?? (current as unknown as { orderStatus?: string }).orderStatus) as
      | "Pending"
      | "Processing"
      | "Shipped"
      | "Delivered"
      | "Cancelled";

    if (effectiveStatus !== "Shipped") {
      return NextResponse.json({ message: "Tracking URL can only be set for shipped orders" }, { status: 400 });
    }

    update.trackingUrl = v || null;
    update.trackingAddedAt = v ? new Date() : null;
  }

  if (typeof parsed.data.isPaid === "boolean") {
    update.isPaid = parsed.data.isPaid;
    update.paidAt = parsed.data.isPaid ? new Date() : null;

    const method = String((current as unknown as { paymentMethod?: string }).paymentMethod ?? "");
    const curPaymentStatus = String((current as unknown as { paymentStatus?: string }).paymentStatus ?? "");

    if (parsed.data.isPaid) {
      update.paymentStatus = "Paid";
    } else {
      if (curPaymentStatus === "Paid") {
        update.paymentStatus = method === "manual" ? "Pending" : "Unpaid";
      }
    }
  }

  if (parsed.data.paymentProofAction) {
    const method = String((current as unknown as { paymentMethod?: string }).paymentMethod ?? "");
    if (method !== "manual") {
      return NextResponse.json({ message: "Payment proof actions are only for manual payments" }, { status: 400 });
    }

    const hasReceipt = Boolean(String((current as unknown as { paymentReceiptUrl?: string }).paymentReceiptUrl ?? "").trim());

    if (parsed.data.paymentProofAction === "approve") {
      if (!hasReceipt) {
        return NextResponse.json({ message: "No payment receipt uploaded" }, { status: 400 });
      }

      update.paymentStatus = "Paid";
      update.isPaid = true;
      update.paidAt = new Date();
      update.paymentReceiptReviewedAt = new Date();
      update.paymentReceiptReviewedBy = admin.session?.user?.id ?? null;
      update.paymentReceiptRejectedReason = null;

      if (currentUserId && prevPaymentStatus !== "Paid") {
        await createUserMessage({
          userId: currentUserId,
          relatedOrderId: id,
          type: "payment_manual_approved",
          title: "Manual payment approved",
          body: `Your manual payment for order #${id.slice(-6)} has been approved.`,
        });
      }
    }

    if (parsed.data.paymentProofAction === "reject") {
      update.paymentStatus = "Rejected";
      update.isPaid = false;
      update.paidAt = null;
      update.paymentReceiptReviewedAt = new Date();
      update.paymentReceiptReviewedBy = admin.session?.user?.id ?? null;
      update.paymentReceiptRejectedReason = parsed.data.paymentRejectReason?.trim() || "";

      if (currentUserId && prevPaymentStatus !== "Rejected") {
        const reason = (parsed.data.paymentRejectReason ?? "").trim();
        await createUserMessage({
          userId: currentUserId,
          relatedOrderId: id,
          type: "payment_manual_rejected",
          title: "Manual payment rejected",
          body: `Your manual payment for order #${id.slice(-6)} was rejected.${reason ? ` Reason: ${reason}` : ""}`,
        });
      }
    }
  }

  const nextOrderStatus = String((parsed.data.orderStatus ?? prevOrderStatus) || "");
  if (currentUserId && prevOrderStatus !== "Shipped" && nextOrderStatus === "Shipped") {
    await createUserMessage({
      userId: currentUserId,
      relatedOrderId: id,
      type: "order_shipped",
      title: "Your order has been shipped",
      body: `Your order #${id.slice(-6)} has been shipped. You can track it from your order details when tracking becomes available.`,
    });
  }

  if (typeof parsed.data.trackingUrl === "string") {
    const nextTrackingUrl = parsed.data.trackingUrl.trim();
    if (currentUserId && nextTrackingUrl && nextTrackingUrl !== prevTrackingUrl) {
      await createUserMessage({
        userId: currentUserId,
        relatedOrderId: id,
        type: "tracking_added",
        title: "Tracking link added",
        body: `Tracking has been added for order #${id.slice(-6)}. Track here: ${nextTrackingUrl}`,
      });
    }
  }

  const order = await Order.findByIdAndUpdate(id, { $set: update }, { new: true })
    .select(
      "userId guestEmail items shippingAddress paymentMethod paymentStatus paymentReceiptUrl paymentReceiptUploadedAt paymentReceiptRejectedReason paymentReceiptReviewedAt paymentReceiptReviewedBy currency pkrPerUsd couponCode couponDiscountAmount promotionId promotionName promotionDiscountAmount discountAmount itemsSubtotal shippingAmount taxAmount totalAmount orderStatus shippingStatus trackingUrl trackingAddedAt isPaid paidAt isDelivered deliveredAt createdAt"
    )
    .populate("userId", "email name")
    .lean();

  if (!order) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const nextStatusFromDb = String((order as unknown as { orderStatus?: string }).orderStatus ?? "");
  if (prevOrderStatus !== nextStatusFromDb && (prevOrderStatus === "Delivered" || nextStatusFromDb === "Delivered")) {
    const items = Array.isArray((order as unknown as { items?: unknown[] }).items)
      ? ((order as unknown as { items?: unknown[] }).items as unknown[])
      : [];

    const productIds = Array.from(
      new Set(items.map((it) => String((it as unknown as { productId?: unknown }).productId ?? "")).filter((x) => /^[a-fA-F0-9]{24}$/.test(x)))
    );

    await Promise.all(productIds.map((pid) => recomputeProductSoldCount(pid)));
  }

  return NextResponse.json({ order });
}
