"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setLanguage, type LanguageCode } from "@/store/slices/languageSlice";

type Props = {
  className?: string;
  variant?: "compact" | "default";
};

function setLangCookie(lang: LanguageCode) {
  if (typeof document === "undefined") return;
  document.cookie = `shop.lang=${lang}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export default function LanguageSwitcher({ className, variant = "default" }: Props) {
  const dispatch = useAppDispatch();
  const language = useAppSelector((s) => s.language);

  const label = useMemo(() => {
    return language.selected === "ur" ? "اردو" : "English";
  }, [language.selected]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <select
        value={language.selected}
        onChange={(e) => {
          const next = e.target.value as LanguageCode;
          setLangCookie(next);
          dispatch(setLanguage(next));
        }}
        className={cn(
          "h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-900",
          "dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50",
          variant === "compact" && "h-9 px-2 text-xs"
        )}
        aria-label="Language"
      >
        <option value="en">English</option>
        <option value="ur">اردو</option>
      </select>

      {variant !== "compact" ? <span className="text-xs text-zinc-500">{label}</span> : null}
    </div>
  );
}
