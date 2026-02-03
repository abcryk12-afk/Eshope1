"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";

type GridSettings = {
  mobileCols: number;
  tabletCols: number;
  desktopCols: number;
};

type StorefrontLayout = {
  grid: GridSettings;
};

type CartUx = {
  quickCheckoutEnabled: boolean;
  quickCheckoutAutoHideSeconds: number;
};

type ApiResponse = {
  storefrontLayout: StorefrontLayout;
  cartUx: CartUx;
};

function clampInt(n: unknown, min: number, max: number, fallback: number) {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(v)));
}

function emptySettings(): ApiResponse {
  return {
    storefrontLayout: { grid: { mobileCols: 2, tabletCols: 3, desktopCols: 4 } },
    cartUx: { quickCheckoutEnabled: true, quickCheckoutAutoHideSeconds: 4 },
  };
}

function normalizeResponse(json: unknown): ApiResponse {
  const fallback = emptySettings();
  if (!json || typeof json !== "object") return fallback;
  const root = json as Record<string, unknown>;

  const layout = (root.storefrontLayout && typeof root.storefrontLayout === "object")
    ? (root.storefrontLayout as Record<string, unknown>)
    : {};
  const grid = (layout.grid && typeof layout.grid === "object") ? (layout.grid as Record<string, unknown>) : {};

  const cartUx = (root.cartUx && typeof root.cartUx === "object") ? (root.cartUx as Record<string, unknown>) : {};

  return {
    storefrontLayout: {
      grid: {
        mobileCols: clampInt(grid.mobileCols, 2, 5, 2),
        tabletCols: clampInt(grid.tabletCols, 3, 5, 3),
        desktopCols: clampInt(grid.desktopCols, 4, 6, 4),
      },
    },
    cartUx: {
      quickCheckoutEnabled: typeof cartUx.quickCheckoutEnabled === "boolean" ? cartUx.quickCheckoutEnabled : true,
      quickCheckoutAutoHideSeconds: clampInt(cartUx.quickCheckoutAutoHideSeconds, 1, 30, 4),
    },
  };
}

export default function AdminStorefrontSettingsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ApiResponse | null>(null);

  const mobileOptions = useMemo(() => [2, 3, 4, 5], []);
  const tabletOptions = useMemo(() => [3, 4, 5], []);
  const desktopOptions = useMemo(() => [4, 5, 6], []);

  const load = useCallback(async () => {
    setLoading(true);

    const res = await fetch("/api/admin/storefront", { cache: "no-store" });

    if (!res.ok) {
      toast.error("Failed to load storefront settings");
      setSettings(null);
      setLoading(false);
      return;
    }

    const json = (await res.json().catch(() => null)) as unknown;
    setSettings(normalizeResponse(json));
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function save() {
    if (!settings) return;

    setSaving(true);

    const res = await fetch("/api/admin/storefront", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });

    const json = (await res.json().catch(() => null)) as unknown;

    if (!res.ok) {
      const msg = json && typeof json === "object" && typeof (json as Record<string, unknown>).message === "string"
        ? String((json as Record<string, unknown>).message)
        : "Failed to save";
      toast.error(msg);
      setSaving(false);
      return;
    }

    setSettings(normalizeResponse(json));
    toast.success("Saved");
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Storefront</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Not available.</p>
          </div>
          <Link href="/admin">
            <Button variant="secondary">Back</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Storefront</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Configure product grid layout and quick checkout UX.</p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin">
            <Button variant="secondary">Back</Button>
          </Link>
          <Button variant="secondary" onClick={() => void load()} disabled={saving}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Product grid</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Controls how many product cards render per row at different screen sizes.</p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Mobile</label>
              <select
                value={settings.storefrontLayout.grid.mobileCols}
                onChange={(e) =>
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          storefrontLayout: {
                            grid: {
                              ...s.storefrontLayout.grid,
                              mobileCols: clampInt(e.target.value, 2, 5, 2),
                            },
                          },
                        }
                      : s
                  )
                }
                className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              >
                {mobileOptions.map((n) => (
                  <option key={n} value={n}>
                    {n} columns
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Tablet</label>
              <select
                value={settings.storefrontLayout.grid.tabletCols}
                onChange={(e) =>
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          storefrontLayout: {
                            grid: {
                              ...s.storefrontLayout.grid,
                              tabletCols: clampInt(e.target.value, 3, 5, 3),
                            },
                          },
                        }
                      : s
                  )
                }
                className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              >
                {tabletOptions.map((n) => (
                  <option key={n} value={n}>
                    {n} columns
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Desktop</label>
              <select
                value={settings.storefrontLayout.grid.desktopCols}
                onChange={(e) =>
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          storefrontLayout: {
                            grid: {
                              ...s.storefrontLayout.grid,
                              desktopCols: clampInt(e.target.value, 4, 6, 4),
                            },
                          },
                        }
                      : s
                  )
                }
                className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              >
                {desktopOptions.map((n) => (
                  <option key={n} value={n}>
                    {n} columns
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Quick checkout</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Show a sticky bar after adding an item to cart.</p>
            </div>

            <label className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={settings.cartUx.quickCheckoutEnabled}
                onChange={(e) =>
                  setSettings((s) => (s ? { ...s, cartUx: { ...s.cartUx, quickCheckoutEnabled: e.target.checked } } : s))
                }
                className="h-4 w-4 rounded border-zinc-300"
              />
              Enabled
            </label>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Auto-hide seconds</label>
              <Input
                type="number"
                min={1}
                max={30}
                value={settings.cartUx.quickCheckoutAutoHideSeconds}
                onChange={(e) =>
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          cartUx: {
                            ...s.cartUx,
                            quickCheckoutAutoHideSeconds: clampInt(e.target.value, 1, 30, 4),
                          },
                        }
                      : s
                  )
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
