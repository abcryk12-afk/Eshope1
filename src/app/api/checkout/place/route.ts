import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { buildDealLabel, computeDealPrice } from "@/lib/deals";
import { computeShippingAmount, normalizeStorefrontSettings } from "@/lib/shipping";
import Coupon from "@/models/Coupon";
import Deal from "@/models/Deal";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Promotion from "@/models/Promotion";
import SiteSetting from "@/models/SiteSetting";
import VisitorEvent from "@/models/VisitorEvent";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { sendMail } from "@/lib/mailer";
import { orderAdminNotifyEmailHtml } from "@/emails/order-admin-notify";
import User from "@/models/User";

export const runtime = "nodejs";

const BodySchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1),
      variantId: z.string().min(1),
      quantity: z.number().int().min(1).max(99),
    })
  ),
  guestEmail: z.string().trim().email().max(320).optional(),
  couponCode: z.string().trim().max(50).optional(),
  paymentMethod: z.enum(["cod", "manual", "online"]),
  currency: z.enum(["PKR", "USD"]).optional(),
  pkrPerUsd: z.number().positive().optional(),
  shippingAddress: z.object({
    fullName: z.string().trim().min(1).max(120),
    phone: z.string().trim().min(3).max(30),
    addressLine1: z.string().trim().min(3).max(200),
    addressLine2: z.string().trim().max(200).optional(),
    city: z.string().trim().min(1).max(80),
    state: z.string().trim().min(1).max(80),
    postalCode: z.string().trim().min(1).max(30),
    country: z.string().trim().min(1).max(80),
  }),
});

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isObjectId(v: string) {
  return /^[a-fA-F0-9]{24}$/.test(v);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readBool(v: unknown, fallback: boolean) {
  return typeof v === "boolean" ? v : fallback;
}

function normalizePayments(v: unknown) {
  const root = isRecord(v) ? v : {};
  const manual = isRecord(root.manual) ? root.manual : {};
  const online = isRecord(root.online) ? root.online : {};

  return {
    codEnabled: readBool(root.codEnabled, true),
    manualEnabled: readBool(manual.enabled, true),
    onlineEnabled: readBool(online.enabled, false),
  };
}

function readString(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function readVisitorSid(req: NextRequest) {
  const raw = req.cookies.get("visitor.sid")?.value ?? "";
  const v = raw.trim().slice(0, 80);
  if (!v) return "";
  return /^[A-Za-z0-9_-]+$/.test(v) ? v : "";
}

async function logPurchaseEvent(params: {
  req: NextRequest;
  userId?: string;
  orderId: string;
  currency: "PKR" | "USD";
  totalAmount: number;
}) {
  const sid = readVisitorSid(params.req);
  if (!sid) return;

  const userAgent = (params.req.headers.get("user-agent") ?? "").slice(0, 500);
  const fwd = params.req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim() || undefined;

  await VisitorEvent.create({
    sessionId: sid,
    userId: params.userId || undefined,
    ip,
    userAgent,
    url: "",
    path: "/checkout/place",
    eventType: "purchase",
    orderId: params.orderId,
    value: params.totalAmount,
    currency: params.currency,
  }).catch(() => null);
}

async function createStripeCheckoutSession(params: {
  secretKey: string;
  orderId: string;
  orderTotalAmountUsd: number;
  currency: "USD";
  successUrl: string;
  cancelUrl: string;
}) {
  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("client_reference_id", params.orderId);
  body.set("success_url", params.successUrl);
  body.set("cancel_url", params.cancelUrl);
  body.set("metadata[order_id]", params.orderId);

  body.set("line_items[0][price_data][currency]", params.currency.toLowerCase());
  body.set("line_items[0][price_data][product_data][name]", `Order ${params.orderId}`);
  body.set("line_items[0][price_data][unit_amount]", String(Math.round(params.orderTotalAmountUsd * 100)));
  body.set("line_items[0][quantity]", "1");

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const json = (await res.json().catch(() => null)) as unknown;
  if (!res.ok || !isRecord(json)) {
    const msg = isRecord(json) && typeof json.error === "object" && json.error !== null
      ? String((json.error as Record<string, unknown>).message ?? "")
      : "Stripe session create failed";
    throw new Error(msg || "Stripe session create failed");
  }

  const id = readString((json as Record<string, unknown>).id);
  const url = readString((json as Record<string, unknown>).url);
  if (!id || !url) throw new Error("Stripe session create failed");

  return { id, url };
}

type ComputedItem = {
  productId: string;
  variantId: string;
  variantSku?: string;
  variantSize?: string;
  variantColor?: string;
  title: string;
  slug: string;
  image: string;
  quantity: number;
  unitPrice: number;
  originalUnitPrice?: number;
  availableStock: number;
  isVariant: boolean;
  categoryId: string;
  deal?: { id: string; name: string; label: string; expiresAt: string | null };
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  const userId = session?.user?.id;

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = BodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const currency = parsed.data.currency ?? "PKR";
  const pkrPerUsd = currency === "USD" ? parsed.data.pkrPerUsd : undefined;

  if (currency === "USD" && (!pkrPerUsd || !Number.isFinite(pkrPerUsd) || pkrPerUsd <= 0)) {
    return NextResponse.json({ message: "Exchange rate is required" }, { status: 400 });
  }

  if (currency === "USD" && parsed.data.paymentMethod === "cod") {
    return NextResponse.json({ message: "Cash on delivery is not available for USD orders" }, { status: 400 });
  }

  await dbConnect();

  const settingsDoc = (await SiteSetting.findOne({ key: "global" })
    .select("payments inventory shipping storefrontLayout cartUx")
    .lean()) as unknown;
  const settingsRoot = isRecord(settingsDoc) ? settingsDoc : null;
  const payments = normalizePayments(settingsRoot?.payments);
  const storefrontSettings = normalizeStorefrontSettings(settingsDoc);

  if (parsed.data.paymentMethod === "cod" && !payments.codEnabled) {
    return NextResponse.json({ message: "Cash on delivery is not available" }, { status: 400 });
  }

  if (parsed.data.paymentMethod === "manual" && !payments.manualEnabled) {
    return NextResponse.json({ message: "Manual payment is not available" }, { status: 400 });
  }

  if (parsed.data.paymentMethod === "online" && !payments.onlineEnabled) {
    return NextResponse.json({ message: "Online payment is not available" }, { status: 400 });
  }

  const guestEmail = parsed.data.guestEmail?.trim().toLowerCase() || undefined;

  if (!userId && !guestEmail) {
    return NextResponse.json({ message: "Email is required" }, { status: 400 });
  }

  const itemsIn = parsed.data.items;

  if (itemsIn.length === 0) {
    return NextResponse.json({ message: "Cart is empty" }, { status: 400 });
  }

  const computed: ComputedItem[] = [];

  const now = new Date();

  const productIdsForDeals = Array.from(
    new Set(itemsIn.map((i) => i.productId).filter((id): id is string => Boolean(id && isObjectId(id))))
  );
  const activeDeals = productIdsForDeals.length
    ? await Deal.find({
        isActive: true,
        startsAt: { $lte: now },
        expiresAt: { $gt: now },
        productIds: { $in: productIdsForDeals },
      })
        .sort({ priority: -1, createdAt: -1 })
        .limit(500)
        .select("name type value priority expiresAt productIds")
        .lean()
    : [];

  const bestDealByProductId = new Map<string, unknown>();
  for (const d of activeDeals) {
    const ids = Array.isArray((d as unknown as { productIds?: unknown[] }).productIds)
      ? ((d as unknown as { productIds?: unknown[] }).productIds as unknown[])
      : [];
    for (const rawId of ids) {
      const pid = String(rawId);
      if (!pid) continue;
      if (!bestDealByProductId.has(pid)) bestDealByProductId.set(pid, d);
    }
  }

  for (const item of itemsIn) {
    const product = await Product.findById(item.productId)
      .select("title slug images basePrice stock variants isActive categoryId")
      .lean();

    if (!product || !product.isActive) {
      return NextResponse.json({ message: "Product not found" }, { status: 400 });
    }

    const variants: unknown[] = Array.isArray(product.variants)
      ? (product.variants as unknown[])
      : [];

    const variant = variants.find((v) => {
      if (typeof v !== "object" || v === null) return false;
      const rec = v as Record<string, unknown>;
      return String(rec._id ?? "") === item.variantId;
    });

    let unitPrice = Number(product.basePrice ?? 0);
    let availableStock = Number(product.stock ?? 0);
    const pImages = Array.isArray(product.images)
      ? (product.images as unknown[]).filter((v) => typeof v === "string" && v.trim())
      : [];
    let image = (pImages[0] as string | undefined) ?? "";

    if (variant && typeof variant === "object") {
      const rec = variant as Record<string, unknown>;
      unitPrice = Number(rec.price ?? unitPrice);
      availableStock = Number(rec.stock ?? 0);
      const vImages = Array.isArray(rec.images)
        ? (rec.images as unknown[]).filter((v) => typeof v === "string" && v.trim())
        : [];
      image = (vImages[0] as string | undefined) || image;
    }

    const variantSku =
      variant && typeof variant === "object" ? String((variant as Record<string, unknown>).sku ?? "").trim() : "";
    const variantSize =
      variant && typeof variant === "object" ? String((variant as Record<string, unknown>).size ?? "").trim() : "";
    const variantColor =
      variant && typeof variant === "object" ? String((variant as Record<string, unknown>).color ?? "").trim() : "";

    const originalUnitPrice = unitPrice;

    const dealDoc = bestDealByProductId.get(String(product._id)) as
      | {
          _id: unknown;
          name?: string;
          type?: "percent" | "fixed";
          value?: number;
          expiresAt?: string | Date;
        }
      | undefined;

    const dealType = dealDoc?.type === "fixed" ? "fixed" : dealDoc?.type === "percent" ? "percent" : null;

    const deal =
      dealType && dealDoc?.value != null
        ? {
            id: String(dealDoc._id),
            name: String(dealDoc.name ?? ""),
            label: buildDealLabel({ type: dealType, value: Number(dealDoc.value) }),
            expiresAt: dealDoc.expiresAt ? new Date(dealDoc.expiresAt).toISOString() : null,
          }
        : undefined;

    if (deal && dealType) {
      unitPrice = computeDealPrice({ original: originalUnitPrice, type: dealType, value: Number(dealDoc?.value ?? 0) });
    }

    image = image || "/next.svg";

    if (availableStock < item.quantity) {
      return NextResponse.json({ message: "Insufficient stock" }, { status: 400 });
    }

    computed.push({
      productId: String(product._id),
      variantId: item.variantId,
      variantSku: variantSku || undefined,
      variantSize: variantSize || undefined,
      variantColor: variantColor || undefined,
      title: String(product.title ?? "Item"),
      slug: String(product.slug ?? ""),
      image,
      quantity: item.quantity,
      unitPrice,
      originalUnitPrice: deal ? originalUnitPrice : undefined,
      availableStock,
      isVariant: Boolean(variant),
      categoryId: String((product as unknown as { categoryId?: unknown }).categoryId ?? ""),
      deal,
    });
  }

  const itemsSubtotal = round2(
    computed.reduce((acc, i) => acc + round2(i.unitPrice * i.quantity), 0)
  );

  let couponDiscountAmount = 0;
  let couponAppliedType: "percent" | "fixed" | null = null;
  let couponCode: string | undefined = undefined;

  let promotionDiscountAmount = 0;
  let promotionId: string | undefined = undefined;
  let promotionName: string | undefined = undefined;

  const couponCodeRaw = parsed.data.couponCode?.trim() ?? "";

  if (couponCodeRaw) {
    const code = couponCodeRaw.toUpperCase();

    const couponDoc = await Coupon.findOne({ code: new RegExp(`^${escapeRegex(code)}$`, "i") })
      .select(
        "code type value minOrderAmount maxDiscountAmount startsAt expiresAt usageLimit usageLimitPerCustomer usedCount appliesTo categoryIds productIds isActive"
      )
      .lean();

    if (!couponDoc || !couponDoc.isActive) {
      return NextResponse.json({ message: "Invalid coupon" }, { status: 400 });
    }

    if (couponDoc.startsAt && new Date(couponDoc.startsAt).getTime() > Date.now()) {
      return NextResponse.json({ message: "Coupon is not active yet" }, { status: 400 });
    }

    if (couponDoc.expiresAt && new Date(couponDoc.expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ message: "Coupon expired" }, { status: 400 });
    }

    if (
      typeof couponDoc.usageLimit === "number" &&
      typeof couponDoc.usedCount === "number" &&
      couponDoc.usedCount >= couponDoc.usageLimit
    ) {
      return NextResponse.json({ message: "Coupon usage limit reached" }, { status: 400 });
    }

    if (typeof couponDoc.usageLimitPerCustomer === "number" && couponDoc.usageLimitPerCustomer > 0) {
      const customerEmail = userId ? undefined : guestEmail;
      if (!userId && !customerEmail) {
        return NextResponse.json({ message: "Email is required" }, { status: 400 });
      }

      const customerFilter = userId ? { userId } : { guestEmail: customerEmail };
      const usedByCustomer = await Order.countDocuments({
        couponCode: String(couponDoc.code ?? code),
        ...customerFilter,
        orderStatus: { $ne: "Cancelled" },
      });

      if (usedByCustomer >= couponDoc.usageLimitPerCustomer) {
        return NextResponse.json({ message: "Coupon usage limit reached" }, { status: 400 });
      }
    }

    if (typeof couponDoc.minOrderAmount === "number" && itemsSubtotal < couponDoc.minOrderAmount) {
      return NextResponse.json({ message: "Min order not reached" }, { status: 400 });
    }

    const appliesTo =
      couponDoc.appliesTo === "categories" ? "categories" : couponDoc.appliesTo === "products" ? "products" : "all";
    const categorySet = new Set(
      Array.isArray(couponDoc.categoryIds) ? (couponDoc.categoryIds as unknown[]).map((id) => String(id)) : []
    );
    const productSet = new Set(
      Array.isArray(couponDoc.productIds) ? (couponDoc.productIds as unknown[]).map((id) => String(id)) : []
    );

    const eligibleSubtotal = round2(
      computed.reduce((acc, i) => {
        const lineTotal = round2(i.unitPrice * i.quantity);
        const eligible =
          appliesTo === "all" ||
          (appliesTo === "categories" && categorySet.has(i.categoryId)) ||
          (appliesTo === "products" && productSet.has(i.productId));
        return acc + (eligible ? lineTotal : 0);
      }, 0)
    );

    if (eligibleSubtotal <= 0) {
      return NextResponse.json({ message: "Coupon is not applicable to your cart" }, { status: 400 });
    }

    if (couponDoc.type === "percent") {
      couponDiscountAmount = round2((eligibleSubtotal * Number(couponDoc.value ?? 0)) / 100);
    } else {
      couponDiscountAmount = round2(Number(couponDoc.value ?? 0));
    }

    if (typeof couponDoc.maxDiscountAmount === "number") {
      couponDiscountAmount = Math.min(couponDiscountAmount, couponDoc.maxDiscountAmount);
    }

    couponDiscountAmount = Math.min(couponDiscountAmount, eligibleSubtotal);
    couponCode = String(couponDoc.code ?? code);
    couponAppliedType = couponDoc.type === "fixed" ? "fixed" : "percent";
  }

  const couponBlocksPromotions = Boolean(couponCode && couponAppliedType === "fixed");

  if (!couponBlocksPromotions && itemsSubtotal > 0) {
    const now = new Date();

    const promos = await Promotion.find({
      isActive: true,
      minOrderAmount: { $lte: itemsSubtotal },
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
      ],
    })
      .sort({ priority: -1, createdAt: -1 })
      .limit(50)
      .select(
        "name type value minOrderAmount maxDiscountAmount priority startsAt expiresAt appliesTo categoryIds productIds isActive"
      )
      .lean();

    for (const promoDoc of promos) {
      const appliesTo =
        promoDoc.appliesTo === "categories" ? "categories" : promoDoc.appliesTo === "products" ? "products" : "all";
      const categorySet = new Set(
        Array.isArray(promoDoc.categoryIds) ? (promoDoc.categoryIds as unknown[]).map((id) => String(id)) : []
      );
      const productSet = new Set(
        Array.isArray(promoDoc.productIds) ? (promoDoc.productIds as unknown[]).map((id) => String(id)) : []
      );

      const eligibleSubtotal = round2(
        computed.reduce((acc, i) => {
          const lineTotal = round2(i.unitPrice * i.quantity);
          const eligible =
            appliesTo === "all" ||
            (appliesTo === "categories" && categorySet.has(i.categoryId)) ||
            (appliesTo === "products" && productSet.has(i.productId));
          return acc + (eligible ? lineTotal : 0);
        }, 0)
      );

      if (eligibleSubtotal <= 0) continue;

      let promoDiscount = 0;
      if (promoDoc.type === "percent") {
        promoDiscount = round2((eligibleSubtotal * Number(promoDoc.value ?? 0)) / 100);
      } else {
        promoDiscount = round2(Number(promoDoc.value ?? 0));
      }

      if (typeof promoDoc.maxDiscountAmount === "number") {
        promoDiscount = Math.min(promoDiscount, promoDoc.maxDiscountAmount);
      }

      promoDiscount = Math.min(promoDiscount, eligibleSubtotal);

      const remainingPayable = round2(Math.max(0, itemsSubtotal - couponDiscountAmount));
      promoDiscount = Math.min(promoDiscount, remainingPayable);

      if (promoDiscount <= 0) continue;

      promotionDiscountAmount = promoDiscount;
      promotionId = String(promoDoc._id);
      promotionName = String(promoDoc.name ?? "");
      break;
    }
  }

  const shippingCity = String(parsed.data.shippingAddress?.city ?? "");
  const discountAmount = round2(couponDiscountAmount + promotionDiscountAmount);
  const shippingSubtotal = round2(Math.max(0, itemsSubtotal - couponDiscountAmount));

  const shipping = computeShippingAmount({
    itemsSubtotal,
    discountedSubtotal: shippingSubtotal,
    city: shippingCity,
    shipping: storefrontSettings.shipping,
  });

  const shippingAmount = round2(Math.max(0, shipping.amount));
  const taxAmount = 0;
  const totalAmount = round2(itemsSubtotal - discountAmount + shippingAmount + taxAmount);

  const decremented: Array<{
    productId: string;
    variantId: string;
    quantity: number;
    isVariant: boolean;
  }> = [];

  async function rollbackStock() {
    for (const d of decremented) {
      if (d.isVariant) {
        await Product.updateOne(
          { _id: d.productId, "variants._id": d.variantId },
          { $inc: { "variants.$.stock": d.quantity } }
        );
      } else {
        await Product.updateOne({ _id: d.productId }, { $inc: { stock: d.quantity } });
      }
    }
  }

  for (const i of computed) {
    if (i.isVariant) {
      const res = await Product.updateOne(
        {
          _id: i.productId,
          "variants._id": i.variantId,
          "variants.stock": { $gte: i.quantity },
        },
        { $inc: { "variants.$.stock": -i.quantity } }
      );

      const matched = (res as unknown as { matchedCount?: number }).matchedCount ?? 0;
      if (matched !== 1) {
        await rollbackStock();
        return NextResponse.json({ message: "Insufficient stock" }, { status: 400 });
      }

      decremented.push({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
        isVariant: true,
      });
      continue;
    }

    const res = await Product.updateOne(
      { _id: i.productId, stock: { $gte: i.quantity } },
      { $inc: { stock: -i.quantity } }
    );

    const matched = (res as unknown as { matchedCount?: number }).matchedCount ?? 0;
    if (matched !== 1) {
      await rollbackStock();
      return NextResponse.json({ message: "Insufficient stock" }, { status: 400 });
    }

    decremented.push({
      productId: i.productId,
      variantId: i.variantId,
      quantity: i.quantity,
      isVariant: false,
    });
  }

  let order;
  try {
    const paymentStatus =
      parsed.data.paymentMethod === "manual" ? "Pending" : parsed.data.paymentMethod === "online" ? "Pending" : "Unpaid";

    const onlineKind = (() => {
      const p = settingsRoot?.payments;
      if (!p || typeof p !== "object") return "";
      const online = (p as Record<string, unknown>).online;
      if (!online || typeof online !== "object") return "";

      const rec = online as Record<string, unknown>;
      const activeKind = String(rec.activeKind ?? "").trim().toLowerCase();
      const legacyKind = String(rec.kind ?? rec.provider ?? "").trim().toLowerCase();
      const kind = (activeKind || legacyKind).trim();

      const providers = rec.providers;
      if (kind && providers && typeof providers === "object") {
        const cfg = (providers as Record<string, unknown>)[kind];
        if (cfg && typeof cfg === "object") {
          const enabled = (cfg as Record<string, unknown>).enabled;
          if (typeof enabled === "boolean" && !enabled) return "";
        }
      }

      return kind;
    })();
    const payload: Record<string, unknown> = {
      items: computed.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        variantSku: i.variantSku,
        variantSize: i.variantSize,
        variantColor: i.variantColor,
        title: i.title,
        slug: i.slug,
        image: i.image,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      shippingAddress: parsed.data.shippingAddress,
      paymentMethod: parsed.data.paymentMethod,
      paymentProvider: parsed.data.paymentMethod === "online" ? (onlineKind || "online") : null,
      paymentProviderRef: null,
      paymentProviderMeta: null,
      currency,
      pkrPerUsd,
      paymentStatus,
      couponCode,
      couponDiscountAmount,
      promotionId: promotionId ?? null,
      promotionName: promotionName ?? null,
      promotionDiscountAmount,
      discountAmount,
      itemsSubtotal,
      shippingAmount,
      taxAmount,
      totalAmount,
      isPaid: false,
      paymentReceiptUrl: null,
      paymentReceiptUploadedAt: null,
      paymentReceiptRejectedReason: null,
      paymentReceiptReviewedAt: null,
      paymentReceiptReviewedBy: null,
    };

    if (userId) payload.userId = userId;
    if (!userId && guestEmail) payload.guestEmail = guestEmail;

    order = await Order.create(payload);
  } catch (err: unknown) {
    console.error("[checkout/place] Order.create failed", err);
    await rollbackStock();

    const message =
      process.env.NODE_ENV !== "production" && err instanceof Error
        ? err.message
        : "Could not create order";

    return NextResponse.json({ message }, { status: 500 });
  }

  const onlineCfg = (() => {
    const p = settingsRoot?.payments;
    if (!p || typeof p !== "object") return null;
    const online = (p as Record<string, unknown>).online;
    if (!online || typeof online !== "object") return null;
    return online as Record<string, unknown>;
  })();

  const onlineProviders = onlineCfg && typeof onlineCfg.providers === "object" && onlineCfg.providers !== null
    ? (onlineCfg.providers as Record<string, unknown>)
    : {};
  const activeKind = readString(onlineCfg?.activeKind).toLowerCase();
  const legacyKind = readString(onlineCfg?.kind ?? onlineCfg?.provider).toLowerCase();
  const onlineKind = (activeKind || legacyKind).trim();
  const providerCfg = onlineKind && typeof onlineProviders[onlineKind] === "object" && onlineProviders[onlineKind] !== null
    ? (onlineProviders[onlineKind] as Record<string, unknown>)
    : null;
  const onlineSecretKey = providerCfg ? readString(providerCfg.secretKey) : readString(onlineCfg?.secretKey);

  if (parsed.data.paymentMethod === "online" && onlineKind === "stripe") {
    if (currency !== "USD") {
      return NextResponse.json({ message: "Stripe payments are only available for USD orders" }, { status: 400 });
    }

    if (!onlineSecretKey) {
      return NextResponse.json({ message: "Stripe secret key is not configured" }, { status: 400 });
    }

    try {
      const origin = new URL(req.url).origin;
      const orderId = order._id.toString();
      const emailQuery = guestEmail ? `?email=${encodeURIComponent(guestEmail)}` : "";
      const successUrl = `${origin}/order/${encodeURIComponent(orderId)}${emailQuery}`;
      const cancelUrl = `${origin}/checkout`;

      const rate = typeof pkrPerUsd === "number" && Number.isFinite(pkrPerUsd) && pkrPerUsd > 0 ? pkrPerUsd : 0;
      if (!rate) {
        return NextResponse.json({ message: "Exchange rate is required" }, { status: 400 });
      }

      const totalUsd = Math.max(0, totalAmount / rate);

      const session = await createStripeCheckoutSession({
        secretKey: onlineSecretKey,
        orderId,
        orderTotalAmountUsd: totalUsd,
        currency: "USD",
        successUrl,
        cancelUrl,
      });

      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            paymentProvider: "stripe",
            paymentProviderRef: session.id,
            paymentProviderMeta: { checkoutUrl: session.url },
          },
        }
      );

      return NextResponse.json({ orderId, checkoutUrl: session.url });
    } catch (err: unknown) {
      console.error("[checkout/place] stripe checkout session failed", err);
      return NextResponse.json({ message: "Could not start Stripe checkout" }, { status: 500 });
    }
  }

  await logPurchaseEvent({
    req,
    userId: userId ? String(userId) : undefined,
    orderId: order._id.toString(),
    currency,
    totalAmount,
  });

  if (couponCode) {
    await Coupon.updateOne({ code: couponCode }, { $inc: { usedCount: 1 } });
  }

  try {
    const brandName = (process.env.BRAND_NAME ?? process.env.SMTP_FROM_NAME ?? "").trim();
    const accentColor = (process.env.EMAIL_BRAND_ACCENT_COLOR ?? "#2563eb").trim();
    const supportEmail = (process.env.SUPPORT_EMAIL ?? process.env.SMTP_FROM_EMAIL ?? "").trim();
    const adminEmail = (process.env.ADMIN_ORDER_NOTIFY_EMAIL ?? process.env.SMTP_FROM_EMAIL ?? "").trim();

    const missing: string[] = [];
    if (!brandName) missing.push("BRAND_NAME/SMTP_FROM_NAME");
    if (!supportEmail) missing.push("SUPPORT_EMAIL/SMTP_FROM_EMAIL");
    if (!adminEmail) missing.push("ADMIN_ORDER_NOTIFY_EMAIL/SMTP_FROM_EMAIL");

    const smtpMissing: string[] = [];
    if (!(process.env.SMTP_HOST ?? "").trim()) smtpMissing.push("SMTP_HOST");
    if (!(process.env.SMTP_PORT ?? "").trim()) smtpMissing.push("SMTP_PORT");
    if (!(process.env.SMTP_USER ?? "").trim()) smtpMissing.push("SMTP_USER");
    if (!(process.env.SMTP_PASS ?? "").trim()) smtpMissing.push("SMTP_PASS");
    if (!(process.env.SMTP_FROM_EMAIL ?? "").trim()) smtpMissing.push("SMTP_FROM_EMAIL");
    if (!(process.env.SMTP_FROM_NAME ?? "").trim()) smtpMissing.push("SMTP_FROM_NAME");

    if (missing.length > 0 || smtpMissing.length > 0) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[email] order emails skipped due to missing config", {
          missing,
          smtpMissing,
        });
      }
    } else {
      let customerEmail = guestEmail ?? "";

      if (!customerEmail && userId) {
        const user = await User.findById(userId).select("email").lean();
        customerEmail = String((user as unknown as { email?: unknown })?.email ?? "").trim().toLowerCase();
      }

      const customerName = String(parsed.data.shippingAddress.fullName ?? "Customer").trim() || "Customer";
      const orderId = order._id.toString();

      const itemsForEmail = computed.map((i) => ({
        title: i.title,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      }));

      if (customerEmail) {
        try {
          await sendOrderConfirmationEmail({
            toEmail: customerEmail,
            customer: {
              fullName: String(parsed.data.shippingAddress.fullName ?? "").trim(),
              email: customerEmail,
              phone: String(parsed.data.shippingAddress.phone ?? "").trim(),
            },
            order: {
              id: orderId,
              createdAt: (order as unknown as { createdAt?: Date })?.createdAt,
              paymentMethod: String(parsed.data.paymentMethod ?? "").trim(),
              orderStatus: String((order as unknown as { orderStatus?: unknown })?.orderStatus ?? "").trim(),
              trackingUrl: String((order as unknown as { trackingUrl?: unknown })?.trackingUrl ?? "").trim() || null,
              shippingAddress: {
                fullName: String(parsed.data.shippingAddress.fullName ?? "").trim(),
                phone: String(parsed.data.shippingAddress.phone ?? "").trim(),
                addressLine1: String(parsed.data.shippingAddress.addressLine1 ?? "").trim(),
                addressLine2: String(parsed.data.shippingAddress.addressLine2 ?? "").trim(),
                city: String(parsed.data.shippingAddress.city ?? "").trim(),
                state: String(parsed.data.shippingAddress.state ?? "").trim(),
                country: String(parsed.data.shippingAddress.country ?? "").trim(),
                postalCode: String(parsed.data.shippingAddress.postalCode ?? "").trim(),
              },
              items: itemsForEmail,
              currency,
              itemsSubtotal,
              shippingAmount,
              discountAmount,
              taxAmount,
              totalAmount,
            },
          });
        } catch (err: unknown) {
          console.warn("[email] customer order confirmation failed", err);
        }
      }

      const adminHtml = orderAdminNotifyEmailHtml({
        brandName,
        accentColor,
        orderId,
        customerName,
        totalAmount,
        currency,
      });

      try {
        await sendMail({
          to: adminEmail,
          subject: `New order received – ${brandName}`,
          html: adminHtml,
          replyTo: supportEmail,
        });
      } catch (err: unknown) {
        console.warn("[email] admin order notification failed", err);
      }
    }
  } catch (err: unknown) {
    console.warn("[email] order emails failed", err);
  }

  return NextResponse.json({ orderId: order._id.toString() });
}
