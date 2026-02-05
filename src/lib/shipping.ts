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

export type StorefrontSettings = {
  inventory: { lowStockThreshold: number };
  shipping: NormalizedShippingSettings;
  storefrontLayout: StorefrontLayoutSettings;
  cartUx: CartUxSettings;
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
