"use client";

import { useEffect, useMemo, useRef } from "react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { hydrateHeader, type HeaderState } from "@/store/headerSlice";
import type { RootState } from "@/store/store";

const HEADER_KEY = "shop.header.v1";

type HeaderPayload = {
  state?: HeaderState | null;
  updatedAt?: number;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizeHeaderState(input: unknown): HeaderState | null {
  if (!isRecord(input)) return null;

  // We only need to guarantee new gating fields have safe defaults.
  const state = input as unknown as HeaderState;

  const enabledRaw = input.enabled;
  const scopeModeRaw = input.scopeMode;
  const scopePathsRaw = input.scopePaths;

  return {
    ...state,
    enabled: typeof enabledRaw === "boolean" ? enabledRaw : false,
    scopeMode: scopeModeRaw === "denylist" ? "denylist" : "allowlist",
    scopePaths: Array.isArray(scopePathsRaw) ? scopePathsRaw.map((x) => String(x)) : [],
  };
}

function readHeaderFromStorage(raw: string | null): HeaderPayload | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;

  const updatedAt = typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0;
  const state = normalizeHeaderState(parsed.state ?? null);
  return { state, updatedAt };
}

export function useHeaderSync() {
  const dispatch = useAppDispatch();
  const header = useAppSelector((s: RootState) => s.header);

  const latestRef = useRef(header);

  useEffect(() => {
    latestRef.current = header;
  }, [header]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const next = readHeaderFromStorage(window.localStorage.getItem(HEADER_KEY));
    if (!next?.state) return;

    const currentUpdatedAt = latestRef.current?.updatedAt ?? 0;
    if ((next.updatedAt ?? 0) > currentUpdatedAt) {
      dispatch(hydrateHeader(next.state));
    }
  }, [dispatch]);

  const serialized = useMemo(() => {
    return JSON.stringify({ state: header, updatedAt: header?.updatedAt ?? 0 });
  }, [header]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!header) return;

    window.localStorage.setItem(HEADER_KEY, serialized);
  }, [serialized, header]);
}
