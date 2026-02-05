"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { formatMoneyFromPkr, type CurrencyCode } from "@/lib/currency";

type OrderListItem = {
  id: string;
  createdAt: string;
  totalAmount: number;
  currency?: CurrencyCode;
  pkrPerUsd?: number;
  orderStatus: string;
  isPaid: boolean;
  itemsCount: number;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function money(amountPkr: number, currency: CurrencyCode, pkrPerUsd?: number) {
  return formatMoneyFromPkr(amountPkr, currency, pkrPerUsd);
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function AccountOrdersClient() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<OrderListItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const res = await fetch("/api/orders", { cache: "no-store" });

      if (cancelled) return;

      if (!res.ok) {
        setItems([]);
        setLoading(false);
        return;
      }

      const json = (await res.json().catch(() => null)) as unknown;

      if (!isRecord(json) || !Array.isArray(json.items)) {
        setItems([]);
        setLoading(false);
        return;
      }

      setItems(json.items as OrderListItem[]);
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-3xl border border-border bg-surface p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Orders</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your recent orders and their status.</p>
        </div>
        <Link href="/">
          <Button variant="secondary">Shop</Button>
        </Link>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="py-2">Order</th>
              <th className="py-2">Status</th>
              <th className="py-2">Paid</th>
              <th className="py-2">Items</th>
              <th className="py-2">Created</th>
              <th className="py-2 text-right">Total</th>
              <th className="py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="py-3"><Skeleton className="h-4 w-20" /></td>
                  <td className="py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="py-3"><Skeleton className="h-4 w-12" /></td>
                  <td className="py-3"><Skeleton className="h-4 w-10" /></td>
                  <td className="py-3"><Skeleton className="h-4 w-36" /></td>
                  <td className="py-3 text-right"><Skeleton className="ml-auto h-4 w-20" /></td>
                  <td className="py-3 text-right"><Skeleton className="ml-auto h-9 w-20" /></td>
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No orders yet.
                </td>
              </tr>
            ) : (
              items.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="py-3 font-semibold text-foreground">{o.id.slice(-6)}</td>
                  <td className="py-3 text-muted-foreground">{o.orderStatus}</td>
                  <td className="py-3 text-muted-foreground">{o.isPaid ? "Yes" : "No"}</td>
                  <td className="py-3 text-muted-foreground">{o.itemsCount}</td>
                  <td className="py-3 text-muted-foreground">{fmtDate(o.createdAt)}</td>
                  <td className="py-3 text-right font-semibold text-foreground">
                    {money(o.totalAmount, o.currency ?? "PKR", o.pkrPerUsd)}
                  </td>
                  <td className="py-3 text-right">
                    <Link href={`/account/orders/${encodeURIComponent(o.id)}`}>
                      <Button variant="secondary" size="sm">View</Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
