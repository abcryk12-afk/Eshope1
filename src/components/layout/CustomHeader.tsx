"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useStorefrontSettings } from "@/hooks/useStorefrontSettings";
import { useAppSelector } from "@/store/hooks";
import type { HeaderLayout, HeaderSettings } from "@/store/headerSlice";
import { normalizeLayout, normalizeSettings } from "@/lib/headerUtils";

import MiniCartDrawer from "@/components/layout/MiniCartDrawer";
import HeaderBlockRenderer from "@/components/layout/HeaderBlockRenderer";
import MobileMenuDrawer, { type MobileMenuItem } from "@/components/layout/MobileMenuDrawer";
import { useMobileMenu } from "@/hooks/useMobileMenu";

type Suggestion = {
  _id?: string;
  title: string;
  slug: string;
  category: string;
  image: string;
  pricePkr: number;
  compareAtPricePkr: number | null;
  dealLabel: string | null;
};

type ProductsMeta = {
  categories: { name: string; slug: string }[];
};

type Props = {
  layout: HeaderLayout;
  settings: HeaderSettings;
};

function cssVarIf(v: string | undefined) {
  const t = (v ?? "").trim();
  return t ? t : undefined;
}

export default function CustomHeader({ layout, settings }: Props) {
  const normalizedLayout = useMemo(() => normalizeLayout(layout), [layout]);
  const s = useMemo(() => normalizeSettings(settings), [settings]);

  const { settings: storefrontSettings } = useStorefrontSettings();
  const branding = storefrontSettings?.branding;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 200);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [meta, setMeta] = useState<ProductsMeta | null>(null);

  const { config: mobileMenuConfig } = useMobileMenu(mobileMenuOpen);

  const defaultMenuItems: MobileMenuItem[] = useMemo(() => {
    const cats = (meta?.categories ?? []).slice(0, 50);
    return cats.map((c) => ({
      id: `cat_${c.slug}`,
      type: "category" as const,
      title: c.name,
      href: `/category/${encodeURIComponent(c.slug)}`,
      enabled: true,
      visibility: "all" as const,
      children: [],
    }));
  }, [meta?.categories]);

  const effectiveMenuItems: MobileMenuItem[] = useMemo(() => {
    if (!mobileMenuConfig || mobileMenuConfig.useDefaultMenu) return defaultMenuItems;
    return (mobileMenuConfig.items as MobileMenuItem[]) ?? [];
  }, [mobileMenuConfig, defaultMenuItems]);

  const lastAddedAt = useAppSelector((st) => st.cart.lastAddedAt);
  const manualCloseAtRef = useRef(0);

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      setScrolled(y > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
    let cancelled = false;

    async function loadSuggestions() {
      const next = debouncedQ.trim();
      if (next.length < 2) {
        setSuggestions([]);
        return;
      }

      const res = await fetch(`/api/products/suggestions?q=${encodeURIComponent(next)}`);
      if (!res.ok) return;

      const data = (await res.json()) as { items: Suggestion[] };
      if (!cancelled) setSuggestions(Array.isArray(data.items) ? data.items : []);
    }

    loadSuggestions();

    return () => {
      cancelled = true;
    };
  }, [debouncedQ]);

  useEffect(() => {
    if (!lastAddedAt) return;
    if (cartOpen) return;

    const now = Date.now();
    if (now - manualCloseAtRef.current < 5000) return;

    setCartOpen(true);
  }, [lastAddedAt, cartOpen]);

  const isTransparent = s.transparent && !scrolled;
  const effectiveHeight = scrolled && s.sticky ? Math.max(48, Math.round(s.heightPx * 0.9)) : s.heightPx;

  const style: React.CSSProperties = {
    height: effectiveHeight,
    paddingLeft: s.paddingX,
    paddingRight: s.paddingX,
    paddingTop: s.paddingY,
    paddingBottom: s.paddingY,
    backgroundColor: isTransparent ? "transparent" : cssVarIf(s.background) ?? "var(--theme-header)",
    color: cssVarIf(s.text) ?? "var(--theme-foreground)",
    borderBottom: s.borderBottom ? "1px solid var(--theme-border)" : undefined,
    boxShadow: s.shadow && !isTransparent ? "0 10px 25px -15px rgba(0,0,0,0.35)" : undefined,
    transition: `background-color 220ms ease, box-shadow 220ms ease, height 220ms ease, border-color 220ms ease`,
  };

  const headerClass = cn(
    "z-50 w-full",
    s.sticky ? "sticky" : "relative",
    "top-[var(--announcement-offset,0px)]",
    "backdrop-blur-xl"
  );

  const logoNode = useMemo(() => {
    const storeName = branding?.storeName?.trim() || "Shop";
    const mode = branding?.logoMode ?? "text";
    const hasLogo = Boolean(branding?.logo?.url?.trim());
    const showImage = (mode === "image" || mode === "both") && hasLogo;
    const showText = (mode !== "image" || !showImage) && (!branding?.hideTextWhenLogoActive || !showImage);

    const maxH = Math.max(16, Math.min(96, Math.trunc(Number(branding?.logoMaxHeight ?? s.logoMaxHeightPx) || s.logoMaxHeightPx)));
    const logoW = branding?.logo?.width ?? null;
    const logoH = branding?.logo?.height ?? null;
    const aspect = logoW && logoH ? logoW / logoH : null;
    const widthPx = aspect ? Math.round(maxH * aspect) : maxH;

    return (
      <span className={cn("inline-flex items-center", mode === "both" ? "gap-2" : "gap-0")}>
        {showImage ? (
          <span className="relative block shrink-0" style={{ height: maxH, width: widthPx }}>
            <Image
              src={branding!.logo.url}
              alt={branding?.logo?.alt?.trim() || storeName}
              fill
              className="object-contain"
              unoptimized
              sizes={`${widthPx}px`}
            />
          </span>
        ) : null}
        {showText ? <span className="text-base font-semibold tracking-tight">{branding?.headerBrandText?.trim() || storeName}</span> : null}
      </span>
    );
  }, [branding, s.logoMaxHeightPx]);

  const [searchOpen, setSearchOpen] = useState(false);

  const navItems = useMemo(() => {
    const cats = meta?.categories ?? [];
    return cats.slice(0, 8);
  }, [meta?.categories]);

  const renderZone = useCallback(
    (blocks: typeof normalizedLayout.left) => (
      <div className="flex min-w-0 items-center" style={{ gap: s.iconSpacingPx }}>
        {blocks
          .filter((b) => b.enabled)
          .map((b) => {
            if (b.type === "logo") {
              return (
                <Link
                  key={b.id}
                  href="/"
                  className={cn("shrink-0", s.logoAlignment === "center" ? "mx-auto" : "")}
                  aria-label="Home"
                >
                  {logoNode}
                </Link>
              );
            }

            if (b.type === "navigation") {
              return (
                <nav key={b.id} className="hidden items-center gap-3 md:flex" aria-label="Primary">
                  {navItems.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/category/${encodeURIComponent(c.slug)}`}
                      className={cn(
                        "relative text-sm font-medium text-muted-foreground transition-colors",
                        "hover:text-foreground",
                        "after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-current after:transition-[width] after:duration-200 hover:after:w-full"
                      )}
                    >
                      {c.name}
                    </Link>
                  ))}
                </nav>
              );
            }

            if (b.type === "megaMenu") {
              return (
                <div key={b.id} className="relative hidden md:block">
                  <button
                    type="button"
                    className={cn(
                      "rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors",
                      "hover:bg-muted hover:text-foreground"
                    )}
                    aria-haspopup="menu"
                    aria-expanded="false"
                  >
                    Categories
                  </button>
                </div>
              );
            }

            return (
              <HeaderBlockRenderer
                key={b.id}
                block={b}
                settings={s}
                onOpenMobileMenu={() => setMobileMenuOpen(true)}
                onOpenCart={() => setCartOpen(true)}
                onToggleSearch={() => setSearchOpen((v) => !v)}
                searchOpen={searchOpen}
              />
            );
          })}
      </div>
    ),
    [logoNode, navItems, normalizedLayout, s, searchOpen]
  );

  const showSearchBar = s.searchStyle === "bar" || searchOpen;

  return (
    <>
      <header className={headerClass} style={style}>
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
          {renderZone(normalizedLayout.left)}

          <div className="flex min-w-0 flex-1 items-center justify-center" style={{ gap: s.iconSpacingPx }}>
            {renderZone(normalizedLayout.center)}
            {showSearchBar ? (
              <div className={cn("hidden md:block", s.searchStyle === "bar" ? "w-full max-w-xl" : "w-full max-w-md")}>
                <div className="relative">
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onFocus={() => setSuggestionsOpen(true)}
                    onBlur={() => window.setTimeout(() => setSuggestionsOpen(false), 150)}
                    placeholder="Search products..."
                    className="h-10 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-foreground/15"
                    aria-label="Search"
                  />
                  {suggestionsOpen && suggestions.length > 0 ? (
                    <div
                      className="absolute left-0 right-0 top-[calc(100%+8px)] overflow-hidden rounded-2xl border border-border bg-background shadow-lg"
                      style={{ transition: `opacity ${s.dropdownSpeedMs}ms ease, transform ${s.dropdownSpeedMs}ms ease` }}
                    >
                      <div className="max-h-80 overflow-auto p-2">
                        {suggestions.slice(0, 8).map((it) => (
                          <Link
                            key={it.slug}
                            href={`/product/${encodeURIComponent(it.slug)}`}
                            className="block rounded-xl px-3 py-2 text-sm hover:bg-muted"
                          >
                            {it.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {renderZone(normalizedLayout.right)}
        </div>
      </header>

      <MiniCartDrawer
        open={cartOpen}
        onClose={() => {
          manualCloseAtRef.current = Date.now();
          setCartOpen(false);
        }}
      />

      <MobileMenuDrawer
        open={mobileMenuOpen}
        title="Menu"
        items={effectiveMenuItems}
        onClose={() => setMobileMenuOpen(false)}
      />
    </>
  );
}
