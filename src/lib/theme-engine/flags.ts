export type BuilderFlagName =
  | "themeBuilder"
  | "layoutBuilder"
  | "headerBuilder"
  | "footerBuilder"
  | "productCardEngine"
  | "advancedSettings";

function normalizeFlag(v: string | undefined) {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "1" || s === "true" || s === "on" || s === "yes") return true;
  if (s === "0" || s === "false" || s === "off" || s === "no") return false;
  return null;
}

function envFlag(name: BuilderFlagName) {
  const key = `NEXT_PUBLIC_${name.replace(/([A-Z])/g, "_$1").toUpperCase()}`;
  const raw = process.env[key];
  return normalizeFlag(raw);
}

function queryFlag(name: BuilderFlagName) {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get(name);
  return normalizeFlag(raw ?? undefined);
}

export function isBuilderEnabled(name: BuilderFlagName) {
  // Priority: query param > env > default false
  const q = queryFlag(name);
  if (typeof q === "boolean") return q;

  const e = envFlag(name);
  if (typeof e === "boolean") return e;

  return false;
}

export function isThemeBuilderEnabled() {
  return isBuilderEnabled("themeBuilder");
}

export function isLayoutBuilderEnabled() {
  return isBuilderEnabled("layoutBuilder");
}

export function isHeaderBuilderEnabled() {
  return isBuilderEnabled("headerBuilder");
}

export function isFooterBuilderEnabled() {
  return isBuilderEnabled("footerBuilder");
}

export function isProductCardEngineEnabled() {
  return isBuilderEnabled("productCardEngine");
}

export function isAdvancedSettingsEnabled() {
  return isBuilderEnabled("advancedSettings");
}
