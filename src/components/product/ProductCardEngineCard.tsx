"use client";

import Image from "next/image";
import Link from "next/link";
import { Eye, Heart, Star } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { formatCompactNumber } from "@/lib/numberFormat";
import { formatMoneyFromPkr } from "@/lib/currency";
import { useStorefrontSettings } from "@/hooks/useStorefrontSettings";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addToCart } from "@/store/slices/cartSlice";
import { toggleWishlist } from "@/store/slices/wishlistSlice";
import AddToCartButton from "@/components/product/AddToCartButton";

const aspectClassFor = (a: "square" | "portrait" | "auto") => (a === "portrait" ? "aspect-[4/5]" : "aspect-square");

type ProductListItem = {
  _id: string;
  title: string;
  slug: string;
  images: string[];
  basePrice: number;
  compareAtPrice?: number;
  ratingAvg: number;
  ratingCount: number;
  soldCount?: number;
  category: string;
  deal?: { label: string; expiresAt?: string | null };
};

type Props = {
  product: ProductListItem;
  onQuickView: () => void;
};

function badgeText(product: ProductListItem) {
  const hasDiscount = typeof product.compareAtPrice === "number" && product.compareAtPrice > product.basePrice;
  const isDeal = Boolean(product.deal?.label);
  if (isDeal) return String(product.deal?.label ?? "");
  if (!hasDiscount) return "";
  const compareAt = Number(product.compareAtPrice ?? 0);
  const base = Number(product.basePrice ?? 0);
  if (!Number.isFinite(compareAt) || !Number.isFinite(base) || compareAt <= 0 || base <= 0) return "Sale";
  const pct = Math.round(((compareAt - base) / compareAt) * 100);
  return pct >= 5 ? `${pct}% OFF` : "Sale";
}

export default function ProductCardEngineCard({ product, onQuickView }: Props) {
  const dispatch = useAppDispatch();
  const wishlistIds = useAppSelector((s) => s.wishlist.productIds);
  const currency = useAppSelector((s) => s.currency);
  const engine = useAppSelector((s) => s.productCardEngine);

  const { settings } = useStorefrontSettings();
  const showAddToCartButton = settings?.storefrontUx?.showAddToCartButton ?? true;
  const enableQuickView = settings?.storefrontUx?.enableQuickView ?? true;

  const imageWrapRef = useRef<HTMLDivElement | null>(null);

  const wished = wishlistIds.includes(product._id);
  const s = engine.settings;
  const blocks = engine.blocks;

  const image = product.images?.[0];
  const discount = badgeText(product);
  const showRating = s.showRating;
  const showSold = s.showSoldCount;

  const isBestSeller = Number(product.soldCount ?? 0) >= 250;

  const aspect = aspectClassFor(s.imageAspect);
  const radius = `${Math.max(0, Math.round(s.radiusPx))}px`;

  const shadowClass =
    s.shadowDepth === "none" ? "shadow-none" : s.shadowDepth === "sm" ? "shadow-sm" : s.shadowDepth === "md" ? "shadow-md" : "shadow-lg";

  const densityPad = s.density === "compact" ? "px-2 pb-2 pt-2" : s.density === "spacious" ? "px-3 pb-3 pt-3" : "px-2.5 pb-2.5 pt-2.5";
  const gapClass = s.density === "compact" ? "space-y-1" : s.density === "spacious" ? "space-y-2" : "space-y-1.5";

  const enableLift = s.enableHoverAnimation && s.enableCardLift;
  const enableZoom = s.enableHoverAnimation && s.enableImageZoom;

  const containerClass = cn(
    "group relative overflow-hidden border border-border bg-surface transition",
    shadowClass,
    enableLift ? "md:hover:-translate-y-0.5 md:hover:shadow-md" : "",
    s.density === "compact" ? "text-[13px]" : ""
  );

  const enabledBlocks = blocks.filter((b) => b.enabled);

  return (
    <div className={containerClass} style={{ borderRadius: radius }} data-ds-scope="productCard">
      {enabledBlocks.map((b) => {
        if (b.type === "image") {
          return (
            <div ref={imageWrapRef} key={b.id} className={cn("relative overflow-hidden bg-muted", aspect)}>
              {image ? (
                <Image
                  src={image}
                  alt={product.title}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  className={cn("object-cover transition duration-500", enableZoom ? "group-hover:scale-[1.05]" : "")}
                  unoptimized
                />
              ) : null}
            </div>
          );
        }

        if (b.type === "badges") {
          if (!s.showDiscountBadge || (!discount && !isBestSeller)) return null;
          return (
            <div key={b.id} className="absolute left-2 top-2 flex flex-col items-start gap-1.5" data-ds-scope="badge">
              {discount ? (
                <span
                  className="bg-accent px-2 py-1 text-[11px] font-extrabold tracking-tight text-accent-foreground shadow-sm ring-1 ring-foreground/10"
                  style={{ borderRadius: "999px" }}
                >
                  {discount}
                </span>
              ) : null}

              {isBestSeller ? (
                <span
                  className="bg-surface/90 px-2 py-1 text-[11px] font-semibold tracking-tight text-foreground shadow-sm ring-1 ring-foreground/10"
                  style={{ borderRadius: "999px" }}
                >
                  Best Seller
                </span>
              ) : null}
            </div>
          );
        }

        if (b.type === "wishlist") {
          if (!s.showWishlistIcon) return null;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                dispatch(toggleWishlist(product._id));
                toast.success(wished ? "Removed from wishlist" : "Added to wishlist");
              }}
              className={cn(
                "absolute right-2 top-2 inline-flex items-center justify-center",
                "bg-surface/90 text-foreground ring-1 ring-foreground/10",
                "transition hover:bg-surface",
                s.density === "compact" ? "h-8 w-8" : "h-9 w-9"
              )}
              style={{ borderRadius: "999px" }}
              aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart className={cn("h-4 w-4", wished ? "fill-current" : "")} />
            </button>
          );
        }

        if (b.type === "title") {
          return (
            <div key={b.id} className={cn(densityPad, gapClass)}>
              <Link
                href={`/product/${product.slug}`}
                className={cn("line-clamp-2 font-semibold tracking-tight text-foreground hover:underline")}
              >
                {product.title}
              </Link>
            </div>
          );
        }

        if (b.type === "rating") {
          if (!showRating || product.ratingCount <= 0) return null;
          return (
            <div key={b.id} className={cn("flex items-center gap-2 px-2.5 text-xs text-muted-foreground")}
            >
              <Star className="h-4 w-4 fill-primary text-primary" />
              <span className="font-semibold text-foreground">{product.ratingAvg.toFixed(1)}</span>
              <span>({product.ratingCount})</span>
              {showSold && Number(product.soldCount ?? 0) > 0 ? (
                <span className="truncate">• {formatCompactNumber(Number(product.soldCount ?? 0))} sold</span>
              ) : null}
            </div>
          );
        }

        if (b.type === "price") {
          const hasDiscount = typeof product.compareAtPrice === "number" && product.compareAtPrice > product.basePrice;
          return (
            <div key={b.id} className={cn("px-2.5 pb-2.5")}
            >
              <p className="text-sm font-semibold text-foreground">
                {formatMoneyFromPkr(product.basePrice, currency.selected, currency.pkrPerUsd)}
              </p>
              {hasDiscount ? (
                <p className="text-xs text-muted-foreground line-through">
                  {formatMoneyFromPkr(product.compareAtPrice!, currency.selected, currency.pkrPerUsd)}
                </p>
              ) : null}
            </div>
          );
        }

        if (b.type === "actions") {
          const showQuickView = enableQuickView;
          return (
            <div key={b.id} className="px-2.5 pb-3" data-ds-scope="buttons">
              <div className="grid grid-cols-1 gap-2">
                {showAddToCartButton ? (
                  <AddToCartButton
                    canAdd={true}
                    getImageEl={() => imageWrapRef.current}
                    onAdd={() => {
                      dispatch(
                        addToCart({
                          productId: product._id,
                          variantId: product._id,
                          quantity: 1,
                          title: product.title,
                          image: product.images?.[0] ?? "",
                          unitPrice: product.basePrice,
                        })
                      );
                    }}
                    className={cn(
                      "w-full rounded-2xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground",
                      "hover:bg-primary/90",
                      s.density === "compact" ? "h-9" : "h-10"
                    )}
                  />
                ) : null}

                {showQuickView ? (
                  <button
                    type="button"
                    onClick={onQuickView}
                    className={cn(
                      "inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-sm font-semibold text-foreground",
                      "hover:bg-muted",
                      s.density === "compact" ? "h-9" : "h-10"
                    )}
                  >
                    <Eye className="h-4 w-4" />
                    Quick view
                  </button>
                ) : null}
              </div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
