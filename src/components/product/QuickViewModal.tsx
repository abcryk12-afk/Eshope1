"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Heart, Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { formatMoneyFromPkr } from "@/lib/currency";
import { formatCompactNumber } from "@/lib/numberFormat";
import { formatEtaText } from "@/lib/shipping";
import { cn } from "@/lib/utils";
import Skeleton from "@/components/ui/Skeleton";
import { StarRatingDisplay } from "@/components/ui/StarRating";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addToCart } from "@/store/slices/cartSlice";
import { toggleWishlist } from "@/store/slices/wishlistSlice";

type Variant = {
  _id: string;
  sku: string;
  size: string;
  color: string;
  price: number;
  stock: number;
  images: string[];
};

type Product = {
  _id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  images: string[];
  basePrice: number;
  compareAtPrice?: number;
  stock?: number;
  variants?: Variant[];
  ratingAvg: number;
  ratingCount: number;
  soldCount?: number;
};

type QuickViewModalProps = {
  open: boolean;
  slug: string | null;
  onClose: () => void;
};

type StorefrontSettings = {
  inventory: { lowStockThreshold: number };
  shipping: {
    defaultFee: number;
    etaDefault: { minDays: number; maxDays: number };
    cityRules: Array<{ city: string; fee: number }>;
  };
};

function stripHtml(html: string) {
  const raw = String(html || "");
  if (!raw.trim()) return "";

  try {
    const doc = new DOMParser().parseFromString(raw, "text/html");
    return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
  } catch {
    return raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
}

function pickDefaultVariant(product: Product) {
  const variants = product.variants ?? [];
  if (variants.length === 0) return null;

  const inStock = variants.find((v) => v.stock > 0);
  return inStock ?? variants[0] ?? null;
}

export default function QuickViewModal({ open, slug, onClose }: QuickViewModalProps) {
  const dispatch = useAppDispatch();
  const wishlistIds = useAppSelector((s) => s.wishlist.productIds);
  const currency = useAppSelector((s) => s.currency);

  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [storefrontSettings, setStorefrontSettings] = useState<StorefrontSettings | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  const wished = product ? wishlistIds.includes(product._id) : false;

  const descriptionText = useMemo(() => stripHtml(product?.description ?? ""), [product?.description]);

  useEffect(() => {
    if (!open || !slug) return;

    const safeSlug = slug;

    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setProduct(null);
      setQty(1);

      const settingsRes = await fetch("/api/storefront/settings", { cache: "no-store", signal: controller.signal }).catch(
        () => null
      );

      if (!cancelled && settingsRes && settingsRes.ok) {
        const settingsJson = (await settingsRes.json().catch(() => null)) as { settings?: StorefrontSettings } | null;
        if (!cancelled && settingsJson?.settings) setStorefrontSettings(settingsJson.settings);
      }

      let res: Response;
      try {
        res = await fetch(`/api/products/${encodeURIComponent(safeSlug)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
      } catch (err: unknown) {
        if (cancelled) return;
        const name = (err as { name?: string } | null)?.name;
        if (name === "AbortError") return;
        setLoading(false);
        return;
      }

      if (cancelled) return;

      if (!res.ok) {
        setLoading(false);
        return;
      }

      const data = (await res.json()) as { product: Product };

      const p = data.product;
      setProduct(p);

      const defaultVariant = pickDefaultVariant(p);
      setSelectedVariantId(defaultVariant?._id ?? null);

      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, slug]);

  const selectedVariant = useMemo(() => {
    if (!product) return null;

    const variants = product.variants ?? [];

    return variants.find((v) => v._id === selectedVariantId) ?? null;
  }, [product, selectedVariantId]);

  const activeImages = useMemo(() => {
    const v = selectedVariant?.images ?? [];
    const p = product?.images ?? [];

    const vClean = v.filter((x) => typeof x === "string" && x.trim());
    const pClean = p.filter((x) => typeof x === "string" && x.trim());

    return vClean.length ? vClean : pClean;
  }, [product, selectedVariant]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [selectedVariantId, product?._id]);

  const unitPrice = selectedVariant?.price ?? product?.basePrice ?? 0;
  const mainImage = activeImages[activeImageIndex] ?? undefined;

  const canAdd = useMemo(() => {
    if (!product) return false;
    if (selectedVariant) return selectedVariant.stock > 0;
    if (typeof product.stock === "number") return product.stock > 0;
    return true;
  }, [product, selectedVariant]);

  const availableStock = selectedVariant
    ? selectedVariant.stock
    : typeof product?.stock === "number"
      ? product.stock
      : null;

  const lowStockThreshold = storefrontSettings?.inventory?.lowStockThreshold ?? 5;
  const showLowStock =
    typeof availableStock === "number" && availableStock > 0 && availableStock <= Number(lowStockThreshold ?? 0);

  const shippingFeeValues = useMemo(() => {
    const s = storefrontSettings?.shipping;
    if (!s) return { allFree: true, minFee: 0, etaText: "" };

    const fees = [Number(s.defaultFee ?? 0), ...(s.cityRules ?? []).map((r) => Number(r.fee ?? 0))]
      .filter((x) => Number.isFinite(x) && x >= 0);

    const allFree = fees.every((f) => f === 0);
    const minFee = fees.length ? Math.min(...fees) : 0;
    const etaText = formatEtaText(Number(s.etaDefault?.minDays ?? 3), Number(s.etaDefault?.maxDays ?? 5));
    return { allFree, minFee, etaText };
  }, [storefrontSettings?.shipping]);

  const canSlideImages = activeImages.length > 1;

  function goPrevImage() {
    if (!canSlideImages) return;
    setActiveImageIndex((i) => (i - 1 + activeImages.length) % activeImages.length);
  }

  function goNextImage() {
    if (!canSlideImages) return;
    setActiveImageIndex((i) => (i + 1) % activeImages.length);
  }

  function add() {
    if (!product) return;

    const variantId = selectedVariant?._id ?? product._id;

    dispatch(
      addToCart({
        productId: product._id,
        variantId,
        quantity: qty,
        title: product.title,
        image: mainImage,
        unitPrice,
      })
    );

    toast.success("Added to cart");
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 12, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 20, stiffness: 200 }}
            className="mx-auto mt-10 w-[min(980px,calc(100%-32px))] overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <p className="text-sm font-semibold text-foreground">
                Quick view
              </p>
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted"
                onClick={onClose}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-2">
              <div>
                <div
                  className="relative aspect-square overflow-hidden rounded-3xl bg-muted"
                  onTouchStart={(e) => {
                    setTouchStartX(e.touches[0]?.clientX ?? null);
                  }}
                  onTouchEnd={(e) => {
                    if (touchStartX === null) return;
                    const endX = e.changedTouches[0]?.clientX ?? touchStartX;
                    const dx = endX - touchStartX;
                    setTouchStartX(null);

                    if (Math.abs(dx) < 40) return;
                    if (dx < 0) goNextImage();
                    else goPrevImage();
                  }}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (!canSlideImages) return;
                    if (e.key === "ArrowLeft") goPrevImage();
                    if (e.key === "ArrowRight") goNextImage();
                  }}
                  role="group"
                  aria-label="Product images"
                >
                  {loading ? (
                    <Skeleton className="h-full w-full" />
                  ) : mainImage ? (
                    <Image
                      src={mainImage}
                      alt={product?.title ?? "Product"}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : null}

                  {!loading && canSlideImages ? (
                    <>
                      <button
                        type="button"
                        onClick={goPrevImage}
                        className={cn(
                          "absolute left-3 top-1/2 -translate-y-1/2",
                          "inline-flex h-10 w-10 items-center justify-center rounded-full",
                          "border border-border bg-surface/90 text-foreground shadow-sm"
                        )}
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={goNextImage}
                        className={cn(
                          "absolute right-3 top-1/2 -translate-y-1/2",
                          "inline-flex h-10 w-10 items-center justify-center rounded-full",
                          "border border-border bg-surface/90 text-foreground shadow-sm"
                        )}
                        aria-label="Next image"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  ) : null}
                </div>

                {!loading && activeImages.length > 1 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeImages.slice(0, 6).map((src, idx) => (
                      <button
                        key={`${src}:${idx}`}
                        type="button"
                        onClick={() => setActiveImageIndex(idx)}
                        className={cn(
                          "relative h-14 w-14 overflow-hidden rounded-2xl border",
                          "border-border bg-surface",
                          idx === activeImageIndex && "ring-2 ring-ring"
                        )}
                        aria-label={`View image ${idx + 1}`}
                      >
                        <Image src={src} alt="" fill className="object-cover" unoptimized />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="min-w-0">
                {loading || !product ? (
                  <div>
                    <Skeleton className="h-7 w-3/4" />
                    <Skeleton className="mt-3 h-4 w-1/2" />
                    <Skeleton className="mt-6 h-11 w-full rounded-2xl" />
                    <Skeleton className="mt-3 h-11 w-full rounded-2xl" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/product/${product.slug}`}
                          className="text-xl font-semibold tracking-tight text-foreground hover:underline"
                        >
                          {product.title}
                        </Link>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {product.category}
                        </p>

                        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                          {product.ratingCount > 0 ? (
                            <>
                              <StarRatingDisplay value={product.ratingAvg} size="sm" />
                              <span className="font-semibold text-foreground">{product.ratingAvg.toFixed(1)}</span>
                              <span>({product.ratingCount})</span>
                            </>
                          ) : (
                            <>
                              <StarRatingDisplay value={0} size="sm" />
                              <span>No reviews yet</span>
                            </>
                          )}

                          {Number(product.soldCount ?? 0) > 0 ? (
                            <span className="truncate">• {formatCompactNumber(Number(product.soldCount ?? 0))} sold</span>
                          ) : null}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => dispatch(toggleWishlist(product._id))}
                        className={cn(
                          "inline-flex h-10 w-10 items-center justify-center rounded-2xl border",
                          "border-border bg-surface text-foreground hover:bg-muted",
                          wished && "bg-primary text-primary-foreground"
                        )}
                        aria-label="Toggle wishlist"
                      >
                        <Heart className={cn("h-4 w-4", wished && "fill-current")} />
                      </button>
                    </div>

                    <div className="mt-3 flex items-baseline justify-between">
                      <p className="text-2xl font-semibold text-foreground">
                        {formatMoneyFromPkr(unitPrice, currency.selected, currency.pkrPerUsd)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedVariant
                          ? selectedVariant.stock
                          : typeof product.stock === "number"
                          ? product.stock
                          : null}
                        {selectedVariant ? " in stock" : null}
                      </p>
                    </div>

                    {showLowStock ? (
                      <p className="mt-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                        Only {availableStock} left in stock
                      </p>
                    ) : null}

                    {storefrontSettings ? (
                      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                        <p>
                          {shippingFeeValues.allFree
                            ? "Free delivery"
                            : `Delivery from ${new Intl.NumberFormat("en-PK", {
                                style: "currency",
                                currency: "PKR",
                                maximumFractionDigits: 0,
                              }).format(shippingFeeValues.minFee)} (varies by city)`}
                        </p>
                        {shippingFeeValues.etaText ? <p>{shippingFeeValues.etaText}</p> : null}
                      </div>
                    ) : null}

                    {(product.variants ?? []).length > 0 ? (
                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Variant
                        </p>
                        <select
                          value={selectedVariantId ?? ""}
                          onChange={(e) => setSelectedVariantId(e.target.value)}
                          className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                        >
                          {(product.variants ?? []).map((v) => (
                            <option key={v._id} value={v._id}>
                              {v.size} / {v.color} - {formatMoneyFromPkr(v.price, currency.selected, currency.pkrPerUsd)}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    <div className="mt-4 flex items-center gap-2">
                      <div className="inline-flex items-center rounded-2xl border border-zinc-200 p-1 dark:border-zinc-800">
                        <button
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900"
                          onClick={() => setQty((q) => Math.max(1, q - 1))}
                          aria-label="Decrease"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-10 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                          {qty}
                        </span>
                        <button
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900"
                          onClick={() => setQty((q) => Math.min(99, q + 1))}
                          aria-label="Increase"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={add}
                        disabled={!canAdd}
                        className={cn(
                          "h-11 flex-1 rounded-2xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800",
                          "dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200",
                          !canAdd && "pointer-events-none opacity-50"
                        )}
                      >
                        Add to cart
                      </button>
                    </div>

                    <p className="mt-4 line-clamp-5 text-sm text-zinc-600 dark:text-zinc-400">
                      {descriptionText}
                    </p>

                    <Link
                      href={`/product/${product.slug}`}
                      className="mt-4 inline-flex text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
                    >
                      View details
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
