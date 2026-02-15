"use client";

import { useEffect, useMemo, useRef } from "react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { hydrateFooter, type FooterLayout, type FooterState } from "@/store/footerSlice";
import type { RootState } from "@/store/store";

const FOOTER_KEY = "shop.footer.v1";

type FooterPayload = {
  enabled?: boolean;
  scopeMode?: FooterState["scopeMode"];
  scopePaths?: string[];
  layout?: FooterLayout | null;
  updatedAt?: number;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizeFooterPayload(input: unknown): FooterPayload | null {
  if (!isRecord(input)) return null;

  const enabledRaw = input.enabled;
  const scopeModeRaw = input.scopeMode;
  const scopePathsRaw = input.scopePaths;

  return {
    enabled: typeof enabledRaw === "boolean" ? enabledRaw : undefined,
    scopeMode: scopeModeRaw === "denylist" ? "denylist" : scopeModeRaw === "allowlist" ? "allowlist" : undefined,
    scopePaths: Array.isArray(scopePathsRaw) ? scopePathsRaw.map((x) => String(x)) : undefined,
    layout: (input.layout ?? null) as FooterLayout | null,
    updatedAt: typeof input.updatedAt === "number" ? input.updatedAt : 0,
  };
}

function readFooterFromStorage(raw: string | null): FooterPayload | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;

  return normalizeFooterPayload(parsed);
}

export function useFooterSync() {
  const dispatch = useAppDispatch();
  const footer = useAppSelector((s: RootState) => s.footer);

  const latestRef = useRef(footer);

  useEffect(() => {
    latestRef.current = footer;
  }, [footer]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const next = readFooterFromStorage(window.localStorage.getItem(FOOTER_KEY));
    if (!next) return;

    const currentUpdatedAt = latestRef.current?.updatedAt ?? 0;
    if ((next.updatedAt ?? 0) > currentUpdatedAt) {
      dispatch(hydrateFooter(next));
    }
  }, [dispatch]);

  const serialized = useMemo(() => {
    return JSON.stringify({
      enabled: footer?.enabled ?? false,
      scopeMode: footer?.scopeMode ?? "allowlist",
      scopePaths: footer?.scopePaths ?? [],
      layout: footer?.layout ?? null,
      updatedAt: footer?.updatedAt ?? 0,
    });
  }, [footer?.enabled, footer?.layout, footer?.scopeMode, footer?.scopePaths, footer?.updatedAt]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!footer) return;

    window.localStorage.setItem(FOOTER_KEY, serialized);
  }, [serialized, footer]);
}
