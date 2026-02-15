"use client";

import { useEffect, useMemo, useState } from "react";

import ProductCardGate from "@/components/product/ProductCardGate";
import CategoryCarousel from "@/components/storefront/CategoryCarousel";
import Skeleton from "@/components/ui/Skeleton";
import { useStorefrontSettings } from "@/hooks/useStorefrontSettings";

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

function isDealProduct(v: unknown): v is DealProduct {
  if (!isRecord(v)) return false;
  const id = String(v._id ?? "").trim();
  const title = String(v.title ?? "").trim();
  const slug = String(v.slug ?? "").trim();
  const basePrice = typeof v.basePrice === "number" ? v.basePrice : Number(v.basePrice);
  const imagesRaw = (v as Record<string, unknown>).images;
  const images = Array.isArray(imagesRaw)
    ? (imagesRaw as unknown[]).filter((x) => typeof x === "string").map((x) => String(x).trim()).filter(Boolean)
    : [];
  if (!id || !title || !slug) return false;
  if (!Number.isFinite(basePrice) || basePrice <= 0) return false;
  if (images.length === 0) return false;
  return true;
}

function readItems(json: unknown): DealProduct[] {
  if (!isRecord(json)) return [];
  const items = json.items;
  if (!Array.isArray(items)) return [];
  return (items as unknown[]).filter(isDealProduct) as DealProduct[];
}

export default function SuperDealsSection({ categorySlug, onQuickView }: Props) {
  const { settings } = useStorefrontSettings();
  const style = settings?.storefrontLayout?.productCard?.style ?? "rounded";
  const sectionRadius =
    style === "squared"
      ? "var(--radius-none)"
      : style === "image_first"
        ? "var(--radius-md)"
        : style === "poster"
          ? "var(--radius-lg)"
          : "var(--radius-xl)";

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
    <div className="mb-6 border border-border bg-surface p-4" style={{ borderRadius: sectionRadius }}>
      <CategoryCarousel
        title="Super Deals"
        subtitle="Limited-time prices on top picks."
        items={items}
        loading={loading}
        skeletonCount={6}
        edgeFade="strong"
        desktopArrows="hover"
        renderSkeleton={() => (
          <div
            className="group relative overflow-hidden border border-border bg-surface shadow-sm"
            style={{ borderRadius: sectionRadius }}
          >
            <Skeleton className="aspect-square w-full" style={{ borderRadius: sectionRadius }} />
            <div className="space-y-1.5 px-2.5 pb-2.5 pt-2.5">
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        )}
        renderItem={(p) => <ProductCardGate product={p} onQuickView={() => onQuickView(p.slug)} />}
      />
    </div>
  );
}
