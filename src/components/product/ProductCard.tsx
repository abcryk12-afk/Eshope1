"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, Heart, Star } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

import { formatMoneyFromPkr } from "@/lib/currency";
import { formatCompactNumber } from "@/lib/numberFormat";
import { cn } from "@/lib/utils";
import { useStorefrontSettings } from "@/hooks/useStorefrontSettings";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addToCart } from "@/store/slices/cartSlice";
import { toggleWishlist } from "@/store/slices/wishlistSlice";
import AddToCartButton from "@/components/product/AddToCartButton";

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

type ProductCardProps = {
  product: ProductListItem;
  onQuickView: () => void;
};

export default function ProductCard({ product, onQuickView }: ProductCardProps) {
  const dispatch = useAppDispatch();
  const wishlistIds = useAppSelector((s) => s.wishlist.productIds);
  const currency = useAppSelector((s) => s.currency);
  const wished = wishlistIds.includes(product._id);

  const imageWrapRef = useRef<HTMLDivElement | null>(null);

  const { settings } = useStorefrontSettings();
  const card = settings?.storefrontLayout?.productCard;
  const style = card?.style ?? "rounded";
  const density = card?.density ?? "balanced";
  const imageAspect = card?.imageAspect ?? "square";

  const ux = settings?.storefrontUx;
  const showAddToCartButton = ux?.showAddToCartButton ?? true;
  const enableQuickView = ux?.enableQuickView ?? true;
  const variant = ux?.productCardVariant ?? "modern";

  const showRating = card?.showRating ?? true;
  const showSoldCount = card?.showSoldCount ?? true;
  const showWishlistIcon = card?.showWishlistIcon ?? true;
  const showDiscountBadge = card?.showDiscountBadge ?? true;

  const image = product.images?.[0];
  const hasDiscount =
    typeof product.compareAtPrice === "number" && product.compareAtPrice > product.basePrice;
  const isDeal = Boolean(product.deal?.label);
  const discountBadge = isDeal
    ? product.deal!.label
    : hasDiscount
      ? (() => {
          const compareAt = Number(product.compareAtPrice ?? 0);
          const base = Number(product.basePrice ?? 0);
          if (!Number.isFinite(compareAt) || !Number.isFinite(base) || compareAt <= 0 || base <= 0) {
            return "Sale";
          }
          const pct = Math.round(((compareAt - base) / compareAt) * 100);
          return pct >= 5 ? `${pct}% OFF` : "Sale";
        })()
      : "";

  const isBestSeller = Number(product.soldCount ?? 0) >= 250;

  const aspectClass = imageAspect === "portrait" ? "aspect-[4/5]" : "aspect-square";
  const objectClass = imageAspect === "auto" ? "object-contain" : "object-cover";

  const cardRadius =
    style === "squared"
      ? "var(--radius-none)"
      : style === "image_first"
        ? "var(--radius-md)"
        : style === "poster"
          ? "var(--radius-lg)"
          : "var(--radius-xl)";

  const contentPadClass =
    style === "image_first"
      ? "px-2 pb-2 pt-2"
      : density === "compact"
        ? "px-2 pb-2 pt-2"
        : density === "image_focused"
          ? "px-2.5 pb-2.5 pt-2.5"
          : "px-2.5 pb-2.5 pt-2.5";

  const titleClass =
    density === "compact" ? "text-[13px]" : density === "image_focused" ? "text-sm" : "text-sm";
  const contentGapClass = density === "compact" ? "space-y-1" : "space-y-1.5";
  const iconBtnClass = density === "compact" ? "h-8 w-8" : "h-9 w-9";

  const isPoster = style === "poster";

  return (
    <motion.div
      layout
      className={cn(
        "group relative flex h-full flex-col overflow-hidden border border-border bg-surface shadow-sm transition",
        "transition-transform md:hover:-translate-y-0.5 md:hover:shadow-md"
      )}
      style={{ borderRadius: cardRadius }}
    >
      <div ref={imageWrapRef} className={cn("relative overflow-hidden bg-muted", aspectClass)}>
        {image ? (
          <Image
            src={image}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className={cn(objectClass, "transition duration-500 group-hover:scale-[1.05]")}
            unoptimized
          />
        ) : null}

        <div className="absolute left-2 top-2 flex flex-col items-start gap-1.5">
          {showDiscountBadge && discountBadge ? (
            <span
              className="bg-accent px-2 py-1 text-[11px] font-extrabold tracking-tight text-accent-foreground shadow-sm ring-1 ring-foreground/10"
              style={{ borderRadius: "999px" }}
            >
              {discountBadge}
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

          {showDiscountBadge && isDeal ? (
            <span
              className="border border-border bg-surface/90 px-2 py-1 text-[11px] font-semibold tracking-tight text-muted-foreground backdrop-blur-sm"
              style={{ borderRadius: "var(--radius-pill)" }}
            >
              Limited time
            </span>
          ) : null}
        </div>

        {showWishlistIcon ? (
          <button
            type="button"
            onClick={() => {
              dispatch(toggleWishlist(product._id));
              toast.success(wished ? "Removed from wishlist" : "Added to wishlist");
            }}
            className={cn(
              "absolute right-2 top-2 inline-flex items-center justify-center",
              "bg-surface/90 text-foreground ring-1 ring-foreground/10",
              "transition hover:bg-surface",
              iconBtnClass
            )}
            style={{ borderRadius: "999px" }}
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart className={cn("h-4 w-4", wished && "fill-current")} />
          </button>
        ) : null}

        {isPoster || !enableQuickView ? null : (
          <div className="absolute bottom-2 left-2 right-2 flex gap-2 opacity-0 transition group-hover:opacity-100">
            <button
              type="button"
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-2 bg-surface/90 text-sm font-semibold text-foreground",
                density === "compact" ? "h-9" : "h-10"
              )}
              style={{ borderRadius: "var(--radius-md)" }}
              onClick={onQuickView}
            >
              <Eye className="h-4 w-4" />
              Quick view
            </button>
          </div>
        )}

        {isPoster ? (
          <div className="absolute inset-x-2 bottom-2">
            <div
              className="bg-foreground/60 p-2 text-background backdrop-blur-sm ring-1 ring-foreground/10"
              style={{ borderRadius: "var(--radius-md)" }}
            >
              <Link
                href={`/product/${product.slug}`}
                className={cn("line-clamp-2 text-sm font-semibold tracking-tight hover:underline")}
              >
                {product.title}
              </Link>

              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  {formatMoneyFromPkr(product.basePrice, currency.selected, currency.pkrPerUsd)}
                </p>

                {showRating && product.ratingCount > 0 ? (
                  <div className="flex items-center gap-1 text-xs">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <span className="font-semibold">{product.ratingAvg.toFixed(1)}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {isPoster ? null : (
        <div
          className={cn(
            contentPadClass,
            contentGapClass,
            "flex flex-1 flex-col",
            variant === "minimal" && density !== "compact" ? "pb-2" : ""
          )}
        >
          <Link
            href={`/product/${product.slug}`}
            className={cn(
              "line-clamp-2 font-semibold tracking-tight text-foreground hover:underline",
              titleClass
            )}
          >
            {product.title}
          </Link>

          {showRating && product.ratingCount > 0 ? (
            <div
              className={cn(
                "flex items-center gap-2 text-xs text-muted-foreground",
                density === "compact" ? "-mt-0.5" : ""
              )}
            >
              <Star className="h-4 w-4 fill-primary text-primary" />
              <span className="font-semibold text-foreground">{product.ratingAvg.toFixed(1)}</span>
              <span>({product.ratingCount})</span>
              {showSoldCount && Number(product.soldCount ?? 0) > 0 ? (
                <span className="truncate">• {formatCompactNumber(Number(product.soldCount ?? 0))} sold</span>
              ) : null}
            </div>
          ) : showSoldCount && Number(product.soldCount ?? 0) > 0 ? (
            <p className="text-xs text-muted-foreground">{formatCompactNumber(Number(product.soldCount ?? 0))} sold</p>
          ) : null}

          <div className={cn("mt-auto", showAddToCartButton ? "space-y-2" : "space-y-0")}
          >
            <div>
              <p className={cn("font-semibold text-foreground", density === "compact" ? "text-sm" : "text-sm")}>
                {formatMoneyFromPkr(product.basePrice, currency.selected, currency.pkrPerUsd)}
              </p>
              {hasDiscount ? (
                <p className="text-xs text-muted-foreground line-through">
                  {formatMoneyFromPkr(product.compareAtPrice!, currency.selected, currency.pkrPerUsd)}
                </p>
              ) : null}
            </div>

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
                  "hover:bg-primary/90"
                )}
              />
            ) : null}
          </div>
        </div>
      )}
    </motion.div>
  );
}
