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
  gap: "compact" | "normal" | "spacious";
};

type ProductCardSettings = {
  style: "rounded" | "squared" | "image_first" | "poster";
  density: "compact" | "balanced" | "image_focused";
  imageAspect: "square" | "portrait" | "auto";
  showRating: boolean;
  showSoldCount: boolean;
  showWishlistIcon: boolean;
  showDiscountBadge: boolean;
};

type StorefrontLayout = {
  grid: GridSettings;
  productCard: ProductCardSettings;
  listingHeader: {
    showSearch: boolean;
    showFilters: boolean;
    spacing: "compact" | "normal";
    showSort: boolean;
    enableLayoutSwitcher: boolean;
  };
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
    storefrontLayout: {
      grid: { mobileCols: 2, tabletCols: 3, desktopCols: 4, gap: "normal" },
      productCard: {
        style: "rounded",
        density: "balanced",
        imageAspect: "square",
        showRating: true,
        showSoldCount: true,
        showWishlistIcon: true,
        showDiscountBadge: true,
      },
      listingHeader: {
        showSearch: true,
        showFilters: true,
        spacing: "compact",
        showSort: true,
        enableLayoutSwitcher: false,
      },
    },
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
  const card = (layout.productCard && typeof layout.productCard === "object")
    ? (layout.productCard as Record<string, unknown>)
    : {};
  const header = (layout.listingHeader && typeof layout.listingHeader === "object")
    ? (layout.listingHeader as Record<string, unknown>)
    : {};

  const cartUx = (root.cartUx && typeof root.cartUx === "object") ? (root.cartUx as Record<string, unknown>) : {};

  return {
    storefrontLayout: {
      grid: {
        mobileCols: clampInt(grid.mobileCols, 2, 5, 2),
        tabletCols: clampInt(grid.tabletCols, 3, 5, 3),
        desktopCols: clampInt(grid.desktopCols, 4, 6, 4),
        gap: (() => {
          const raw = typeof grid.gap === "string" ? grid.gap : "";
          if (raw === "compact" || raw === "spacious") return raw;
          return "normal";
        })(),
      },
      productCard: {
        style: (() => {
          const raw = typeof card.style === "string" ? card.style : "";
          if (raw === "squared" || raw === "image_first" || raw === "poster") return raw;
          return "rounded";
        })(),
        density: (() => {
          const raw = typeof card.density === "string" ? card.density : "";
          if (raw === "compact" || raw === "image_focused") return raw;
          return "balanced";
        })(),
        imageAspect: (() => {
          const raw = typeof card.imageAspect === "string" ? card.imageAspect : "";
          if (raw === "portrait" || raw === "auto") return raw;
          return "square";
        })(),
        showRating: typeof card.showRating === "boolean" ? card.showRating : true,
        showSoldCount: typeof card.showSoldCount === "boolean" ? card.showSoldCount : true,
        showWishlistIcon: typeof card.showWishlistIcon === "boolean" ? card.showWishlistIcon : true,
        showDiscountBadge: typeof card.showDiscountBadge === "boolean" ? card.showDiscountBadge : true,
      },
      listingHeader: {
        showSearch: typeof header.showSearch === "boolean" ? header.showSearch : true,
        showFilters: typeof header.showFilters === "boolean" ? header.showFilters : true,
        spacing: header.spacing === "normal" ? "normal" : "compact",
        showSort: typeof header.showSort === "boolean" ? header.showSort : true,
        enableLayoutSwitcher: typeof header.enableLayoutSwitcher === "boolean" ? header.enableLayoutSwitcher : false,
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

    try {
      const bc = new BroadcastChannel("storefront-settings");
      bc.postMessage({ type: "updated", at: Date.now() });
      bc.close();
    } catch {
    }

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
                            ...s.storefrontLayout,
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
                            ...s.storefrontLayout,
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
                            ...s.storefrontLayout,
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

            <div>
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Gap</label>
              <select
                value={settings.storefrontLayout.grid.gap}
                onChange={(e) =>
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          storefrontLayout: {
                            ...s.storefrontLayout,
                            grid: {
                              ...s.storefrontLayout.grid,
                              gap: (() => {
                                const v = e.target.value;
                                if (v === "compact") return "compact";
                                if (v === "spacious") return "spacious";
                                return "normal";
                              })(),
                            },
                          },
                        }
                      : s
                  )
                }
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              >
                <option value="compact">Compact</option>
                <option value="normal">Normal</option>
                <option value="spacious">Spacious</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Product card</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Controls product card density, image emphasis, and what metadata shows.</p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Product Card Style</label>
              <select
                value={settings.storefrontLayout.productCard.style}
                onChange={(e) =>
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          storefrontLayout: {
                            ...s.storefrontLayout,
                            productCard: {
                              ...s.storefrontLayout.productCard,
                              style: (() => {
                                const v = e.target.value;
                                if (v === "squared") return "squared";
                                if (v === "image_first") return "image_first";
                                if (v === "poster") return "poster";
                                return "rounded";
                              })(),
                            },
                          },
                        }
                      : s
                  )
                }
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              >
                <option value="rounded">Rounded (Default / Friendly)</option>
                <option value="squared">Squared (Sharp / Professional)</option>
                <option value="image_first">Image-First (AliExpress Style)</option>
                <option value="poster">Full Image / Poster Style</option>
              </select>

              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                This controls card shape and how image/text are balanced across listings and Super Deals.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Density</label>
              <select
                value={settings.storefrontLayout.productCard.density}
                onChange={(e) =>
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          storefrontLayout: {
                            ...s.storefrontLayout,
                            productCard: {
                              ...s.storefrontLayout.productCard,
                              density: (() => {
                                const v = e.target.value;
                                if (v === "compact") return "compact";
                                if (v === "image_focused") return "image_focused";
                                return "balanced";
                              })(),
                            },
                          },
                        }
                      : s
                  )
                }
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              >
                <option value="compact">Compact</option>
                <option value="balanced">Balanced</option>
                <option value="image_focused">Image-Focused</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Image aspect ratio</label>
              <select
                value={settings.storefrontLayout.productCard.imageAspect}
                onChange={(e) =>
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          storefrontLayout: {
                            ...s.storefrontLayout,
                            productCard: {
                              ...s.storefrontLayout.productCard,
                              imageAspect: (() => {
                                const v = e.target.value;
                                if (v === "portrait") return "portrait";
                                if (v === "auto") return "auto";
                                return "square";
                              })(),
                            },
                          },
                        }
                      : s
                  )
                }
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              >
                <option value="square">1:1 (Square)</option>
                <option value="portrait">4:5 (Portrait)</option>
                <option value="auto">Auto (No crop)</option>
              </select>
            </div>

            <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
              <span>Show rating</span>
              <input
                type="checkbox"
                checked={settings.storefrontLayout.productCard.showRating}
                onChange={(e) =>
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          storefrontLayout: {
                            ...s.storefrontLayout,
                            productCard: {
                              ...s.storefrontLayout.productCard,
                              showRating: e.target.checked,
                            },
                          },
                        }
                      : s
                  )
                }
                className="h-4 w-4 rounded border-zinc-300"
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
              <span>Show sold count</span>
              <input
                type="checkbox"
                checked={settings.storefrontLayout.productCard.showSoldCount}
                onChange={(e) =>
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          storefrontLayout: {
                            ...s.storefrontLayout,
                            productCard: {
                              ...s.storefrontLayout.productCard,
                              showSoldCount: e.target.checked,
                            },
                          },
                        }
                      : s
                  )
                }
                className="h-4 w-4 rounded border-zinc-300"
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
              <span>Show wishlist icon</span>
              <input
                type="checkbox"
                checked={settings.storefrontLayout.productCard.showWishlistIcon}
                onChange={(e) =>
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          storefrontLayout: {
                            ...s.storefrontLayout,
                            productCard: {
                              ...s.storefrontLayout.productCard,
                              showWishlistIcon: e.target.checked,
                            },
                          },
                        }
                      : s
                  )
                }
                className="h-4 w-4 rounded border-zinc-300"
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
              <span>Show discount badge</span>
              <input
                type="checkbox"
                checked={settings.storefrontLayout.productCard.showDiscountBadge}
                onChange={(e) =>
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          storefrontLayout: {
                            ...s.storefrontLayout,
                            productCard: {
                              ...s.storefrontLayout.productCard,
                              showDiscountBadge: e.target.checked,
                            },
                          },
                        }
                      : s
                  )
                }
                className="h-4 w-4 rounded border-zinc-300"
              />
            </label>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Listing header</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Controls search and controls above the product grid.</p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
              <span>Show search</span>
              <input
                type="checkbox"
                checked={settings.storefrontLayout.listingHeader.showSearch}
                onChange={(e) =>
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          storefrontLayout: {
                            ...s.storefrontLayout,
                            listingHeader: {
                              ...s.storefrontLayout.listingHeader,
                              showSearch: e.target.checked,
                            },
                          },
                        }
                      : s
                  )
                }
                className="h-4 w-4 rounded border-zinc-300"
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
              <span>Show filters</span>
              <input
                type="checkbox"
                checked={settings.storefrontLayout.listingHeader.showFilters}
                onChange={(e) =>
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          storefrontLayout: {
                            ...s.storefrontLayout,
                            listingHeader: {
                              ...s.storefrontLayout.listingHeader,
                              showFilters: e.target.checked,
                            },
                          },
                        }
                      : s
                  )
                }
                className="h-4 w-4 rounded border-zinc-300"
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
              <span>Show sort</span>
              <input
                type="checkbox"
                checked={settings.storefrontLayout.listingHeader.showSort}
                onChange={(e) =>
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          storefrontLayout: {
                            ...s.storefrontLayout,
                            listingHeader: {
                              ...s.storefrontLayout.listingHeader,
                              showSort: e.target.checked,
                            },
                          },
                        }
                      : s
                  )
                }
                className="h-4 w-4 rounded border-zinc-300"
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
              <span>Enable layout switcher</span>
              <input
                type="checkbox"
                checked={settings.storefrontLayout.listingHeader.enableLayoutSwitcher}
                onChange={(e) =>
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          storefrontLayout: {
                            ...s.storefrontLayout,
                            listingHeader: {
                              ...s.storefrontLayout.listingHeader,
                              enableLayoutSwitcher: e.target.checked,
                            },
                          },
                        }
                      : s
                  )
                }
                className="h-4 w-4 rounded border-zinc-300"
              />
            </label>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Spacing</label>
              <select
                value={settings.storefrontLayout.listingHeader.spacing}
                onChange={(e) =>
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          storefrontLayout: {
                            ...s.storefrontLayout,
                            listingHeader: {
                              ...s.storefrontLayout.listingHeader,
                              spacing: e.target.value === "normal" ? "normal" : "compact",
                            },
                          },
                        }
                      : s
                  )
                }
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              >
                <option value="compact">Compact</option>
                <option value="normal">Normal</option>
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
