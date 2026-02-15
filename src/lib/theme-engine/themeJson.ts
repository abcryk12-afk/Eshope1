import { z } from "zod";

import { normalizeDesignTokens, type DesignTokens } from "@/lib/design-system/tokens";

export const DesignTokensSchema: z.ZodType<DesignTokens> = z
  .object({
    colors: z
      .object({
        primary: z.string(),
        accent: z.string(),
        background: z.string(),
        surface: z.string(),
        muted: z.string(),
        destructive: z.string(),
        success: z.string(),
      })
      .partial()
      .optional(),
    typography: z
      .object({
        fontFamilyBase: z.string(),
        fontSizeBasePx: z.number(),
        fontScale: z.number(),
      })
      .partial()
      .optional(),
    radius: z
      .object({
        sm: z.number(),
        md: z.number(),
        lg: z.number(),
        xl: z.number(),
      })
      .partial()
      .optional(),
    spacing: z
      .object({
        xs: z.number(),
        sm: z.number(),
        md: z.number(),
        lg: z.number(),
        xl: z.number(),
      })
      .partial()
      .optional(),
    shadows: z
      .object({
        sm: z.string(),
        md: z.string(),
        lg: z.string(),
      })
      .partial()
      .optional(),
    motion: z
      .object({
        fastMs: z.number(),
        normalMs: z.number(),
        slowMs: z.number(),
        easeStandard: z.string(),
      })
      .partial()
      .optional(),
    layout: z
      .object({
        containerWidthPx: z.number(),
        gridColumns: z.number(),
        cardGapPx: z.number(),
        sectionPaddingPx: z.number(),
        headerHeightPx: z.number(),
        footerStyle: z.enum(["simple", "mega", "grid", "dark"]),
      })
      .partial()
      .optional(),
    components: z
      .object({
        cardStyle: z.enum(["flat", "shadow", "glass", "bordered"]),
        buttonStyle: z.enum(["solid", "outline", "soft", "gradient"]),
        headerStyle: z.enum(["classic", "marketplace", "minimal", "center-logo"]),
        footerStyle: z.enum(["simple", "mega", "grid", "dark"]),
      })
      .partial()
      .optional(),
    animations: z
      .object({
        hoverAnimations: z.boolean(),
        cardLift: z.boolean(),
        imageZoom: z.boolean(),
        parallax: z.boolean(),
        smoothScroll: z.boolean(),
        intensity: z.number(),
      })
      .partial()
      .optional(),
    depth: z
      .object({
        glassMode: z.boolean(),
        blurIntensityPx: z.number(),
        perspectivePx: z.number(),
        softShadows: z.boolean(),
      })
      .partial()
      .optional(),
    marketplace: z
      .object({
        enabled: z.boolean(),
        compactGrid: z.boolean(),
        discountBadges: z.boolean(),
        flashSaleRibbons: z.boolean(),
        stickyHeader: z.boolean(),
        aggressiveCtas: z.boolean(),
      })
      .partial()
      .optional(),
    overrides: z.unknown().optional(),
  })
  .passthrough()
  .transform((v) => normalizeDesignTokens(v));

export type ThemeJsonV1 = {
  version: 1;
  name: string;
  presetId?: string;
  tokens: DesignTokens;
  createdAt: number;
};

export const ThemeJsonV1Schema = z.object({
  version: z.literal(1),
  name: z.string(),
  presetId: z.string().optional(),
  tokens: DesignTokensSchema,
  createdAt: z.number(),
});

export function exportThemeJsonV1(args: { name: string; presetId?: string; tokens: DesignTokens }): ThemeJsonV1 {
  return {
    version: 1,
    name: args.name,
    presetId: args.presetId,
    tokens: args.tokens,
    createdAt: Date.now(),
  };
}

export function importThemeJsonV1(raw: unknown) {
  return ThemeJsonV1Schema.safeParse(raw);
}
