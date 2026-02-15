"use client";

import { useEffect, useMemo, useRef } from "react";

import {
  applyCssVars,
  clearCssVars,
  normalizeDesignTokens,
  tokensToCssVars,
  tokensToThemeOverrides,
  type DesignTokens,
  type CssVarMap,
} from "@/lib/design-system/tokens";
import { useAppSelector } from "@/store/hooks";

function shouldEnableProvider() {
  if (typeof window === "undefined") return false;
  const flag = process.env.NEXT_PUBLIC_THEME_BUILDER;
  if (flag === "1") return true;
  const params = new URLSearchParams(window.location.search);
  if (params.get("themeBuilderPreview") === "1") return true;
  return window.location.pathname.startsWith("/admin/theme-builder");
}

type ThemeProviderProps = {
  children: React.ReactNode;
};

function mergeTokenGroups(base: unknown, patch: unknown) {
  if (typeof base !== "object" || base === null) return patch;
  if (typeof patch !== "object" || patch === null) return base;
  return { ...(base as Record<string, unknown>), ...(patch as Record<string, unknown>) };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function mergeTokens(base: Record<string, unknown>, patch: Record<string, unknown>) {
  return {
    ...base,
    ...patch,
    colors: mergeTokenGroups(base.colors, patch.colors),
    typography: mergeTokenGroups(base.typography, patch.typography),
    radius: mergeTokenGroups(base.radius, patch.radius),
    spacing: mergeTokenGroups(base.spacing, patch.spacing),
    shadows: mergeTokenGroups(base.shadows, patch.shadows),
    motion: mergeTokenGroups(base.motion, patch.motion),
    layout: mergeTokenGroups(base.layout, patch.layout),
    components: mergeTokenGroups(base.components, patch.components),
    animations: mergeTokenGroups(base.animations, patch.animations),
    depth: mergeTokenGroups(base.depth, patch.depth),
    marketplace: mergeTokenGroups(base.marketplace, patch.marketplace),
    overrides: mergeTokenGroups(base.overrides, patch.overrides),
  };
}

function cssFromVars(selector: string, vars: CssVarMap) {
  const body = Object.entries(vars)
    .map(([k, v]) => `${k}:${v};`)
    .join("");
  return `${selector}{${body}}`;
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  const builder = useAppSelector((s) => s.themeBuilder);

  const enabled = shouldEnableProvider();
  const activeMode = enabled ? builder.mode : "default";

  const vars: CssVarMap | null = useMemo(() => {
    if (activeMode === "default") return null;

    const dsVars = tokensToCssVars(builder.customTokens);
    const themeOverrides = tokensToThemeOverrides(builder.customTokens);

    return { ...dsVars, ...themeOverrides };
  }, [activeMode, builder.customTokens]);

  const scopedCssText: string = useMemo(() => {
    if (activeMode === "default") return "";

    const overrides = builder.customTokens.overrides;
    const baseTokens = builder.customTokens as unknown as Record<string, unknown>;

    const scopes: Array<{ key: keyof typeof overrides; selector: string }> = [
      { key: "header", selector: '[data-ds-scope="header"]' },
      { key: "footer", selector: '[data-ds-scope="footer"]' },
      { key: "productCard", selector: '[data-ds-scope="productCard"]' },
      { key: "buttons", selector: '[data-ds-scope="buttons"]' },
      { key: "badge", selector: '[data-ds-scope="badge"]' },
      { key: "cartDrawer", selector: '[data-ds-scope="cartDrawer"]' },
    ];

    let out = "";
    for (const s of scopes) {
      const entry = overrides[s.key];
      if (!entry || entry.mode !== "override" || !entry.tokens) continue;

      const patch = isRecord(entry.tokens) ? (entry.tokens as Record<string, unknown>) : null;
      if (!patch) continue;

      const mergedUnknown = mergeTokens(baseTokens, patch);
      const mergedTokens: DesignTokens = normalizeDesignTokens(mergedUnknown);
      const dsVars = tokensToCssVars(mergedTokens);
      const themeVars = tokensToThemeOverrides(mergedTokens);
      out += cssFromVars(s.selector, { ...dsVars, ...themeVars });
    }
    return out;
  }, [activeMode, builder.customTokens]);

  const rafRef = useRef<number | null>(null);
  const appliedKeysRef = useRef<string[]>([]);
  const styleElRef = useRef<HTMLStyleElement | null>(null);
  const styleRafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;

      if (!vars) {
        if (appliedKeysRef.current.length) {
          clearCssVars(root, appliedKeysRef.current);
          appliedKeysRef.current = [];
        }
        return;
      }

      applyCssVars(root, vars);
      appliedKeysRef.current = Object.keys(vars);
    });

    return () => {
      if (typeof window !== "undefined" && rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      if (appliedKeysRef.current.length) {
        clearCssVars(root, appliedKeysRef.current);
        appliedKeysRef.current = [];
      }
    };
  }, [vars]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    if (styleRafRef.current) {
      window.cancelAnimationFrame(styleRafRef.current);
      styleRafRef.current = null;
    }

    styleRafRef.current = window.requestAnimationFrame(() => {
      styleRafRef.current = null;

      const wantText = scopedCssText;
      if (!wantText) {
        if (styleElRef.current) {
          styleElRef.current.remove();
          styleElRef.current = null;
        }
        return;
      }

      if (!styleElRef.current) {
        const el = document.createElement("style");
        el.setAttribute("data-theme-builder", "scoped-overrides");
        document.head.appendChild(el);
        styleElRef.current = el;
      }

      if (styleElRef.current.textContent !== wantText) {
        styleElRef.current.textContent = wantText;
      }
    });

    return () => {
      if (typeof window !== "undefined" && styleRafRef.current) {
        window.cancelAnimationFrame(styleRafRef.current);
        styleRafRef.current = null;
      }
      if (styleElRef.current) {
        styleElRef.current.remove();
        styleElRef.current = null;
      }
    };
  }, [scopedCssText]);

  return children;
}
