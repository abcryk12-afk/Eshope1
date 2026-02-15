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
}: Props<T>) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = useMemo(() => {
    return () => {
      const el = scrollerRef.current;
      if (!el) return;

      const max = el.scrollWidth - el.clientWidth;
      const left = el.scrollLeft;

      setCanScrollLeft(left > 2);
      setCanScrollRight(left < max - 2);
    };
  }, []);

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

  return (
    <div className={cn("w-full", className)}>
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
          >
            →
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <div
          ref={scrollerRef}
          className={cn("horizontal-scroll-container")}
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
  );
}
