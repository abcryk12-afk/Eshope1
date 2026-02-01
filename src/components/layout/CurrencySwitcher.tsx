"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setCurrency, type CurrencyCode } from "@/store/slices/currencySlice";

type Props = {
  className?: string;
  variant?: "compact" | "default";
};

export default function CurrencySwitcher({ className, variant = "default" }: Props) {
  const dispatch = useAppDispatch();
  const currency = useAppSelector((s) => s.currency);

  const helper = useMemo(() => {
    if (currency.selected !== "USD") return "";
    if (currency.status === "loading") return "Updating rate…";
    if (currency.status === "error") return currency.error ?? "Rate unavailable";
    return currency.pkrPerUsd ? "" : "Rate unavailable";
  }, [currency.selected, currency.status, currency.error, currency.pkrPerUsd]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <select
        value={currency.selected}
        onChange={(e) => dispatch(setCurrency(e.target.value as CurrencyCode))}
        className={cn(
          "h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-900",
          "dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50",
          variant === "compact" && "h-9 px-2 text-xs"
        )}
        aria-label="Currency"
      >
        <option value="PKR">PKR</option>
        <option value="USD">USD</option>
      </select>

      {helper ? (
        <span className={cn("text-xs text-zinc-500", variant === "compact" && "hidden sm:inline")}>{helper}</span>
      ) : null}
    </div>
  );
}
