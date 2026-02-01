"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Search } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

type VariantRow = {
  id: string;
  sku: string;
  size: string;
  color: string;
  stock: number;
};

type InventoryItem = {
  id: string;
  title: string;
  slug: string;
  category: string;
  isActive: boolean;
  hasVariants: boolean;
  stockLevel: number;
  baseStock: number;
  variants: VariantRow[];
};

type ListResponse = {
  items: InventoryItem[];
  threshold: number;
};

type AdjustResponse = {
  ok: true;
  productId: string;
  variantId?: string;
  previousStock: number;
  newStock: number;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readMessage(json: unknown): string | undefined {
  if (!isRecord(json)) return undefined;
  const m = json.message;
  return typeof m === "string" ? m : undefined;
}

export default function AdminInventoryClient() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);

  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [onlyLow, setOnlyLow] = useState(true);
  const [threshold, setThreshold] = useState(10);

  const [adjusting, setAdjusting] = useState(false);
  const [targetProductId, setTargetProductId] = useState<string | null>(null);
  const [targetVariantId, setTargetVariantId] = useState<string | null>(null);
  const [delta, setDelta] = useState("0");
  const [reason, setReason] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 250);
    return () => clearTimeout(t);
  }, [qInput]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("threshold", String(threshold));
    params.set("onlyLow", String(onlyLow));
    if (q.trim()) params.set("q", q.trim());
    return params.toString();
  }, [onlyLow, q, threshold]);

  const load = useCallback(async () => {
    setLoading(true);

    const res = await fetch(`/api/admin/inventory?${queryString}`, { cache: "no-store" });

    if (!res.ok) {
      toast.error("Failed to load inventory");
      setItems([]);
      setLoading(false);
      return;
    }

    const data = (await res.json()) as ListResponse;
    setItems(data.items ?? []);
    setLoading(false);
  }, [queryString]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  function openAdjust(productId: string, variantId?: string) {
    setTargetProductId(productId);
    setTargetVariantId(variantId ?? null);
    setDelta("0");
    setReason("");
  }

  async function submitAdjust() {
    if (!targetProductId) return;

    const n = Number(delta);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n === 0) {
      toast.error("Delta must be a non-zero integer");
      return;
    }

    setAdjusting(true);

    const res = await fetch("/api/admin/inventory/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: targetProductId,
        variantId: targetVariantId ?? undefined,
        delta: n,
        reason: reason.trim() || undefined,
      }),
    });

    const json = (await res.json().catch(() => null)) as unknown;

    if (!res.ok) {
      toast.error(readMessage(json) ?? "Failed to adjust");
      setAdjusting(false);
      return;
    }

    const data = json as AdjustResponse;

    toast.success(`Stock updated (${data.previousStock} → ${data.newStock})`);
    setAdjusting(false);
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Inventory
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Low-stock monitoring and stock adjustments.
          </p>
        </div>

        <Button variant="secondary" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Search products"
              className="pl-9"
            />
          </div>

          <label className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={onlyLow}
              onChange={(e) => setOnlyLow(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300"
            />
            Low stock only
          </label>

          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Threshold</span>
            <Input
              value={String(threshold)}
              onChange={(e) => setThreshold(Number(e.target.value) || 0)}
              className="w-24"
            />
          </div>
        </div>

        <Link href="/admin/inventory/logs" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          View adjustment logs
        </Link>
      </div>

      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Variants</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-64" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="ml-auto h-8 w-36" /></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-600 dark:text-zinc-400">
                    No items.
                  </td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr key={p.id} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-50">{p.title}</div>
                      <div className="mt-0.5 text-xs text-zinc-500">/{p.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{p.category}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                          p.stockLevel <= threshold
                            ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        )}
                      >
                        {p.stockLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {p.hasVariants ? `${p.variants.length} variants` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openAdjust(p.id)}
                        >
                          Adjust
                        </Button>
                        {p.hasVariants ? (
                          <select
                            onChange={(e) => {
                              const vId = e.target.value;
                              if (vId) openAdjust(p.id, vId);
                            }}
                            className="h-9 rounded-xl border border-zinc-200 bg-white px-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                            value=""
                          >
                            <option value="">Adjust variant…</option>
                            {p.variants.slice(0, 20).map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.sku} ({v.stock})
                              </option>
                            ))}
                          </select>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {targetProductId ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Adjust stock</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Enter a delta (e.g. 5 or -3). Variant: {targetVariantId ?? "(none)"}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Delta</label>
              <Input value={delta} onChange={(e) => setDelta(e.target.value)} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Reason (optional)</label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button onClick={() => void submitAdjust()} disabled={adjusting}>
              {adjusting ? "Saving..." : "Apply"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setTargetProductId(null);
                setTargetVariantId(null);
              }}
              disabled={adjusting}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
