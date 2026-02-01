"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Package, Receipt, ShoppingCart, Users } from "lucide-react";

import Skeleton from "@/components/ui/Skeleton";

type SalesPoint = {
  date: string;
  sales: number;
  orders: number;
};

type RecentOrder = {
  id: string;
  createdAt: string;
  totalAmount: number;
  orderStatus: string;
  isPaid: boolean;
  customerEmail?: string;
};

type LowStockItem = {
  id: string;
  title: string;
  slug: string;
  stockLevel: number;
};

type Overview = {
  cards: {
    totalSales: number;
    totalOrders: number;
    totalProducts: number;
    totalUsers: number;
  };
  salesSeries: SalesPoint[];
  recentOrders: RecentOrder[];
  lowStock: LowStockItem[];
};

function Stat({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {title}
        </p>
        <div className="text-zinc-500">{icon}</div>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
    </div>
  );
}

export default function AdminDashboardClient() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const res = await fetch("/api/admin/overview?range=30d", {
        cache: "no-store",
      });

      if (cancelled) return;

      if (!res.ok) {
        setData(null);
        setLoading(false);
        return;
      }

      const json = (await res.json()) as Overview;
      setData(json);
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const maxSales = useMemo(() => {
    const series = data?.salesSeries ?? [];
    return Math.max(1, ...series.map((p) => p.sales));
  }, [data?.salesSeries]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Overview
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Sales, orders, inventory, and operational alerts.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading || !data ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-4 h-8 w-32" />
            </div>
          ))
        ) : (
          <>
            <Stat
              title="Total Sales"
              value={`$${data.cards.totalSales.toFixed(2)}`}
              icon={<Receipt className="h-4 w-4" />}
            />
            <Stat
              title="Total Orders"
              value={String(data.cards.totalOrders)}
              icon={<ShoppingCart className="h-4 w-4" />}
            />
            <Stat
              title="Total Products"
              value={String(data.cards.totalProducts)}
              icon={<Package className="h-4 w-4" />}
            />
            <Stat
              title="Total Users"
              value={String(data.cards.totalUsers)}
              icon={<Users className="h-4 w-4" />}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Sales (Last 30 days)
            </p>
          </div>

          {loading || !data ? (
            <div className="mt-4 grid grid-cols-12 gap-2 items-end">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-12 gap-2 items-end">
              {(data.salesSeries ?? []).slice(-12).map((p) => (
                <motion.div
                  key={p.date}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(6, (p.sales / maxSales) * 100)}%` }}
                  transition={{ type: "spring", damping: 20, stiffness: 180 }}
                  className="w-full rounded-xl bg-zinc-900/90 dark:bg-zinc-50/90"
                  title={`${p.date}  $${p.sales.toFixed(2)}  (${p.orders} orders)`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Low stock alerts
            </p>
            <AlertTriangle className="h-4 w-4 text-zinc-500" />
          </div>

          {loading || !data ? (
            <div className="mt-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data.lowStock.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
              No low-stock items.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {data.lowStock.slice(0, 6).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-2xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
                >
                  <span className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                    {p.title}
                  </span>
                  <span className="ml-3 shrink-0 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    {p.stockLevel}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Recent orders
        </p>

        {loading || !data ? (
          <div className="mt-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : data.recentOrders.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            No orders yet.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-zinc-500">
                  <th className="py-2">Order</th>
                  <th className="py-2">Customer</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Paid</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.slice(0, 8).map((o) => (
                  <tr key={o.id} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="py-3 font-semibold text-zinc-900 dark:text-zinc-50">
                      {o.id.slice(-6)}
                    </td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-400">
                      {o.customerEmail ?? "—"}
                    </td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-400">
                      {o.orderStatus}
                    </td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-400">
                      {o.isPaid ? "Yes" : "No"}
                    </td>
                    <td className="py-3 text-right font-semibold text-zinc-900 dark:text-zinc-50">
                      ${o.totalAmount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
