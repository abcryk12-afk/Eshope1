export type DsColors = {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  muted: string;
  destructive: string;
  success: string;
};

export type DsTypography = {
  fontFamilyBase: string;
  fontSizeBasePx: number;
  fontScale: number;
};

export type DsRadius = {
  sm: number;
  md: number;
  lg: number;
  xl: number;
};

export type DsSpacing = {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
};

export type DsShadows = {
  sm: string;
  md: string;
  lg: string;
};

export type DsMotion = {
  fastMs: number;
  normalMs: number;
  slowMs: number;
  easeStandard: string;
};

export type DsLayout = {
  containerWidthPx: number;
  gridColumns: number;
  cardGapPx: number;
  sectionPaddingPx: number;
  headerHeightPx: number;
  footerStyle: "simple" | "mega" | "grid" | "dark";
};

export type ComponentStyleCard = "flat" | "shadow" | "glass" | "bordered";
export type ComponentStyleButton = "solid" | "outline" | "soft" | "gradient";
export type ComponentStyleHeader = "classic" | "marketplace" | "minimal" | "center-logo";
export type ComponentStyleFooter = "simple" | "mega" | "grid" | "dark";

export type DsComponents = {
  cardStyle: ComponentStyleCard;
  buttonStyle: ComponentStyleButton;
  headerStyle: ComponentStyleHeader;
  footerStyle: ComponentStyleFooter;
};

export type DsAnimations = {
  hoverAnimations: boolean;
  cardLift: boolean;
  imageZoom: boolean;
  parallax: boolean;
  smoothScroll: boolean;
  intensity: number;
};

export type DsDepth = {
  glassMode: boolean;
  blurIntensityPx: number;
  perspectivePx: number;
  softShadows: boolean;
};

export type DsMarketplace = {
  enabled: boolean;
  compactGrid: boolean;
  discountBadges: boolean;
  flashSaleRibbons: boolean;
  stickyHeader: boolean;
  aggressiveCtas: boolean;
};

export type OverrideMode = "inherit" | "override";

export type ComponentOverride<T> = {
  mode: OverrideMode;
  tokens?: Partial<T>;
};

export type DsComponentOverrides = {
  header: ComponentOverride<DesignTokens>;
  footer: ComponentOverride<DesignTokens>;
  productCard: ComponentOverride<DesignTokens>;
  buttons: ComponentOverride<DesignTokens>;
  badge: ComponentOverride<DesignTokens>;
  cartDrawer: ComponentOverride<DesignTokens>;
};

export type DesignTokens = {
  colors: DsColors;
  typography: DsTypography;
  radius: DsRadius;
  spacing: DsSpacing;
  shadows: DsShadows;
  motion: DsMotion;
  layout: DsLayout;
  components: DsComponents;
  animations: DsAnimations;
  depth: DsDepth;
  marketplace: DsMarketplace;
  overrides: DsComponentOverrides;
};

export const DEFAULT_DESIGN_TOKENS: DesignTokens = {
  colors: {
    primary: "#18181b",
    accent: "#ff6a00",
    background: "#ffffff",
    surface: "#ffffff",
    muted: "#f4f4f5",
    destructive: "#ef4444",
    success: "#16a34a",
  },
  typography: {
    fontFamilyBase: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji",
    fontSizeBasePx: 16,
    fontScale: 1.06,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  shadows: {
    sm: "0 1px 2px rgba(0,0,0,0.06)",
    md: "0 8px 24px rgba(0,0,0,0.10)",
    lg: "0 24px 64px rgba(0,0,0,0.16)",
  },
  motion: {
    fastMs: 120,
    normalMs: 220,
    slowMs: 420,
    easeStandard: "cubic-bezier(0.2, 0, 0, 1)",
  },
  layout: {
    containerWidthPx: 1280,
    gridColumns: 4,
    cardGapPx: 16,
    sectionPaddingPx: 24,
    headerHeightPx: 72,
    footerStyle: "grid",
  },
  components: {
    cardStyle: "shadow",
    buttonStyle: "solid",
    headerStyle: "classic",
    footerStyle: "grid",
  },
  animations: {
    hoverAnimations: true,
    cardLift: true,
    imageZoom: true,
    parallax: false,
    smoothScroll: false,
    intensity: 1,
  },
  depth: {
    glassMode: false,
    blurIntensityPx: 16,
    perspectivePx: 900,
    softShadows: true,
  },
  marketplace: {
    enabled: false,
    compactGrid: false,
    discountBadges: false,
    flashSaleRibbons: false,
    stickyHeader: false,
    aggressiveCtas: false,
  },
  overrides: {
    header: { mode: "inherit" },
    footer: { mode: "inherit" },
    productCard: { mode: "inherit" },
    buttons: { mode: "inherit" },
    badge: { mode: "inherit" },
    cartDrawer: { mode: "inherit" },
  },
};

export type CssVarMap = Record<string, string>;

export function tokensToCssVars(tokens: DesignTokens): CssVarMap {
  return {
    "--ds-color-primary": tokens.colors.primary,
    "--ds-color-accent": tokens.colors.accent,
    "--ds-color-background": tokens.colors.background,
    "--ds-color-surface": tokens.colors.surface,
    "--ds-color-muted": tokens.colors.muted,
    "--ds-color-destructive": tokens.colors.destructive,
    "--ds-color-success": tokens.colors.success,

    "--ds-font-family-base": tokens.typography.fontFamilyBase,
    "--ds-font-size-base": `${tokens.typography.fontSizeBasePx}px`,
    "--ds-font-scale": String(tokens.typography.fontScale),

    "--ds-radius-sm": `${tokens.radius.sm}px`,
    "--ds-radius-md": `${tokens.radius.md}px`,
    "--ds-radius-lg": `${tokens.radius.lg}px`,
    "--ds-radius-xl": `${tokens.radius.xl}px`,

    "--ds-spacing-xs": `${tokens.spacing.xs}px`,
    "--ds-spacing-sm": `${tokens.spacing.sm}px`,
    "--ds-spacing-md": `${tokens.spacing.md}px`,
    "--ds-spacing-lg": `${tokens.spacing.lg}px`,
    "--ds-spacing-xl": `${tokens.spacing.xl}px`,

    "--ds-shadow-sm": tokens.shadows.sm,
    "--ds-shadow-md": tokens.shadows.md,
    "--ds-shadow-lg": tokens.shadows.lg,

    "--ds-duration-fast": `${tokens.motion.fastMs}ms`,
    "--ds-duration-normal": `${tokens.motion.normalMs}ms`,
    "--ds-duration-slow": `${tokens.motion.slowMs}ms`,
    "--ds-ease-standard": tokens.motion.easeStandard,

    "--ds-container-width": `${tokens.layout.containerWidthPx}px`,
    "--ds-grid-columns": String(tokens.layout.gridColumns),
    "--ds-card-gap": `${tokens.layout.cardGapPx}px`,
    "--ds-section-padding": `${tokens.layout.sectionPaddingPx}px`,
    "--ds-header-height": `${tokens.layout.headerHeightPx}px`,
    "--ds-footer-style": tokens.layout.footerStyle,

    "--ds-card-style": tokens.components.cardStyle,
    "--ds-button-style": tokens.components.buttonStyle,
    "--ds-header-style": tokens.components.headerStyle,
    "--ds-footer-style-component": tokens.components.footerStyle,

    "--ds-anim-hover": tokens.animations.hoverAnimations ? "1" : "0",
    "--ds-anim-card-lift": tokens.animations.cardLift ? "1" : "0",
    "--ds-anim-image-zoom": tokens.animations.imageZoom ? "1" : "0",
    "--ds-anim-parallax": tokens.animations.parallax ? "1" : "0",
    "--ds-anim-smooth-scroll": tokens.animations.smoothScroll ? "1" : "0",
    "--ds-anim-intensity": String(tokens.animations.intensity),

    "--ds-depth-glass": tokens.depth.glassMode ? "1" : "0",
    "--ds-depth-blur": `${tokens.depth.blurIntensityPx}px`,
    "--ds-depth-perspective": `${tokens.depth.perspectivePx}px`,
    "--ds-depth-soft-shadows": tokens.depth.softShadows ? "1" : "0",

    "--ds-marketplace-enabled": tokens.marketplace.enabled ? "1" : "0",
    "--ds-marketplace-compact-grid": tokens.marketplace.compactGrid ? "1" : "0",
    "--ds-marketplace-discount-badges": tokens.marketplace.discountBadges ? "1" : "0",
    "--ds-marketplace-flash-ribbons": tokens.marketplace.flashSaleRibbons ? "1" : "0",
    "--ds-marketplace-sticky-header": tokens.marketplace.stickyHeader ? "1" : "0",
    "--ds-marketplace-aggressive-ctas": tokens.marketplace.aggressiveCtas ? "1" : "0",
  };
}

export function tokensToThemeOverrides(tokens: DesignTokens): CssVarMap {
  return {
    "--theme-primary": tokens.colors.primary,
    "--theme-accent": tokens.colors.accent,
    "--theme-background": tokens.colors.background,
    "--theme-surface": tokens.colors.surface,
    "--theme-muted": tokens.colors.muted,
    "--theme-destructive": tokens.colors.destructive,
    "--theme-success": tokens.colors.success,
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function pickNumber(v: unknown, fallback: number) {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function pickBoolean(v: unknown, fallback: boolean) {
  return typeof v === "boolean" ? v : fallback;
}

function pickString(v: unknown, fallback: string) {
  return typeof v === "string" ? v : fallback;
}

function pickOverrideTokens(v: unknown): Partial<DesignTokens> | undefined {
  if (!isRecord(v)) return undefined;
  return v as Partial<DesignTokens>;
}

export function normalizeDesignTokens(input: unknown): DesignTokens {
  const t = isRecord(input) ? input : {};

  const base = DEFAULT_DESIGN_TOKENS;
  const colors = isRecord(t.colors) ? t.colors : {};
  const typography = isRecord(t.typography) ? t.typography : {};
  const radius = isRecord(t.radius) ? t.radius : {};
  const spacing = isRecord(t.spacing) ? t.spacing : {};
  const shadows = isRecord(t.shadows) ? t.shadows : {};
  const motion = isRecord(t.motion) ? t.motion : {};
  const layout = isRecord(t.layout) ? t.layout : {};
  const components = isRecord(t.components) ? t.components : {};
  const animations = isRecord(t.animations) ? t.animations : {};
  const depth = isRecord(t.depth) ? t.depth : {};
  const marketplace = isRecord(t.marketplace) ? t.marketplace : {};
  const overrides = isRecord(t.overrides) ? t.overrides : {};

  return {
    colors: {
      primary: pickString(colors.primary, base.colors.primary),
      accent: pickString(colors.accent, base.colors.accent),
      background: pickString(colors.background, base.colors.background),
      surface: pickString(colors.surface, base.colors.surface),
      muted: pickString(colors.muted, base.colors.muted),
      destructive: pickString(colors.destructive, base.colors.destructive),
      success: pickString(colors.success, base.colors.success),
    },
    typography: {
      fontFamilyBase: pickString(typography.fontFamilyBase, base.typography.fontFamilyBase),
      fontSizeBasePx: pickNumber(typography.fontSizeBasePx, base.typography.fontSizeBasePx),
      fontScale: pickNumber(typography.fontScale, base.typography.fontScale),
    },
    radius: {
      sm: pickNumber(radius.sm, base.radius.sm),
      md: pickNumber(radius.md, base.radius.md),
      lg: pickNumber(radius.lg, base.radius.lg),
      xl: pickNumber(radius.xl, base.radius.xl),
    },
    spacing: {
      xs: pickNumber(spacing.xs, base.spacing.xs),
      sm: pickNumber(spacing.sm, base.spacing.sm),
      md: pickNumber(spacing.md, base.spacing.md),
      lg: pickNumber(spacing.lg, base.spacing.lg),
      xl: pickNumber(spacing.xl, base.spacing.xl),
    },
    shadows: {
      sm: pickString(shadows.sm, base.shadows.sm),
      md: pickString(shadows.md, base.shadows.md),
      lg: pickString(shadows.lg, base.shadows.lg),
    },
    motion: {
      fastMs: pickNumber(motion.fastMs, base.motion.fastMs),
      normalMs: pickNumber(motion.normalMs, base.motion.normalMs),
      slowMs: pickNumber(motion.slowMs, base.motion.slowMs),
      easeStandard: pickString(motion.easeStandard, base.motion.easeStandard),
    },
    layout: {
      containerWidthPx: pickNumber(layout.containerWidthPx, base.layout.containerWidthPx),
      gridColumns: pickNumber(layout.gridColumns, base.layout.gridColumns),
      cardGapPx: pickNumber(layout.cardGapPx, base.layout.cardGapPx),
      sectionPaddingPx: pickNumber(layout.sectionPaddingPx, base.layout.sectionPaddingPx),
      headerHeightPx: pickNumber(layout.headerHeightPx, base.layout.headerHeightPx),
      footerStyle: pickString(layout.footerStyle, base.layout.footerStyle) as DesignTokens["layout"]["footerStyle"],
    },
    components: {
      cardStyle: pickString(components.cardStyle, base.components.cardStyle) as DesignTokens["components"]["cardStyle"],
      buttonStyle: pickString(components.buttonStyle, base.components.buttonStyle) as DesignTokens["components"]["buttonStyle"],
      headerStyle: pickString(components.headerStyle, base.components.headerStyle) as DesignTokens["components"]["headerStyle"],
      footerStyle: pickString(components.footerStyle, base.components.footerStyle) as DesignTokens["components"]["footerStyle"],
    },
    animations: {
      hoverAnimations: pickBoolean(animations.hoverAnimations, base.animations.hoverAnimations),
      cardLift: pickBoolean(animations.cardLift, base.animations.cardLift),
      imageZoom: pickBoolean(animations.imageZoom, base.animations.imageZoom),
      parallax: pickBoolean(animations.parallax, base.animations.parallax),
      smoothScroll: pickBoolean(animations.smoothScroll, base.animations.smoothScroll),
      intensity: pickNumber(animations.intensity, base.animations.intensity),
    },
    depth: {
      glassMode: pickBoolean(depth.glassMode, base.depth.glassMode),
      blurIntensityPx: pickNumber(depth.blurIntensityPx, base.depth.blurIntensityPx),
      perspectivePx: pickNumber(depth.perspectivePx, base.depth.perspectivePx),
      softShadows: pickBoolean(depth.softShadows, base.depth.softShadows),
    },
    marketplace: {
      enabled: pickBoolean(marketplace.enabled, base.marketplace.enabled),
      compactGrid: pickBoolean(marketplace.compactGrid, base.marketplace.compactGrid),
      discountBadges: pickBoolean(marketplace.discountBadges, base.marketplace.discountBadges),
      flashSaleRibbons: pickBoolean(marketplace.flashSaleRibbons, base.marketplace.flashSaleRibbons),
      stickyHeader: pickBoolean(marketplace.stickyHeader, base.marketplace.stickyHeader),
      aggressiveCtas: pickBoolean(marketplace.aggressiveCtas, base.marketplace.aggressiveCtas),
    },
    overrides: {
      header: isRecord(overrides.header)
        ? {
            mode: pickString(overrides.header.mode, base.overrides.header.mode) as DesignTokens["overrides"]["header"]["mode"],
            tokens: pickOverrideTokens(overrides.header.tokens),
          }
        : base.overrides.header,
      footer: isRecord(overrides.footer)
        ? {
            mode: pickString(overrides.footer.mode, base.overrides.footer.mode) as DesignTokens["overrides"]["footer"]["mode"],
            tokens: pickOverrideTokens(overrides.footer.tokens),
          }
        : base.overrides.footer,
      productCard: isRecord(overrides.productCard)
        ? {
            mode: pickString(overrides.productCard.mode, base.overrides.productCard.mode) as DesignTokens["overrides"]["productCard"]["mode"],
            tokens: pickOverrideTokens(overrides.productCard.tokens),
          }
        : base.overrides.productCard,
      buttons: isRecord(overrides.buttons)
        ? {
            mode: pickString(overrides.buttons.mode, base.overrides.buttons.mode) as DesignTokens["overrides"]["buttons"]["mode"],
            tokens: pickOverrideTokens(overrides.buttons.tokens),
          }
        : base.overrides.buttons,
      badge: isRecord(overrides.badge)
        ? {
            mode: pickString(overrides.badge.mode, base.overrides.badge.mode) as DesignTokens["overrides"]["badge"]["mode"],
            tokens: pickOverrideTokens(overrides.badge.tokens),
          }
        : base.overrides.badge,
      cartDrawer: isRecord(overrides.cartDrawer)
        ? {
            mode: pickString(overrides.cartDrawer.mode, base.overrides.cartDrawer.mode) as DesignTokens["overrides"]["cartDrawer"]["mode"],
            tokens: pickOverrideTokens(overrides.cartDrawer.tokens),
          }
        : base.overrides.cartDrawer,
    },
  };
}

export function applyCssVars(el: HTMLElement, vars: CssVarMap) {
  for (const [k, v] of Object.entries(vars)) {
    el.style.setProperty(k, v);
  }
}

export function clearCssVars(el: HTMLElement, keys: string[]) {
  for (const k of keys) {
    el.style.removeProperty(k);
  }
}
