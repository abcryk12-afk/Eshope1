"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { ChevronLeft, ChevronRight, Heart, Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { formatMoneyFromPkr } from "@/lib/currency";
import { formatCompactNumber } from "@/lib/numberFormat";
import { formatEtaText, type StorefrontSettings } from "@/lib/shipping";
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

  const [isMobile, setIsMobile] = useState(false);
  const dragControls = useDragControls();

  const wished = product ? wishlistIds.includes(product._id) : false;

  const descriptionText = useMemo(() => stripHtml(product?.description ?? ""), [product?.description]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(max-width: 767px)");

    function recompute() {
      setIsMobile(mq.matches);
    }

    recompute();

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", recompute);
      return () => mq.removeEventListener("change", recompute);
    }

    mq.addListener(recompute);
    return () => mq.removeListener(recompute);
  }, []);

  useEffect(() => {
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

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

  const [addUi, setAddUi] = useState<"idle" | "loading" | "added">("idle");

  useEffect(() => {
    let t: number | null = null;
    if (addUi === "added") {
      t = window.setTimeout(() => setAddUi("idle"), 1500);
    }
    return () => {
      if (t) window.clearTimeout(t);
    };
  }, [addUi]);

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

    toast.success("Added to cart", {
      closeButton: true,
      duration: 2500,
    });
  }

  async function handleAddToCart() {
    if (addUi !== "idle") return;
    if (!canAdd) return;

    setAddUi("loading");

    await Promise.resolve();

    add();
    setAddUi("added");
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm"
          onClick={onClose}
        >
          {isMobile ? (
            <motion.div
              initial={{ y: 48, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 48, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.12}
              onDragEnd={(_, info) => {
                if (info.offset.y > 120 || info.velocity.y > 900) onClose();
              }}
              className="absolute inset-x-0 bottom-0 flex h-dvh flex-col border border-border bg-surface shadow-2xl"
              style={{
                borderTopLeftRadius: "var(--radius-xl)",
                borderTopRightRadius: "var(--radius-xl)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="shrink-0 border-b border-border px-4 pb-3"
                onPointerDown={(e) => dragControls.start(e)}
                style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}
              >
                <div
                  className="mx-auto h-1.5 w-10 bg-muted"
                  style={{ borderRadius: "var(--radius-pill)" }}
                />

                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-semibold text-foreground">
                    {product?.title?.trim() ? product.title : "Quick view"}
                  </p>
                  <button
                    className="inline-flex h-10 w-10 items-center justify-center hover:bg-muted"
                    style={{ borderRadius: "var(--radius-md)" }}
                    onClick={onClose}
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                <div
                  className="relative aspect-square overflow-hidden bg-muted"
                  style={{ borderRadius: "var(--radius-xl)" }}
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
                          "inline-flex h-10 w-10 items-center justify-center",
                          "border border-border bg-surface/90 text-foreground shadow-sm"
                        )}
                        style={{ borderRadius: "var(--radius-pill)" }}
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={goNextImage}
                        className={cn(
                          "absolute right-3 top-1/2 -translate-y-1/2",
                          "inline-flex h-10 w-10 items-center justify-center",
                          "border border-border bg-surface/90 text-foreground shadow-sm"
                        )}
                        style={{ borderRadius: "var(--radius-pill)" }}
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
                          "relative h-14 w-14 overflow-hidden border",
                          "border-border bg-surface",
                          idx === activeImageIndex && "ring-2 ring-ring"
                        )}
                        style={{ borderRadius: "var(--radius-md)" }}
                        aria-label={`View image ${idx + 1}`}
                      >
                        <Image
                          src={src}
                          alt={`${product?.title ?? "Product"} image ${idx + 1}`}
                          fill
                          sizes="56px"
                          className="object-cover"
                          unoptimized
                        />
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
                    <Skeleton className="mt-6 h-11 w-full" style={{ borderRadius: "var(--radius-md)" }} />
                    <Skeleton className="mt-3 h-11 w-full" style={{ borderRadius: "var(--radius-md)" }} />
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
                          "inline-flex h-10 w-10 items-center justify-center border",
                          "border-border bg-surface text-foreground hover:bg-muted",
                          wished && "bg-primary text-primary-foreground"
                        )}
                        style={{ borderRadius: "var(--radius-md)" }}
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
                      <p className="mt-2 text-sm font-semibold text-destructive">
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
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Variant
                        </p>
                        <select
                          value={selectedVariantId ?? ""}
                          onChange={(e) => setSelectedVariantId(e.target.value)}
                          className="mt-2 h-11 w-full border border-border bg-surface px-3 text-sm text-foreground"
                          style={{ borderRadius: "var(--radius-md)" }}
                        >
                          {(product.variants ?? []).map((v) => (
                            <option key={v._id} value={v._id}>
                              {v.size} / {v.color} - {formatMoneyFromPkr(v.price, currency.selected, currency.pkrPerUsd)}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    <p className="mt-4 line-clamp-8 text-sm text-muted-foreground">
                      {descriptionText}
                    </p>

                    <Link
                      href={`/product/${product.slug}`}
                      className="mt-4 inline-flex text-sm font-semibold text-foreground hover:underline"
                    >
                      View details
                    </Link>
                  </>
                )}
              </div>
                </div>
              </div>

              <div
                className="shrink-0 border-t border-border px-4 pt-3"
                style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Price</p>
                    <p className="truncate text-base font-semibold text-foreground">
                      {formatMoneyFromPkr(unitPrice, currency.selected, currency.pkrPerUsd)}
                    </p>
                  </div>

                  <div
                    className="inline-flex items-center border border-border bg-surface p-1"
                    style={{ borderRadius: "var(--radius-md)" }}
                  >
                    <button
                      className="inline-flex h-9 w-9 items-center justify-center hover:bg-muted"
                      style={{ borderRadius: "var(--radius-sm)" }}
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      aria-label="Decrease"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-10 text-center text-sm font-semibold text-foreground">{qty}</span>
                    <button
                      className="inline-flex h-9 w-9 items-center justify-center hover:bg-muted"
                      style={{ borderRadius: "var(--radius-sm)" }}
                      onClick={() => setQty((q) => Math.min(99, q + 1))}
                      aria-label="Increase"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!canAdd || addUi !== "idle"}
                  className={cn(
                    "mt-3 h-11 w-full bg-primary px-4 text-sm font-semibold text-primary-foreground",
                    "hover:bg-primary-hover",
                    "transition-transform duration-150 active:scale-[0.98]",
                    (!canAdd || addUi !== "idle") && "pointer-events-none opacity-60"
                  )}
                  style={{ borderRadius: "var(--radius-md)" }}
                >
                  <span className="sr-only" aria-live="polite">
                    {addUi === "loading" ? "Adding to cart" : addUi === "added" ? "Added" : ""}
                  </span>
                  {addUi === "added" ? "✓ Added" : addUi === "loading" ? "Adding…" : "Add to cart"}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ y: 12, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 12, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", damping: 20, stiffness: 200 }}
              className="mx-auto mt-10 flex max-h-[calc(100dvh-80px)] w-[min(980px,calc(100%-32px))] flex-col overflow-hidden border border-border bg-surface shadow-2xl"
              style={{ borderRadius: "var(--radius-xl)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <p className="min-w-0 truncate text-sm font-semibold text-foreground">
                  {product?.title?.trim() ? product.title : "Quick view"}
                </p>
                <button
                  className="inline-flex h-10 w-10 items-center justify-center hover:bg-muted"
                  style={{ borderRadius: "var(--radius-md)" }}
                  onClick={onClose}
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-2">
                  <div>
                    <div
                      className="relative aspect-square overflow-hidden bg-muted"
                      style={{ borderRadius: "var(--radius-xl)" }}
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
                              "inline-flex h-10 w-10 items-center justify-center",
                              "border border-border bg-surface/90 text-foreground shadow-sm"
                            )}
                            style={{ borderRadius: "var(--radius-pill)" }}
                            aria-label="Previous image"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={goNextImage}
                            className={cn(
                              "absolute right-3 top-1/2 -translate-y-1/2",
                              "inline-flex h-10 w-10 items-center justify-center",
                              "border border-border bg-surface/90 text-foreground shadow-sm"
                            )}
                            style={{ borderRadius: "var(--radius-pill)" }}
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
                              "relative h-14 w-14 overflow-hidden border",
                              "border-border bg-surface",
                              idx === activeImageIndex && "ring-2 ring-ring"
                            )}
                            style={{ borderRadius: "var(--radius-md)" }}
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
                        <Skeleton className="mt-6 h-11 w-full" style={{ borderRadius: "var(--radius-md)" }} />
                        <Skeleton className="mt-3 h-11 w-full" style={{ borderRadius: "var(--radius-md)" }} />
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
                            <p className="mt-1 text-sm text-muted-foreground">{product.category}</p>

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
                              "inline-flex h-10 w-10 items-center justify-center border",
                              "border-border bg-surface text-foreground hover:bg-muted",
                              wished && "bg-primary text-primary-foreground"
                            )}
                            style={{ borderRadius: "var(--radius-md)" }}
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
                          <p className="mt-2 text-sm font-semibold text-destructive">Only {availableStock} left in stock</p>
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
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Variant</p>
                            <select
                              value={selectedVariantId ?? ""}
                              onChange={(e) => setSelectedVariantId(e.target.value)}
                              className="mt-2 h-11 w-full border border-border bg-surface px-3 text-sm text-foreground"
                              style={{ borderRadius: "var(--radius-md)" }}
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
                          <div
                            className="inline-flex items-center border border-border bg-surface p-1"
                            style={{ borderRadius: "var(--radius-md)" }}
                          >
                            <button
                              className="inline-flex h-9 w-9 items-center justify-center hover:bg-muted"
                              style={{ borderRadius: "var(--radius-sm)" }}
                              onClick={() => setQty((q) => Math.max(1, q - 1))}
                              aria-label="Decrease"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-10 text-center text-sm font-semibold text-foreground">{qty}</span>
                            <button
                              className="inline-flex h-9 w-9 items-center justify-center hover:bg-muted"
                              style={{ borderRadius: "var(--radius-sm)" }}
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
                              "h-11 flex-1 bg-primary px-4 text-sm font-semibold text-primary-foreground",
                              "hover:bg-primary-hover",
                              !canAdd && "pointer-events-none opacity-50"
                            )}
                            style={{ borderRadius: "var(--radius-md)" }}
                          >
                            Add to cart
                          </button>
                        </div>

                        <p className="mt-4 line-clamp-6 text-sm text-muted-foreground">{descriptionText}</p>

                        <Link
                          href={`/product/${product.slug}`}
                          className="mt-4 inline-flex text-sm font-semibold text-foreground hover:underline"
                        >
                          View details
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
