"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, Heart, Star } from "lucide-react";

import { formatMoneyFromPkr } from "@/lib/currency";
import { formatCompactNumber } from "@/lib/numberFormat";
import { cn } from "@/lib/utils";
import { useStorefrontSettings } from "@/hooks/useStorefrontSettings";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toggleWishlist } from "@/store/slices/wishlistSlice";

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

  const { settings } = useStorefrontSettings();
  const card = settings?.storefrontLayout?.productCard;
  const density = card?.density ?? "balanced";
  const imageAspect = card?.imageAspect ?? "square";

  const showRating = card?.showRating ?? true;
  const showSoldCount = card?.showSoldCount ?? true;
  const showWishlistIcon = card?.showWishlistIcon ?? true;
  const showDiscountBadge = card?.showDiscountBadge ?? true;

  const image = product.images?.[0];
  const hasDiscount =
    typeof product.compareAtPrice === "number" && product.compareAtPrice > product.basePrice;
  const isDeal = Boolean(product.deal?.label);
  const topBadge = isDeal ? product.deal!.label : hasDiscount ? "Sale" : "";

  const aspectClass = imageAspect === "portrait" ? "aspect-[4/5]" : "aspect-square";
  const objectClass = imageAspect === "auto" ? "object-contain" : "object-cover";

  const shellClass =
    density === "compact"
      ? "rounded-2xl p-2"
      : density === "image_focused"
        ? "rounded-3xl p-2.5"
        : "rounded-3xl p-3";

  const titleClass =
    density === "compact" ? "text-[13px]" : density === "image_focused" ? "text-sm" : "text-sm";
  const contentGapClass = density === "compact" ? "mt-2 space-y-1.5" : "mt-3 space-y-2";
  const iconBtnClass = density === "compact" ? "h-8 w-8" : "h-9 w-9";

  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      className={cn(
        "group relative overflow-hidden border border-border bg-surface shadow-sm transition",
        shellClass
      )}
    >
      <div className={cn("relative overflow-hidden bg-muted", aspectClass, density === "compact" ? "rounded-2xl" : "rounded-3xl")}>
        {image ? (
          <Image
            src={image}
            alt={product.title}
            fill
            className={cn(objectClass, "transition duration-500 group-hover:scale-[1.05]")}
            unoptimized
          />
        ) : null}

        <div className="absolute left-2 top-2 flex gap-2">
          {showDiscountBadge && topBadge ? (
            <span className="rounded-full bg-surface/90 px-2 py-1 text-xs font-semibold text-foreground">
              {topBadge}
            </span>
          ) : null}

          {showDiscountBadge && isDeal ? (
            <span className="rounded-full bg-surface/90 px-2 py-1 text-xs font-semibold text-foreground">
              Limited time
            </span>
          ) : null}
        </div>

        {showWishlistIcon ? (
          <div className="absolute right-2 top-2 flex gap-2">
            <button
              type="button"
              onClick={() => dispatch(toggleWishlist(product._id))}
              className={cn(
                "inline-flex items-center justify-center rounded-full bg-surface/90 text-foreground",
                iconBtnClass,
                wished && "bg-primary text-primary-foreground"
              )}
              aria-label="Toggle wishlist"
            >
              <Heart className={cn("h-4 w-4", wished && "fill-current")} />
            </button>
          </div>
        ) : null}

        <div className="absolute bottom-2 left-2 right-2 flex gap-2 opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-surface/90 text-sm font-semibold text-foreground",
              density === "compact" ? "h-9" : "h-10"
            )}
            onClick={onQuickView}
          >
            <Eye className="h-4 w-4" />
            Quick view
          </button>
        </div>
      </div>

      <div className={contentGapClass}>
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
          <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", density === "compact" ? "-mt-0.5" : "")}
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
      </div>
    </motion.div>
  );
}
