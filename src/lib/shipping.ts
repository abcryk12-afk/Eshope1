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

export type StorefrontSettings = {
  inventory: { lowStockThreshold: number };
  shipping: NormalizedShippingSettings;
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

  return {
    inventory: { lowStockThreshold },
    shipping,
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
