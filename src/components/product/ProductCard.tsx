"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, Heart, Star } from "lucide-react";

import { formatMoneyFromPkr } from "@/lib/currency";
import { formatCompactNumber } from "@/lib/numberFormat";
import { cn } from "@/lib/utils";
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

  const image = product.images?.[0];
  const hasDiscount =
    typeof product.compareAtPrice === "number" && product.compareAtPrice > product.basePrice;
  const isDeal = Boolean(product.deal?.label);
  const topBadge = isDeal ? product.deal!.label : hasDiscount ? "Sale" : "";

  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      className="group relative overflow-hidden rounded-3xl border border-border bg-surface p-3 shadow-sm transition"
    >
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
        {image ? (
          <Image
            src={image}
            alt={product.title}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.05]"
            unoptimized
          />
        ) : null}

        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/25 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />

        <div className="absolute left-2 top-2 flex gap-2">
          {topBadge ? (
            <span className="rounded-full bg-surface/90 px-2 py-1 text-xs font-semibold text-foreground">
              {topBadge}
            </span>
          ) : null}

          {isDeal ? (
            <span className="rounded-full bg-surface/90 px-2 py-1 text-xs font-semibold text-foreground">
              Limited time
            </span>
          ) : null}
        </div>

        <div className="absolute right-2 top-2 flex gap-2">
          <button
            type="button"
            onClick={() => dispatch(toggleWishlist(product._id))}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-foreground",
              wished && "bg-primary text-primary-foreground"
            )}
            aria-label="Toggle wishlist"
          >
            <Heart className={cn("h-4 w-4", wished && "fill-current")} />
          </button>
        </div>

        <div className="absolute bottom-2 left-2 right-2 flex gap-2 opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-2xl bg-surface/90 text-sm font-semibold text-foreground"
            onClick={onQuickView}
          >
            <Eye className="h-4 w-4" />
            Quick view
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <Link
          href={`/product/${product.slug}`}
          className="line-clamp-2 text-sm font-semibold tracking-tight text-foreground hover:underline"
        >
          {product.title}
        </Link>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {product.ratingCount > 0 ? (
              <>
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span className="font-semibold text-foreground">{product.ratingAvg.toFixed(1)}</span>
                <span>({product.ratingCount})</span>
              </>
            ) : (
              <>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4" />
                  ))}
                </div>
                <span>No reviews yet</span>
              </>
            )}

            {Number(product.soldCount ?? 0) > 0 ? (
              <span className="truncate">• {formatCompactNumber(Number(product.soldCount ?? 0))} sold</span>
            ) : null}
          </div>

          <div className="text-right">
            <p className="text-sm font-semibold text-foreground">
              {formatMoneyFromPkr(product.basePrice, currency.selected, currency.pkrPerUsd)}
            </p>
            {hasDiscount ? (
              <p className="text-xs text-muted-foreground line-through">
                {formatMoneyFromPkr(product.compareAtPrice!, currency.selected, currency.pkrPerUsd)}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
