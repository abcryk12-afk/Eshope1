"use client";

import { useEffect, useMemo, useRef } from "react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { hydrateAdvancedSettings, type AdvancedSettingsState } from "@/store/advancedSettingsSlice";
import type { RootState } from "@/store/store";

const KEY = "shop.advancedSettings.v1";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function read(raw: string | null): Partial<AdvancedSettingsState> | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  return parsed as Partial<AdvancedSettingsState>;
}

export function useAdvancedSettingsSync() {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((s: RootState) => s.advancedSettings);

  const latestRef = useRef(settings);
  useEffect(() => {
    latestRef.current = settings;
  }, [settings]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const next = read(window.localStorage.getItem(KEY));
    if (!next) return;

    const currentUpdatedAt = latestRef.current?.updatedAt ?? 0;
    const nextUpdatedAt = typeof next.updatedAt === "number" ? next.updatedAt : 0;

    if (nextUpdatedAt > currentUpdatedAt) {
      dispatch(hydrateAdvancedSettings(next));
    }
  }, [dispatch]);

  const serialized = useMemo(() => JSON.stringify(settings), [settings]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY, serialized);
  }, [serialized]);
}
