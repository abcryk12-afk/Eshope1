"use client";

import { useEffect, useMemo, useRef } from "react";

import { useAppSelector } from "@/store/hooks";

type AdvancedSettingsProviderProps = {
  children: React.ReactNode;
};

function toFlag(v: boolean) {
  return v ? "1" : "0";
}

function buildCss(opts: {
  reduceMotion: boolean;
  highPerformance: boolean;
  disableGlass: boolean;
  disable3d: boolean;
}) {
  let css = "";

  if (opts.reduceMotion) {
    css += `html[data-adv-reduce-motion="1"] *,html[data-adv-reduce-motion="1"] *::before,html[data-adv-reduce-motion="1"] *::after{animation-duration:0.001ms !important;animation-iteration-count:1 !important;transition-duration:0.001ms !important;scroll-behavior:auto !important;}`;
  }

  if (opts.highPerformance) {
    css += `html[data-adv-high-performance="1"]{--ds-anim-hover:0;--ds-anim-card-lift:0;--ds-anim-image-zoom:0;--ds-anim-parallax:0;--ds-anim-smooth-scroll:0;--ds-anim-intensity:0;}`;
    css += `html[data-adv-high-performance="1"]{scroll-behavior:auto;}`;
  }

  if (opts.disableGlass) {
    css += `html[data-adv-disable-glass="1"]{--ds-depth-glass:0;}`;
    css += `html[data-adv-disable-glass="1"] .backdrop-blur,html[data-adv-disable-glass="1"] [class*="backdrop-blur"]{backdrop-filter:none !important;}`;
  }

  if (opts.disable3d) {
    css += `html[data-adv-disable-3d="1"]{--ds-depth-perspective:0px;}`;
  }

  return css;
}

export default function AdvancedSettingsProvider({ children }: AdvancedSettingsProviderProps) {
  const adv = useAppSelector((s) => s.advancedSettings);

  const attrs = useMemo(
    () => ({
      reduceMotion: Boolean(adv.reduceMotion),
      highPerformance: Boolean(adv.highPerformance),
      disableGlass: Boolean(adv.disableGlass),
      disable3d: Boolean(adv.disable3d),
    }),
    [adv.reduceMotion, adv.highPerformance, adv.disableGlass, adv.disable3d]
  );

  const cssText = useMemo(() => buildCss(attrs), [attrs]);

  const styleElRef = useRef<HTMLStyleElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;

    root.setAttribute("data-adv-reduce-motion", toFlag(attrs.reduceMotion));
    root.setAttribute("data-adv-high-performance", toFlag(attrs.highPerformance));
    root.setAttribute("data-adv-disable-glass", toFlag(attrs.disableGlass));
    root.setAttribute("data-adv-disable-3d", toFlag(attrs.disable3d));

    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;

      if (!cssText) {
        if (styleElRef.current) {
          styleElRef.current.remove();
          styleElRef.current = null;
        }
        return;
      }

      if (!styleElRef.current) {
        const el = document.createElement("style");
        el.setAttribute("data-advanced-settings", "overrides");
        document.head.appendChild(el);
        styleElRef.current = el;
      }

      if (styleElRef.current.textContent !== cssText) {
        styleElRef.current.textContent = cssText;
      }
    });

    return () => {
      if (typeof window !== "undefined" && rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      if (styleElRef.current) {
        styleElRef.current.remove();
        styleElRef.current = null;
      }

      root.removeAttribute("data-adv-reduce-motion");
      root.removeAttribute("data-adv-high-performance");
      root.removeAttribute("data-adv-disable-glass");
      root.removeAttribute("data-adv-disable-3d");
    };
  }, [attrs.reduceMotion, attrs.highPerformance, attrs.disableGlass, attrs.disable3d, cssText]);

  return children;
}
