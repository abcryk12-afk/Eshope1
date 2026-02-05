"use client";

import { useCallback, useEffect, useState } from "react";

import type { StorefrontSettings } from "@/lib/shipping";

let cached: StorefrontSettings | null = null;
let inflight: Promise<StorefrontSettings | null> | null = null;

type Subscriber = (settings: StorefrontSettings | null) => void;
const subscribers = new Set<Subscriber>();

function notify(next: StorefrontSettings | null) {
  for (const sub of subscribers) sub(next);
}

async function fetchStorefrontSettings(args?: { force?: boolean }): Promise<StorefrontSettings | null> {
  const force = Boolean(args?.force);
  if (cached) return cached;
  if (inflight && !force) return inflight;

  inflight = (async () => {
    const res = await fetch("/api/storefront/settings", { cache: "no-store" }).catch(() => null);
    if (!res || !res.ok) return null;

    const json = (await res.json().catch(() => null)) as { settings?: StorefrontSettings } | null;
    const settings = json?.settings ?? null;
    if (settings) cached = settings;
    notify(cached);
    return settings;
  })();

  const result = await inflight;
  inflight = null;
  return result;
}

async function refreshStorefrontSettings(): Promise<StorefrontSettings | null> {
  cached = null;
  inflight = null;
  const next = await fetchStorefrontSettings({ force: true });
  notify(next);
  return next;
}

if (typeof window !== "undefined") {
  try {
    const bc = new BroadcastChannel("storefront-settings");
    bc.onmessage = (ev) => {
      const data = ev?.data as { type?: unknown } | null;
      if (data && data.type === "updated") {
        void refreshStorefrontSettings();
      }
    };
  } catch {
  }
}

export function useStorefrontSettings() {
  const [settings, setSettings] = useState<StorefrontSettings | null>(cached);
  const [loading, setLoading] = useState(!cached);

  const refresh = useCallback(async () => {
    setLoading(true);
    const next = await refreshStorefrontSettings();
    setSettings(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    const sub: Subscriber = (next) => {
      setSettings(next);
    };

    subscribers.add(sub);
    return () => {
      subscribers.delete(sub);
    };
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
