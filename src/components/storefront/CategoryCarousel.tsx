"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type Props<T> = {
  title: string;
  subtitle?: string;
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  loading?: boolean;
  skeletonCount?: number;
  renderSkeleton?: (index: number) => React.ReactNode;
  className?: string;
  itemClassName?: string;
  edgeFade?: "none" | "soft" | "strong";
  desktopArrows?: "always" | "hover";
};

export default function CategoryCarousel<T>({
  title,
  subtitle,
  items,
  renderItem,
  loading,
  skeletonCount,
  renderSkeleton,
  className,
  itemClassName,
  edgeFade = "none",
  desktopArrows = "always",
}: Props<T>) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const swipeBlockClickRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  const updateArrows = useMemo(() => {
    return () => {
      const el = scrollerRef.current;
      if (!el) return;

      const max = el.scrollWidth - el.clientWidth;
      const left = el.scrollLeft;

      setCanScrollLeft(left > 2);
      setCanScrollRight(left < max - 2);

      if (edgeFade === "none") {
        setShowLeftFade(false);
        setShowRightFade(false);
        return;
      }

      const atStart = left <= 1;
      const atEnd = left + el.clientWidth >= el.scrollWidth - 1;

      setShowLeftFade(!atStart);
      setShowRightFade(!atEnd);
    };
  }, [edgeFade]);

  useEffect(() => {
    updateArrows();

    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => updateArrows();
    el.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver(() => updateArrows());
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [items.length, loading, skeletonCount, updateArrows]);

  const skeletonItems = useMemo(() => {
    const n = typeof skeletonCount === "number" && Number.isFinite(skeletonCount) ? Math.max(0, Math.round(skeletonCount)) : 0;
    return Array.from({ length: n });
  }, [skeletonCount]);

  function scrollByCard(dir: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;

    const first = el.querySelector<HTMLElement>("[data-carousel-item='1']");
    const step = first?.getBoundingClientRect().width ?? Math.max(240, el.clientWidth * 0.5);

    el.scrollTo({ left: el.scrollLeft + step * dir, behavior: "smooth" });
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Track if user is swiping; we'll cancel click if movement exceeds a small threshold.
    // This avoids accidental product opens while doing horizontal swipe.
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    swipeBlockClickRef.current = false;
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const start = pointerStartRef.current;
    if (!start || swipeBlockClickRef.current) return;

    const dx = Math.abs(e.clientX - start.x);
    const dy = Math.abs(e.clientY - start.y);

    const threshold = e.pointerType === "touch" ? 10 : 6;

    if (dx > threshold && dx > dy) {
      swipeBlockClickRef.current = true;
    }
  }

  function onPointerUp() {
    pointerStartRef.current = null;
    // Keep swipeBlockClickRef for the ensuing click event; it will be reset on next pointer down.
  }

  function onClickCapture(e: React.MouseEvent<HTMLDivElement>) {
    if (!swipeBlockClickRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    // Ensure the next tap/click works normally.
    swipeBlockClickRef.current = false;
  }

  return (
    <div className={cn("group w-full", className)}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-tight text-foreground">{title}</p>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => scrollByCard(-1)}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
            className={cn(desktopArrows === "hover" && "opacity-0 transition-opacity group-hover:opacity-100")}
          >
            ←
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => scrollByCard(1)}
            disabled={!canScrollRight}
            aria-label="Scroll right"
            className={cn(desktopArrows === "hover" && "opacity-0 transition-opacity group-hover:opacity-100")}
          >
            →
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <div className="relative">
          {edgeFade === "none" ? null : (
            <>
              <div
                className={cn(
                  "pointer-events-none absolute inset-y-0 left-0 z-10",
                  edgeFade === "strong" ? "w-10 opacity-90" : "w-8 opacity-70",
                  "bg-gradient-to-r from-surface to-transparent transition-opacity",
                  showLeftFade ? "opacity-100" : "opacity-0"
                )}
              />
              <div
                className={cn(
                  "pointer-events-none absolute inset-y-0 right-0 z-10",
                  edgeFade === "strong" ? "w-10 opacity-90" : "w-8 opacity-70",
                  "bg-gradient-to-l from-surface to-transparent transition-opacity",
                  showRightFade ? "opacity-100" : "opacity-0"
                )}
              />
            </>
          )}

          <div
            ref={scrollerRef}
            className={cn("horizontal-scroll-container")}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onClickCapture={onClickCapture}
          >
          {loading
            ? skeletonItems.map((_, idx) => (
                <div
                  key={idx}
                  className={cn("product-card", itemClassName)}
                  data-carousel-item={idx === 0 ? "1" : undefined}
                >
                  {renderSkeleton ? renderSkeleton(idx) : null}
                </div>
              ))
            : items.map((item, idx) => (
                <div
                  key={idx}
                  className={cn("product-card", itemClassName)}
                  data-carousel-item={idx === 0 ? "1" : undefined}
                >
                  {renderItem(item, idx)}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
