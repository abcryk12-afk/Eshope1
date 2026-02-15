"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store/hooks";
import type { FooterLayout, FooterSection as FooterSectionT } from "@/store/footerSlice";

import FooterSection from "@/components/layout/FooterSection";

function buildGridCols(columns: number) {
  const c = Math.min(6, Math.max(1, columns));
  if (c === 1) return "grid-cols-1";
  if (c === 2) return "grid-cols-1 md:grid-cols-2";
  if (c === 3) return "grid-cols-1 md:grid-cols-3";
  if (c === 4) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
  if (c === 5) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5";
  return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-6";
}

function splitLegal(sections: FooterSectionT[]) {
  const main: FooterSectionT[] = [];
  const legal: FooterSectionT[] = [];

  for (const s of sections) {
    if (s.type === "legal") legal.push(s);
    else main.push(s);
  }

  return { main, legal };
}

function applyStyle(layout: FooterLayout) {
  const bg = layout.colors.background?.trim();
  const text = layout.colors.text?.trim();

  const style: Record<string, string> = {};
  if (bg) style.background = bg;
  if (text) style.color = text;

  return style;
}

export default function Footer({ fallbackLayout }: { fallbackLayout?: FooterLayout }) {
  const storedLayout = useAppSelector((s) => s.footer.layout);
  const layout = storedLayout ?? fallbackLayout ?? null;

  const normalized = useMemo(() => {
    if (!layout) return null;

    const columns = Math.min(6, Math.max(1, Number(layout.columns ?? 4)));
    const align = layout.align === "center" ? "center" : layout.align === "right" ? "right" : "left";

    return {
      ...layout,
      columns,
      align,
      mobileView: layout.mobileView === "grid" ? "grid" : "accordion",
      style: layout.style === "gradient" ? "gradient" : layout.style === "dark" ? "dark" : "solid",
      darkMode: Boolean(layout.darkMode),
      sections: Array.isArray(layout.sections) ? layout.sections : [],
      spacing: {
        paddingY: layout.spacing?.paddingY || "py-12",
        gap: layout.spacing?.gap || "gap-10",
      },
    } as FooterLayout;
  }, [layout]);

  if (!normalized) return null;

  const { main, legal } = splitLegal(normalized.sections);

  const containerBgClass =
    normalized.style === "dark"
      ? "bg-foreground text-background"
      : normalized.style === "gradient"
        ? "bg-gradient-to-b from-surface to-background"
        : "bg-surface";

  const borderClass = normalized.style === "dark" ? "border-background/15" : "border-border";

  return (
    <footer
      className={cn("mt-12 border-t", borderClass, containerBgClass)}
      style={applyStyle(normalized)}
    >
      <div className={cn("mx-auto w-full max-w-6xl px-4", normalized.spacing.paddingY)}>
        {normalized.mobileView === "grid" ? (
          <>
            <div className={cn("hidden md:grid", buildGridCols(normalized.columns), normalized.spacing.gap)}>
              {main
                .filter((s) => s.enabled)
                .map((s) => (
                  <div key={s.id}>
                    <FooterSection section={s} align={normalized.align} />
                  </div>
                ))}
            </div>

            <div className="md:hidden">
              <div className="-mx-4 overflow-x-auto px-4">
                <div className={cn("grid grid-flow-col auto-cols-[minmax(180px,1fr)]", normalized.spacing.gap)}>
                  {main
                    .filter((s) => s.enabled)
                    .map((s) => (
                      <div key={s.id} className="min-w-0">
                        <FooterSection section={s} align={normalized.align} />
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className={cn("grid", buildGridCols(normalized.columns), normalized.spacing.gap)}>
            {main
              .filter((s) => s.enabled)
              .map((s) => (
                <div key={s.id} className="hidden md:block">
                  <FooterSection section={s} align={normalized.align} />
                </div>
              ))}

            {/* Mobile accordion */}
            <div className="md:hidden">
              <div className="space-y-2">
                {main
                  .filter((s) => s.enabled)
                  .map((s) => (
                    <details
                      key={s.id}
                      className={cn(
                        "group overflow-hidden rounded-2xl border",
                        normalized.style === "dark" ? "border-background/15 bg-foreground/10" : "border-border bg-background"
                      )}
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4">
                        <span className={cn("text-sm font-semibold", normalized.style === "dark" ? "text-background" : "text-foreground")}>
                          {s.title || "Section"}
                        </span>
                        <span
                          className={cn(
                            "text-xs text-muted-foreground transition-transform group-open:rotate-180",
                            normalized.style === "dark" ? "text-background/70" : "text-muted-foreground"
                          )}
                        >
                          ↓
                        </span>
                      </summary>

                      <div className="max-h-0 overflow-hidden px-4 pb-0 transition-all duration-300 group-open:max-h-96">
                        <div className="pb-4 pt-1">
                          <FooterSection section={{ ...s, title: "" }} align={normalized.align} />
                        </div>
                      </div>
                    </details>
                  ))}
              </div>
            </div>
          </div>
        )}

        {legal
          .filter((s) => s.enabled)
          .map((s) => (
            <FooterSection key={s.id} section={s} align={normalized.align} />
          ))}
      </div>
    </footer>
  );
}
