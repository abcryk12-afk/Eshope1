"use client";

import { useEffect, useMemo, useRef } from "react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { hydrateThemeBuilder, type ThemeBuilderState } from "@/store/themeBuilderSlice";

const KEY = "shop.themeBuilder.v1";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function safeJsonParse(raw: string | null) {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function normalize(payload: unknown): Partial<ThemeBuilderState> | null {
  if (!isRecord(payload)) return null;

  const out: Partial<ThemeBuilderState> = {};

  if (payload.mode === "default" || payload.mode === "preview" || payload.mode === "published") out.mode = payload.mode;
  if (typeof payload.activeThemeId === "string") out.activeThemeId = payload.activeThemeId;

  if (isRecord(payload.customTokens)) out.customTokens = payload.customTokens as ThemeBuilderState["customTokens"];
  if (Array.isArray(payload.history)) out.history = payload.history as ThemeBuilderState["history"];
  if (Array.isArray(payload.future)) out.future = payload.future as ThemeBuilderState["future"];
  if (typeof payload.isDirty === "boolean") out.isDirty = payload.isDirty;

  return out;
}

export function useThemeBuilderSync() {
  const dispatch = useAppDispatch();
  const builder = useAppSelector((s) => s.themeBuilder);

  const latestRef = useRef(builder);
  const bcRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    latestRef.current = builder;
  }, [builder]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const next = normalize(safeJsonParse(window.localStorage.getItem(KEY)));
    if (next) dispatch(hydrateThemeBuilder(next));
  }, [dispatch]);

  const serialized = useMemo(() => {
    return JSON.stringify(builder);
  }, [builder]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY, serialized);

    if (bcRef.current) {
      bcRef.current.postMessage(builder);
    }
  }, [builder, serialized]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof BroadcastChannel !== "function") return;

    const bc = new BroadcastChannel("shop.themeBuilder");
    bcRef.current = bc;

    bc.onmessage = (event) => {
      const msg = normalize(event.data);
      if (!msg) return;

      const current = latestRef.current;
      // Only accept if different mode/tokens to prevent echo storms
      if (
        msg.mode !== current.mode ||
        msg.activeThemeId !== current.activeThemeId ||
        msg.isDirty !== current.isDirty ||
        JSON.stringify(msg.customTokens ?? null) !== JSON.stringify(current.customTokens)
      ) {
        dispatch(hydrateThemeBuilder(msg));
      }
    };

    return () => {
      bc.close();
      bcRef.current = null;
    };
  }, [dispatch]);
}
