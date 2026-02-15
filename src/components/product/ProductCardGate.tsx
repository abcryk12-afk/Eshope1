"use client";

import { usePathname } from "next/navigation";

import { isProductCardEngineEnabled } from "@/lib/theme-engine";
import { useAppSelector } from "@/store/hooks";

import ProductCard from "@/components/product/ProductCard";
import ProductCardEngineCard from "@/components/product/ProductCardEngineCard";

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

export default function ProductCardGate(props: Props) {
  const pathname = usePathname() || "/";
  const engine = useAppSelector((s) => s.productCardEngine);

  if (!isProductCardEngineEnabled()) {
    return <ProductCard {...props} />;
  }

  if (!engine?.enabled) {
    return <ProductCard {...props} />;
  }

  const scopePaths = engine.scopePaths ?? [];
  const inScope =
    engine.scopeMode === "denylist"
      ? !scopePaths.some((p) => p && (pathname === p || pathname.startsWith(p + "/")))
      : scopePaths.some((p) => p && (pathname === p || pathname.startsWith(p + "/")));

  if (!inScope) {
    return <ProductCard {...props} />;
  }

  if (engine.mode === "default") {
    return <ProductCard {...props} />;
  }

  return <ProductCardEngineCard {...props} />;
}
