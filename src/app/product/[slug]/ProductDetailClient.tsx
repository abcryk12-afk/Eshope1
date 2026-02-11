"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Heart, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

import { formatMoneyFromPkr } from "@/lib/currency";
import { formatCompactNumber } from "@/lib/numberFormat";
import { formatEtaText } from "@/lib/shipping";
import { useWhatsAppContext } from "@/components/layout/WhatsAppContext";
import { cn } from "@/lib/utils";
import Skeleton from "@/components/ui/Skeleton";
import { StarRatingDisplay } from "@/components/ui/StarRating";
import ProductCard from "@/components/product/ProductCard";
import ProductGrid from "@/components/product/ProductGrid";
import ZoomableProductImage from "@/components/product/ZoomableProductImage";
import AddToCartButton from "@/components/product/AddToCartButton";
import { useStorefrontSettings } from "@/hooks/useStorefrontSettings";
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
  categorySlug?: string;
  images: string[];
  basePrice: number;
  compareAtPrice?: number;
  stock?: number;
  variants?: Variant[];
  ratingAvg: number;
  ratingCount: number;
  soldCount?: number;
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
};

type Props = {
  slug: string;
};

function isSafeUrl(url: string, kind: "href" | "src") {
  const v = String(url || "").trim();
  if (!v) return false;

  if (v.startsWith("/")) return true;
  if (v.startsWith("#")) return kind === "href";

  try {
    const u = new URL(v);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return true;
  } catch {
    return false;
  }
}

function sanitizeHtml(html: string) {
  const raw = String(html || "");
  if (!raw.trim()) return "";

  const allowedColors = new Set(["#0f172a", "#52525b", "#dc2626", "#16a34a", "#2563eb"]);

  function sanitizeStyle(tag: string, styleValue: string) {
    const rawStyle = String(styleValue || "").trim();
    if (!rawStyle) return "";

    const parts = rawStyle
      .split(";")
      .map((p) => p.trim())
      .filter(Boolean);

    const map = new Map<string, string>();
    for (const part of parts) {
      const idx = part.indexOf(":");
      if (idx <= 0) continue;
      const prop = part.slice(0, idx).trim().toLowerCase();
      const val = part.slice(idx + 1).trim();
      map.set(prop, val);
    }

    if (tag === "span") {
      const c = map.get("color")?.toLowerCase() ?? "";
      if (!allowedColors.has(c)) return "";
      return `color:${c};`;
    }

    if (tag === "p" || tag === "h1" || tag === "h2" || tag === "h3" || tag === "h4" || tag === "h5" || tag === "h6") {
      const a = map.get("text-align")?.toLowerCase() ?? "";
      if (a !== "left" && a !== "center" && a !== "right") return "";
      return `text-align:${a};`;
    }

    if (tag === "img") {
      const display = map.get("display")?.toLowerCase();
      const maxWidth = map.get("max-width")?.toLowerCase();
      const height = map.get("height")?.toLowerCase();
      const margin = (map.get("margin") ?? "").toLowerCase().replace(/\s+/g, " ").trim();

      const okDisplay = !display || display === "block";
      const okMax = !maxWidth || maxWidth === "100%";
      const okHeight = !height || height === "auto";
      const okMargin = !margin || margin === "0.5rem auto" || margin === "0.5rem 0 0.5rem 0" || margin === "0.5rem 0 0.5rem auto";

      if (!okDisplay || !okMax || !okHeight || !okMargin) return "";

      const finalMargin = margin || "0.5rem auto";
      return `display:block;max-width:100%;height:auto;margin:${finalMargin};`;
    }

    return "";
  }

  if (typeof window === "undefined") {
    const stripped = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return stripped
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  const allowedTags = new Set([
    "p",
    "br",
    "strong",
    "em",
    "b",
    "i",
    "u",
    "s",
    "span",
    "ul",
    "ol",
    "li",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "blockquote",
    "pre",
    "code",
    "a",
    "img",
  ]);

  const allowedAttrs: Record<string, Set<string>> = {
    a: new Set(["href", "target", "rel"]),
    span: new Set(["style"]),
    p: new Set(["style"]),
    h1: new Set(["style"]),
    h2: new Set(["style"]),
    h3: new Set(["style"]),
    h4: new Set(["style"]),
    h5: new Set(["style"]),
    h6: new Set(["style"]),
    img: new Set(["src", "alt", "style"]),
  };

  const doc = new DOMParser().parseFromString(raw, "text/html");
  const root = doc.body;

  function clean(parent: Element) {
    let i = 0;
    while (i < parent.childNodes.length) {
      const node = parent.childNodes[i];

      if (node.nodeType === Node.COMMENT_NODE) {
        node.parentNode?.removeChild(node);
        continue;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        i += 1;
        continue;
      }

      const el = node as Element;
      const tag = el.tagName.toLowerCase();

      if (!allowedTags.has(tag)) {
        const before = el;
        while (before.firstChild) {
          parent.insertBefore(before.firstChild, before);
        }
        parent.removeChild(before);
        continue;
      }

      const allowed = allowedAttrs[tag] ?? new Set<string>();
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        if (name.startsWith("on")) {
          el.removeAttribute(attr.name);
          continue;
        }

        if (name === "style" && allowed.has("style")) {
          const next = sanitizeStyle(tag, attr.value);
          if (!next) {
            el.removeAttribute(attr.name);
          } else {
            el.setAttribute("style", next);
          }
          continue;
        }

        if (!allowed.has(name)) {
          el.removeAttribute(attr.name);
        }
      }

      if (tag === "a") {
        const href = el.getAttribute("href") ?? "";
        if (!isSafeUrl(href, "href")) {
          el.removeAttribute("href");
        }

        el.setAttribute("rel", "noreferrer noopener");
        if (el.getAttribute("target") === "_blank") {
          el.setAttribute("rel", "noreferrer noopener");
        }
      }

      if (tag === "img") {
        const src = el.getAttribute("src") ?? "";
        if (!isSafeUrl(src, "src")) {
          parent.removeChild(el);
          continue;
        }
      }

      clean(el);
      i += 1;
    }
  }

  clean(root);
  return root.innerHTML;
}

function pickDefaultVariant(product: Product) {
  const variants = product.variants ?? [];
  if (variants.length === 0) return null;

  const inStock = variants.find((v) => v.stock > 0);
  return inStock ?? variants[0] ?? null;
}

export default function ProductDetailClient({ slug }: Props) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const wishlistIds = useAppSelector((s) => s.wishlist.productIds);
  const currency = useAppSelector((s) => s.currency);

  const { settings: storefrontSettings } = useStorefrontSettings();
  const { setProduct: setWhatsAppProduct, clearProduct: clearWhatsAppProduct } = useWhatsAppContext();

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);

  const [recentlyViewed, setRecentlyViewed] = useState<ProductListItem[]>([]);
  const [related, setRelated] = useState<ProductListItem[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  const wished = product ? wishlistIds.includes(product._id) : false;

  const [safeDescription, setSafeDescription] = useState("");

  useEffect(() => {
    setSafeDescription(sanitizeHtml(product?.description ?? ""));
  }, [product?.description]);

  useEffect(() => {
    if (!product) return;
    const productUrl = typeof window !== "undefined" ? window.location.href : "";
    setWhatsAppProduct({ productName: product.title, productUrl });
    return () => {
      clearWhatsAppProduct();
    };
  }, [product, setWhatsAppProduct, clearWhatsAppProduct]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setProduct(null);
      setQty(1);

      let res: Response;
      try {
        res = await fetch(`/api/products/${encodeURIComponent(slug)}`, {
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
      setSelectedVariantId(pickDefaultVariant(p)?._id ?? null);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [slug]);

  useEffect(() => {
    if (!product) return;

    const item: ProductListItem = {
      _id: product._id,
      title: product.title,
      slug: product.slug,
      images: product.images ?? [],
      basePrice: product.basePrice ?? 0,
      compareAtPrice: product.compareAtPrice,
      ratingAvg: product.ratingAvg ?? 0,
      ratingCount: product.ratingCount ?? 0,
      category: product.category ?? "",
    };

    try {
      const raw = window.localStorage.getItem("recently_viewed_products") ?? "[]";
      const parsed = JSON.parse(raw) as unknown;
      const arr = Array.isArray(parsed) ? (parsed as unknown[]) : [];

      const safe: ProductListItem[] = arr
        .filter((v): v is ProductListItem => typeof v === "object" && v !== null)
        .map((v) => v as ProductListItem)
        .filter((v) => typeof v.slug === "string" && typeof v.title === "string")
        .slice(0, 50);

      const next = [item, ...safe.filter((p) => p.slug !== item.slug)].slice(0, 8);
      window.localStorage.setItem("recently_viewed_products", JSON.stringify(next));
      setRecentlyViewed(next.filter((p) => p.slug !== item.slug));
    } catch {
      setRecentlyViewed([]);
    }
  }, [product]);

  useEffect(() => {
    if (!product?.category) return;

    const category = product.categorySlug ?? product.category;
    const currentSlug = product.slug;

    let cancelled = false;
    const controller = new AbortController();

    async function loadRelated() {
      setLoadingRelated(true);

      const res = await fetch(
        `/api/products?category=${encodeURIComponent(category)}&limit=12&page=1`,
        {
          cache: "no-store",
          signal: controller.signal,
        }
      ).catch(() => null);

      if (cancelled) return;

      if (!res || !res.ok) {
        setRelated([]);
        setLoadingRelated(false);
        return;
      }

      const data = (await res.json().catch(() => null)) as
        | { items?: ProductListItem[] }
        | null;

      const items = Array.isArray(data?.items) ? data!.items! : [];
      const filtered = items.filter((p) => p.slug !== currentSlug).slice(0, 8);
      setRelated(filtered);
      setLoadingRelated(false);
    }

    void loadRelated();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [product?.category, product?.categorySlug, product?.slug]);

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

  const canAdd = useMemo(() => {
    if (!product) return false;

    if (selectedVariant) return selectedVariant.stock > 0;

    if (typeof product.stock === "number") return product.stock > 0;

    return true;
  }, [product, selectedVariant]);

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

  function buyNow() {
    add();
    router.push("/checkout");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 px-4 py-10 dark:bg-black">
        <div className="mx-auto w-full max-w-5xl">
          <Skeleton className="h-8 w-56" />
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <Skeleton className="aspect-square w-full rounded-3xl" />
            <div>
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="mt-3 h-5 w-1/2" />
              <Skeleton className="mt-6 h-11 w-full rounded-2xl" />
              <Skeleton className="mt-3 h-11 w-full rounded-2xl" />
              <Skeleton className="mt-8 h-28 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-zinc-50 px-4 py-10 dark:bg-black">
        <div className="mx-auto w-full max-w-3xl rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Product not found
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            This product may be unavailable.
          </p>
          <Link href="/" className="mt-6 inline-flex text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-50">
            Back to products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 pb-32 dark:bg-black md:pb-10">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-50">
            Back
          </Link>

          <button
            type="button"
            onClick={() => dispatch(toggleWishlist(product._id))}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold",
              "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-100",
              "dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900",
              wished && "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
            )}
          >
            <Heart className={cn("h-4 w-4", wished && "fill-current")} />
            Wishlist
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <div
              className="relative aspect-square overflow-hidden rounded-3xl bg-zinc-100 dark:bg-zinc-900"
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
              {mainImage ? (
                <ZoomableProductImage src={mainImage} alt={product.title} className="absolute inset-0" />
              ) : null}

              {canSlideImages ? (
                <>
                  <button
                    type="button"
                    onClick={goPrevImage}
                    className={cn(
                      "absolute left-3 top-1/2 -translate-y-1/2",
                      "inline-flex h-10 w-10 items-center justify-center rounded-full",
                      "border border-zinc-200 bg-white/90 text-zinc-900 shadow-sm",
                      "dark:border-zinc-800 dark:bg-zinc-950/80 dark:text-zinc-50"
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
                      "border border-zinc-200 bg-white/90 text-zinc-900 shadow-sm",
                      "dark:border-zinc-800 dark:bg-zinc-950/80 dark:text-zinc-50"
                    )}
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              ) : null}
            </div>

            {activeImages.length > 1 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {activeImages.slice(0, 8).map((src, idx) => (
                  <button
                    key={`${src}:${idx}`}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={cn(
                      "relative h-14 w-14 overflow-hidden rounded-2xl border",
                      "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950",
                      idx === activeImageIndex && "ring-2 ring-zinc-900/15 dark:ring-zinc-50/15"
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
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{product.category}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {product.title}
            </h1>

            <div className="mt-2 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              {product.ratingCount > 0 ? (
                <>
                  <StarRatingDisplay value={product.ratingAvg} size="sm" />
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">{product.ratingAvg.toFixed(1)}</span>
                  <span>({product.ratingCount} reviews)</span>
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

            <div className="mt-4 flex items-baseline justify-between gap-4">
              <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {formatMoneyFromPkr(unitPrice, currency.selected, currency.pkrPerUsd)}
              </p>
              <p className="text-sm text-zinc-500">
                {selectedVariant
                  ? `${selectedVariant.stock} in stock`
                  : typeof product.stock === "number"
                    ? `${product.stock} in stock`
                    : ""}
              </p>
            </div>

            {showLowStock ? (
              <p className="mt-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                Only {availableStock} left in stock
              </p>
            ) : null}

            {storefrontSettings ? (
              <div className="mt-3 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
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
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Variant</p>
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

            <div className="mt-5 flex items-center gap-2">
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

              <AddToCartButton
                canAdd={canAdd}
                getImageEl={() => document.querySelector<HTMLElement>("[data-product-main-image='true']")}
                onAdd={add}
                className={cn(
                  "h-11 flex-1 rounded-2xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800",
                  "dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                )}
              />
            </div>

            <div
              className={cn(
                "mt-6 text-sm leading-6 text-zinc-600 dark:text-zinc-400",
                "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-2xl",
                "[&_a]:underline [&_a]:underline-offset-2",
                "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
                "[&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-zinc-900 dark:[&_h1]:text-zinc-50",
                "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-zinc-900 dark:[&_h2]:text-zinc-50"
              )}
              dangerouslySetInnerHTML={{ __html: safeDescription }}
            />
          </div>
        </div>

        {related.length > 0 || loadingRelated ? (
          <div className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Related products</h2>
              <Link
                href={
                  product.categorySlug
                    ? `/category/${encodeURIComponent(product.categorySlug)}`
                    : `/?category=${encodeURIComponent(product.category)}`
                }
                className="text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
              >
                View category
              </Link>
            </div>

            <div className="mt-4">
              <ProductGrid>
              {loadingRelated
                ? Array.from({ length: 4 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="rounded-3xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
                    >
                      <Skeleton className="aspect-square w-full rounded-2xl" />
                      <Skeleton className="mt-3 h-4 w-3/4" />
                      <Skeleton className="mt-2 h-4 w-1/2" />
                    </div>
                  ))
                : related.map((p) => (
                    <ProductCard
                      key={p._id}
                      product={p}
                      onQuickView={() => router.push(`/product/${p.slug}`)}
                    />
                  ))}
              </ProductGrid>
            </div>
          </div>
        ) : null}

        {recentlyViewed.length > 0 ? (
          <div className="mt-10">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Recently viewed</h2>
            <div className="mt-4">
              <ProductGrid>
                {recentlyViewed.map((p) => (
                  <ProductCard
                    key={p._id}
                    product={p}
                    onQuickView={() => router.push(`/product/${p.slug}`)}
                  />
                ))}
              </ProductGrid>
            </div>
          </div>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 backdrop-blur md:hidden">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-muted-foreground">Total</p>
            <p className="truncate text-sm font-semibold text-foreground">
              {formatMoneyFromPkr(unitPrice, currency.selected, currency.pkrPerUsd)}
            </p>
          </div>

          <button
            type="button"
            onClick={add}
            disabled={!canAdd}
            className={cn(
              "h-11 rounded-2xl border border-border bg-surface px-4 text-sm font-semibold text-foreground",
              "hover:bg-muted",
              !canAdd && "pointer-events-none opacity-50"
            )}
          >
            Add
          </button>

          <button
            type="button"
            onClick={buyNow}
            disabled={!canAdd}
            className={cn(
              "h-11 rounded-2xl bg-accent px-5 text-sm font-semibold text-accent-foreground",
              "hover:bg-accent-hover",
              !canAdd && "pointer-events-none opacity-50"
            )}
          >
            Buy now
          </button>
        </div>
      </div>
    </div>
  );
}
