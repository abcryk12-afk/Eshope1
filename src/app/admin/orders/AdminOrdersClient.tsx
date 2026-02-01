"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronRight, MessageCircle, RefreshCw, Search } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import { formatMoneyFromPkr, type CurrencyCode } from "@/lib/currency";
import { buildWhatsAppOrderUrl } from "@/lib/whatsapp";

type OrderListItem = {
  id: string;
  createdAt: string;
  totalAmount: number;
  currency?: CurrencyCode;
  pkrPerUsd?: number;
  orderStatus: string;
  isPaid: boolean;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  itemsCount: number;
  items?: Array<{
    title: string;
    quantity: number;
    variantSku?: string;
    variantSize?: string;
    variantColor?: string;
  }>;
  paymentMethod?: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

type ListResponse = {
  storeName?: string;
  whatsAppOrderTemplate?: string;
  items: OrderListItem[];
  pagination: Pagination;
};

type StatusFilter = "all" | "Pending" | "Processing" | "Shipped" | "Delivered" | "Cancelled";

type PaidFilter = "all" | "paid" | "unpaid";

function money(amountPkr: number, currency: CurrencyCode, pkrPerUsd?: number) {
  return formatMoneyFromPkr(amountPkr, currency, pkrPerUsd);
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function AdminOrdersClient() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<OrderListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [storeName, setStoreName] = useState("Shop");
  const [whatsAppOrderTemplate, setWhatsAppOrderTemplate] = useState("");

  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [paid, setPaid] = useState<PaidFilter>("all");
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

    if (status !== "all") params.set("status", status);
    if (paid !== "all") params.set("paid", paid);
    if (q.trim()) params.set("q", q.trim());

    return params.toString();
  }, [page, paid, q, status]);

  const load = useCallback(async () => {
    setLoading(true);

    const res = await fetch(`/api/admin/orders?${queryString}`, { cache: "no-store" });

    if (!res.ok) {
      toast.error("Failed to load orders");
      setItems([]);
      setPagination(null);
      setLoading(false);
      return;
    }

    const data = (await res.json()) as ListResponse;

    setStoreName(String(data.storeName ?? "Shop") || "Shop");
    setWhatsAppOrderTemplate(String(data.whatsAppOrderTemplate ?? ""));
    setItems(data.items ?? []);
    setPagination(data.pagination ?? null);
    setLoading(false);
  }, [queryString]);

  function variantLabel(it: { variantSize?: string; variantColor?: string; variantSku?: string }) {
    const size = String(it.variantSize ?? "").trim();
    const color = String(it.variantColor ?? "").trim();
    const sku = String(it.variantSku ?? "").trim();

    if (size && color) return `${size}, ${color}`;
    if (size) return size;
    if (color) return color;
    return sku;
  }

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 0);

    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Orders
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Review, filter, and update order lifecycle.
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
              placeholder="Search by order id or customer email"
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
            <option value="all">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <select
            value={paid}
            onChange={(e) => {
              setPaid(e.target.value as PaidFilter);
              setPage(1);
            }}
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          >
            <option value="all">All payments</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>

        <div className="text-xs font-semibold text-zinc-500">
          {pagination ? `${pagination.total} orders` : ""}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-10" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-16" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="ml-auto h-4 w-20" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="ml-auto h-8 w-20" /></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-zinc-600 dark:text-zinc-400">
                    No orders found.
                  </td>
                </tr>
              ) : (
                items.map((o) => (
                  <tr key={o.id} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-50">
                      {o.id.slice(-6)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {o.customerName?.trim() ? o.customerName : o.customerEmail ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {o.itemsCount}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {o.orderStatus}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {o.isPaid ? "Yes" : "No"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {fmtDate(o.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-50">
                      {money(o.totalAmount, o.currency ?? "PKR", o.pkrPerUsd)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        {(() => {
                          const itemsBrief = (o.items ?? []).map((it) => ({
                            title: it.title,
                            quantity: it.quantity,
                            variant: variantLabel(it),
                          }));

                          const hasPhone = Boolean(String(o.customerPhone ?? "").trim());

                          const waUrl = buildWhatsAppOrderUrl({
                            storeName,
                            customerName: String(o.customerName ?? "").trim() || "Customer",
                            customerPhone: String(o.customerPhone ?? "").trim(),
                            orderId: o.id,
                            items: itemsBrief,
                            totalAmount: o.totalAmount,
                            currency: o.currency,
                            pkrPerUsd: o.pkrPerUsd,
                            paymentMethod: o.paymentMethod,
                            template: String(whatsAppOrderTemplate ?? ""),
                            defaultCountryCallingCode: "92",
                          });

                          if (!waUrl) {
                            return (
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled
                                title={!hasPhone ? "Customer phone number is missing" : "WhatsApp cannot be opened"}
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            );
                          }

                          return (
                            <a href={waUrl} target="_blank" rel="noreferrer noopener">
                              <Button variant="secondary" size="sm" title="WhatsApp customer">
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            </a>
                          );
                        })()}

                        <Link href={`/admin/orders/${o.id}`}>
                          <Button variant="secondary" size="sm">
                            View <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </td>
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
