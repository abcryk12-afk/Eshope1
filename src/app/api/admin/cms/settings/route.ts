import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import SiteSetting from "@/models/SiteSetting";

export const runtime = "nodejs";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

const BannerSchema = z.object({
  title: z.string().trim().max(120).optional(),
  subtitle: z.string().trim().max(200).optional(),
  image: z.string().trim().optional().default(""),
  desktopImage: z.string().trim().optional().default(""),
  mobileImage: z.string().trim().optional().default(""),
  href: z.string().trim().optional(),
  buttonText: z.string().trim().max(60).optional().default(""),
  buttonHref: z.string().trim().optional().default(""),
  textAlign: z.enum(["left", "center", "right"]).optional().default("left"),
  verticalAlign: z.enum(["top", "center", "bottom"]).optional().default("center"),
  overlayColor: z.string().trim().optional().default("#000000"),
  overlayOpacity: z.number().min(0).max(1).optional().default(0.25),
  textColor: z.string().trim().optional().default("#ffffff"),
  buttonColor: z.string().trim().optional().default("#ffffff"),
  isActive: z.boolean().optional().default(true),
});

const HeroBannerSettingsSchema = z.object({
  desktopHeightPx: z.number().int().min(200).max(900).optional().default(520),
  mobileHeightPx: z.number().int().min(180).max(900).optional().default(360),
  aspectMode: z.enum(["height", "ratio"]).optional().default("height"),
  aspectRatio: z.string().trim().optional().default("16/9"),
  customAspectW: z.number().int().min(1).max(64).optional().default(16),
  customAspectH: z.number().int().min(1).max(64).optional().default(9),
  fitMode: z.enum(["cover", "contain"]).optional().default("cover"),
  autoplayEnabled: z.boolean().optional().default(true),
  autoplayDelayMs: z.number().int().min(1000).max(20000).optional().default(5000),
  loop: z.boolean().optional().default(true),
  showDots: z.boolean().optional().default(true),
  showArrows: z.boolean().optional().default(true),
  transitionSpeedMs: z.number().int().min(100).max(5000).optional().default(550),
  animation: z.enum(["slide", "fade"]).optional().default("slide"),
  keyboard: z.boolean().optional().default(true),
});

const DEFAULT_HERO_BANNER_SETTINGS = {
  desktopHeightPx: 520,
  mobileHeightPx: 360,
  aspectMode: "height",
  aspectRatio: "16/9",
  customAspectW: 16,
  customAspectH: 9,
  fitMode: "cover",
  autoplayEnabled: true,
  autoplayDelayMs: 5000,
  loop: true,
  showDots: true,
  showArrows: true,
  transitionSpeedMs: 550,
  animation: "slide",
  keyboard: true,
} as const;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizeBanners(raw: unknown) {
  const arr = Array.isArray(raw) ? raw : [];
  return arr
    .filter((b) => isRecord(b))
    .map((b) => {
      const r = b as Record<string, unknown>;
      return {
        title: typeof r.title === "string" ? r.title.trim() : "",
        subtitle: typeof r.subtitle === "string" ? r.subtitle.trim() : "",
        image: typeof r.image === "string" ? r.image.trim() : "",
        desktopImage: typeof r.desktopImage === "string" ? r.desktopImage.trim() : "",
        mobileImage: typeof r.mobileImage === "string" ? r.mobileImage.trim() : "",
        href: typeof r.href === "string" ? r.href.trim() : "",
        buttonText: typeof r.buttonText === "string" ? r.buttonText.trim() : "",
        buttonHref: typeof r.buttonHref === "string" ? r.buttonHref.trim() : "",
        textAlign: r.textAlign === "center" ? "center" : r.textAlign === "right" ? "right" : "left",
        verticalAlign: r.verticalAlign === "top" ? "top" : r.verticalAlign === "bottom" ? "bottom" : "center",
        overlayColor: typeof r.overlayColor === "string" ? r.overlayColor.trim() : "#000000",
        overlayOpacity: typeof r.overlayOpacity === "number" ? Math.max(0, Math.min(1, r.overlayOpacity)) : 0.25,
        textColor: typeof r.textColor === "string" ? r.textColor.trim() : "#ffffff",
        buttonColor: typeof r.buttonColor === "string" ? r.buttonColor.trim() : "#ffffff",
        isActive: typeof r.isActive === "boolean" ? r.isActive : true,
      };
    });
}

const LocalizedTextSchema = z.record(z.string().trim().max(24), z.string().trim().max(500)).optional().default({});

const FooterLinkSchema = z.object({
  href: z.string().trim().optional(),
  label: LocalizedTextSchema.optional().default({}),
});

const FooterSectionSchema = z.object({
  title: LocalizedTextSchema.optional().default({}),
  links: z.array(FooterLinkSchema).optional().default([]),
});

const FooterSocialLinkSchema = z.object({
  kind: z.string().trim().max(40).optional(),
  href: z.string().trim().optional(),
  label: LocalizedTextSchema.optional().default({}),
});

const FooterSchema = z
  .object({
    text: LocalizedTextSchema.optional().default({}),
    sections: z.array(FooterSectionSchema).optional().default([]),
    policyLinks: z.array(FooterLinkSchema).optional().default([]),
    socialLinks: z.array(FooterSocialLinkSchema).optional().default([]),
  })
  .optional();

const BodySchema = z.object({
  homeBanners: z.array(BannerSchema).optional().default([]),
  heroBanners: z.array(BannerSchema).optional().default([]),
  heroBannerSettings: HeroBannerSettingsSchema.optional().default(DEFAULT_HERO_BANNER_SETTINGS),
  footerText: z.string().trim().max(500).optional(),
  footer: z.union([FooterSchema, z.null()]).optional(),
  globalSeoTitle: z.string().trim().max(160).optional(),
  globalSeoDescription: z.string().trim().max(320).optional(),
  whatsAppSalesPhone: z.string().trim().max(40).optional(),
  whatsAppProductTemplate: z.string().trim().max(5000).optional(),
  whatsAppOrderTemplate: z.string().trim().max(5000).optional(),
  returnsWindowDays: z.number().int().min(1).max(60).optional(),
  inventoryLowStockThreshold: z.number().int().min(0).max(1000).optional(),
  shippingDefaultFee: z.number().min(0).optional(),
  shippingFreeAboveSubtotal: z.union([z.number().min(0), z.null()]).optional(),
  shippingEtaMinDays: z.number().int().min(0).max(60).optional(),
  shippingEtaMaxDays: z.number().int().min(0).max(60).optional(),
  shippingCityRules: z
    .array(
      z.object({
        city: z.string().trim().max(80),
        fee: z.number().min(0).optional(),
        freeAboveSubtotal: z.union([z.number().min(0), z.null()]).optional(),
        etaMinDays: z.number().int().min(0).max(60).optional(),
        etaMaxDays: z.number().int().min(0).max(60).optional(),
      })
    )
    .optional(),
});

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

const WHATSAPP_ALLOWED_PLACEHOLDERS = new Set([
  "storeName",
  "customerName",
  "orderId",
  "productList",
  "items",
  "total",
  "paymentMethod",
]);

const WHATSAPP_REQUIRED_PLACEHOLDERS = new Set(["customerName", "orderId", "total", "paymentMethod"]);

const WHATSAPP_PRODUCT_ALLOWED_PLACEHOLDERS = new Set(["storeName", "productName", "productUrl"]);
const WHATSAPP_PRODUCT_REQUIRED_PLACEHOLDERS = new Set(["productName"]);

function extractPlaceholders(template: string) {
  const found = new Set<string>();
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(template))) {
    const key = String(m[1] ?? "").trim();
    if (key) found.add(key);
  }
  return found;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  await dbConnect();

  const doc = await SiteSetting.findOne({ key: "global" }).lean();

  const returnsWindowDays =
    typeof (doc as unknown as { returns?: { windowDays?: number } }).returns?.windowDays === "number"
      ? (doc as unknown as { returns?: { windowDays?: number } }).returns?.windowDays
      : 14;

  const inventoryLowStockThreshold =
    typeof (doc as unknown as { inventory?: { lowStockThreshold?: number } }).inventory?.lowStockThreshold === "number"
      ? (doc as unknown as { inventory?: { lowStockThreshold?: number } }).inventory?.lowStockThreshold
      : 5;

  const shippingDefaultFee =
    typeof (doc as unknown as { shipping?: { defaultFee?: number } }).shipping?.defaultFee === "number"
      ? (doc as unknown as { shipping?: { defaultFee?: number } }).shipping?.defaultFee
      : 0;

  const shippingFreeAboveSubtotal =
    typeof (doc as unknown as { shipping?: { freeAboveSubtotal?: number } }).shipping?.freeAboveSubtotal === "number"
      ? (doc as unknown as { shipping?: { freeAboveSubtotal?: number } }).shipping?.freeAboveSubtotal
      : null;

  const etaMinDays =
    typeof (doc as unknown as { shipping?: { etaDefault?: { minDays?: number } } }).shipping?.etaDefault?.minDays ===
    "number"
      ? (doc as unknown as { shipping?: { etaDefault?: { minDays?: number } } }).shipping?.etaDefault?.minDays
      : 3;

  const etaMaxDays =
    typeof (doc as unknown as { shipping?: { etaDefault?: { maxDays?: number } } }).shipping?.etaDefault?.maxDays ===
    "number"
      ? (doc as unknown as { shipping?: { etaDefault?: { maxDays?: number } } }).shipping?.etaDefault?.maxDays
      : 5;

  const shippingCityRulesRaw =
    (doc as unknown as { shipping?: { cityRules?: unknown[] } }).shipping?.cityRules ?? [];
  const shippingCityRules = Array.isArray(shippingCityRulesRaw)
    ? shippingCityRulesRaw
        .filter((x) => typeof x === "object" && x !== null)
        .map((x) => x as Record<string, unknown>)
        .map((x) => ({
          city: String(x.city ?? ""),
          fee: typeof x.fee === "number" ? x.fee : 0,
          freeAboveSubtotal: typeof x.freeAboveSubtotal === "number" ? x.freeAboveSubtotal : null,
          etaMinDays: typeof x.etaMinDays === "number" ? x.etaMinDays : undefined,
          etaMaxDays: typeof x.etaMaxDays === "number" ? x.etaMaxDays : undefined,
        }))
        .filter((x) => x.city.trim())
    : [];

  return NextResponse.json({
    settings: {
      homeBanners: normalizeBanners((doc as unknown as { homeBanners?: unknown }).homeBanners),
      heroBanners: normalizeBanners((doc as unknown as { heroBanners?: unknown }).heroBanners),
      heroBannerSettings:
        typeof (doc as unknown as { heroBannerSettings?: unknown }).heroBannerSettings === "object" &&
        (doc as unknown as { heroBannerSettings?: unknown }).heroBannerSettings !== null
          ? (doc as unknown as { heroBannerSettings?: unknown }).heroBannerSettings
          : {},
      footerText: doc?.footerText ?? "",
      footer: (doc as unknown as { footer?: unknown }).footer ?? {},
      globalSeoTitle: doc?.globalSeoTitle ?? "",
      globalSeoDescription: doc?.globalSeoDescription ?? "",
      whatsAppSalesPhone:
        typeof (doc as unknown as { whatsAppSalesPhone?: unknown }).whatsAppSalesPhone === "string"
          ? String((doc as unknown as { whatsAppSalesPhone?: string }).whatsAppSalesPhone)
          : "",
      whatsAppProductTemplate:
        typeof (doc as unknown as { whatsAppProductTemplate?: unknown }).whatsAppProductTemplate === "string"
          ? String((doc as unknown as { whatsAppProductTemplate?: string }).whatsAppProductTemplate)
          : "",
      whatsAppOrderTemplate:
        typeof (doc as unknown as { whatsAppOrderTemplate?: unknown }).whatsAppOrderTemplate === "string"
          ? String((doc as unknown as { whatsAppOrderTemplate?: string }).whatsAppOrderTemplate)
          : "",
      returnsWindowDays,
      inventoryLowStockThreshold,
      shippingDefaultFee,
      shippingFreeAboveSubtotal,
      shippingEtaMinDays: etaMinDays,
      shippingEtaMaxDays: etaMaxDays,
      shippingCityRules,
    },
  });
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = BodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const waTemplate = String(parsed.data.whatsAppOrderTemplate ?? "");
  if (waTemplate.trim()) {
    const found = extractPlaceholders(waTemplate);
    const unknown = Array.from(found).filter((k) => !WHATSAPP_ALLOWED_PLACEHOLDERS.has(k));
    if (unknown.length) {
      return NextResponse.json(
        {
          message: `Unknown WhatsApp placeholders: ${unknown.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const missing = Array.from(WHATSAPP_REQUIRED_PLACEHOLDERS).filter((k) => !found.has(k));
    const hasProductList = found.has("productList") || found.has("items");
    if (!hasProductList) missing.push("productList");
    if (missing.length) {
      return NextResponse.json(
        {
          message: `WhatsApp template must include: ${missing.map((k) => `{{${k}}}`).join(", ")}`,
        },
        { status: 400 }
      );
    }
  }

  const waProductTemplate = String(parsed.data.whatsAppProductTemplate ?? "");
  if (waProductTemplate.trim()) {
    const found = extractPlaceholders(waProductTemplate);
    const unknown = Array.from(found).filter((k) => !WHATSAPP_PRODUCT_ALLOWED_PLACEHOLDERS.has(k));

    if (unknown.length) {
      return NextResponse.json(
        {
          message: `Unknown WhatsApp product placeholders: ${unknown.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const missing = Array.from(WHATSAPP_PRODUCT_REQUIRED_PLACEHOLDERS).filter((k) => !found.has(k));
    if (missing.length) {
      return NextResponse.json(
        {
          message: `WhatsApp product template must include: ${missing.map((k) => `{{${k}}}`).join(", ")}`,
        },
        { status: 400 }
      );
    }
  }

  await dbConnect();

  const nextReturnsWindowDays =
    typeof parsed.data.returnsWindowDays === "number" ? parsed.data.returnsWindowDays : undefined;

  const nextLowStockThreshold =
    typeof parsed.data.inventoryLowStockThreshold === "number" ? parsed.data.inventoryLowStockThreshold : undefined;

  const nextShippingDefaultFee =
    typeof parsed.data.shippingDefaultFee === "number" ? parsed.data.shippingDefaultFee : undefined;
  const nextShippingFreeAboveSubtotal =
    parsed.data.shippingFreeAboveSubtotal === null || typeof parsed.data.shippingFreeAboveSubtotal === "number"
      ? parsed.data.shippingFreeAboveSubtotal
      : undefined;
  const nextEtaMinDays =
    typeof parsed.data.shippingEtaMinDays === "number" ? parsed.data.shippingEtaMinDays : undefined;
  const nextEtaMaxDays =
    typeof parsed.data.shippingEtaMaxDays === "number" ? parsed.data.shippingEtaMaxDays : undefined;
  const nextCityRules = Array.isArray(parsed.data.shippingCityRules) ? parsed.data.shippingCityRules : undefined;

  const setPayload: Record<string, unknown> = { key: "global", ...parsed.data };
  delete setPayload.returnsWindowDays;
  delete setPayload.inventoryLowStockThreshold;
  delete setPayload.shippingDefaultFee;
  delete setPayload.shippingFreeAboveSubtotal;
  delete setPayload.shippingEtaMinDays;
  delete setPayload.shippingEtaMaxDays;
  delete setPayload.shippingCityRules;

  const unsetPayload: Record<string, unknown> = {};
  if (!String(parsed.data.whatsAppSalesPhone ?? "").trim()) {
    delete setPayload.whatsAppSalesPhone;
    unsetPayload.whatsAppSalesPhone = 1;
  }

  if (!String(parsed.data.whatsAppProductTemplate ?? "").trim()) {
    delete setPayload.whatsAppProductTemplate;
    unsetPayload.whatsAppProductTemplate = 1;
  }

  if (!String(parsed.data.whatsAppOrderTemplate ?? "").trim()) {
    delete setPayload.whatsAppOrderTemplate;
    unsetPayload.whatsAppOrderTemplate = 1;
  }

  if (parsed.data.footer === null) {
    setPayload.footer = {};
  }

  if (typeof nextReturnsWindowDays === "number") {
    setPayload.returns = { windowDays: nextReturnsWindowDays };
  }

  if (typeof nextLowStockThreshold === "number") {
    setPayload.inventory = { lowStockThreshold: nextLowStockThreshold };
  }

  if (
    typeof nextShippingDefaultFee === "number" ||
    nextShippingFreeAboveSubtotal === null ||
    typeof nextShippingFreeAboveSubtotal === "number" ||
    typeof nextEtaMinDays === "number" ||
    typeof nextEtaMaxDays === "number" ||
    typeof nextCityRules !== "undefined"
  ) {
    setPayload.shipping = {
      defaultFee: typeof nextShippingDefaultFee === "number" ? nextShippingDefaultFee : 0,
      freeAboveSubtotal:
        nextShippingFreeAboveSubtotal === null || typeof nextShippingFreeAboveSubtotal === "number"
          ? nextShippingFreeAboveSubtotal
          : null,
      etaDefault: {
        minDays: typeof nextEtaMinDays === "number" ? nextEtaMinDays : 3,
        maxDays: typeof nextEtaMaxDays === "number" ? nextEtaMaxDays : 5,
      },
      cityRules: (nextCityRules ?? []).map((r) => ({
        city: r.city,
        fee: typeof r.fee === "number" ? r.fee : 0,
        freeAboveSubtotal:
          r.freeAboveSubtotal === null || typeof r.freeAboveSubtotal === "number" ? r.freeAboveSubtotal : undefined,
        etaMinDays: typeof r.etaMinDays === "number" ? r.etaMinDays : undefined,
        etaMaxDays: typeof r.etaMaxDays === "number" ? r.etaMaxDays : undefined,
      })),
    };
  }

  const update: Record<string, unknown> = { $set: setPayload };
  if (Object.keys(unsetPayload).length) {
    update.$unset = unsetPayload;
  }

  const doc = await SiteSetting.findOneAndUpdate({ key: "global" }, update, { upsert: true, new: true }).lean();

  const returnsWindowDays =
    typeof (doc as unknown as { returns?: { windowDays?: number } }).returns?.windowDays === "number"
      ? (doc as unknown as { returns?: { windowDays?: number } }).returns?.windowDays
      : 14;

  const inventoryLowStockThreshold =
    typeof (doc as unknown as { inventory?: { lowStockThreshold?: number } }).inventory?.lowStockThreshold === "number"
      ? (doc as unknown as { inventory?: { lowStockThreshold?: number } }).inventory?.lowStockThreshold
      : 5;

  const shippingDefaultFee =
    typeof (doc as unknown as { shipping?: { defaultFee?: number } }).shipping?.defaultFee === "number"
      ? (doc as unknown as { shipping?: { defaultFee?: number } }).shipping?.defaultFee
      : 0;

  const shippingFreeAboveSubtotal =
    typeof (doc as unknown as { shipping?: { freeAboveSubtotal?: number } }).shipping?.freeAboveSubtotal === "number"
      ? (doc as unknown as { shipping?: { freeAboveSubtotal?: number } }).shipping?.freeAboveSubtotal
      : null;

  const etaMinDays =
    typeof (doc as unknown as { shipping?: { etaDefault?: { minDays?: number } } }).shipping?.etaDefault?.minDays ===
    "number"
      ? (doc as unknown as { shipping?: { etaDefault?: { minDays?: number } } }).shipping?.etaDefault?.minDays
      : 3;

  const etaMaxDays =
    typeof (doc as unknown as { shipping?: { etaDefault?: { maxDays?: number } } }).shipping?.etaDefault?.maxDays ===
    "number"
      ? (doc as unknown as { shipping?: { etaDefault?: { maxDays?: number } } }).shipping?.etaDefault?.maxDays
      : 5;

  const shippingCityRulesRaw =
    (doc as unknown as { shipping?: { cityRules?: unknown[] } }).shipping?.cityRules ?? [];
  const shippingCityRules = Array.isArray(shippingCityRulesRaw)
    ? shippingCityRulesRaw
        .filter((x) => typeof x === "object" && x !== null)
        .map((x) => x as Record<string, unknown>)
        .map((x) => ({
          city: String(x.city ?? ""),
          fee: typeof x.fee === "number" ? x.fee : 0,
          freeAboveSubtotal: typeof x.freeAboveSubtotal === "number" ? x.freeAboveSubtotal : null,
          etaMinDays: typeof x.etaMinDays === "number" ? x.etaMinDays : undefined,
          etaMaxDays: typeof x.etaMaxDays === "number" ? x.etaMaxDays : undefined,
        }))
        .filter((x) => x.city.trim())
    : [];

  return NextResponse.json({
    settings: {
      homeBanners: normalizeBanners((doc as unknown as { homeBanners?: unknown }).homeBanners),
      heroBanners: normalizeBanners((doc as unknown as { heroBanners?: unknown }).heroBanners),
      heroBannerSettings:
        typeof (doc as unknown as { heroBannerSettings?: unknown }).heroBannerSettings === "object" &&
        (doc as unknown as { heroBannerSettings?: unknown }).heroBannerSettings !== null
          ? (doc as unknown as { heroBannerSettings?: unknown }).heroBannerSettings
          : {},
      footerText: doc?.footerText ?? "",
      footer: (doc as unknown as { footer?: unknown }).footer ?? {},
      globalSeoTitle: doc?.globalSeoTitle ?? "",
      globalSeoDescription: doc?.globalSeoDescription ?? "",
      whatsAppSalesPhone:
        typeof (doc as unknown as { whatsAppSalesPhone?: unknown }).whatsAppSalesPhone === "string"
          ? String((doc as unknown as { whatsAppSalesPhone?: string }).whatsAppSalesPhone)
          : "",
      whatsAppProductTemplate:
        typeof (doc as unknown as { whatsAppProductTemplate?: unknown }).whatsAppProductTemplate === "string"
          ? String((doc as unknown as { whatsAppProductTemplate?: string }).whatsAppProductTemplate)
          : "",
      whatsAppOrderTemplate:
        typeof (doc as unknown as { whatsAppOrderTemplate?: unknown }).whatsAppOrderTemplate === "string"
          ? String((doc as unknown as { whatsAppOrderTemplate?: string }).whatsAppOrderTemplate)
          : "",
      returnsWindowDays,
      inventoryLowStockThreshold,
      shippingDefaultFee,
      shippingFreeAboveSubtotal,
      shippingEtaMinDays: etaMinDays,
      shippingEtaMaxDays: etaMaxDays,
      shippingCityRules,
    },
  });
}
