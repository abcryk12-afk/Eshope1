import { DEFAULT_DESIGN_TOKENS, type DesignTokens } from "@/lib/design-system/tokens";

export type BuilderThemeId =
  | "modern-minimal"
  | "dark-luxury"
  | "soft-pastel"
  | "vibrant-commerce"
  | "tech-glass"
  | "elegant-boutique"
  | "daraz-marketplace"
  | "aliexpress-commerce"
  | "amazon-clean"
  | "shopify-minimal-pro"
  | "temu-inspired";

export type BuilderThemePreset = {
  id: BuilderThemeId;
  name: string;
  tokens: DesignTokens;
};

export const THEME_PRESETS: BuilderThemePreset[] = [
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    tokens: {
      ...DEFAULT_DESIGN_TOKENS,
      colors: {
        primary: "#0f172a",
        accent: "#2563eb",
        background: "#ffffff",
        surface: "#ffffff",
        muted: "#f1f5f9",
        destructive: "#ef4444",
        success: "#16a34a",
      },
      typography: {
        fontFamilyBase:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji",
        fontSizeBasePx: 16,
        fontScale: 1.06,
      },
      radius: { sm: 10, md: 14, lg: 18, xl: 26 },
      spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
      shadows: {
        sm: "0 1px 2px rgba(2,6,23,0.06)",
        md: "0 10px 28px rgba(2,6,23,0.10)",
        lg: "0 30px 70px rgba(2,6,23,0.14)",
      },
      motion: { fastMs: 120, normalMs: 220, slowMs: 420, easeStandard: "cubic-bezier(0.2, 0, 0, 1)" },
    },
  },
  {
    id: "dark-luxury",
    name: "Dark Luxury",
    tokens: {
      ...DEFAULT_DESIGN_TOKENS,
      colors: {
        primary: "#e5e7eb",
        accent: "#d4af37",
        background: "#07070a",
        surface: "#0b0b10",
        muted: "#111827",
        destructive: "#ef4444",
        success: "#22c55e",
      },
      typography: {
        fontFamilyBase:
          "ui-serif, Georgia, Cambria, Times New Roman, Times, serif",
        fontSizeBasePx: 16,
        fontScale: 1.05,
      },
      radius: { sm: 8, md: 12, lg: 18, xl: 28 },
      spacing: { xs: 4, sm: 8, md: 12, lg: 18, xl: 28 },
      shadows: {
        sm: "0 1px 2px rgba(0,0,0,0.50)",
        md: "0 18px 50px rgba(0,0,0,0.55)",
        lg: "0 40px 110px rgba(0,0,0,0.65)",
      },
      motion: { fastMs: 140, normalMs: 240, slowMs: 460, easeStandard: "cubic-bezier(0.2, 0, 0, 1)" },
      components: {
        ...DEFAULT_DESIGN_TOKENS.components,
        cardStyle: "glass",
        buttonStyle: "gradient",
      },
      depth: {
        ...DEFAULT_DESIGN_TOKENS.depth,
        glassMode: true,
        blurIntensityPx: 18,
      },
    },
  },
  {
    id: "soft-pastel",
    name: "Soft Pastel",
    tokens: {
      ...DEFAULT_DESIGN_TOKENS,
      colors: {
        primary: "#1f2937",
        accent: "#fb7185",
        background: "#fff7ed",
        surface: "#ffffff",
        muted: "#fde68a",
        destructive: "#f43f5e",
        success: "#10b981",
      },
      typography: {
        fontFamilyBase:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji",
        fontSizeBasePx: 16,
        fontScale: 1.07,
      },
      radius: { sm: 14, md: 18, lg: 22, xl: 34 },
      spacing: { xs: 6, sm: 10, md: 14, lg: 18, xl: 28 },
      shadows: {
        sm: "0 1px 2px rgba(31,41,55,0.08)",
        md: "0 14px 34px rgba(31,41,55,0.12)",
        lg: "0 34px 80px rgba(31,41,55,0.14)",
      },
      motion: { fastMs: 130, normalMs: 230, slowMs: 440, easeStandard: "cubic-bezier(0.2, 0, 0, 1)" },
    },
  },
  {
    id: "vibrant-commerce",
    name: "Vibrant Commerce",
    tokens: {
      ...DEFAULT_DESIGN_TOKENS,
      colors: {
        primary: "#111827",
        accent: "#f97316",
        background: "#ffffff",
        surface: "#ffffff",
        muted: "#ecfeff",
        destructive: "#dc2626",
        success: "#16a34a",
      },
      typography: {
        fontFamilyBase:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji",
        fontSizeBasePx: 16,
        fontScale: 1.08,
      },
      radius: { sm: 12, md: 16, lg: 22, xl: 34 },
      spacing: { xs: 4, sm: 8, md: 12, lg: 18, xl: 28 },
      shadows: {
        sm: "0 1px 2px rgba(17,24,39,0.08)",
        md: "0 16px 40px rgba(17,24,39,0.14)",
        lg: "0 40px 96px rgba(17,24,39,0.18)",
      },
      motion: { fastMs: 110, normalMs: 210, slowMs: 400, easeStandard: "cubic-bezier(0.2, 0, 0, 1)" },
    },
  },
  {
    id: "tech-glass",
    name: "Tech Glass",
    tokens: {
      ...DEFAULT_DESIGN_TOKENS,
      colors: {
        primary: "#0b1220",
        accent: "#22d3ee",
        background: "#050816",
        surface: "#0b1026",
        muted: "#111a35",
        destructive: "#fb7185",
        success: "#34d399",
      },
      typography: {
        fontFamilyBase:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji",
        fontSizeBasePx: 16,
        fontScale: 1.06,
      },
      radius: { sm: 14, md: 18, lg: 24, xl: 36 },
      spacing: { xs: 4, sm: 8, md: 12, lg: 18, xl: 28 },
      shadows: {
        sm: "0 1px 2px rgba(0,0,0,0.45)",
        md: "0 18px 50px rgba(34,211,238,0.12)",
        lg: "0 44px 120px rgba(34,211,238,0.14)",
      },
      motion: { fastMs: 120, normalMs: 220, slowMs: 420, easeStandard: "cubic-bezier(0.16, 1, 0.3, 1)" },
    },
  },
  {
    id: "elegant-boutique",
    name: "Elegant Boutique",
    tokens: {
      ...DEFAULT_DESIGN_TOKENS,
      colors: {
        primary: "#1f2937",
        accent: "#a855f7",
        background: "#ffffff",
        surface: "#faf5ff",
        muted: "#fdf2f8",
        destructive: "#e11d48",
        success: "#22c55e",
      },
      typography: {
        fontFamilyBase:
          "ui-serif, Georgia, Cambria, Times New Roman, Times, serif",
        fontSizeBasePx: 16,
        fontScale: 1.06,
      },
      radius: { sm: 12, md: 18, lg: 26, xl: 40 },
      spacing: { xs: 4, sm: 10, md: 14, lg: 20, xl: 32 },
      shadows: {
        sm: "0 1px 2px rgba(31,41,55,0.08)",
        md: "0 18px 44px rgba(31,41,55,0.12)",
        lg: "0 44px 120px rgba(31,41,55,0.14)",
      },
      motion: { fastMs: 130, normalMs: 230, slowMs: 440, easeStandard: "cubic-bezier(0.2, 0, 0, 1)" },
    },
  },

  {
    id: "daraz-marketplace",
    name: "Daraz Marketplace Theme",
    tokens: {
      ...DEFAULT_DESIGN_TOKENS,
      colors: {
        primary: "#111827",
        accent: "#f57224",
        background: "#ffffff",
        surface: "#ffffff",
        muted: "#fff7ed",
        destructive: "#dc2626",
        success: "#16a34a",
      },
      layout: {
        ...DEFAULT_DESIGN_TOKENS.layout,
        gridColumns: 5,
        cardGapPx: 12,
        headerHeightPx: 78,
        footerStyle: "mega",
      },
      components: {
        ...DEFAULT_DESIGN_TOKENS.components,
        headerStyle: "marketplace",
        cardStyle: "bordered",
        buttonStyle: "solid",
        footerStyle: "mega",
      },
      marketplace: {
        enabled: true,
        compactGrid: true,
        discountBadges: true,
        flashSaleRibbons: true,
        stickyHeader: true,
        aggressiveCtas: true,
      },
      animations: {
        ...DEFAULT_DESIGN_TOKENS.animations,
        intensity: 1.15,
        cardLift: true,
        imageZoom: true,
      },
    },
  },

  {
    id: "aliexpress-commerce",
    name: "AliExpress Commerce Theme",
    tokens: {
      ...DEFAULT_DESIGN_TOKENS,
      colors: {
        primary: "#111827",
        accent: "#ef4444",
        background: "#ffffff",
        surface: "#ffffff",
        muted: "#fff1f2",
        destructive: "#b91c1c",
        success: "#16a34a",
      },
      layout: {
        ...DEFAULT_DESIGN_TOKENS.layout,
        gridColumns: 5,
        cardGapPx: 12,
        headerHeightPx: 76,
        footerStyle: "grid",
      },
      radius: { sm: 14, md: 18, lg: 24, xl: 34 },
      components: {
        ...DEFAULT_DESIGN_TOKENS.components,
        headerStyle: "marketplace",
        cardStyle: "shadow",
        buttonStyle: "gradient",
        footerStyle: "grid",
      },
      marketplace: {
        enabled: true,
        compactGrid: true,
        discountBadges: true,
        flashSaleRibbons: true,
        stickyHeader: true,
        aggressiveCtas: true,
      },
      shadows: {
        sm: "0 1px 2px rgba(17,24,39,0.08)",
        md: "0 14px 34px rgba(17,24,39,0.14)",
        lg: "0 44px 120px rgba(17,24,39,0.18)",
      },
    },
  },

  {
    id: "amazon-clean",
    name: "Amazon Clean Commerce",
    tokens: {
      ...DEFAULT_DESIGN_TOKENS,
      colors: {
        primary: "#232f3e",
        accent: "#ff9900",
        background: "#ffffff",
        surface: "#ffffff",
        muted: "#f4f4f5",
        destructive: "#dc2626",
        success: "#16a34a",
      },
      layout: {
        ...DEFAULT_DESIGN_TOKENS.layout,
        gridColumns: 4,
        cardGapPx: 14,
        headerHeightPx: 74,
        footerStyle: "dark",
      },
      components: {
        ...DEFAULT_DESIGN_TOKENS.components,
        headerStyle: "classic",
        cardStyle: "flat",
        buttonStyle: "solid",
        footerStyle: "dark",
      },
      animations: {
        ...DEFAULT_DESIGN_TOKENS.animations,
        intensity: 0.9,
        parallax: false,
        smoothScroll: false,
      },
    },
  },

  {
    id: "shopify-minimal-pro",
    name: "Shopify Modern Minimal Pro",
    tokens: {
      ...DEFAULT_DESIGN_TOKENS,
      colors: {
        primary: "#0f172a",
        accent: "#22c55e",
        background: "#ffffff",
        surface: "#ffffff",
        muted: "#f8fafc",
        destructive: "#ef4444",
        success: "#16a34a",
      },
      typography: {
        ...DEFAULT_DESIGN_TOKENS.typography,
        fontScale: 1.08,
        fontFamilyBase:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji",
      },
      layout: {
        ...DEFAULT_DESIGN_TOKENS.layout,
        containerWidthPx: 1200,
        cardGapPx: 18,
        sectionPaddingPx: 32,
        gridColumns: 4,
        footerStyle: "simple",
      },
      components: {
        ...DEFAULT_DESIGN_TOKENS.components,
        headerStyle: "minimal",
        cardStyle: "bordered",
        buttonStyle: "soft",
        footerStyle: "simple",
      },
      animations: {
        ...DEFAULT_DESIGN_TOKENS.animations,
        intensity: 0.95,
        cardLift: true,
        imageZoom: false,
      },
    },
  },

  {
    id: "temu-inspired",
    name: "Temu Inspired",
    tokens: {
      ...DEFAULT_DESIGN_TOKENS,
      colors: {
        primary: "#111827",
        accent: "#f97316",
        background: "#ffffff",
        surface: "#ffffff",
        muted: "#fef3c7",
        destructive: "#ef4444",
        success: "#16a34a",
      },
      layout: {
        ...DEFAULT_DESIGN_TOKENS.layout,
        gridColumns: 5,
        cardGapPx: 10,
        sectionPaddingPx: 20,
        headerHeightPx: 74,
        footerStyle: "grid",
      },
      radius: { sm: 14, md: 18, lg: 24, xl: 34 },
      components: {
        ...DEFAULT_DESIGN_TOKENS.components,
        headerStyle: "marketplace",
        cardStyle: "shadow",
        buttonStyle: "gradient",
        footerStyle: "grid",
      },
      marketplace: {
        enabled: true,
        compactGrid: true,
        discountBadges: true,
        flashSaleRibbons: true,
        stickyHeader: true,
        aggressiveCtas: true,
      },
      animations: {
        ...DEFAULT_DESIGN_TOKENS.animations,
        intensity: 1.2,
        cardLift: true,
        imageZoom: true,
      },
    },
  },
];

export const THEME_PRESET_MAP: Record<BuilderThemeId, BuilderThemePreset> = THEME_PRESETS.reduce((acc, t) => {
  acc[t.id] = t;
  return acc;
}, {} as Record<BuilderThemeId, BuilderThemePreset>);
