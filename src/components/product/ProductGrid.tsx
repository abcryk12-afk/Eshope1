"use client";

import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { useStorefrontSettings } from "@/hooks/useStorefrontSettings";

type ProductGridProps = {
  children: React.ReactNode;
  className?: string;
};

function clampInt(n: unknown, min: number, max: number, fallback: number) {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(v)));
}

export default function ProductGrid({ children, className }: ProductGridProps) {
  const { settings } = useStorefrontSettings();

  const gap = settings?.storefrontLayout?.grid?.gap ?? "normal";
  const gapClass = gap === "compact" ? "gap-2 sm:gap-3" : gap === "spacious" ? "gap-4 sm:gap-6" : "gap-3 sm:gap-4";

  const cols = useMemo(() => {
    const grid = settings?.storefrontLayout?.grid;

    const mobileCols = clampInt(grid?.mobileCols, 2, 5, 2);
    const tabletCols = clampInt(grid?.tabletCols, 3, 5, 3);
    const desktopCols = clampInt(grid?.desktopCols, 4, 6, 4);

    return { mobileCols, tabletCols, desktopCols };
  }, [settings?.storefrontLayout?.grid]);

  const [activeCols, setActiveCols] = useState(cols.mobileCols);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mqTablet = window.matchMedia("(min-width: 768px)");
    const mqDesktop = window.matchMedia("(min-width: 1024px)");

    function recompute() {
      if (mqDesktop.matches) {
        setActiveCols(cols.desktopCols);
        return;
      }

      if (mqTablet.matches) {
        setActiveCols(cols.tabletCols);
        return;
      }

      setActiveCols(cols.mobileCols);
    }

    recompute();

    const handler = () => recompute();

    if (typeof mqTablet.addEventListener === "function") {
      mqTablet.addEventListener("change", handler);
      mqDesktop.addEventListener("change", handler);
      return () => {
        mqTablet.removeEventListener("change", handler);
        mqDesktop.removeEventListener("change", handler);
      };
    }

    mqTablet.addListener(handler);
    mqDesktop.addListener(handler);
    return () => {
      mqTablet.removeListener(handler);
      mqDesktop.removeListener(handler);
    };
  }, [cols.desktopCols, cols.mobileCols, cols.tabletCols]);

  return (
    <div
      className={cn("grid", gapClass, className)}
      style={{
        gridTemplateColumns: `repeat(${activeCols}, minmax(0, 1fr))`,
      }}
    >
      {children}
    </div>
  );
}
