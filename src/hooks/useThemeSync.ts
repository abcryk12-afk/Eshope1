"use client";

import { useEffect, useMemo, useRef } from "react";

import { applyThemeToDocument, DEFAULT_THEME, type ThemeColors, type ThemePresetId } from "@/lib/theme";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { hydrateTheme } from "@/store/slices/themeSlice";

const THEME_KEY = "shop.theme.v1";

type ThemePayload = {
  preset?: ThemePresetId;
  colors?: ThemeColors;
  updatedAt?: number;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizeTheme(payload: ThemePayload | null) {
  const preset = payload?.preset ?? "default";
  const colors = payload?.colors ?? DEFAULT_THEME;
  const updatedAt = typeof payload?.updatedAt === "number" ? payload!.updatedAt! : 0;
  return { preset, colors, updatedAt };
}

function readThemeFromStorage(raw: string | null) {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;

  const colors = isRecord(parsed.colors)
    ? {
        primary: String(parsed.colors.primary ?? DEFAULT_THEME.primary),
        secondary: String(parsed.colors.secondary ?? DEFAULT_THEME.secondary),
        accent: String(parsed.colors.accent ?? DEFAULT_THEME.accent),
        background: String(parsed.colors.background ?? DEFAULT_THEME.background),
        surface: String(parsed.colors.surface ?? parsed.colors.background ?? DEFAULT_THEME.surface),
        header: String(parsed.colors.header ?? parsed.colors.background ?? DEFAULT_THEME.header),
        text: String(parsed.colors.text ?? DEFAULT_THEME.text),
      }
    : undefined;

  return normalizeTheme({
    preset: typeof parsed.preset === "string" ? (parsed.preset as ThemePresetId) : undefined,
    colors,
    updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : undefined,
  });
}

function isThemeEditorRoute() {
  if (typeof window === "undefined") return false;
  return (
    window.location.pathname.startsWith("/admin/settings/theme") ||
    window.location.pathname.startsWith("/admin/settings/appearance")
  );
}

export function useThemeSync() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.theme);

  const appliedRef = useRef(false);
  const latestRef = useRef(theme);
  const bcRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    latestRef.current = theme;
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isThemeEditorRoute()) return;

    const next = readThemeFromStorage(window.localStorage.getItem(THEME_KEY));
    if (next) dispatch(hydrateTheme(next));
  }, [dispatch]);

  const serialized = useMemo(() => {
    return JSON.stringify({ preset: theme.preset, colors: theme.colors, updatedAt: theme.updatedAt });
  }, [theme.colors, theme.preset, theme.updatedAt]);

  useEffect(() => {
    applyThemeToDocument(theme.colors);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_KEY, serialized);
    }

    if (bcRef.current) {
      bcRef.current.postMessage({
        preset: theme.preset,
        colors: theme.colors,
        updatedAt: theme.updatedAt,
      });
    }

    appliedRef.current = true;
  }, [serialized, theme.colors, theme.preset, theme.updatedAt]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function onStorage(e: StorageEvent) {
      if (e.key !== THEME_KEY) return;
      const next = readThemeFromStorage(e.newValue);
      if (!next) return;

      const current = latestRef.current;
      if (next.updatedAt > (current.updatedAt ?? 0)) {
        dispatch(hydrateTheme(next));
      }
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [dispatch]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isThemeEditorRoute()) return;
    if (typeof BroadcastChannel !== "function") return;

    const bc = new BroadcastChannel("shop.theme");
    bcRef.current = bc;

    bc.onmessage = (event) => {
      const msg = event.data as unknown;
      if (!isRecord(msg)) return;

      const colors = isRecord(msg.colors)
        ? {
            primary: String(msg.colors.primary ?? DEFAULT_THEME.primary),
            secondary: String(msg.colors.secondary ?? DEFAULT_THEME.secondary),
            accent: String(msg.colors.accent ?? DEFAULT_THEME.accent),
            background: String(msg.colors.background ?? DEFAULT_THEME.background),
            surface: String(msg.colors.surface ?? msg.colors.background ?? DEFAULT_THEME.surface),
            header: String(msg.colors.header ?? msg.colors.background ?? DEFAULT_THEME.header),
            text: String(msg.colors.text ?? DEFAULT_THEME.text),
          }
        : undefined;

      const next = normalizeTheme({
        preset: typeof msg.preset === "string" ? (msg.preset as ThemePresetId) : undefined,
        colors,
        updatedAt: typeof msg.updatedAt === "number" ? msg.updatedAt : undefined,
      });

      const current = latestRef.current;
      if (next.updatedAt > (current.updatedAt ?? 0)) {
        dispatch(hydrateTheme(next));
      }
    };

    return () => {
      bc.close();
      bcRef.current = null;
    };
  }, [dispatch]);

  useEffect(() => {
    if (typeof window !== "undefined" && isThemeEditorRoute()) return;
    async function refresh() {
      const res = await fetch("/api/theme", { cache: "no-store" }).catch(() => null);
      if (!res || !res.ok) return;

      const json = (await res.json().catch(() => null)) as unknown;
      if (!isRecord(json) || !isRecord(json.theme)) return;

      const payload: ThemePayload = {
        preset: typeof json.theme.preset === "string" ? (json.theme.preset as ThemePresetId) : undefined,
        colors: isRecord(json.theme.colors)
          ? {
              primary: String(json.theme.colors.primary ?? DEFAULT_THEME.primary),
              secondary: String(json.theme.colors.secondary ?? DEFAULT_THEME.secondary),
              accent: String(json.theme.colors.accent ?? DEFAULT_THEME.accent),
              background: String(json.theme.colors.background ?? DEFAULT_THEME.background),
              surface: String(json.theme.colors.surface ?? json.theme.colors.background ?? DEFAULT_THEME.surface),
              header: String(json.theme.colors.header ?? json.theme.colors.background ?? DEFAULT_THEME.header),
              text: String(json.theme.colors.text ?? DEFAULT_THEME.text),
            }
          : undefined,
        updatedAt: typeof json.theme.updatedAt === "number" ? json.theme.updatedAt : undefined,
      };

      const next = normalizeTheme(payload);
      const current = latestRef.current;
      if (next.updatedAt > (current.updatedAt ?? 0)) {
        dispatch(hydrateTheme(next));
      }
    }

    const first = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), 15000);

    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [dispatch]);

  useEffect(() => {
    if (appliedRef.current) return;
    applyThemeToDocument(theme.colors);
    appliedRef.current = true;
  }, [theme.colors]);
}
