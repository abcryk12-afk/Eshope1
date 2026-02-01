"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

type ReturnItem = {
  id: string;
  orderId: string;
  orderShort: string;
  orderCreatedAt: string | null;
  orderStatus: string;
  productId: string;
  variantId: string;
  productTitle: string;
  productSlug: string;
  productImage: string;
  storeName: string;
  reason: string;
  comment: string;
  images: string[];
  status: string;
  refundProcessedAt: string | null;
  createdAt: string | null;
};

type ListResponse = { items: ReturnItem[] };

type Tab = "in_progress" | "awaiting_returns";

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

function statusLabel(s: string) {
  if (s === "requested") return "Return requested";
  if (s === "approved") return "Return approved";
  if (s === "rejected") return "Return rejected";
  if (s === "completed") return "Return completed";
  return s;
}

export default function AccountReturnsClient() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReturnItem[]>([]);

  const [tab, setTab] = useState<Tab>("in_progress");
  const [orderQ, setOrderQ] = useState("");
  const [storeQ, setStoreQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/account/returns", { cache: "no-store" }).catch(() => null);
    if (!res || !res.ok) {
      setItems([]);
      setLoading(false);
      return;
    }
    const json = (await res.json().catch(() => null)) as ListResponse | null;
    setItems(Array.isArray(json?.items) ? json!.items : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const filtered = useMemo(() => {
    const oq = orderQ.trim().toLowerCase();
    const sq = storeQ.trim().toLowerCase();

    return items.filter((it) => {
      if (tab === "in_progress" && !["requested"].includes(it.status)) return false;
      if (tab === "awaiting_returns" && !["approved"].includes(it.status)) return false;

      if (oq) {
        const hay = `${it.orderShort} ${it.orderId}`.toLowerCase();
        if (!hay.includes(oq)) return false;
      }

      if (sq) {
        if (!String(it.storeName ?? "").toLowerCase().includes(sq)) return false;
      }

      return true;
    });
  }, [items, orderQ, storeQ, tab]);

  const history = useMemo(() => items.filter((it) => ["rejected", "completed"].includes(it.status)), [items]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Returns / Refunds</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Request and track returns. Refunds are processed after approval/completion.</p>
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("in_progress")}
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-semibold",
                tab === "in_progress"
                  ? "border-zinc-900 bg-zinc-50 text-zinc-900 dark:border-zinc-50 dark:bg-zinc-900 dark:text-zinc-50"
                  : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
              )}
            >
              In Progress
            </button>
            <button
              type="button"
              onClick={() => setTab("awaiting_returns")}
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-semibold",
                tab === "awaiting_returns"
                  ? "border-zinc-900 bg-zinc-50 text-zinc-900 dark:border-zinc-50 dark:bg-zinc-900 dark:text-zinc-50"
                  : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
              )}
            >
              Awaiting Returns
            </button>
          </div>

          <Link href="/account/orders">
            <Button variant="secondary" size="sm">Go to orders</Button>
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
          <Input value={orderQ} onChange={(e) => setOrderQ(e.target.value)} placeholder="Order number" />
          <Input value={storeQ} onChange={(e) => setStoreQ(e.target.value)} placeholder="Store name" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          No items.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((it) => (
            <div key={it.id} className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 gap-3">
                  {it.productImage ? (
                    <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
                      <Image src={it.productImage} alt={it.productTitle} fill className="object-cover" sizes="56px" />
                    </div>
                  ) : null}

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{statusLabel(it.status)}</p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 truncate">{it.productTitle}</p>
                    <p className="mt-1 text-xs text-zinc-500">Order #{it.orderShort}{it.storeName ? ` · ${it.storeName}` : ""}</p>
                    <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">Reason: {it.reason}</p>
                    {it.comment ? <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{it.comment}</p> : null}
                    {it.createdAt ? <p className="mt-2 text-xs text-zinc-500">Requested: {fmtDate(it.createdAt)}</p> : null}
                    {it.refundProcessedAt ? <p className="mt-1 text-xs text-zinc-500">Refund processed: {fmtDate(it.refundProcessedAt)}</p> : null}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/account/orders/${encodeURIComponent(it.orderId)}`}>
                    <Button variant="secondary" size="sm">Order</Button>
                  </Link>
                  {it.productSlug ? (
                    <Link href={`/product/${encodeURIComponent(it.productSlug)}`}>
                      <Button variant="secondary" size="sm">Product</Button>
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && history.length ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">History</h2>
          <p className="mt-1 text-xs text-zinc-500">Rejected and completed requests.</p>

          <div className="mt-3 space-y-2">
            {history.slice(0, 20).map((it) => (
              <div key={it.id} className="flex items-center justify-between rounded-2xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
                <div className="min-w-0">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50 truncate">{it.productTitle}</p>
                  <p className="text-xs text-zinc-500">Order #{it.orderShort} · {statusLabel(it.status)}</p>
                </div>
                <Link href={`/account/orders/${encodeURIComponent(it.orderId)}`}>
                  <Button variant="secondary" size="sm">View</Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
