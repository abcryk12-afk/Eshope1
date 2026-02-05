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
      <div className="rounded-3xl border border-border bg-surface p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Returns / Refunds</h1>
        <p className="mt-2 text-sm text-muted-foreground">Request and track returns. Refunds are processed after approval/completion.</p>
      </div>

      <div className="rounded-3xl border border-border bg-surface p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("in_progress")}
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-semibold",
                tab === "in_progress"
                  ? "border-primary bg-muted text-foreground"
                  : "border-border bg-background text-foreground-secondary"
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
                  ? "border-primary bg-muted text-foreground"
                  : "border-border bg-background text-foreground-secondary"
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
        <div className="rounded-3xl border border-border bg-surface p-6 text-sm text-muted-foreground">
          No items.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((it) => (
            <div key={it.id} className="rounded-3xl border border-border bg-surface p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 gap-3">
                  {it.productImage ? (
                    <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-border">
                      <Image src={it.productImage} alt={it.productTitle} fill className="object-cover" sizes="56px" />
                    </div>
                  ) : null}

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{statusLabel(it.status)}</p>
                    <p className="mt-1 text-sm text-muted-foreground truncate">{it.productTitle}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Order #{it.orderShort}{it.storeName ? ` · ${it.storeName}` : ""}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Reason: {it.reason}</p>
                    {it.comment ? <p className="mt-1 text-xs text-muted-foreground">{it.comment}</p> : null}
                    {it.createdAt ? <p className="mt-2 text-xs text-muted-foreground">Requested: {fmtDate(it.createdAt)}</p> : null}
                    {it.refundProcessedAt ? <p className="mt-1 text-xs text-muted-foreground">Refund processed: {fmtDate(it.refundProcessedAt)}</p> : null}
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
        <div className="rounded-3xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-foreground">History</h2>
          <p className="mt-1 text-xs text-muted-foreground">Rejected and completed requests.</p>

          <div className="mt-3 space-y-2">
            {history.slice(0, 20).map((it) => (
              <div key={it.id} className="flex items-center justify-between rounded-2xl border border-border px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{it.productTitle}</p>
                  <p className="text-xs text-muted-foreground">Order #{it.orderShort} · {statusLabel(it.status)}</p>
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
