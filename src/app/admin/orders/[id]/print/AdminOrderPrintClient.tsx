"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { formatMoneyFromPkr, type CurrencyCode } from "@/lib/currency";

type OrderItem = {
  title: string;
  quantity: number;
  unitPrice: number;
  variantSku?: string;
  variantSize?: string;
  variantColor?: string;
};

type ShippingAddress = {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type OrderDetail = {
  _id: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  currency?: CurrencyCode;
  pkrPerUsd?: number;
  couponCode?: string;
  couponDiscountAmount?: number;
  promotionName?: string;
  promotionDiscountAmount?: number;
  discountAmount: number;
  itemsSubtotal: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  orderStatus: string;
  isPaid: boolean;
  createdAt: string;
};

type ApiResponse = { order: OrderDetail; storeName?: string };

type Props = {
  orderId: string;
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

function buildVariantLabel(it: OrderItem) {
  const parts: string[] = [];
  const size = String(it.variantSize ?? "").trim();
  const color = String(it.variantColor ?? "").trim();
  const sku = String(it.variantSku ?? "").trim();

  if (size) parts.push(`Size: ${size}`);
  if (color) parts.push(`Color: ${color}`);
  if (!parts.length && sku) parts.push(`SKU: ${sku}`);
  return parts.join(", ");
}

function paymentMethodLabel(method: string) {
  const v = String(method ?? "").trim().toLowerCase();
  if (v === "cod") return "Cash on Delivery";
  if (v === "manual") return "Manual / Bank Transfer";
  if (v === "online") return "Online Payment";
  return v || "Payment";
}

export default function AdminOrderPrintClient({ orderId }: Props) {
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [storeName, setStoreName] = useState("Shop");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, { cache: "no-store" });
      if (cancelled) return;

      if (!res.ok) {
        toast.error("Failed to load order");
        setOrder(null);
        setLoading(false);
        return;
      }

      const json = (await res.json().catch(() => null)) as unknown;
      if (!isRecord(json) || !isRecord(json.order)) {
        toast.error("Invalid response");
        setOrder(null);
        setLoading(false);
        return;
      }

      const data = json as unknown as ApiResponse;
      setOrder(data.order);
      setStoreName(String(data.storeName ?? "Shop") || "Shop");
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useEffect(() => {
    if (!loading && order) {
      window.setTimeout(() => {
        window.print();
      }, 50);
    }
  }, [loading, order]);

  const cur: CurrencyCode = order?.currency ?? "PKR";
  const rate = order?.pkrPerUsd;

  const hasExplicitCoupon = Boolean(order?.couponCode && Number(order?.couponDiscountAmount ?? 0) > 0);
  const hasExplicitPromo = Boolean(order?.promotionName && Number(order?.promotionDiscountAmount ?? 0) > 0);

  const discountLabel = useMemo(() => {
    if (!order) return "Discount";
    if (hasExplicitCoupon) return order.couponCode ? `Coupon (${order.couponCode})` : "Coupon";
    if (hasExplicitPromo) return order.promotionName ? `Promo (${order.promotionName})` : "Promo";
    return order.couponCode ? `Discount (${order.couponCode})` : "Discount";
  }, [hasExplicitCoupon, hasExplicitPromo, order]);

  const discountAmount = useMemo(() => {
    if (!order) return 0;
    const v = Number(order.discountAmount ?? 0);
    return Number.isFinite(v) ? Math.max(0, v) : 0;
  }, [order]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="text-sm text-zinc-600">Loading…</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="text-sm text-zinc-600">Not found.</div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 text-black">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page { size: A4; margin: 14mm; }
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body { background: #fff !important; }
            .no-print { display: block; }
            @media print {
              .no-print { display: none !important; }
              a { color: inherit; text-decoration: none; }
            }
          `,
        }}
      />

      <div className="no-print mb-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold"
        >
          Print
        </button>
        <button
          type="button"
          onClick={() => window.close()}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold"
        >
          Close
        </button>
      </div>

      <div className="border border-zinc-300 p-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image src="/favicon.ico" alt="" width={32} height={32} unoptimized />
            <div>
              <div className="text-lg font-bold">{storeName}</div>
              <div className="text-xs">Shipping Slip / Receipt</div>
            </div>
          </div>

          <div className="text-right text-xs">
            <div>
              <span className="font-semibold">Order ID:</span> {order._id}
            </div>
            <div>
              <span className="font-semibold">Order Date:</span> {fmtDate(order.createdAt)}
            </div>
          </div>
        </div>

        <hr className="my-4 border-zinc-300" />

        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <div className="text-xs font-semibold uppercase">Customer</div>
            <div className="mt-1 font-semibold">{order.shippingAddress.fullName}</div>
            <div>{order.shippingAddress.phone}</div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase">Shipping Address</div>
            <div className="mt-1">
              <div>{order.shippingAddress.addressLine1}</div>
              {order.shippingAddress.addressLine2 ? <div>{order.shippingAddress.addressLine2}</div> : null}
              <div>
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
              </div>
              <div>{order.shippingAddress.country}</div>
            </div>
          </div>
        </div>

        <hr className="my-4 border-zinc-300" />

        <div>
          <div className="text-xs font-semibold uppercase">Items</div>
          <table className="mt-2 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-300">
                <th className="py-2 text-left">Product</th>
                <th className="py-2 text-left">Variant</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Price</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it, idx) => {
                const variant = buildVariantLabel(it);
                return (
                  <tr key={idx} className="border-b border-zinc-200">
                    <td className="py-2">{it.title}</td>
                    <td className="py-2">{variant || "—"}</td>
                    <td className="py-2 text-right">{it.quantity}</td>
                    <td className="py-2 text-right">{money(it.unitPrice * it.quantity, cur, rate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <div className="w-full max-w-sm space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span className="font-semibold">{money(order.itemsSubtotal, cur, rate)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Delivery fee</span>
              <span className="font-semibold">{money(order.shippingAmount, cur, rate)}</span>
            </div>
            {discountAmount > 0 ? (
              <div className="flex items-center justify-between">
                <span>{discountLabel}</span>
                <span className="font-semibold">-{money(discountAmount, cur, rate)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between">
              <span>Tax</span>
              <span className="font-semibold">{money(order.taxAmount, cur, rate)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-zinc-300 pt-2 text-base">
              <span className="font-semibold">Total</span>
              <span className="font-bold">{money(order.totalAmount, cur, rate)}</span>
            </div>
          </div>
        </div>

        <hr className="my-4 border-zinc-300" />

        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <div className="text-xs font-semibold uppercase">Payment method</div>
            <div className="mt-1">{paymentMethodLabel(order.paymentMethod)}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase">Order status</div>
            <div className="mt-1">{order.orderStatus}</div>
          </div>
        </div>

        <div className="mt-6 text-center text-sm">
          Thank you for shopping with us
        </div>
      </div>
    </div>
  );
}
