"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, RefreshCw } from "lucide-react";

import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";

type Range = "7d" | "30d" | "90d";

type SalesPoint = { date: string; sales: number; orders: number };

type TopProduct = { productId: string; title: string; quantity: number; revenue: number };

type ApiResponse = {
  range: Range;
  cards: { totalSales: number; totalOrders: number; totalProducts: number; totalUsers: number };
  salesSeries: SalesPoint[];
  topProducts: TopProduct[];
};

function money(v: number) {
  return `$${Number(v ?? 0).toFixed(2)}`;
}

export default function AdminReportsClient() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [range, setRange] = useState<Range>("30d");

  const load = useCallback(async () => {
    setLoading(true);

    const res = await fetch(`/api/admin/reports?range=${range}`, { cache: "no-store" });

    if (!res.ok) {
      toast.error("Failed to load reports");
      setData(null);
      setLoading(false);
      return;
    }

    const json = (await res.json()) as ApiResponse;
    setData(json);
    setLoading(false);
  }, [range]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const maxSales = useMemo(() => {
    const series = data?.salesSeries ?? [];
    return Math.max(1, ...series.map((p) => p.sales));
  }, [data?.salesSeries]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Reports
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Sales performance and best sellers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as Range)}
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>

          <Button variant="secondary" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>

          <a href={`/api/admin/reports/export?range=${range}`}>
            <Button variant="secondary" disabled={loading}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading || !data ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-4 h-8 w-32" />
            </div>
          ))
        ) : (
          <>
            <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Total Sales</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{money(data.cards.totalSales)}</p>
            </div>
            <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Orders</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{data.cards.totalOrders}</p>
            </div>
            <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Products</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{data.cards.totalProducts}</p>
            </div>
            <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Users</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{data.cards.totalUsers}</p>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Sales chart</p>
          {loading || !data ? (
            <div className="mt-4 grid grid-cols-12 gap-2 items-end">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-12 gap-2 items-end">
              {data.salesSeries.slice(-12).map((p) => (
                <div
                  key={p.date}
                  className="w-full rounded-xl bg-zinc-900/90 dark:bg-zinc-50/90"
                  style={{ height: `${Math.max(6, (p.sales / maxSales) * 100)}%` }}
                  title={`${p.date} ${money(p.sales)} (${p.orders} orders)`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Best sellers</p>
          {loading || !data ? (
            <div className="mt-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data.topProducts.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">No data.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {data.topProducts.map((p) => (
                <div key={p.productId} className="rounded-2xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-50 truncate">{p.title}</div>
                  <div className="mt-1 flex items-center justify-between text-xs text-zinc-500">
                    <span>{p.quantity} sold</span>
                    <span>{money(p.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
