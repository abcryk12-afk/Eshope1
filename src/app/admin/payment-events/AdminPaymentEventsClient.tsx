"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";

type PaymentEventItem = {
  id: string;
  kind: string;
  event: string;
  signatureOk: boolean;
  providerRef: string;
  orderId: string | null;
  createdAt: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

type ApiResponse = {
  items: PaymentEventItem[];
  pagination: Pagination;
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function AdminPaymentEventsClient() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PaymentEventItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const [page, setPage] = useState(1);
  const [kind, setKind] = useState("");
  const [event, setEvent] = useState("");
  const [providerRef, setProviderRef] = useState("");
  const [orderId, setOrderId] = useState("");
  const [signatureOk, setSignatureOk] = useState("");

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("limit", "20");
    if (kind.trim()) p.set("kind", kind.trim());
    if (event.trim()) p.set("event", event.trim());
    if (providerRef.trim()) p.set("providerRef", providerRef.trim());
    if (orderId.trim()) p.set("orderId", orderId.trim());
    if (signatureOk.trim()) p.set("signatureOk", signatureOk.trim());
    return p.toString();
  }, [event, kind, orderId, page, providerRef, signatureOk]);

  const load = useCallback(async () => {
    setLoading(true);

    const res = await fetch(`/api/admin/payment-events?${queryString}`, { cache: "no-store" });

    if (!res.ok) {
      toast.error("Failed to load payment events");
      setItems([]);
      setPagination(null);
      setLoading(false);
      return;
    }

    const data = (await res.json()) as ApiResponse;
    setItems(data.items ?? []);
    setPagination(data.pagination ?? null);
    setLoading(false);
  }, [queryString]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Payment events</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Incoming payment webhooks audit trail.</p>
        </div>

        <Button variant="secondary" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2 rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 md:grid-cols-3">
        <Input
          value={kind}
          onChange={(e) => {
            setKind(e.target.value);
            setPage(1);
          }}
          placeholder="Kind (e.g. stripe)"
        />
        <Input
          value={event}
          onChange={(e) => {
            setEvent(e.target.value);
            setPage(1);
          }}
          placeholder="Event (e.g. payment.succeeded)"
        />
        <Input
          value={providerRef}
          onChange={(e) => {
            setProviderRef(e.target.value);
            setPage(1);
          }}
          placeholder="Provider ref"
        />
        <Input
          value={orderId}
          onChange={(e) => {
            setOrderId(e.target.value);
            setPage(1);
          }}
          placeholder="Order id"
        />
        <Input
          value={signatureOk}
          onChange={(e) => {
            setSignatureOk(e.target.value);
            setPage(1);
          }}
          placeholder="signatureOk (true/false)"
        />
      </div>

      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Signature</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Provider ref</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-600 dark:text-zinc-400">
                    No payment events.
                  </td>
                </tr>
              ) : (
                items.map((l) => (
                  <tr key={l.id} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{fmtDate(l.createdAt)}</td>
                    <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-50">{l.kind}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{l.event}</td>
                    <td className="px-4 py-3">
                      <span className={l.signatureOk ? "text-emerald-600" : "text-rose-600"}>
                        {l.signatureOk ? "OK" : "BAD"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{l.orderId ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{l.providerRef || "—"}</td>
                  </tr>
                ))
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
