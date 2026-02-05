export type ThemePresetId = "default" | "marketplace" | "sales" | "premium" | "daraz" | "amazon";

export type ThemeColors = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  header: string;
  text: string;
};

export const DEFAULT_THEME: ThemeColors = {
  primary: "#18181b",
  secondary: "#f4f4f5",
  accent: "#ff6a00",
  background: "#ffffff",
  surface: "#ffffff",
  header: "#ffffff",
  text: "#171717",
};

export const PRESET_THEMES: Record<ThemePresetId, ThemeColors> = {
  default: DEFAULT_THEME,
  marketplace: {
    primary: "#1d4ed8",
    secondary: "#eff6ff",
    accent: "#f97316",
    background: "#ffffff",
    surface: "#ffffff",
    header: "#ffffff",
    text: "#0f172a",
  },
  sales: {
    primary: "#b91c1c",
    secondary: "#fff1f2",
    accent: "#ef4444",
    background: "#ffffff",
    surface: "#ffffff",
    header: "#ffffff",
    text: "#111827",
  },
  premium: {
    primary: "#0b0f19",
    secondary: "#f5f5f4",
    accent: "#d4af37",
    background: "#ffffff",
    surface: "#ffffff",
    header: "#ffffff",
    text: "#0b0f19",
  },
  daraz: {
    primary: "#1a7f37",
    secondary: "#f0fdf4",
    accent: "#22c55e",
    background: "#ffffff",
    surface: "#ffffff",
    header: "#ffffff",
    text: "#0f172a",
  },
  amazon: {
    primary: "#232f3e",
    secondary: "#ff9900",
    accent: "#ff9900",
    background: "#ffffff",
    surface: "#ffffff",
    header: "#ffffff",
    text: "#111827",
  },
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function hexToRgb(hex: string) {
  const v = String(hex || "").trim().replace(/^#/, "");
  if (v.length !== 6) return null;
  const r = Number.parseInt(v.slice(0, 2), 16);
  const g = Number.parseInt(v.slice(2, 4), 16);
  const b = Number.parseInt(v.slice(4, 6), 16);
  if ([r, g, b].some((x) => Number.isNaN(x))) return null;
  return { r, g, b };
}

function rgbaFromHex(hex: string, alpha: number) {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(0, 0, 0, ${clamp(alpha, 0, 1)})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamp(alpha, 0, 1)})`;
}

function rgbToHex(r: number, g: number, b: number) {
  const to = (x: number) => clamp(Math.round(x), 0, 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function mix(hexA: string, hexB: string, t: number) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return hexA;
  const k = clamp(t, 0, 1);
  return rgbToHex(a.r + (b.r - a.r) * k, a.g + (b.g - a.g) * k, a.b + (b.b - a.b) * k);
}

function computeHover(primary: string, background: string) {
  return mix(primary, background, 0.12);
}

function computeBorder(background: string, text: string) {
  return mix(background, text, 0.12);
}

function computeMuted(background: string, text: string) {
  return mix(background, text, 0.02);
}

function computeMutedFg(background: string, text: string) {
  return mix(text, background, 0.45);
}

function computePrimaryFg(primary: string) {
  const rgb = hexToRgb(primary);
  if (!rgb) return "#ffffff";
  const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return yiq >= 160 ? "#0f172a" : "#ffffff";
}

function computeSecondaryFg(secondary: string) {
  const rgb = hexToRgb(secondary);
  if (!rgb) return "#0f172a";
  const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return yiq >= 160 ? "#0f172a" : "#ffffff";
}

function computeAccentFg(accent: string) {
  return computePrimaryFg(accent);
}

function computeSubtleBorder(background: string, text: string) {
  return mix(background, text, 0.08);
}

function computeSecondaryText(background: string, text: string) {
  return mix(text, background, 0.28);
}

export function deriveThemeVars(theme: ThemeColors) {
  const primaryHover = computeHover(theme.primary, theme.background);
  const secondaryHover = computeHover(theme.secondary, theme.background);
  const accentHover = computeHover(theme.accent, theme.background);
  const border = computeBorder(theme.background, theme.text);
  const borderMuted = computeSubtleBorder(theme.background, theme.text);
  const muted = computeMuted(theme.background, theme.text);
  const mutedFg = computeMutedFg(theme.background, theme.text);
  const secondaryText = computeSecondaryText(theme.background, theme.text);
  const ring = rgbaFromHex(theme.primary, 0.22);

  const destructive = "#ef4444";
  const destructiveFg = computePrimaryFg(destructive);

  return {
    "--theme-background": theme.background,
    "--theme-surface": theme.surface,
    "--theme-header": theme.header,
    "--theme-foreground": theme.text,
    "--theme-foreground-secondary": secondaryText,
    "--theme-muted": muted,
    "--theme-muted-foreground": mutedFg,
    "--theme-border": border,
    "--theme-border-muted": borderMuted,

    "--theme-primary": theme.primary,
    "--theme-primary-hover": primaryHover,
    "--theme-primary-foreground": computePrimaryFg(theme.primary),

    "--theme-secondary": theme.secondary,
    "--theme-secondary-hover": secondaryHover,
    "--theme-secondary-foreground": computeSecondaryFg(theme.secondary),

    "--theme-accent": theme.accent,
    "--theme-accent-hover": accentHover,
    "--theme-accent-foreground": computeAccentFg(theme.accent),

    "--theme-success": "#16a34a",
    "--theme-warning": "#f59e0b",

    "--theme-destructive": destructive,
    "--theme-destructive-foreground": destructiveFg,

    "--theme-ring": ring,
  } as const;
}

export function deriveDarkTheme(theme: ThemeColors): ThemeColors {
  return {
    primary: theme.primary,
    secondary: theme.secondary,
    accent: theme.accent,
    background: "#0a0a0a",
    surface: "#0a0a0a",
    header: "#0a0a0a",
    text: "#ededed",
  };
}

export function deriveThemeCssText(theme: ThemeColors) {
  const light = deriveThemeVars(theme);
  const dark = deriveThemeVars(deriveDarkTheme(theme));

  const lightCss = Object.entries(light)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
  const darkCss = Object.entries(dark)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");

  return `:root{${lightCss}}@media (prefers-color-scheme: dark){:root{${darkCss}}}`;
}

export function applyThemeToDocument(theme: ThemeColors) {
  if (typeof document === "undefined") return;
  const isDark =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const root = document.documentElement;
  const vars = deriveThemeVars(isDark ? deriveDarkTheme(theme) : theme);
  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(k, v);
  }
}
