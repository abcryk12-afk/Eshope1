export type ThemePresetId = "default" | "daraz" | "amazon";

export type ThemeColors = {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  header: string;
  text: string;
};

export const DEFAULT_THEME: ThemeColors = {
  primary: "#18181b",
  secondary: "#f4f4f5",
  background: "#ffffff",
  surface: "#ffffff",
  header: "#ffffff",
  text: "#171717",
};

export const PRESET_THEMES: Record<ThemePresetId, ThemeColors> = {
  default: DEFAULT_THEME,
  daraz: {
    primary: "#1a7f37",
    secondary: "#f0fdf4",
    background: "#ffffff",
    surface: "#ffffff",
    header: "#ffffff",
    text: "#0f172a",
  },
  amazon: {
    primary: "#232f3e",
    secondary: "#ff9900",
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

export function deriveThemeVars(theme: ThemeColors) {
  const primaryHover = computeHover(theme.primary, theme.background);
  const secondaryHover = computeHover(theme.secondary, theme.background);
  const border = computeBorder(theme.background, theme.text);
  const muted = computeMuted(theme.background, theme.text);
  const mutedFg = computeMutedFg(theme.background, theme.text);
  const ring = `rgba(24, 24, 27, 0.18)`;

  return {
    "--theme-background": theme.background,
    "--theme-surface": theme.surface,
    "--theme-header": theme.header,
    "--theme-foreground": theme.text,
    "--theme-muted": muted,
    "--theme-muted-foreground": mutedFg,
    "--theme-border": border,

    "--theme-primary": theme.primary,
    "--theme-primary-hover": primaryHover,
    "--theme-primary-foreground": computePrimaryFg(theme.primary),

    "--theme-secondary": theme.secondary,
    "--theme-secondary-hover": secondaryHover,
    "--theme-secondary-foreground": computeSecondaryFg(theme.secondary),

    "--theme-ring": ring,
  } as const;
}

function deriveDarkTheme(theme: ThemeColors): ThemeColors {
  return {
    primary: theme.primary,
    secondary: theme.secondary,
    background: "#0a0a0a",
    surface: "#0a0a0a",
    header: "#0a0a0a",
    text: "#ededed",
  };
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
