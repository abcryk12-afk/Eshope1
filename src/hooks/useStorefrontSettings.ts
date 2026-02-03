"use client";

import { useCallback, useEffect, useState } from "react";

import type { StorefrontSettings } from "@/lib/shipping";

let cached: StorefrontSettings | null = null;
let inflight: Promise<StorefrontSettings | null> | null = null;

async function fetchStorefrontSettings(): Promise<StorefrontSettings | null> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    const res = await fetch("/api/storefront/settings", { cache: "no-store" }).catch(() => null);
    if (!res || !res.ok) return null;

    const json = (await res.json().catch(() => null)) as { settings?: StorefrontSettings } | null;
    const settings = json?.settings ?? null;
    if (settings) cached = settings;
    return settings;
  })();

  const result = await inflight;
  inflight = null;
  return result;
}

export function useStorefrontSettings() {
  const [settings, setSettings] = useState<StorefrontSettings | null>(cached);
  const [loading, setLoading] = useState(!cached);

  const refresh = useCallback(async () => {
    setLoading(true);
    cached = null;
    inflight = null;
    const next = await fetchStorefrontSettings();
    setSettings(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (cached) {
      setSettings(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      const next = await fetchStorefrontSettings();
      if (!cancelled) {
        setSettings(next);
        setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { settings, loading, refresh };
}
