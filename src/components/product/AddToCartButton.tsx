"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { useCartAnimation } from "@/hooks/useCartAnimation";

type Props = {
  canAdd: boolean;
  getImageEl: () => HTMLElement | null;
  onAdd: () => void;
  className?: string;
  style?: React.CSSProperties;
};

export default function AddToCartButton({ canAdd, getImageEl, onAdd, className, style }: Props) {
  const { run } = useCartAnimation();

  const [ui, setUi] = useState<"idle" | "loading" | "animating" | "added">("idle");
  const loadingTimerRef = useRef<number | null>(null);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) window.clearTimeout(loadingTimerRef.current);
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (ui !== "added") return;

    resetTimerRef.current = window.setTimeout(() => {
      setUi("idle");
      resetTimerRef.current = null;
    }, 1500);

    return () => {
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    };
  }, [ui]);

  async function handleClick() {
    if (!canAdd) return;
    if (ui !== "idle") return;

    setUi("loading");

    loadingTimerRef.current = window.setTimeout(() => {
      setUi((s) => (s === "loading" ? "animating" : s));
      loadingTimerRef.current = null;
    }, 400);

    await run({
      imageEl: getImageEl(),
      onComplete: () => {
        onAdd();
      },
    });

    setUi("added");
  }

  const disabled = !canAdd || ui !== "idle";
  const isAdded = ui === "added";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "relative inline-flex items-center justify-center",
        "transition-transform duration-150 active:scale-[0.98]",
        disabled && "pointer-events-none opacity-60",
        isAdded && "bg-[var(--theme-success)] text-white",
        className
      )}
      style={style}
      aria-live="polite"
    >
      {ui === "loading" ? (
        <span className="inline-flex items-center gap-2">
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            aria-hidden="true"
          />
          <span>Adding…</span>
        </span>
      ) : ui === "added" ? (
        "✔ Added"
      ) : (
        "Add to cart"
      )}
    </button>
  );
}
