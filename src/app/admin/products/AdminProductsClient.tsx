"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckSquare, ChevronRight, Plus, RefreshCw, Search, Trash2 } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import { formatMoneyFromPkr } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store/hooks";

type AdminProductListItem = {
  _id: string;
  title: string;
  slug: string;
  category: string;
  basePrice: number;
  compareAtPrice?: number;
  isActive: boolean;
  createdAt?: string;
};

type ApiListResponse = {
  items: AdminProductListItem[];
};

type StatusFilter = "all" | "active" | "inactive";

async function fetchProducts() {
  const res = await fetch("/api/admin/products", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load");
  return (await res.json()) as ApiListResponse;
}

async function bulkAction(ids: string[], action: "activate" | "deactivate" | "delete") {
  const res = await fetch("/api/admin/products/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids, action }),
  });

  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(json?.message ?? "Request failed");
  }
}

export default function AdminProductsClient() {
  const currency = useAppSelector((s) => s.currency);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AdminProductListItem[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => k),
    [selected]
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return items.filter((p) => {
      if (status === "active" && !p.isActive) return false;
      if (status === "inactive" && p.isActive) return false;

      if (!query) return true;

      return (
        p.title.toLowerCase().includes(query) ||
        p.slug.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
    });
  }, [items, q, status]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      try {
        const data = await fetchProducts();
        if (!cancelled) {
          setItems(data.items ?? []);
          setSelected({});
        }
      } catch {
        if (!cancelled) toast.error("Failed to load products");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function onRefresh() {
    setLoading(true);
    try {
      const data = await fetchProducts();
      setItems(data.items ?? []);
      setSelected({});
    } catch {
      toast.error("Failed to refresh");
    } finally {
      setLoading(false);
    }
  }

  function toggleAll(next: boolean) {
    const map: Record<string, boolean> = {};
    for (const p of filtered) map[p._id] = next;
    setSelected(map);
  }

  async function runBulk(action: "activate" | "deactivate" | "delete") {
    if (selectedIds.length === 0) {
      toast.message("Select products first");
      return;
    }

    const label =
      action === "activate" ? "Publish" : action === "deactivate" ? "Disable" : "Delete";

    const ok = window.confirm(`${label} ${selectedIds.length} product(s)?`);
    if (!ok) return;

    try {
      await bulkAction(selectedIds, action);
      toast.success("Updated");
      await onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  }

  async function deleteOne(id: string) {
    const ok = window.confirm("Delete this product? This cannot be undone.");
    if (!ok) return;

    const res = await fetch(`/api/admin/products/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      toast.error("Failed to delete");
      return;
    }

    toast.success("Deleted");
    await onRefresh();
  }

  const allChecked = filtered.length > 0 && filtered.every((p) => selected[p._id]);
  const someChecked = filtered.some((p) => selected[p._id]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Products
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Manage catalog, pricing, and visibility.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onRefresh} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Link href="/admin/products/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New product
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title, slug, category"
              className="pl-9"
            />
          </div>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          >
            <option value="all">All</option>
            <option value="active">Published</option>
            <option value="inactive">Draft/Disabled</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => runBulk("activate")}
            disabled={selectedIds.length === 0 || loading}
          >
            Publish
          </Button>
          <Button variant="secondary" onClick={() => runBulk("deactivate")}
            disabled={selectedIds.length === 0 || loading}
          >
            Disable
          </Button>
          <Button
            variant="ghost"
            onClick={() => runBulk("delete")}
            disabled={selectedIds.length === 0 || loading}
            className="border border-zinc-200 dark:border-zinc-800"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>

          <div className="ml-auto text-xs font-semibold text-zinc-500">
            {selectedIds.length} selected
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
              <tr>
                <th className="w-12 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleAll(!allChecked)}
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-xl border",
                      someChecked ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-600",
                      "dark:border-zinc-800 dark:text-zinc-300"
                    )}
                    aria-label="Toggle all"
                  >
                    <CheckSquare className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="px-4 py-3">
                      <Skeleton className="h-8 w-8" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-64" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-6 w-24" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Skeleton className="ml-auto h-8 w-28" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-600 dark:text-zinc-400">
                    No products found.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p._id} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={!!selected[p._id]}
                        onChange={(e) => setSelected((prev) => ({ ...prev, [p._id]: e.target.checked }))}
                        className="h-4 w-4 rounded border-zinc-300"
                      />
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-50">{p.title}</div>
                      <div className="mt-0.5 text-xs text-zinc-500">/{p.slug}</div>
                    </td>

                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{p.category}</td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {formatMoneyFromPkr(Number(p.basePrice ?? 0), currency.selected, currency.pkrPerUsd)}
                      </div>
                      {p.compareAtPrice ? (
                        <div className="text-xs text-zinc-500 line-through">
                          {formatMoneyFromPkr(Number(p.compareAtPrice), currency.selected, currency.pkrPerUsd)}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                          p.isActive
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300"
                        )}
                      >
                        {p.isActive ? "Published" : "Draft"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link href={`/admin/products/${p._id}`}>
                          <Button variant="secondary" size="sm">
                            Edit <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteOne(p._id)}
                          className="border border-zinc-200 dark:border-zinc-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
