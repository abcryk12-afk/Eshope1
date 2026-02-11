"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import ProductCard from "@/components/product/ProductCard";
import ProductGrid from "@/components/product/ProductGrid";
import SuperDealsSection from "@/components/deals/SuperDealsSection";
import HomeBanners from "@/components/home/HomeBanners";
import HeroBannerSlider, {
  type HeroBanner,
  type HeroBannerSettings,
} from "@/components/home/HeroBannerSlider";
import Skeleton from "@/components/ui/Skeleton";
import BottomSheet from "@/components/ui/BottomSheet";
import ListingTopBar, { type ListingLayoutMode } from "@/components/storefront/ListingTopBar";
import { useStorefrontSettings } from "@/hooks/useStorefrontSettings";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import QuickViewModal from "../components/product/QuickViewModal";

type ProductsMeta = {
  categories: { name: string; slug: string }[];
  price: { min: number; max: number };
};

type ProductListItem = {
  _id: string;
  title: string;
  slug: string;
  images: string[];
  basePrice: number;
  compareAtPrice?: number;
  ratingAvg: number;
  ratingCount: number;
  category: string;
  deal?: { label: string; expiresAt?: string | null };
};

type HomeBanner = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  href: string;
};

type HeroHomeResponse = {
  homeBanners?: HomeBanner[];
  heroBanners?: HeroBanner[];
  heroBannerSettings?: HeroBannerSettings;
};

type Pagination = {
  page: number;
  pages: number;
  total: number;
  limit: number;
};

type ListResponse = {
  items: ProductListItem[];
  pagination: Pagination;
};

type StorefrontClientProps = {
  initialSearchParams: Record<string, string | string[] | undefined>;
  basePath?: string;
  forcedCategory?: string;
  pageTitle?: string;
};

function readString(v: string | string[] | undefined) {
  if (!v) return "";
  return Array.isArray(v) ? v[0] ?? "" : v;
}

function readBool(v: string | string[] | undefined) {
  const s = readString(v);
  if (!s) return false;
  return s === "true" || s === "1";
}

function readNumber(v: string | string[] | undefined) {
  const s = readString(v);
  if (!s) return undefined;
  const n = Number(s);
  if (Number.isNaN(n)) return undefined;
  return n;
}

const SORT_OPTIONS = [
  { label: "Relevance", value: "relevance" },
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Top Rated", value: "rating" },
] as const;

export default function StorefrontClient({
  initialSearchParams,
  basePath,
  forcedCategory,
  pageTitle,
}: StorefrontClientProps) {
  const router = useRouter();

  const targetPath = typeof basePath === "string" && basePath.trim() ? basePath.trim() : "/";
  const fixedCategory = typeof forcedCategory === "string" && forcedCategory.trim() ? forcedCategory.trim() : "";
  const isHome = targetPath === "/";

  const [meta, setMeta] = useState<ProductsMeta | null>(null);

  const [qInput, setQInput] = useState(readString(initialSearchParams.q));
  const [q, setQ] = useState(readString(initialSearchParams.q));
  const [category, setCategory] = useState(fixedCategory || readString(initialSearchParams.category));
  const [priceMin, setPriceMin] = useState<number | undefined>(readNumber(initialSearchParams.priceMin));
  const [priceMax, setPriceMax] = useState<number | undefined>(readNumber(initialSearchParams.priceMax));
  const [ratingMin, setRatingMin] = useState<number | undefined>(readNumber(initialSearchParams.ratingMin));
  const [inStock, setInStock] = useState(readBool(initialSearchParams.inStock));
  const [sort, setSort] = useState(readString(initialSearchParams.sort) || "relevance");
  const [page, setPage] = useState(readNumber(initialSearchParams.page) ?? 1);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ProductListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileSortOpen, setMobileSortOpen] = useState(false);

  const [layoutMode, setLayoutMode] = useState<ListingLayoutMode>("grid");

  const [quickViewSlug, setQuickViewSlug] = useState<string | null>(null);

  const [homeBanners, setHomeBanners] = useState<HomeBanner[]>([]);
  const [homeBannersLoading, setHomeBannersLoading] = useState(false);

  const [heroBanners, setHeroBanners] = useState<HeroBanner[]>([]);
  const [heroBannerSettings, setHeroBannerSettings] = useState<HeroBannerSettings | null>(null);

  const applyFilters = useCallback(
    (next: {
      q?: string;
      category?: string;
      priceMin?: number;
      priceMax?: number;
      ratingMin?: number;
      inStock?: boolean;
      sort?: string;
      page?: number;
    }) => {
      const params = new URLSearchParams();

      const nextQ = next.q ?? q;
      const nextCategory = fixedCategory || next.category || category;
      const nextPriceMin = next.priceMin ?? priceMin;
      const nextPriceMax = next.priceMax ?? priceMax;
      const nextRatingMin = next.ratingMin ?? ratingMin;
      const nextInStock = typeof next.inStock === "boolean" ? next.inStock : inStock;
      const nextSort = next.sort ?? sort;
      const nextPage = typeof next.page === "number" ? next.page : page;

      if (nextQ.trim()) params.set("q", nextQ.trim());
      if (!fixedCategory && nextCategory) params.set("category", nextCategory);
      if (typeof nextPriceMin === "number") params.set("priceMin", String(nextPriceMin));
      if (typeof nextPriceMax === "number") params.set("priceMax", String(nextPriceMax));
      if (typeof nextRatingMin === "number") params.set("ratingMin", String(nextRatingMin));
      if (nextInStock) params.set("inStock", "true");
      if (nextSort) params.set("sort", nextSort);
      if (nextPage && nextPage !== 1) params.set("page", String(nextPage));

      const qs = params.toString();
      router.push(qs ? `${targetPath}?${qs}` : targetPath);
    },
    [router, q, category, priceMin, priceMax, ratingMin, inStock, sort, page, targetPath, fixedCategory]
  );

  useEffect(() => {
    if (qInput.trim() === q.trim()) return;

    const t = setTimeout(() => {
      const next = qInput.trim();
      setQ(next);
      setPage(1);
      applyFilters({ q: next, page: 1 });
    }, 250);

    return () => clearTimeout(t);
  }, [qInput, q, applyFilters]);

  useEffect(() => {
    let cancelled = false;

    async function loadMeta() {
      const res = await fetch("/api/products/meta", { cache: "no-store" });
      if (!res.ok) return;

      const data = (await res.json()) as ProductsMeta;
      if (!cancelled) setMeta(data);
    }

    loadMeta();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isHome) return;

    let cancelled = false;
    const controller = new AbortController();

    async function loadHome() {
      setHomeBannersLoading(true);
      const res = await fetch("/api/storefront/home", { cache: "no-store", signal: controller.signal }).catch(() => null);

      if (cancelled) return;

      if (!res || !res.ok) {
        setHomeBanners([]);
        setHomeBannersLoading(false);
        return;
      }

      const json = (await res.json().catch(() => null)) as unknown;
      const root = json as HeroHomeResponse | null;

      setHomeBanners(Array.isArray(root?.homeBanners) ? root?.homeBanners : []);
      setHeroBanners(Array.isArray(root?.heroBanners) ? root?.heroBanners : []);
      setHeroBannerSettings(root?.heroBannerSettings ?? null);
      setHomeBannersLoading(false);
    }

    void loadHome();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isHome]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    const apiCategory = fixedCategory || category;

    if (q.trim()) params.set("q", q.trim());
    if (apiCategory) params.set("category", apiCategory);
    if (typeof priceMin === "number") params.set("priceMin", String(priceMin));
    if (typeof priceMax === "number") params.set("priceMax", String(priceMax));
    if (typeof ratingMin === "number") params.set("ratingMin", String(ratingMin));
    if (inStock) params.set("inStock", "true");
    if (sort) params.set("sort", sort);
    if (page && page !== 1) params.set("page", String(page));

    return params.toString();
  }, [q, category, priceMin, priceMax, ratingMin, inStock, sort, page, fixedCategory]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadProducts() {
      setLoading(true);

      let res: Response;

      try {
        res = await fetch(`/api/products?${queryString}`, {
          cache: "no-store",
          signal: controller.signal,
        });
      } catch (err: unknown) {
        if (cancelled) return;

        const name = (err as { name?: string } | null)?.name;
        if (name === "AbortError") {
          return;
        }

        setItems([]);
        setPagination(null);
        setLoading(false);
        return;
      }

      if (cancelled) return;

      if (!res.ok) {
        setItems([]);
        setPagination(null);
        setLoading(false);
        return;
      }

      const data = (await res.json()) as ListResponse;

      if (!cancelled) {
        setItems(data.items ?? []);
        setPagination(data.pagination ?? null);
        setLoading(false);
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [queryString]);

  const hasActiveFilters =
    q.trim().length > 0 ||
    Boolean(!fixedCategory && category) ||
    typeof priceMin === "number" ||
    typeof priceMax === "number" ||
    typeof ratingMin === "number" ||
    inStock ||
    (sort !== "relevance" && sort !== "");

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (q.trim()) c += 1;
    if (!fixedCategory && category) c += 1;
    if (typeof priceMin === "number") c += 1;
    if (typeof priceMax === "number") c += 1;
    if (typeof ratingMin === "number") c += 1;
    if (inStock) c += 1;
    return c;
  }, [q, fixedCategory, category, priceMin, priceMax, ratingMin, inStock]);

  const { settings: storefrontSettings } = useStorefrontSettings();
  const headerSettings = storefrontSettings?.storefrontLayout?.listingHeader;

  const cardStyle = storefrontSettings?.storefrontLayout?.productCard?.style ?? "rounded";
  const cardRadius =
    cardStyle === "squared"
      ? "var(--radius-none)"
      : cardStyle === "image_first"
        ? "var(--radius-md)"
        : cardStyle === "poster"
          ? "var(--radius-lg)"
          : "var(--radius-xl)";

  const headerSpacing = headerSettings?.spacing ?? "compact";
  const showSearch = headerSettings?.showSearch ?? true;
  const showFilters = headerSettings?.showFilters ?? true;
  const showSort = headerSettings?.showSort ?? true;
  const showLayoutSwitcher = headerSettings?.enableLayoutSwitcher ?? false;

  const sortLabel = useMemo(() => {
    const found = SORT_OPTIONS.find((o) => o.value === sort);
    return found?.label ?? "";
  }, [sort]);

  const clearAll = useCallback(() => {
    setQInput("");
    setQ("");
    setCategory(fixedCategory || "");
    setPriceMin(undefined);
    setPriceMax(undefined);
    setRatingMin(undefined);
    setInStock(false);
    setSort("relevance");
    setPage(1);
    router.push(targetPath);
  }, [fixedCategory, router, targetPath]);

  const canGoPrev = (pagination?.page ?? 1) > 1;
  const canGoNext = (pagination?.page ?? 1) < (pagination?.pages ?? 1);

  const priceFloor = meta?.price?.min ?? 0;
  const priceCeil = meta?.price?.max ?? 0;

  const dealsCategorySlug = fixedCategory || category;

  return (
    <div className="bg-background text-foreground">
      {isHome && heroBanners.length && heroBannerSettings ? (
        <HeroBannerSlider banners={heroBanners} settings={heroBannerSettings} />
      ) : null}
      <div
        className={cn(
          "mx-auto w-full max-w-6xl px-4",
          headerSpacing === "compact" ? "py-5 md:py-8" : "py-8"
        )}
      >
        <div className={cn("flex flex-col", headerSpacing === "compact" ? "gap-4" : "gap-6")}>
          {isHome ? (
            <>
              <HomeBanners banners={homeBanners} loading={homeBannersLoading} />
              <SuperDealsSection
                categorySlug={dealsCategorySlug}
                onQuickView={(slug) => setQuickViewSlug(slug)}
              />
            </>
          ) : null}

          <ListingTopBar
            title={pageTitle?.trim() || "Products"}
            spacing={headerSpacing}
            showSearch={showSearch}
            qInput={qInput}
            onQInputChange={setQInput}
            showFilters={showFilters}
            activeFilterCount={activeFilterCount}
            onOpenFilters={() => setMobileFiltersOpen(true)}
            showSort={showSort}
            sortLabel={sortLabel}
            onOpenSort={() => setMobileSortOpen(true)}
            showLayoutSwitcher={showLayoutSwitcher}
            layoutMode={layoutMode}
            onLayoutModeChange={showLayoutSwitcher ? setLayoutMode : undefined}
          />

          <div
            className={cn(
              "grid grid-cols-1 gap-6",
              showFilters && "md:grid-cols-[260px_1fr]"
            )}
          >
            {showFilters ? (
              <aside className="hidden h-fit rounded-3xl border border-border bg-surface p-4 md:block">
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={clearAll}
                  className={cn(
                    "w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground",
                    "hover:bg-muted",
                    !hasActiveFilters && "pointer-events-none opacity-50"
                  )}
                >
                  Clear all
                </button>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Category
                  </p>
                  <select
                    value={category}
                    onChange={(e) => {
                      if (fixedCategory) {
                        const next = e.target.value || "";
                        router.push(next ? `/category/${encodeURIComponent(next)}` : "/");
                        return;
                      }

                      setCategory(e.target.value || "");
                      setPage(1);
                      applyFilters({ category: e.target.value || "", page: 1 });
                    }}
                    className="mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground"
                  >
                    <option value="">All</option>
                    {(meta?.categories ?? []).map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Price
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min={priceFloor}
                      max={priceCeil}
                      value={typeof priceMin === "number" ? priceMin : ""}
                      onChange={(e) => setPriceMin(e.target.value ? Number(e.target.value) : undefined)}
                      onBlur={() => {
                        setPage(1);
                        applyFilters({ priceMin, page: 1 });
                      }}
                      placeholder="Min"
                      className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground"
                    />
                    <input
                      type="number"
                      min={priceFloor}
                      max={priceCeil}
                      value={typeof priceMax === "number" ? priceMax : ""}
                      onChange={(e) => setPriceMax(e.target.value ? Number(e.target.value) : undefined)}
                      onBlur={() => {
                        setPage(1);
                        applyFilters({ priceMax, page: 1 });
                      }}
                      placeholder="Max"
                      className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Rating
                  </p>
                  <select
                    value={typeof ratingMin === "number" ? String(ratingMin) : ""}
                    onChange={(e) => {
                      const next = e.target.value ? Number(e.target.value) : undefined;
                      setPage(1);
                      setRatingMin(next);
                      applyFilters({ ratingMin: next, page: 1 });
                    }}
                    className="mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground"
                  >
                    <option value="">Any</option>
                    <option value="4">4+</option>
                    <option value="3">3+</option>
                    <option value="2">2+</option>
                  </select>
                </div>

                <label className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3 text-sm text-foreground">
                  <span>In stock only</span>
                  <input
                    type="checkbox"
                    checked={inStock}
                    onChange={(e) => {
                      setPage(1);
                      setInStock(e.target.checked);
                      applyFilters({ inStock: e.target.checked, page: 1 });
                    }}
                    className="h-4 w-4"
                  />
                </label>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Sort
                  </p>
                  {showSort ? (
                    <select
                      value={sort}
                      onChange={(e) => {
                        setPage(1);
                        setSort(e.target.value);
                        applyFilters({ sort: e.target.value, page: 1 });
                      }}
                      className="mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground"
                    >
                      {SORT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              </div>
              </aside>
            ) : null}

            <section className="min-w-0">
              {!isHome ? (
                <SuperDealsSection
                  categorySlug={dealsCategorySlug}
                  onQuickView={(slug) => setQuickViewSlug(slug)}
                />
              ) : null}

              {loading ? (
                <ProductGrid>
                  {Array.from({ length: 12 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="border border-border bg-surface p-3"
                      style={{ borderRadius: cardRadius }}
                    >
                      <Skeleton className="aspect-square w-full" style={{ borderRadius: cardRadius }} />
                      <Skeleton className="mt-3 h-4 w-3/4" />
                      <Skeleton className="mt-2 h-4 w-1/2" />
                    </div>
                  ))}
                </ProductGrid>
              ) : items.length === 0 ? (
                <div className="rounded-3xl border border-border bg-surface p-8 text-center">
                  <p className="text-sm font-medium text-foreground">No products found</p>
                  <p className="mt-1 text-sm text-muted-foreground">Try adjusting filters.</p>
                </div>
              ) : (
                <ProductGrid>
                  {items.map((p) => (
                    <ProductCard
                      key={p._id}
                      product={p}
                      onQuickView={() => setQuickViewSlug(p.slug)}
                    />
                  ))}
                </ProductGrid>
              )}

              <div className="mt-8 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {pagination ? (
                    <>
                      Page {pagination.page} of {pagination.pages} - {pagination.total} items
                    </>
                  ) : null}
                </p>

                {pagination ? (
                  <div className="flex items-center gap-2">
                    <button
                      className={cn(
                        "h-11 rounded-2xl border border-border bg-surface px-4 text-sm font-medium text-foreground",
                        "hover:bg-muted",
                        !canGoPrev && "pointer-events-none opacity-50"
                      )}
                      onClick={() => {
                        const next = Math.max(1, page - 1);
                        setPage(next);
                        applyFilters({ page: next });
                      }}
                    >
                      Prev
                    </button>
                    <button
                      className={cn(
                        "h-11 rounded-2xl border border-border bg-surface px-4 text-sm font-medium text-foreground",
                        "hover:bg-muted",
                        !canGoNext && "pointer-events-none opacity-50"
                      )}
                      onClick={() => {
                        const next = Math.min(pagination.pages, page + 1);
                        setPage(next);
                        applyFilters({ page: next });
                      }}
                    >
                      Next
                    </button>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      </div>

      <QuickViewModal
        open={!!quickViewSlug}
        slug={quickViewSlug}
        onClose={() => setQuickViewSlug(null)}
      />

      <BottomSheet
        open={mobileFiltersOpen && showFilters}
        title="Filters"
        onClose={() => setMobileFiltersOpen(false)}
        rightAction={
          <Button variant="ghost" size="sm" onClick={clearAll} disabled={!hasActiveFilters} className="h-auto py-2">
            Clear
          </Button>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</p>
            <select
              value={category}
              onChange={(e) => {
                if (fixedCategory) {
                  const next = e.target.value || "";
                  router.push(next ? `/category/${encodeURIComponent(next)}` : "/");
                  return;
                }

                setPage(1);
                setCategory(e.target.value || "");
                applyFilters({ category: e.target.value || "", page: 1 });
              }}
              className="mt-2 w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
            >
              <option value="">All</option>
              {(meta?.categories ?? []).map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3 text-sm text-foreground">
            <span>In stock only</span>
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => {
                setPage(1);
                setInStock(e.target.checked);
                applyFilters({ inStock: e.target.checked, page: 1 });
              }}
              className="h-4 w-4"
            />
          </label>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Price</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Input
                type="number"
                min={priceFloor}
                max={priceCeil}
                value={typeof priceMin === "number" ? priceMin : ""}
                onChange={(e) => setPriceMin(e.target.value ? Number(e.target.value) : undefined)}
                onBlur={() => {
                  setPage(1);
                  applyFilters({ priceMin, page: 1 });
                }}
                placeholder="Min"
                className="h-auto rounded-2xl py-2"
              />
              <Input
                type="number"
                min={priceFloor}
                max={priceCeil}
                value={typeof priceMax === "number" ? priceMax : ""}
                onChange={(e) => setPriceMax(e.target.value ? Number(e.target.value) : undefined)}
                onBlur={() => {
                  setPage(1);
                  applyFilters({ priceMax, page: 1 });
                }}
                placeholder="Max"
                className="h-auto rounded-2xl py-2"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rating</p>
            <select
              value={typeof ratingMin === "number" ? String(ratingMin) : ""}
              onChange={(e) => {
                const next = e.target.value ? Number(e.target.value) : undefined;
                setPage(1);
                setRatingMin(next);
                applyFilters({ ratingMin: next, page: 1 });
              }}
              className="mt-2 w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
            >
              <option value="">Any</option>
              <option value="4">4+</option>
              <option value="3">3+</option>
              <option value="2">2+</option>
            </select>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={mobileSortOpen && showSort}
        title="Sort"
        onClose={() => setMobileSortOpen(false)}
      >
        <div className="space-y-2">
          {SORT_OPTIONS.map((o) => (
            <Button
              key={o.value}
              type="button"
              variant="secondary"
              onClick={() => {
                setPage(1);
                setSort(o.value);
                applyFilters({ sort: o.value, page: 1 });
                setMobileSortOpen(false);
              }}
              className={cn(
                "h-auto w-full justify-start rounded-2xl py-3",
                sort === o.value && "bg-muted"
              )}
            >
              {o.label}
            </Button>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}
