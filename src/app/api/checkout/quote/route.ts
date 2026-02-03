import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { buildDealLabel, computeDealPrice } from "@/lib/deals";
import { computeDeliveryEta, computeShippingAmount, normalizeStorefrontSettings } from "@/lib/shipping";
import Coupon from "@/models/Coupon";
import Deal from "@/models/Deal";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Promotion from "@/models/Promotion";
import SiteSetting from "@/models/SiteSetting";

export const runtime = "nodejs";

const BodySchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().min(1),
        quantity: z.number().int().min(1).max(99),
      })
    )
    .default([]),
  couponCode: z.string().trim().max(50).optional(),
  guestEmail: z.string().trim().email().max(320).optional(),
  shippingAddress: z
    .object({
      city: z.string().trim().max(80).optional(),
      state: z.string().trim().max(80).optional(),
      country: z.string().trim().max(80).optional(),
    })
    .optional(),
});

type QuoteLine = {
  productId: string;
  variantId: string;
  title: string;
  slug: string;
  image: string;
  quantity: number;
  unitPrice: number;
  originalUnitPrice?: number;
  lineTotal: number;
  availableStock: number;
  isAvailable: boolean;
  message?: string;
  deal?: { id: string; name: string; label: string; expiresAt: string | null };
};

type QuoteResponse = {
  items: QuoteLine[];
  itemsSubtotal: number;
  discountAmount: number;
  couponDiscountAmount?: number;
  promotionDiscountAmount?: number;
  shippingAmount: number;
  shippingFreeAboveSubtotal?: number | null;
  shippingRemainingForFree?: number | null;
  shippingIsFree?: boolean;
  taxAmount: number;
  totalAmount: number;
  deliveryEta?: { minDays: number; maxDays: number; text: string };
  coupon?: { code: string; ok: boolean; message?: string };
  promotion?: { id: string; name: string };
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isObjectId(v: string) {
  return /^[a-fA-F0-9]{24}$/.test(v);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = BodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  await dbConnect();

  const itemsIn = parsed.data.items;
  const couponCodeRaw = parsed.data.couponCode?.trim() ?? "";
  const guestEmail = parsed.data.guestEmail?.trim().toLowerCase() || undefined;
  const shippingCity = String(parsed.data.shippingAddress?.city ?? "");

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

  const lines: QuoteLine[] = [];
  const lineMeta: Array<{ productId: string; categoryId: string; lineTotal: number }> = [];

  for (const item of itemsIn) {
    const product = await Product.findById(item.productId)
      .select("title slug images basePrice stock variants isActive categoryId")
      .lean();

    if (!product || !product.isActive) {
      lines.push({
        productId: item.productId,
        variantId: item.variantId,
        title: "Item",
        slug: "",
        image: "",
        quantity: item.quantity,
        unitPrice: 0,
        lineTotal: 0,
        availableStock: 0,
        isAvailable: false,
        message: "Product not found",
      });
      continue;
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
    let image = Array.isArray(product.images) ? (product.images[0] as string) : "";

    if (variant && typeof variant === "object") {
      const rec = variant as Record<string, unknown>;
      unitPrice = Number(rec.price ?? unitPrice);
      availableStock = Number(rec.stock ?? 0);
      const vImages = Array.isArray(rec.images) ? (rec.images as unknown[]) : [];
      image = (vImages[0] as string) || image;
    }

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

    const ok = availableStock >= item.quantity;

    lines.push({
      productId: String(product._id),
      variantId: item.variantId,
      title: String(product.title ?? "Item"),
      slug: String(product.slug ?? ""),
      image,
      quantity: item.quantity,
      unitPrice,
      originalUnitPrice: deal ? originalUnitPrice : undefined,
      lineTotal: round2(unitPrice * item.quantity),
      availableStock,
      isAvailable: ok,
      message: ok ? undefined : "Insufficient stock",
      deal,
    });

    lineMeta.push({
      productId: String(product._id),
      categoryId: String((product as unknown as { categoryId?: unknown }).categoryId ?? ""),
      lineTotal: round2(unitPrice * item.quantity),
    });
  }

  const itemsSubtotal = round2(lines.reduce((acc, l) => acc + l.lineTotal, 0));

  let couponDiscountAmount = 0;
  let coupon: QuoteResponse["coupon"] = undefined;
  let couponAppliedType: "percent" | "fixed" | null = null;

  if (couponCodeRaw) {
    const code = couponCodeRaw.toUpperCase();

    const couponDoc = await Coupon.findOne({ code: new RegExp(`^${escapeRegex(code)}$`, "i") })
      .select(
        "code type value minOrderAmount maxDiscountAmount startsAt expiresAt usageLimit usageLimitPerCustomer usedCount appliesTo categoryIds productIds isActive"
      )
      .lean();

    if (!couponDoc || !couponDoc.isActive) {
      coupon = { code, ok: false, message: "Invalid coupon" };
    } else if (couponDoc.startsAt && new Date(couponDoc.startsAt).getTime() > Date.now()) {
      coupon = { code, ok: false, message: "Coupon is not active yet" };
    } else if (couponDoc.expiresAt && new Date(couponDoc.expiresAt).getTime() < Date.now()) {
      coupon = { code, ok: false, message: "Coupon expired" };
    } else if (
      typeof couponDoc.usageLimit === "number" &&
      typeof couponDoc.usedCount === "number" &&
      couponDoc.usedCount >= couponDoc.usageLimit
    ) {
      coupon = { code, ok: false, message: "Coupon usage limit reached" };
    } else if (typeof couponDoc.usageLimitPerCustomer === "number" && couponDoc.usageLimitPerCustomer > 0) {
      const customerEmail = userId ? undefined : guestEmail;
      if (!userId && !customerEmail) {
        coupon = { code, ok: false, message: "Enter email to apply this coupon" };
      } else {
        const customerFilter = userId ? { userId } : { guestEmail: customerEmail };
        const usedByCustomer = await Order.countDocuments({
          couponCode: String(couponDoc.code ?? code),
          ...customerFilter,
          orderStatus: { $ne: "Cancelled" },
        });

        if (usedByCustomer >= couponDoc.usageLimitPerCustomer) {
          coupon = { code, ok: false, message: "Coupon usage limit reached" };
        }
      }
    } else if (typeof couponDoc.minOrderAmount === "number" && itemsSubtotal < couponDoc.minOrderAmount) {
      coupon = { code, ok: false, message: `Min order $${Number(couponDoc.minOrderAmount).toFixed(2)}` };
    } else {
      const appliesTo =
        couponDoc.appliesTo === "categories" ? "categories" : couponDoc.appliesTo === "products" ? "products" : "all";
      const categorySet = new Set(
        Array.isArray(couponDoc.categoryIds) ? (couponDoc.categoryIds as unknown[]).map((id) => String(id)) : []
      );
      const productSet = new Set(
        Array.isArray(couponDoc.productIds) ? (couponDoc.productIds as unknown[]).map((id) => String(id)) : []
      );

      const eligibleSubtotal = round2(
        lineMeta.reduce((acc, m) => {
          const eligible =
            appliesTo === "all" ||
            (appliesTo === "categories" && categorySet.has(m.categoryId)) ||
            (appliesTo === "products" && productSet.has(m.productId));
          return acc + (eligible ? m.lineTotal : 0);
        }, 0)
      );

      if (eligibleSubtotal <= 0) {
        coupon = { code, ok: false, message: "Coupon is not applicable to your cart" };
      } else {
        if (couponDoc.type === "percent") {
          couponDiscountAmount = round2((eligibleSubtotal * Number(couponDoc.value ?? 0)) / 100);
        } else {
          couponDiscountAmount = round2(Number(couponDoc.value ?? 0));
        }

        if (typeof couponDoc.maxDiscountAmount === "number") {
          couponDiscountAmount = Math.min(couponDiscountAmount, couponDoc.maxDiscountAmount);
        }

        couponDiscountAmount = Math.min(couponDiscountAmount, eligibleSubtotal);
        couponAppliedType = couponDoc.type === "fixed" ? "fixed" : "percent";
        coupon = { code: String(couponDoc.code ?? code), ok: true };
      }
    }
  }

  let promotionDiscountAmount = 0;
  let promotion: QuoteResponse["promotion"] = undefined;

  const couponBlocksPromotions = Boolean(coupon?.ok && couponAppliedType === "fixed");

  if (!couponBlocksPromotions && itemsSubtotal > 0) {
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
        lineMeta.reduce((acc, m) => {
          const eligible =
            appliesTo === "all" ||
            (appliesTo === "categories" && categorySet.has(m.categoryId)) ||
            (appliesTo === "products" && productSet.has(m.productId));
          return acc + (eligible ? m.lineTotal : 0);
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
      promotion = { id: String(promoDoc._id), name: String(promoDoc.name ?? "") };
      break;
    }
  }

  const settingsDoc = (await SiteSetting.findOne({ key: "global" })
    .select("inventory shipping storefrontLayout cartUx")
    .lean()) as unknown;
  const settings = normalizeStorefrontSettings(settingsDoc);

  const discountAmount = round2(couponDiscountAmount + promotionDiscountAmount);
  const shippingSubtotal = round2(Math.max(0, itemsSubtotal - couponDiscountAmount));

  const shipping = computeShippingAmount({
    itemsSubtotal,
    discountedSubtotal: shippingSubtotal,
    city: shippingCity,
    shipping: settings.shipping,
  });

  const shippingAmount = round2(Math.max(0, shipping.amount));
  const shippingFreeAboveSubtotal = shipping.freeAboveSubtotal;
  const shippingIsFree = shippingAmount <= 0;
  const shippingRemainingForFree =
    typeof shippingFreeAboveSubtotal === "number" && Number.isFinite(shippingFreeAboveSubtotal)
      ? round2(Math.max(0, shippingFreeAboveSubtotal - shippingSubtotal))
      : null;
  const deliveryEta = computeDeliveryEta({ city: shippingCity, shipping: settings.shipping });
  const taxAmount = 0;
  const totalAmount = round2(itemsSubtotal - discountAmount + shippingAmount + taxAmount);

  const resp: QuoteResponse = {
    items: lines,
    itemsSubtotal,
    discountAmount,
    couponDiscountAmount,
    promotionDiscountAmount,
    shippingAmount,
    shippingFreeAboveSubtotal,
    shippingRemainingForFree,
    shippingIsFree,
    taxAmount,
    totalAmount,
    deliveryEta,
    coupon,
    promotion,
  };

  return NextResponse.json(resp);
}
