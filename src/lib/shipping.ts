export type NormalizedShippingEta = {
  minDays: number;
  maxDays: number;
};

export type NormalizedShippingCityRule = {
  city: string;
  fee: number;
  freeAboveSubtotal: number | null;
  etaMinDays: number | null;
  etaMaxDays: number | null;
};

export type NormalizedShippingSettings = {
  defaultFee: number;
  freeAboveSubtotal: number | null;
  etaDefault: NormalizedShippingEta;
  cityRules: NormalizedShippingCityRule[];
};

export type StorefrontGridSettings = {
  mobileCols: number;
  tabletCols: number;
  desktopCols: number;
  gap: "compact" | "normal" | "spacious";
};

export type StorefrontProductCardSettings = {
  style: "rounded" | "squared" | "image_first" | "poster";
  density: "compact" | "balanced" | "image_focused";
  imageAspect: "square" | "portrait" | "auto";
  showRating: boolean;
  showSoldCount: boolean;
  showWishlistIcon: boolean;
  showDiscountBadge: boolean;
};

export type StorefrontLayoutSettings = {
  grid: StorefrontGridSettings;
  productCard: StorefrontProductCardSettings;
  listingHeader: {
    showSearch: boolean;
    showFilters: boolean;
    spacing: "compact" | "normal";
    showSort: boolean;
    enableLayoutSwitcher: boolean;
  };
};

export type CartUxSettings = {
  quickCheckoutEnabled: boolean;
  quickCheckoutAutoHideSeconds: number;
};

export type AnnouncementBarMode = "static" | "slide" | "fade" | "marquee_ltr" | "marquee_rtl";

export type AnnouncementBarSettings = {
  enabled: boolean;
  position: "fixed" | "sticky";
  showOn: "all" | "home_only";
  heightPx: number;
  paddingX: number;
  paddingY: number;
  textAlign: "left" | "center" | "right";
  textColor: string;
  background: {
    solid: string;
    gradientEnabled: boolean;
    gradientCss: string;
  };
  border: { enabled: boolean; color: string; thicknessPx: number };
  shadowEnabled: boolean;
  closeButtonEnabled: boolean;
  closeButtonVariant: "minimal" | "pill";
  dismissTtlHours: number;
  mode: AnnouncementBarMode;
  marqueeSpeedPxPerSec: number;
  slideIntervalMs: number;
  transitionMs: number;
  easing: string;
};

export type AnnouncementVisibility = {
  device: "all" | "desktop" | "mobile";
  pageMode: "all" | "include" | "exclude";
  paths: string[];
};

export type AnnouncementSchedule = {
  startAt: number | null;
  endAt: number | null;
};

export type AnnouncementCta = {
  enabled: boolean;
  label: string;
  href: string;
  newTab: boolean;
  style: {
    bg: string;
    text: string;
    hoverBg: string;
  };
};

export type AnnouncementItem = {
  id: string;
  enabled: boolean;
  html: string;
  href: string;
  newTab: boolean;
  schedule: AnnouncementSchedule;
  visibility: AnnouncementVisibility;
  cta: AnnouncementCta;
};

export type BrandingLogo = {
  url: string;
  width: number | null;
  height: number | null;
  alt: string;
  updatedAt: number;
};

export type BrandingTextStyle = {
  weight: number;
  italic: boolean;
  letterSpacing: "tight" | "normal" | "wide";
  color: "foreground" | "muted" | "primary";
  customColorEnabled: boolean;
  customColor: string;
  gradientEnabled: boolean;
  embossedEnabled: boolean;
  embossedIntensity: number;
  glowEnabled: boolean;
  glowColor: string;
  glowIntensity: number;
  blinkEnabled: boolean;
  blinkSpeedMs: number;
};

export type BrandingSeo = {
  title: string;
  description: string;
  ogImageUrl: string;
};

export type BrandingFavicon = {
  sourceUrl: string;
  assetsVersion: string;
  updatedAt: number;
};

export type BrandingSettings = {
  storeName: string;
  headerBrandText: string;
  logoMode: "text" | "image" | "both";
  logoAlignment: "left" | "center";
  hideTextWhenLogoActive: boolean;
  logoMaxHeight: number;
  logo: BrandingLogo;
  brandTextStyle: BrandingTextStyle;
  seo: BrandingSeo;
  favicon: BrandingFavicon;
  updatedAt: number;
};

export type WhatsAppStorefrontSettings = {
  salesPhone: string;
  productTemplate: string;
};

export type StorefrontSettings = {
  inventory: { lowStockThreshold: number };
  shipping: NormalizedShippingSettings;
  storefrontLayout: StorefrontLayoutSettings;
  cartUx: CartUxSettings;
  announcementBar: AnnouncementBarSettings;
  announcements: AnnouncementItem[];
  branding: BrandingSettings;
  whatsApp: WhatsAppStorefrontSettings;
};

export type ShippingEta = {
  minDays: number;
  maxDays: number;
  text: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readNumber(v: unknown, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clampInt(n: number, min: number, max: number) {
  const t = Math.trunc(n);
  return Math.min(max, Math.max(min, t));
}

function readString(v: unknown, fallback: string) {
  const s = typeof v === "string" ? v.trim() : "";
  return s || fallback;
}

function readStringArray(v: unknown) {
  const arr = Array.isArray(v) ? v : [];
  return arr.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function normalizeAnnouncementBarSettings(raw: unknown): AnnouncementBarSettings {
  const r = isRecord(raw) ? (raw as Record<string, unknown>) : {};

  const position = r.position === "sticky" ? "sticky" : "fixed";
  const showOn = r.showOn === "home_only" ? "home_only" : "all";
  const textAlign = r.textAlign === "center" ? "center" : r.textAlign === "right" ? "right" : "left";
  const closeButtonVariant = r.closeButtonVariant === "pill" ? "pill" : "minimal";

  const modeRaw = String(r.mode ?? "").trim();
  const mode: AnnouncementBarMode =
    modeRaw === "slide" ||
    modeRaw === "fade" ||
    modeRaw === "marquee_ltr" ||
    modeRaw === "marquee_rtl" ||
    modeRaw === "static"
      ? (modeRaw as AnnouncementBarMode)
      : "static";

  const bg = isRecord(r.background) ? (r.background as Record<string, unknown>) : {};
  const border = isRecord(r.border) ? (r.border as Record<string, unknown>) : {};

  return {
    enabled: typeof r.enabled === "boolean" ? r.enabled : false,
    position,
    showOn,
    heightPx: clampInt(readNumber(r.heightPx, 36), 24, 120),
    paddingX: clampInt(readNumber(r.paddingX, 16), 0, 48),
    paddingY: clampInt(readNumber(r.paddingY, 6), 0, 24),
    textAlign,
    textColor: readString(r.textColor, "#ffffff"),
    background: {
      solid: readString(bg.solid, "#0f172a"),
      gradientEnabled: typeof bg.gradientEnabled === "boolean" ? bg.gradientEnabled : false,
      gradientCss: readString(bg.gradientCss, "linear-gradient(90deg,#0f172a,#111827)"),
    },
    border: {
      enabled: typeof border.enabled === "boolean" ? border.enabled : false,
      color: readString(border.color, "rgba(255,255,255,0.12)"),
      thicknessPx: clampInt(readNumber(border.thicknessPx, 1), 0, 6),
    },
    shadowEnabled: typeof r.shadowEnabled === "boolean" ? r.shadowEnabled : false,
    closeButtonEnabled: typeof r.closeButtonEnabled === "boolean" ? r.closeButtonEnabled : true,
    closeButtonVariant,
    dismissTtlHours: clampInt(readNumber(r.dismissTtlHours, 24), 0, 24 * 30),
    mode,
    marqueeSpeedPxPerSec: clampInt(readNumber(r.marqueeSpeedPxPerSec, 60), 10, 600),
    slideIntervalMs: clampInt(readNumber(r.slideIntervalMs, 3500), 800, 30000),
    transitionMs: clampInt(readNumber(r.transitionMs, 350), 100, 4000),
    easing: readString(r.easing, "cubic-bezier(0.22, 1, 0.36, 1)"),
  };
}

function isActiveSchedule(schedule: AnnouncementSchedule, now: number) {
  const startOk = schedule.startAt === null || now >= schedule.startAt;
  const endOk = schedule.endAt === null || now <= schedule.endAt;
  return startOk && endOk;
}

function normalizeAnnouncements(raw: unknown): AnnouncementItem[] {
  const arr = Array.isArray(raw) ? raw : [];
  const now = Date.now();

  return arr
    .filter((x) => isRecord(x))
    .map((x) => {
      const r = x as Record<string, unknown>;
      const visibility = isRecord(r.visibility) ? (r.visibility as Record<string, unknown>) : {};
      const schedule = isRecord(r.schedule) ? (r.schedule as Record<string, unknown>) : {};
      const cta = isRecord(r.cta) ? (r.cta as Record<string, unknown>) : {};
      const ctaStyle = isRecord(cta.style) ? (cta.style as Record<string, unknown>) : {};

      const device = visibility.device === "desktop" || visibility.device === "mobile" ? visibility.device : "all";
      const pageMode = visibility.pageMode === "include" || visibility.pageMode === "exclude" ? visibility.pageMode : "all";

      const startAtRaw = typeof schedule.startAt === "number" && Number.isFinite(schedule.startAt) ? schedule.startAt : null;
      const endAtRaw = typeof schedule.endAt === "number" && Number.isFinite(schedule.endAt) ? schedule.endAt : null;

      const normalizedSchedule: AnnouncementSchedule = {
        startAt: startAtRaw,
        endAt: endAtRaw,
      };

      return {
        id: readString(r.id, ""),
        enabled: typeof r.enabled === "boolean" ? r.enabled : true,
        html: typeof r.html === "string" ? r.html.trim() : "",
        href: typeof r.href === "string" ? r.href.trim() : "",
        newTab: typeof r.newTab === "boolean" ? r.newTab : false,
        schedule: normalizedSchedule,
        visibility: {
          device: device as AnnouncementVisibility["device"],
          pageMode: pageMode as AnnouncementVisibility["pageMode"],
          paths: readStringArray(visibility.paths),
        },
        cta: {
          enabled: typeof cta.enabled === "boolean" ? cta.enabled : false,
          label: readString(cta.label, ""),
          href: readString(cta.href, ""),
          newTab: typeof cta.newTab === "boolean" ? cta.newTab : false,
          style: {
            bg: readString(ctaStyle.bg, "#ffffff"),
            text: readString(ctaStyle.text, "#0f172a"),
            hoverBg: readString(ctaStyle.hoverBg, "#e5e7eb"),
          },
        },
      };
    })
    .filter((a) => a.id)
    .filter((a) => a.enabled)
    .filter((a) => a.html)
    .filter((a) => isActiveSchedule(a.schedule, now));
}

function normalizeCityKey(v: string) {
  return String(v ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function formatEtaText(minDays: number, maxDays: number) {
  const min = clampInt(readNumber(minDays, 0), 0, 60);
  const max = clampInt(readNumber(maxDays, min), 0, 60);

  if (max <= 0 && min <= 0) return "";

  if (min === max) {
    return `Delivery in ${min} business day${min === 1 ? "" : "s"}`;
  }

  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return `Delivery in ${lo}–${hi} business days`;
}

export function normalizeShippingSettings(input: unknown): NormalizedShippingSettings {
  const root = isRecord(input) ? input : {};

  const defaultFee = Math.max(0, readNumber(root.defaultFee, 0));

  const freeAboveRaw = root.freeAboveSubtotal;
  const freeAbove =
    typeof freeAboveRaw === "number" && Number.isFinite(freeAboveRaw) && freeAboveRaw >= 0
      ? freeAboveRaw
      : null;

  const etaDefaultRaw = isRecord(root.etaDefault) ? root.etaDefault : {};
  const minDays = clampInt(readNumber(etaDefaultRaw.minDays, 3), 0, 60);
  const maxDays = clampInt(readNumber(etaDefaultRaw.maxDays, 5), 0, 60);

  const cityRulesRaw = Array.isArray(root.cityRules) ? root.cityRules : [];
  const cityRules: NormalizedShippingCityRule[] = cityRulesRaw
    .filter((x) => isRecord(x))
    .map((x) => {
      const r = x as Record<string, unknown>;

      const city = String(r.city ?? "").trim();
      const fee = Math.max(0, readNumber(r.fee, 0));

      const freeAboveCity =
        typeof r.freeAboveSubtotal === "number" && Number.isFinite(r.freeAboveSubtotal) && r.freeAboveSubtotal >= 0
          ? Number(r.freeAboveSubtotal)
          : null;

      const etaMinDays =
        typeof r.etaMinDays === "number" && Number.isFinite(r.etaMinDays) && r.etaMinDays >= 0
          ? clampInt(Number(r.etaMinDays), 0, 60)
          : null;

      const etaMaxDays =
        typeof r.etaMaxDays === "number" && Number.isFinite(r.etaMaxDays) && r.etaMaxDays >= 0
          ? clampInt(Number(r.etaMaxDays), 0, 60)
          : null;

      return { city, fee, freeAboveSubtotal: freeAboveCity, etaMinDays, etaMaxDays };
    })
    .filter((r) => r.city);

  return {
    defaultFee,
    freeAboveSubtotal: freeAbove,
    etaDefault: { minDays, maxDays },
    cityRules,
  };
}

export function normalizeStorefrontSettings(doc: unknown): StorefrontSettings {
  const root = isRecord(doc) ? doc : {};

  const inv = isRecord(root.inventory) ? root.inventory : {};
  const lowStockThreshold = clampInt(readNumber(inv.lowStockThreshold, 5), 0, 1000);

  const shipping = normalizeShippingSettings(root.shipping);

  const layout = isRecord(root.storefrontLayout) ? root.storefrontLayout : {};
  const grid = isRecord(layout.grid) ? layout.grid : {};
  const mobileCols = clampInt(readNumber(grid.mobileCols, 2), 2, 5);
  const tabletCols = clampInt(readNumber(grid.tabletCols, 3), 3, 5);
  const desktopCols = clampInt(readNumber(grid.desktopCols, 4), 4, 6);
  const gapRaw = String(grid.gap ?? "").trim();
  const gap = gapRaw === "compact" || gapRaw === "spacious" ? gapRaw : "normal";

  const productCard = isRecord(layout.productCard) ? layout.productCard : {};
  const styleRaw = String(productCard.style ?? "").trim();
  const style =
    styleRaw === "squared" || styleRaw === "image_first" || styleRaw === "poster" ? styleRaw : "rounded";
  const densityRaw = String(productCard.density ?? "").trim();
  const density = densityRaw === "compact" || densityRaw === "image_focused" ? densityRaw : "balanced";
  const aspectRaw = String(productCard.imageAspect ?? "").trim();
  const imageAspect = aspectRaw === "portrait" || aspectRaw === "auto" ? aspectRaw : "square";

  const showRating = typeof productCard.showRating === "boolean" ? productCard.showRating : true;
  const showSoldCount = typeof productCard.showSoldCount === "boolean" ? productCard.showSoldCount : true;
  const showWishlistIcon =
    typeof productCard.showWishlistIcon === "boolean" ? productCard.showWishlistIcon : true;
  const showDiscountBadge =
    typeof productCard.showDiscountBadge === "boolean" ? productCard.showDiscountBadge : true;

  const header = isRecord(layout.listingHeader) ? layout.listingHeader : {};
  const showSearch = typeof header.showSearch === "boolean" ? header.showSearch : true;
  const showFilters = typeof header.showFilters === "boolean" ? header.showFilters : true;
  const spacingRaw = String(header.spacing ?? "").trim();
  const spacing = spacingRaw === "normal" ? "normal" : "compact";
  const showSort = typeof header.showSort === "boolean" ? header.showSort : true;
  const enableLayoutSwitcher = typeof header.enableLayoutSwitcher === "boolean" ? header.enableLayoutSwitcher : false;

  const cartUx = isRecord(root.cartUx) ? root.cartUx : {};
  const quickCheckoutEnabled = typeof cartUx.quickCheckoutEnabled === "boolean" ? cartUx.quickCheckoutEnabled : true;
  const quickCheckoutAutoHideSeconds = clampInt(readNumber(cartUx.quickCheckoutAutoHideSeconds, 4), 1, 30);

  const announcementBar = normalizeAnnouncementBarSettings(
    (root as Record<string, unknown>).announcementBar
  );
  const announcements = normalizeAnnouncements((root as Record<string, unknown>).announcements);

  const brandingRoot = isRecord(root.branding) ? root.branding : {};
  const storeName = readString(brandingRoot.storeName, "Shop").slice(0, 80);
  const headerBrandText = readString(brandingRoot.headerBrandText, storeName).slice(0, 80);

  const logoModeRaw = String(brandingRoot.logoMode ?? "").trim();
  const logoMode = logoModeRaw === "image" || logoModeRaw === "both" ? logoModeRaw : "text";

  const logoAlignmentRaw = String(brandingRoot.logoAlignment ?? "").trim();
  const logoAlignment = logoAlignmentRaw === "center" ? "center" : "left";

  const hideTextWhenLogoActive =
    typeof brandingRoot.hideTextWhenLogoActive === "boolean" ? brandingRoot.hideTextWhenLogoActive : false;
  const logoMaxHeight = clampInt(readNumber(brandingRoot.logoMaxHeight, 28), 16, 96);

  const logoRoot = isRecord(brandingRoot.logo) ? brandingRoot.logo : {};
  const logoUpdatedAt = typeof logoRoot.updatedAt === "number" ? logoRoot.updatedAt : 0;
  const logoWidthRaw = typeof logoRoot.width === "number" && Number.isFinite(logoRoot.width) && logoRoot.width > 0 ? logoRoot.width : null;
  const logoHeightRaw = typeof logoRoot.height === "number" && Number.isFinite(logoRoot.height) && logoRoot.height > 0 ? logoRoot.height : null;

  const styleRoot = isRecord(brandingRoot.brandTextStyle) ? brandingRoot.brandTextStyle : {};
  const weight = clampInt(readNumber(styleRoot.weight, 600), 300, 900);
  const italic = typeof styleRoot.italic === "boolean" ? styleRoot.italic : false;
  const letterSpacingRaw = String(styleRoot.letterSpacing ?? "").trim();
  const letterSpacing = letterSpacingRaw === "normal" || letterSpacingRaw === "wide" ? (letterSpacingRaw as "normal" | "wide") : "tight";
  const colorRaw = String(styleRoot.color ?? "").trim();
  const color = colorRaw === "muted" || colorRaw === "primary" ? (colorRaw as "muted" | "primary") : "foreground";
  const customColorEnabled = typeof styleRoot.customColorEnabled === "boolean" ? styleRoot.customColorEnabled : false;
  const customColor = readString(styleRoot.customColor, "#171717");
  const gradientEnabled = typeof styleRoot.gradientEnabled === "boolean" ? styleRoot.gradientEnabled : false;
  const embossedEnabled = typeof styleRoot.embossedEnabled === "boolean" ? styleRoot.embossedEnabled : false;
  const embossedIntensity = clampInt(readNumber(styleRoot.embossedIntensity, 18), 0, 60);

  const glowEnabled = typeof styleRoot.glowEnabled === "boolean" ? styleRoot.glowEnabled : false;
  const glowColor = readString(styleRoot.glowColor, "#ffffff");
  const glowIntensity = clampInt(readNumber(styleRoot.glowIntensity, 14), 0, 60);

  const blinkEnabled = typeof styleRoot.blinkEnabled === "boolean" ? styleRoot.blinkEnabled : false;
  const blinkSpeedMs = clampInt(readNumber(styleRoot.blinkSpeedMs, 1400), 200, 6000);

  const seoRoot = isRecord(brandingRoot.seo) ? brandingRoot.seo : {};
  const seoTitle = readString(seoRoot.title, "").slice(0, 160);
  const seoDescription = readString(seoRoot.description, "").slice(0, 320);
  const ogImageUrl = readString(seoRoot.ogImageUrl, "");

  const faviconRoot = isRecord(brandingRoot.favicon) ? brandingRoot.favicon : {};
  const faviconSourceUrl = readString(faviconRoot.sourceUrl, "");
  const faviconAssetsVersion = readString(faviconRoot.assetsVersion, "");
  const faviconUpdatedAt = typeof faviconRoot.updatedAt === "number" ? faviconRoot.updatedAt : 0;

  const brandingUpdatedAt = typeof root.brandingUpdatedAt === "number" ? root.brandingUpdatedAt : 0;

  const whatsAppSalesPhone = readString(root.whatsAppSalesPhone, "").slice(0, 40);
  const whatsAppProductTemplate = readString(root.whatsAppProductTemplate, "").slice(0, 5000);

  return {
    inventory: { lowStockThreshold },
    shipping,
    storefrontLayout: {
      grid: { mobileCols, tabletCols, desktopCols, gap },
      productCard: {
        style,
        density,
        imageAspect,
        showRating,
        showSoldCount,
        showWishlistIcon,
        showDiscountBadge,
      },
      listingHeader: { showSearch, showFilters, spacing, showSort, enableLayoutSwitcher },
    },
    cartUx: { quickCheckoutEnabled, quickCheckoutAutoHideSeconds },
    announcementBar,
    announcements,
    branding: {
      storeName,
      headerBrandText,
      logoMode,
      logoAlignment,
      hideTextWhenLogoActive,
      logoMaxHeight,
      logo: {
        url: readString(logoRoot.url, ""),
        width: logoWidthRaw,
        height: logoHeightRaw,
        alt: readString(logoRoot.alt, storeName).slice(0, 160),
        updatedAt: logoUpdatedAt,
      },
      brandTextStyle: {
        weight,
        italic,
        letterSpacing,
        color,
        customColorEnabled,
        customColor,
        gradientEnabled,
        embossedEnabled,
        embossedIntensity,
        glowEnabled,
        glowColor,
        glowIntensity,
        blinkEnabled,
        blinkSpeedMs,
      },
      seo: {
        title: seoTitle,
        description: seoDescription,
        ogImageUrl,
      },
      favicon: {
        sourceUrl: faviconSourceUrl,
        assetsVersion: faviconAssetsVersion,
        updatedAt: faviconUpdatedAt,
      },
      updatedAt: brandingUpdatedAt,
    },
    whatsApp: {
      salesPhone: whatsAppSalesPhone,
      productTemplate: whatsAppProductTemplate,
    },
  };
}

export function matchCityRule(shipping: NormalizedShippingSettings, city: string) {
  const key = normalizeCityKey(city);
  if (!key) return null;

  return shipping.cityRules.find((r) => normalizeCityKey(r.city) === key) ?? null;
}

export function computeShippingAmount(args: {
  itemsSubtotal: number;
  discountedSubtotal?: number;
  city?: string;
  shipping: NormalizedShippingSettings;
}) {
  const city = String(args.city ?? "");
  const shipping = args.shipping;
  const subtotal = Math.max(0, readNumber(args.discountedSubtotal ?? args.itemsSubtotal, 0));

  const rule = matchCityRule(shipping, city);
  const freeAbove = rule?.freeAboveSubtotal ?? shipping.freeAboveSubtotal;

  if (typeof freeAbove === "number" && Number.isFinite(freeAbove) && freeAbove >= 0 && subtotal >= freeAbove) {
    return { amount: 0, matchedCity: rule?.city ?? null, freeAboveSubtotal: freeAbove };
  }

  const fee = rule ? rule.fee : shipping.defaultFee;
  return { amount: Math.max(0, readNumber(fee, 0)), matchedCity: rule?.city ?? null, freeAboveSubtotal: freeAbove };
}

export function computeDeliveryEta(args: { city?: string; shipping: NormalizedShippingSettings }): ShippingEta {
  const shipping = args.shipping;
  const city = String(args.city ?? "");

  const rule = matchCityRule(shipping, city);

  const minDays = rule?.etaMinDays ?? shipping.etaDefault.minDays;
  const maxDays = rule?.etaMaxDays ?? shipping.etaDefault.maxDays;

  const min = clampInt(readNumber(minDays, 0), 0, 60);
  const max = clampInt(readNumber(maxDays, min), 0, 60);

  return { minDays: min, maxDays: max, text: formatEtaText(min, max) };
}
