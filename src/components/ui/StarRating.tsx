"use client";

import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

type DisplayProps = {
  value: number;
  size?: "sm" | "md";
  className?: string;
};

export function StarRatingDisplay({ value, size = "md", className }: DisplayProps) {
  const v = Number.isFinite(value) ? Math.max(0, Math.min(5, value)) : 0;
  const px = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div className={cn("flex items-center gap-0.5", className)} aria-label={`Rating ${v.toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, v - i));

        return (
          <span key={i} className={cn("relative inline-flex", px)}>
            <Star className={cn("absolute inset-0", px, "text-zinc-300 dark:text-zinc-700")} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={cn(px, "fill-primary text-primary")} />
            </span>
          </span>
        );
      })}
    </div>
  );
}

type InputProps = {
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
};

export function StarRatingInput({ value, onChange, disabled, size = "md", className }: InputProps) {
  const v = Number.isFinite(value) ? Math.max(1, Math.min(5, Math.round(value))) : 5;
  const px = size === "sm" ? "h-5 w-5" : "h-6 w-6";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1;
        const active = n <= v;

        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            disabled={disabled}
            className={cn("inline-flex", disabled && "opacity-60")}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
          >
            <Star className={cn(px, active ? "fill-primary text-primary" : "text-zinc-300 dark:text-zinc-700")} />
          </button>
        );
      })}
    </div>
  );
}
