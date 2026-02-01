"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronRight, Plus, RefreshCw, Search, Trash2 } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

type CouponItem = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  expiresAt: string | null;
  isExpired: boolean;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

type ListResponse = {
  items: CouponItem[];
  pagination: Pagination;
};

type StatusFilter = "all" | "active" | "inactive" | "expired";

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readMessage(json: unknown): string | undefined {
  if (!isRecord(json)) return undefined;
  const m = json.message;
  return typeof m === "string" ? m : undefined;
}

export default function AdminCouponsClient() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CouponItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(qInput);
      setPage(1);
    }, 250);

    return () => clearTimeout(t);
  }, [qInput]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "20");

    if (q.trim()) params.set("q", q.trim());
    if (status !== "all") params.set("status", status);

    return params.toString();
  }, [page, q, status]);

  const load = useCallback(async () => {
    setLoading(true);

    const res = await fetch(`/api/admin/coupons?${queryString}`, { cache: "no-store" });

    if (!res.ok) {
      toast.error("Failed to load coupons");
      setItems([]);
      setPagination(null);
      setLoading(false);
      return;
    }

    const data = (await res.json()) as ListResponse;

    setItems(data.items ?? []);
    setPagination(data.pagination ?? null);
    setLoading(false);
  }, [queryString]);

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 0);

    return () => clearTimeout(t);
  }, [load]);

  async function deleteCoupon(id: string) {
    const ok = window.confirm("Delete this coupon?");
    if (!ok) return;

    const res = await fetch(`/api/admin/coupons/${encodeURIComponent(id)}`, { method: "DELETE" });

    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as unknown;
      toast.error(readMessage(json) ?? "Failed to delete");
      return;
    }

    toast.success("Deleted");
    void load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Coupons
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Create and manage promotions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Link href="/admin/coupons/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New coupon
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Search by code"
              className="pl-9"
            />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as StatusFilter);
              setPage(1);
            }}
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        <div className="text-xs font-semibold text-zinc-500">
          {pagination ? `${pagination.total} coupons` : ""}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Usage</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-24" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="ml-auto h-8 w-32" /></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-600 dark:text-zinc-400">
                    No coupons found.
                  </td>
                </tr>
              ) : (
                items.map((c) => {
                  const expired = c.isExpired;

                  return (
                    <tr key={c.id} className="border-b border-zinc-100 dark:border-zinc-900">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-50">{c.code}</div>
                        <div className="mt-0.5 text-xs text-zinc-500">Min: ${c.minOrderAmount.toFixed(2)}</div>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{c.type}</td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {c.type === "percent" ? `${c.value}%` : `$${c.value.toFixed(2)}`}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {c.usedCount}/{c.usageLimit ?? "∞"}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {c.expiresAt ? fmtDate(c.expiresAt) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                            !c.isActive
                              ? "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300"
                              : expired
                                ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          )}
                        >
                          {!c.isActive ? "Inactive" : expired ? "Expired" : "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link href={`/admin/coupons/${c.id}`}>
                            <Button variant="secondary" size="sm">
                              Edit <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="border border-zinc-200 dark:border-zinc-800"
                            onClick={() => void deleteCoupon(c.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.pages > 1 ? (
          <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <p className="text-xs font-semibold text-zinc-500">
              Page {pagination.page} of {pagination.pages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1 || loading}
              >
                Prev
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={pagination.page >= pagination.pages || loading}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
