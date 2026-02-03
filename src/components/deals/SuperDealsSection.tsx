"use client";

import { useEffect, useMemo, useState } from "react";

import ProductCard from "@/components/product/ProductCard";
import ProductGrid from "@/components/product/ProductGrid";
import Skeleton from "@/components/ui/Skeleton";

type DealInfo = {
  id: string;
  name: string;
  type: "percent" | "fixed";
  value: number;
  priority: number;
  expiresAt: string | null;
  label: string;
};

type DealProduct = {
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
  deal: DealInfo;
};

type Props = {
  categorySlug?: string;
  onQuickView: (slug: string) => void;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readItems(json: unknown): DealProduct[] {
  if (!isRecord(json)) return [];
  const items = json.items;
  return Array.isArray(items) ? (items as DealProduct[]) : [];
}

export default function SuperDealsSection({ categorySlug, onQuickView }: Props) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<DealProduct[]>([]);

  const qs = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", "6");
    if (categorySlug?.trim()) params.set("category", categorySlug.trim());
    return params.toString();
  }, [categorySlug]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);

      let res: Response;
      try {
        res = await fetch(`/api/deals/super?${qs}`, { cache: "no-store", signal: controller.signal });
      } catch {
        if (!cancelled) {
          setItems([]);
          setLoading(false);
        }
        return;
      }

      if (!res.ok) {
        if (!cancelled) {
          setItems([]);
          setLoading(false);
        }
        return;
      }

      const json = (await res.json().catch(() => null)) as unknown;
      const dataItems = readItems(json);

      if (!cancelled) {
        setItems(dataItems);
        setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [qs]);

  if (!loading && items.length === 0) return null;

  return (
    <div className="mb-6 rounded-3xl border border-border bg-surface p-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-tight text-foreground">Super Deals</p>
          <p className="mt-1 text-sm text-muted-foreground">Limited-time prices on top picks.</p>
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <ProductGrid>
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="rounded-3xl border border-border bg-background p-3">
                <Skeleton className="aspect-square w-full rounded-2xl" />
                <Skeleton className="mt-3 h-4 w-3/4" />
                <Skeleton className="mt-2 h-4 w-1/2" />
              </div>
            ))}
          </ProductGrid>
        ) : (
          <ProductGrid>
            {items.map((p) => (
              <ProductCard key={p._id} product={p} onQuickView={() => onQuickView(p.slug)} />
            ))}
          </ProductGrid>
        )}
      </div>
    </div>
  );
}
