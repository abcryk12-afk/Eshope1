import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";

import { dbConnect } from "@/lib/db";
import SiteSetting from "@/models/SiteSetting";
import PaymentEventLog from "@/models/PaymentEventLog";
import Order from "@/models/Order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readString(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function verifyStripeSignature(params: { rawBody: string; stripeSignature: string; secret: string }) {
  const header = params.stripeSignature;
  const parts = header.split(",").map((p) => p.trim());
  const tPart = parts.find((p) => p.startsWith("t=")) ?? "";
  const v1Parts = parts.filter((p) => p.startsWith("v1="));

  const timestamp = tPart.startsWith("t=") ? tPart.slice(2) : "";
  if (!timestamp) return false;

  const signedPayload = `${timestamp}.${params.rawBody}`;
  const digest = crypto.createHmac("sha256", params.secret).update(signedPayload, "utf8").digest("hex");

  for (const p of v1Parts) {
    const sig = p.slice(3);
    if (!sig) continue;
    if (sig.length !== digest.length) continue;
    if (crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(digest))) return true;
  }

  return false;
}

function getHeader(req: NextRequest, name: string) {
  return req.headers.get(name) ?? req.headers.get(name.toLowerCase()) ?? "";
}

export async function POST(req: NextRequest) {
  await dbConnect();

  const settingsDoc = (await SiteSetting.findOne({ key: "global" }).select("payments").lean()) as unknown;
  const settingsRoot = isRecord(settingsDoc) ? (settingsDoc as Record<string, unknown>) : {};
  const payments = isRecord(settingsRoot.payments) ? (settingsRoot.payments as Record<string, unknown>) : {};
  const online = isRecord(payments.online) ? (payments.online as Record<string, unknown>) : {};

  const enabled = typeof online.enabled === "boolean" ? online.enabled : false;

  const providers = isRecord(online.providers) ? (online.providers as Record<string, unknown>) : {};
  const activeKind = readString(online.activeKind).toLowerCase();

  const kindFromHeader = readString(getHeader(req, "x-payment-kind")).toLowerCase();
  const legacyKind = (readString(online.kind) || readString(online.provider)).toLowerCase();
  const effectiveKind = (kindFromHeader || activeKind || legacyKind || "online").trim().toLowerCase();

  const providerCfg = isRecord(providers[effectiveKind]) ? (providers[effectiveKind] as Record<string, unknown>) : null;
  const providerEnabled = providerCfg ? (typeof providerCfg.enabled === "boolean" ? providerCfg.enabled : false) : null;
  const secret = providerCfg ? readString(providerCfg.webhookSecret) : readString(online.webhookSecret);

  if (!enabled) {
    return NextResponse.json({ message: "Online payments are disabled" }, { status: 403 });
  }

  if (providerEnabled === false) {
    return NextResponse.json({ message: "Payment provider is disabled" }, { status: 403 });
  }

  if (!secret) {
    return NextResponse.json({ message: "Webhook secret is not configured" }, { status: 400 });
  }

  const raw = await req.text();

  const signatureOk =
    effectiveKind === "stripe"
      ? verifyStripeSignature({ rawBody: raw, stripeSignature: readString(getHeader(req, "stripe-signature")), secret })
      : (() => {
          const sig = readString(getHeader(req, "x-webhook-signature"));
          const digest = crypto.createHmac("sha256", secret).update(raw, "utf8").digest("hex");
          return Boolean(sig) && sig.length === digest.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(digest));
        })();

  const parsed = safeJsonParse(raw);
  const bodyRec = isRecord(parsed) ? (parsed as Record<string, unknown>) : {};

  const event = readString(bodyRec.event) || readString(bodyRec.type) || "webhook";
  const providerRef = readString(bodyRec.ref) || readString(bodyRec.reference) || readString(bodyRec.id);

  const orderIdRaw = readString(bodyRec.orderId) || readString(bodyRec.order_id);
  const orderId = /^[a-fA-F0-9]{24}$/.test(orderIdRaw) ? orderIdRaw : "";

  const headersObj = Object.fromEntries(req.headers.entries());

  await PaymentEventLog.create({
    kind: effectiveKind,
    event,
    signatureOk,
    providerRef: providerRef || undefined,
    orderId: orderId || undefined,
    headers: headersObj,
    bodyRaw: raw,
    body: parsed,
  });

  if (!signatureOk) {
    return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
  }

  if (effectiveKind === "stripe") {
    try {
      const data = isRecord(bodyRec.data) ? (bodyRec.data as Record<string, unknown>) : null;
      const obj = data && isRecord(data.object) ? (data.object as Record<string, unknown>) : null;

      const eventType = readString(bodyRec.type) || event;
      const stripeObjId = readString(obj?.id);

      const orderIdFromRef = readString(obj?.client_reference_id);
      const metadata = obj && isRecord(obj.metadata) ? (obj.metadata as Record<string, unknown>) : null;
      const orderIdFromMeta = readString(metadata?.order_id);
      const orderIdEffective = orderIdFromRef || orderIdFromMeta || orderId;

      const isSuccess =
        eventType === "checkout.session.completed" ||
        eventType === "payment_intent.succeeded" ||
        eventType === "charge.succeeded";

      if (isSuccess && /^[a-fA-F0-9]{24}$/.test(orderIdEffective)) {
        await Order.updateOne(
          { _id: orderIdEffective, isPaid: { $ne: true } },
          {
            $set: {
              paymentStatus: "Paid",
              isPaid: true,
              paidAt: new Date(),
              paymentProvider: "stripe",
              paymentProviderRef: stripeObjId || providerRef || undefined,
            },
          }
        );
      }
    } catch (err: unknown) {
      console.warn("[payments/webhook] stripe handler failed", err);
    }
  }

  if (effectiveKind === "jazzcash" || effectiveKind === "easypaisa") {
    try {
      const status = readString(bodyRec.status) || readString(bodyRec.paymentStatus) || readString(bodyRec.payment_status);
      const statusLc = status.toLowerCase();

      const eventType = readString(bodyRec.type) || readString(bodyRec.event) || "";
      const eventLc = eventType.toLowerCase();

      const looksSuccessful =
        statusLc === "paid" ||
        statusLc === "success" ||
        statusLc === "succeeded" ||
        statusLc === "completed" ||
        eventLc === "payment.paid" ||
        eventLc === "payment.success" ||
        eventLc === "payment.succeeded";

      if (looksSuccessful && orderId && /^[a-fA-F0-9]{24}$/.test(orderId)) {
        await Order.updateOne(
          { _id: orderId, isPaid: { $ne: true } },
          {
            $set: {
              paymentStatus: "Paid",
              isPaid: true,
              paidAt: new Date(),
              paymentProvider: effectiveKind,
              paymentProviderRef: providerRef || undefined,
            },
          }
        );
      }
    } catch (err: unknown) {
      console.warn("[payments/webhook] provider handler failed", err);
    }
  }

  return NextResponse.json({ ok: true });
}
