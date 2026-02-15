import type { HeaderBlock, HeaderLayout, HeaderSettings } from "@/store/headerSlice";

export function headerUid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function clampInt(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.floor(v)));
}

export function moveItem<T>(arr: T[], from: number, to: number) {
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  if (item === undefined) return next;
  next.splice(to, 0, item);
  return next;
}

export function ensureBlockIds(list: HeaderBlock[]) {
  return list.map((b, idx) => ({ ...b, id: b.id || `block_${idx}` }));
}

export function normalizeLayout(layout: HeaderLayout): HeaderLayout {
  return {
    left: ensureBlockIds(Array.isArray(layout.left) ? layout.left : []),
    center: ensureBlockIds(Array.isArray(layout.center) ? layout.center : []),
    right: ensureBlockIds(Array.isArray(layout.right) ? layout.right : []),
  };
}

export function normalizeSettings(settings: Partial<HeaderSettings> | undefined): HeaderSettings {
  const s = settings ?? {};

  return {
    sticky: Boolean(s.sticky),
    transparent: Boolean(s.transparent),
    heightPx: clampInt(Number(s.heightPx ?? 64), 44, 120),
    paddingX: clampInt(Number(s.paddingX ?? 16), 0, 64),
    paddingY: clampInt(Number(s.paddingY ?? 12), 0, 48),
    background: typeof s.background === "string" ? s.background : "",
    text: typeof s.text === "string" ? s.text : "",
    hover: typeof s.hover === "string" ? s.hover : "",
    borderBottom: Boolean(s.borderBottom ?? true),
    shadow: Boolean(s.shadow),
    dropdownSpeedMs: clampInt(Number(s.dropdownSpeedMs ?? 220), 80, 800),
    searchStyle: s.searchStyle === "bar" ? "bar" : "icon",
    logoAlignment: s.logoAlignment === "center" ? "center" : "left",
    logoMaxHeightPx: clampInt(Number(s.logoMaxHeightPx ?? 28), 16, 96),
    iconSizePx: clampInt(Number(s.iconSizePx ?? 20), 14, 32),
    iconSpacingPx: clampInt(Number(s.iconSpacingPx ?? 10), 4, 24),
    cartBadgeStyle: s.cartBadgeStyle === "dot" ? "dot" : "count",
    mobileLayoutStyle: s.mobileLayoutStyle === "dropdown" ? "dropdown" : "drawer",
    collapseBreakpointPx: clampInt(Number(s.collapseBreakpointPx ?? 768), 420, 1280),
    megaMenuWidthPx: clampInt(Number(s.megaMenuWidthPx ?? 980), 640, 1600),
  };
}
