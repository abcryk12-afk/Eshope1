"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import Button from "@/components/ui/Button";
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

type StorefrontUx = {
  stickyFiltersEnabled: boolean;
  showAddToCartButton: boolean;
  enableQuickView: boolean;
  productCardVariant: "modern" | "minimal";
  superDealsViewAllEnabled: boolean;
};

type CartUx = {
  quickCheckoutEnabled: boolean;
  quickCheckoutAutoHideSeconds: number;
  onePageCheckoutEnabled: boolean;
  buyNowEnabled: boolean;
};

type Performance = {
  apiCacheEnabled: boolean;
  apiCacheSMaxAgeSeconds: number;
  apiCacheStaleWhileRevalidateSeconds: number;
  productApiCacheEnabled: boolean;
  productApiCacheSMaxAgeSeconds: number;
  productApiCacheStaleWhileRevalidateSeconds: number;
  deferTrackingScripts: boolean;
  fontDisplaySwapEnabled: boolean;
};

type ApiResponse = {
  storefrontLayout: StorefrontLayout;
  storefrontUx: StorefrontUx;
  cartUx: CartUx;
  performance: Performance;
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
    storefrontUx: {
      stickyFiltersEnabled: true,
      showAddToCartButton: true,
      enableQuickView: true,
      productCardVariant: "modern",
      superDealsViewAllEnabled: true,
    },
    cartUx: {
      quickCheckoutEnabled: true,
      quickCheckoutAutoHideSeconds: 4,
      onePageCheckoutEnabled: false,
      buyNowEnabled: true,
    },
    performance: {
      apiCacheEnabled: false,
      apiCacheSMaxAgeSeconds: 60,
      apiCacheStaleWhileRevalidateSeconds: 300,
      productApiCacheEnabled: false,
      productApiCacheSMaxAgeSeconds: 20,
      productApiCacheStaleWhileRevalidateSeconds: 60,
      deferTrackingScripts: false,
      fontDisplaySwapEnabled: true,
    },
  };
}

function normalizeResponse(json: unknown): ApiResponse {
  const fallback = emptySettings();
  if (!json || typeof json !== "object") return fallback;
  const root = json as Record<string, unknown>;
  const layout = root.storefrontLayout && typeof root.storefrontLayout === "object" ? (root.storefrontLayout as Record<string, unknown>) : {};
  const grid = layout.grid && typeof layout.grid === "object" ? (layout.grid as Record<string, unknown>) : {};
  const card = layout.productCard && typeof layout.productCard === "object" ? (layout.productCard as Record<string, unknown>) : {};
  const header = layout.listingHeader && typeof layout.listingHeader === "object" ? (layout.listingHeader as Record<string, unknown>) : {};

  const ux = root.storefrontUx && typeof root.storefrontUx === "object" ? (root.storefrontUx as Record<string, unknown>) : {};
  const cartUx = root.cartUx && typeof root.cartUx === "object" ? (root.cartUx as Record<string, unknown>) : {};
  const perf = root.performance && typeof root.performance === "object" ? (root.performance as Record<string, unknown>) : {};

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
    storefrontUx: {
      stickyFiltersEnabled: typeof ux.stickyFiltersEnabled === "boolean" ? ux.stickyFiltersEnabled : true,
      showAddToCartButton: typeof ux.showAddToCartButton === "boolean" ? ux.showAddToCartButton : true,
      enableQuickView: typeof ux.enableQuickView === "boolean" ? ux.enableQuickView : true,
      productCardVariant: (() => {
        const raw = typeof ux.productCardVariant === "string" ? ux.productCardVariant : "";
        return raw === "minimal" ? "minimal" : "modern";
      })(),
      superDealsViewAllEnabled: typeof ux.superDealsViewAllEnabled === "boolean" ? ux.superDealsViewAllEnabled : true,
    },
    cartUx: {
      quickCheckoutEnabled: typeof cartUx.quickCheckoutEnabled === "boolean" ? cartUx.quickCheckoutEnabled : true,
      quickCheckoutAutoHideSeconds: clampInt(cartUx.quickCheckoutAutoHideSeconds, 1, 30, 4),
      onePageCheckoutEnabled: typeof cartUx.onePageCheckoutEnabled === "boolean" ? cartUx.onePageCheckoutEnabled : false,
      buyNowEnabled: typeof cartUx.buyNowEnabled === "boolean" ? cartUx.buyNowEnabled : true,
    },
    performance: {
      apiCacheEnabled: typeof perf.apiCacheEnabled === "boolean" ? perf.apiCacheEnabled : false,
      apiCacheSMaxAgeSeconds: clampInt(perf.apiCacheSMaxAgeSeconds, 0, 3600, 60),
      apiCacheStaleWhileRevalidateSeconds: clampInt(perf.apiCacheStaleWhileRevalidateSeconds, 0, 86400, 300),
      productApiCacheEnabled: typeof perf.productApiCacheEnabled === "boolean" ? perf.productApiCacheEnabled : false,
      productApiCacheSMaxAgeSeconds: clampInt(perf.productApiCacheSMaxAgeSeconds, 0, 600, 20),
      productApiCacheStaleWhileRevalidateSeconds: clampInt(perf.productApiCacheStaleWhileRevalidateSeconds, 0, 3600, 60),
      deferTrackingScripts: typeof perf.deferTrackingScripts === "boolean" ? perf.deferTrackingScripts : false,
      fontDisplaySwapEnabled: typeof perf.fontDisplaySwapEnabled === "boolean" ? perf.fontDisplaySwapEnabled : true,
    },
  };
}

export default function AdminStorefrontCustomizerClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ApiResponse | null>(null);

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

  const previewBadges = useMemo(() => {
    if (!settings) return [];
    const ux = settings.storefrontUx;
    const out: { label: string; active: boolean }[] = [];
    out.push({ label: "Sticky filters", active: ux.stickyFiltersEnabled });
    out.push({ label: "Add to cart", active: ux.showAddToCartButton });
    out.push({ label: "Quick view", active: ux.enableQuickView });
    out.push({ label: "View All", active: ux.superDealsViewAllEnabled });
    out.push({ label: ux.productCardVariant === "minimal" ? "Minimal cards" : "Modern cards", active: true });
    return out;
  }, [settings]);

  async function save() {
    if (!settings) return;

    setSaving(true);

    const res = await fetch("/api/admin/storefront", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storefrontLayout: settings.storefrontLayout,
        storefrontUx: settings.storefrontUx,
        cartUx: settings.cartUx,
        performance: settings.performance,
      }),
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
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Storefront Customizer</h1>
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
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Storefront Customizer</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Control high-impact storefront behaviors without code changes.</p>
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

      <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Live preview</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">This is a quick snapshot of what’s enabled.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {previewBadges.map((b) => (
            <span
              key={b.label}
              className={
                "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold " +
                (b.active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-zinc-200 bg-white text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400")
              }
            >
              {b.label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Listing behavior</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Filters, sorting bar, and browse flow.</p>

          <div className="mt-4 space-y-3">
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
              <div>
                <div className="font-medium">Sticky filters</div>
                <div className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">Keep filter/sort bar visible while scrolling.</div>
              </div>
              <input
                type="checkbox"
                checked={settings.storefrontUx.stickyFiltersEnabled}
                onChange={(e) =>
                  setSettings((s) => (s ? { ...s, storefrontUx: { ...s.storefrontUx, stickyFiltersEnabled: e.target.checked } } : s))
                }
                className="h-4 w-4 rounded border-zinc-300"
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
              <div>
                <div className="font-medium">Enable Quick View</div>
                <div className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">Allow quick preview modal from cards and Super Deals.</div>
              </div>
              <input
                type="checkbox"
                checked={settings.storefrontUx.enableQuickView}
                onChange={(e) =>
                  setSettings((s) => (s ? { ...s, storefrontUx: { ...s.storefrontUx, enableQuickView: e.target.checked } } : s))
                }
                className="h-4 w-4 rounded border-zinc-300"
              />
            </label>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Product cards</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Conversion controls that affect product cards.</p>

          <div className="mt-4 space-y-3">
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
              <div>
                <div className="font-medium">Show Add to Cart button</div>
                <div className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">Show/hide the Add to Cart CTA on cards.</div>
              </div>
              <input
                type="checkbox"
                checked={settings.storefrontUx.showAddToCartButton}
                onChange={(e) =>
                  setSettings((s) => (s ? { ...s, storefrontUx: { ...s.storefrontUx, showAddToCartButton: e.target.checked } } : s))
                }
                className="h-4 w-4 rounded border-zinc-300"
              />
            </label>

            <div className="space-y-2 rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
              <div>
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Product Card Style</div>
                <div className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">Choose the overall card preset.</div>
              </div>

              <select
                value={settings.storefrontUx.productCardVariant}
                onChange={(e) =>
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          storefrontUx: { ...s.storefrontUx, productCardVariant: e.target.value === "minimal" ? "minimal" : "modern" },
                        }
                      : s
                  )
                }
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              >
                <option value="modern">Modern (Default)</option>
                <option value="minimal">Minimal</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 lg:col-span-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Homepage sections</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Controls for homepage modules like Super Deals.</p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
              <div>
                <div className="font-medium">Super Deals: View All</div>
                <div className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">Show the View All link in Super Deals section.</div>
              </div>
              <input
                type="checkbox"
                checked={settings.storefrontUx.superDealsViewAllEnabled}
                onChange={(e) =>
                  setSettings((s) => (s ? { ...s, storefrontUx: { ...s.storefrontUx, superDealsViewAllEnabled: e.target.checked } } : s))
                }
                className="h-4 w-4 rounded border-zinc-300"
              />
            </label>

            <div className="rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
              The View All button opens:
              <div className="mt-1 font-mono text-xs text-zinc-900 dark:text-zinc-50">/products?tag=super-deals</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
