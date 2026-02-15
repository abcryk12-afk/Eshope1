"use client";

import { useEffect, useState } from "react";

import type { MobileMenuConfig } from "@/lib/mobileMenu";
import { normalizeMobileMenuConfig } from "@/lib/mobileMenu";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function useMobileMenu(open: boolean) {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<MobileMenuConfig>(() => normalizeMobileMenuConfig(null));

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/menu", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as unknown;
        const mobileMenu = isRecord(json) ? json.mobileMenu : null;
        const normalized = normalizeMobileMenuConfig(mobileMenu);
        if (!cancelled) setConfig(normalized);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [open]);

  return { loading, config };
}
