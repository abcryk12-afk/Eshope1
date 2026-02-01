"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Search, ShoppingBag, User2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAppSelector } from "@/store/hooks";

import MiniCartDrawer from "./MiniCartDrawer";
import CurrencySwitcher from "./CurrencySwitcher";
import LanguageSwitcher from "./LanguageSwitcher";

type Suggestion = {
  _id?: string;
  title: string;
  slug: string;
  category: string;
};

type ProductsMeta = {
  categories: { name: string; slug: string }[];
  price: { min: number; max: number };
};

export default function Header() {
  const pathname = usePathname();

  const isAdminPath = pathname.startsWith("/admin");

  const { data: session } = useSession();
  const cartCount = useAppSelector((s) =>
    s.cart.items.reduce((acc, i) => acc + i.quantity, 0)
  );

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 200);

  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [meta, setMeta] = useState<ProductsMeta | null>(null);

  const userLabel = useMemo(() => session?.user?.email ?? "Account", [session?.user?.email]);

  useEffect(() => {
    if (isAdminPath) return;

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
  }, [isAdminPath]);

  useEffect(() => {
    if (isAdminPath) return;

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

      if (!cancelled) {
        setSuggestions(data.items ?? []);
      }
    }

    loadSuggestions();

    return () => {
      cancelled = true;
    };
  }, [debouncedQ, isAdminPath]);

  if (isAdminPath) {
    return null;
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-header backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted md:hidden"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/" className="text-base font-semibold tracking-tight text-foreground">
            Shop
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            <div className="group relative">
              <button
                type="button"
                className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Categories
              </button>
              <div className="invisible absolute left-0 top-full mt-2 w-130 translate-y-1 rounded-2xl border border-border bg-surface p-4 opacity-0 shadow-xl transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                <div className="grid grid-cols-2 gap-2">
                  {(meta?.categories ?? []).slice(0, 12).map((c) => (
                    <Link
                      key={c.slug}
                      href={`/category/${encodeURIComponent(c.slug)}`}
                      className="rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </nav>

          <div className="relative ml-auto flex w-full max-w-xl items-center gap-2">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setSuggestionsOpen(true);
                }}
                onFocus={() => setSuggestionsOpen(true)}
                onBlur={() => {
                  window.setTimeout(() => setSuggestionsOpen(false), 150);
                }}
                placeholder="Search products"
                className="h-11 w-full rounded-2xl border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />

              <AnimatePresence>
                {suggestionsOpen && (suggestions.length > 0 || debouncedQ.trim().length >= 2) ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
                  >
                    <div className="p-2">
                      {suggestions.map((s) => (
                        <Link
                          key={s.slug}
                          href={`/product/${s.slug}`}
                          className="block rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate">{s.title}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">{s.category}</span>
                          </div>
                        </Link>
                      ))}

                      {debouncedQ.trim().length >= 2 ? (
                        <Link
                          href={`/?q=${encodeURIComponent(debouncedQ.trim())}`}
                          className="mt-1 block rounded-xl px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate">View all results for “{debouncedQ.trim()}”</span>
                            <span className="shrink-0 text-xs font-medium text-muted-foreground">Search</span>
                          </div>
                        </Link>
                      ) : null}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <LanguageSwitcher className="hidden md:flex" variant="compact" />
            <CurrencySwitcher className="hidden md:flex" variant="compact" />
            {session?.user ? (
              <button
                type="button"
                className="hidden rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground md:inline-flex"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/login"
                className="hidden rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground md:inline-flex"
              >
                Sign in
              </Link>
            )}

            <Link
              href="/account"
              className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Account"
            >
              <User2 className="h-4 w-4" />
              <span className="hidden max-w-35 truncate md:inline">{userLabel}</span>
            </Link>

            <button
              type="button"
              className={cn(
                "relative inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium",
                "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              onClick={() => setCartOpen(true)}
              aria-label="Open cart"
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden md:inline">Cart</span>
              {cartCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
                  {cartCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </header>

      <MiniCartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      <AnimatePresence>
        {mobileMenuOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 px-4 py-6 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              className="h-full w-full max-w-sm rounded-3xl bg-surface p-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  Menu
                </span>
                <div className="flex items-center gap-2">
                  <LanguageSwitcher variant="compact" />
                  <CurrencySwitcher variant="compact" />
                </div>
                <button
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-1">
                {(meta?.categories ?? []).slice(0, 12).map((c) => (
                  <Link
                    key={c.slug}
                    href={`/category/${encodeURIComponent(c.slug)}`}
                    className="block rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
