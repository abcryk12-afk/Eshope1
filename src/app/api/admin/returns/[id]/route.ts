import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { createUserMessage } from "@/lib/messages";
import { recomputeProductSoldCount } from "@/lib/sales";
import ReturnRequest from "@/models/ReturnRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

const BodySchema = z
  .object({
    action: z.enum(["approve", "reject", "complete", "refund"]),
  })
  .strict();

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!ADMIN_ROLE_SET.has(session.user.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = BodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  await dbConnect();

  const rr = await ReturnRequest.findById(id).select("status refundProcessedAt userId orderId productId");

  if (!rr) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const curStatus = String((rr as unknown as { status?: string }).status ?? "");
  const userId = (rr as unknown as { userId?: unknown }).userId ? String((rr as unknown as { userId?: unknown }).userId) : "";
  const orderId = (rr as unknown as { orderId?: unknown }).orderId ? String((rr as unknown as { orderId?: unknown }).orderId) : "";
  const productId = (rr as unknown as { productId?: unknown }).productId ? String((rr as unknown as { productId?: unknown }).productId) : "";

  if (parsed.data.action === "approve") {
    if (curStatus !== "requested") {
      return NextResponse.json({ message: "Only requested returns can be approved" }, { status: 400 });
    }
    rr.set("status", "approved");

    if (userId && orderId) {
      await createUserMessage({
        userId,
        relatedOrderId: orderId,
        type: "return_approved",
        title: "Return approved",
        body: `Your return request for order #${orderId.slice(-6)} has been approved.`,
      });
    }
  }

  if (parsed.data.action === "reject") {
    if (curStatus !== "requested") {
      return NextResponse.json({ message: "Only requested returns can be rejected" }, { status: 400 });
    }
    rr.set("status", "rejected");

    if (userId && orderId) {
      await createUserMessage({
        userId,
        relatedOrderId: orderId,
        type: "return_rejected",
        title: "Return rejected",
        body: `Your return request for order #${orderId.slice(-6)} has been rejected.`,
      });
    }
  }

  if (parsed.data.action === "complete") {
    if (curStatus !== "approved") {
      return NextResponse.json({ message: "Only approved returns can be completed" }, { status: 400 });
    }
    rr.set("status", "completed");
  }

  if (parsed.data.action === "refund") {
    if ((rr as unknown as { refundProcessedAt?: Date | null }).refundProcessedAt) {
      return NextResponse.json({ message: "Refund already processed" }, { status: 400 });
    }
    rr.set("refundProcessedAt", new Date());

    if (userId && orderId) {
      await createUserMessage({
        userId,
        relatedOrderId: orderId,
        type: "refund_processed",
        title: "Refund processed",
        body: `A refund has been processed for order #${orderId.slice(-6)}.`,
      });
    }
  }

  await rr.save();

  if (parsed.data.action === "complete" && productId) {
    await recomputeProductSoldCount(productId);
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
