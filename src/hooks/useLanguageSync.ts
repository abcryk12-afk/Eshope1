"use client";

import { useEffect } from "react";
import { useRef } from "react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { hydrateLanguage, setLanguage, type LanguageCode } from "@/store/slices/languageSlice";

const LANGUAGE_KEY = "shop.language.v1";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readSelected(v: unknown): LanguageCode | null {
  return v === "en" || v === "ur" ? v : null;
}

function readCookieLang(): LanguageCode | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie;
  if (!raw) return null;
  const parts = raw.split(";").map((p) => p.trim());
  const hit = parts.find((p) => p.startsWith("shop.lang="));
  if (!hit) return null;
  const v = decodeURIComponent(hit.slice("shop.lang=".length));
  return readSelected(v);
}

export function useLanguageSync() {
  const dispatch = useAppDispatch();
  const language = useAppSelector((s) => s.language);

  const allowPersistRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem(LANGUAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (isRecord(parsed)) {
          const selected = readSelected(parsed.selected);
          if (selected) dispatch(hydrateLanguage({ selected }));
          return;
        }
      } catch {
        return;
      }
    }

    const cookieLang = readCookieLang();
    if (cookieLang) {
      dispatch(setLanguage(cookieLang));
      return;
    }

    const nav = window.navigator;
    const browserLang = String((nav.languages && nav.languages[0]) || nav.language || "").toLowerCase();
    if (browserLang.startsWith("ur")) dispatch(setLanguage("ur"));
  }, [dispatch]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!allowPersistRef.current) return;

    const payload = {
      selected: language.selected,
    };

    window.localStorage.setItem(LANGUAGE_KEY, JSON.stringify(payload));
  }, [language.selected]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    document.documentElement.lang = language.selected;
    document.documentElement.dir = language.selected === "ur" ? "rtl" : "ltr";
  }, [language.selected]);

  useEffect(() => {
    allowPersistRef.current = true;
  }, []);
}
