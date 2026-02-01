"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MessageCircle, Printer } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import { formatMoneyFromPkr, type CurrencyCode } from "@/lib/currency";
import { buildWhatsAppOrderUrl } from "@/lib/whatsapp";

type OrderItem = {
  title: string;
  slug: string;
  image: string;
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
  userId?: { email?: string; name?: string } | string;
  guestEmail?: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  paymentStatus?: string;
  paymentReceiptUrl?: string;
  paymentReceiptUploadedAt?: string | null;
  paymentReceiptRejectedReason?: string;
  paymentReceiptReviewedAt?: string | null;
  currency?: CurrencyCode;
  pkrPerUsd?: number;
  couponCode?: string;
  couponDiscountAmount?: number;
  promotionId?: string;
  promotionName?: string;
  promotionDiscountAmount?: number;
  discountAmount: number;
  itemsSubtotal: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  orderStatus: "Pending" | "Processing" | "Shipped" | "Delivered" | "Cancelled";
  shippingStatus?: "Pending" | "Shipped" | "Delivered";
  trackingUrl?: string;
  trackingAddedAt?: string | null;
  isPaid: boolean;
  createdAt: string;
};

type Props = {
  orderId: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readMessage(json: unknown): string | undefined {
  if (!isRecord(json)) return undefined;
  const m = json.message;
  return typeof m === "string" ? m : undefined;
}

function money(amountPkr: number, currency: CurrencyCode, pkrPerUsd?: number) {
  return formatMoneyFromPkr(amountPkr, currency, pkrPerUsd);
}

export default function AdminOrderDetailClient({ orderId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [storeName, setStoreName] = useState("Shop");
  const [whatsAppOrderTemplate, setWhatsAppOrderTemplate] = useState("");

  const [nextStatus, setNextStatus] = useState<OrderDetail["orderStatus"]>("Pending");
  const [nextPaid, setNextPaid] = useState(false);
  const [trackingUrl, setTrackingUrl] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const customerEmail = useMemo(() => {
    if (!order) return "";
    if (typeof order.userId === "string") return order.guestEmail ?? "";
    return order.userId?.email ?? order.guestEmail ?? "";
  }, [order]);

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

      if (typeof (json as Record<string, unknown>).storeName === "string") {
        const sn = String((json as Record<string, unknown>).storeName ?? "").trim();
        setStoreName(sn || "Shop");
      }

      if (typeof (json as Record<string, unknown>).whatsAppOrderTemplate === "string") {
        setWhatsAppOrderTemplate(String((json as Record<string, unknown>).whatsAppOrderTemplate ?? ""));
      }

      const next = json.order as unknown as OrderDetail;

      setOrder(next);
      setNextStatus(next.orderStatus);
      setNextPaid(Boolean(next.isPaid));
      setTrackingUrl(String(next.trackingUrl ?? ""));
      setRejectReason(String(next.paymentReceiptRejectedReason ?? ""));
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  async function save() {
    if (!order) return;

    setSaving(true);

    const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderStatus: nextStatus, isPaid: nextPaid }),
    });

    const json = (await res.json().catch(() => null)) as unknown;

    if (!res.ok) {
      toast.error(readMessage(json) ?? "Failed to save");
      setSaving(false);
      return;
    }

    if (!isRecord(json) || !isRecord(json.order)) {
      toast.error("Invalid response");
      setSaving(false);
      return;
    }

    setOrder(json.order as unknown as OrderDetail);
    setTrackingUrl(String((json.order as unknown as { trackingUrl?: string }).trackingUrl ?? trackingUrl));
    setRejectReason(String((json.order as unknown as { paymentReceiptRejectedReason?: string }).paymentReceiptRejectedReason ?? rejectReason));
    toast.success("Saved");
    setSaving(false);
  }

  async function saveTracking() {
    if (!order) return;

    setSaving(true);

    const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackingUrl }),
    });

    const json = (await res.json().catch(() => null)) as unknown;

    if (!res.ok) {
      toast.error(readMessage(json) ?? "Failed to save tracking link");
      setSaving(false);
      return;
    }

    if (!isRecord(json) || !isRecord(json.order)) {
      toast.error("Invalid response");
      setSaving(false);
      return;
    }

    setOrder(json.order as unknown as OrderDetail);
    setTrackingUrl(String((json.order as unknown as { trackingUrl?: string }).trackingUrl ?? trackingUrl));
    toast.success("Tracking link saved");
    setSaving(false);
  }

  async function approvePayment() {
    if (!order) return;
    setSaving(true);

    const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentProofAction: "approve" }),
    });

    const json = (await res.json().catch(() => null)) as unknown;

    if (!res.ok) {
      toast.error(readMessage(json) ?? "Failed to approve payment");
      setSaving(false);
      return;
    }

    if (!isRecord(json) || !isRecord(json.order)) {
      toast.error("Invalid response");
      setSaving(false);
      return;
    }

    setOrder(json.order as unknown as OrderDetail);
    toast.success("Payment approved");
    setSaving(false);
  }

  async function rejectPayment() {
    if (!order) return;
    setSaving(true);

    const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentProofAction: "reject", paymentRejectReason: rejectReason }),
    });

    const json = (await res.json().catch(() => null)) as unknown;

    if (!res.ok) {
      toast.error(readMessage(json) ?? "Failed to reject payment");
      setSaving(false);
      return;
    }

    if (!isRecord(json) || !isRecord(json.order)) {
      toast.error("Invalid response");
      setSaving(false);
      return;
    }

    setOrder(json.order as unknown as OrderDetail);
    toast.success("Payment rejected");
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-28" />
        </div>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Order
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Not found.</p>
          </div>
          <Link href="/admin/orders">
            <Button variant="secondary">Back</Button>
          </Link>
        </div>
      </div>
    );
  }

  const cur: CurrencyCode = order.currency ?? "PKR";
  const rate = order.pkrPerUsd;

  const customerPhoneRaw = String(order.shippingAddress?.phone ?? "").trim();
  const itemsBrief = order.items.map((it) => {
    const size = String(it.variantSize ?? "").trim();
    const color = String(it.variantColor ?? "").trim();
    const sku = String(it.variantSku ?? "").trim();
    const variant = size && color ? `${size}, ${color}` : size || color || sku;
    return { title: it.title, quantity: it.quantity, variant };
  });
  const hasPhone = Boolean(customerPhoneRaw);

  const waUrl = buildWhatsAppOrderUrl({
    storeName,
    customerName: String(order.shippingAddress?.fullName ?? "").trim() || "Customer",
    customerPhone: customerPhoneRaw,
    orderId: order._id,
    items: itemsBrief,
    totalAmount: order.totalAmount,
    currency: order.currency,
    pkrPerUsd: order.pkrPerUsd,
    paymentMethod: order.paymentMethod,
    template: String(whatsAppOrderTemplate ?? ""),
    defaultCountryCallingCode: "92",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Order</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {order._id}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {customerEmail ? `Customer: ${customerEmail}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/orders">
            <Button variant="secondary">Back</Button>
          </Link>

          <Link href={`/admin/orders/${encodeURIComponent(order._id)}/print`} target="_blank" rel="noreferrer noopener">
            <Button variant="secondary">
              <Printer className="mr-2 h-4 w-4" />
              Print Receipt
            </Button>
          </Link>

          {waUrl ? (
            <a href={waUrl} target="_blank" rel="noreferrer noopener">
              <Button variant="secondary">
                <MessageCircle className="mr-2 h-4 w-4" />
                WhatsApp Customer
              </Button>
            </a>
          ) : (
            <div className="flex flex-col items-end">
              <Button
                variant="secondary"
                disabled
                title={!hasPhone ? "Customer phone number is missing" : "WhatsApp cannot be opened"}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                WhatsApp Customer
              </Button>
              <div className="mt-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                {!hasPhone ? "Phone missing. WhatsApp disabled." : "WhatsApp disabled."}
              </div>
            </div>
          )}

          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Items</h2>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="py-2">Product</th>
                    <th className="py-2">Qty</th>
                    <th className="py-2 text-right">Unit</th>
                    <th className="py-2 text-right">Line</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((it, idx) => (
                    <tr key={idx} className="border-t border-zinc-200 dark:border-zinc-800">
                      <td className="py-3 font-medium text-zinc-900 dark:text-zinc-50">
                        {it.title}
                      </td>
                      <td className="py-3 text-zinc-600 dark:text-zinc-400">{it.quantity}</td>
                      <td className="py-3 text-right text-zinc-600 dark:text-zinc-400">
                        {money(it.unitPrice, cur, rate)}
                      </td>
                      <td className="py-3 text-right font-semibold text-zinc-900 dark:text-zinc-50">
                        {money(it.unitPrice * it.quantity, cur, rate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Shipping</h2>
            <div className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
              <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                {order.shippingAddress.fullName}
              </div>
              <div>{order.shippingAddress.phone}</div>
              <div>{order.shippingAddress.addressLine1}</div>
              {order.shippingAddress.addressLine2 ? <div>{order.shippingAddress.addressLine2}</div> : null}
              <div>
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
              </div>
              <div>{order.shippingAddress.country}</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Status</h2>

            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Order status</p>
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as OrderDetail["orderStatus"])}
                  className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                >
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <label className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={nextPaid}
                  onChange={(e) => setNextPaid(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                Mark as paid
              </label>

              <div className="text-xs text-zinc-500">
                Payment method: {order.paymentMethod}
              </div>
            </div>
          </div>

          {String(order.paymentMethod ?? "") === "manual" ? (
            <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Payment receipt</h2>

              {(() => {
                const raw = String(order.paymentStatus ?? (order.isPaid ? "Paid" : "Unpaid"));
                const label = raw === "ProofSubmitted" ? "Payment Proof Submitted" : raw === "Rejected" ? "Payment Rejected" : raw;
                return <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">Status: {label}</p>;
              })()}

              {order.paymentReceiptRejectedReason ? (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">Reason: {order.paymentReceiptRejectedReason}</p>
              ) : null}

              {order.paymentReceiptUploadedAt ? (
                <p className="mt-2 text-xs text-zinc-500">Uploaded: {new Date(order.paymentReceiptUploadedAt).toLocaleString()}</p>
              ) : null}

              {order.paymentReceiptUrl ? (
                <div className="mt-3 space-y-2">
                  <div className="rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
                    {String(order.paymentReceiptUrl).toLowerCase().endsWith(".pdf") ? (
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">PDF receipt uploaded.</p>
                    ) : (
                      <Image
                        src={String(order.paymentReceiptUrl)}
                        alt="Payment receipt"
                        width={1200}
                        height={900}
                        className="max-h-72 w-full rounded-xl object-contain"
                        unoptimized
                      />
                    )}
                  </div>
                  <a
                    href={order.paymentReceiptUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="block text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
                  >
                    Download receipt
                  </a>
                </div>
              ) : (
                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">No receipt uploaded yet.</p>
              )}

              <div className="mt-4 grid grid-cols-1 gap-2">
                <Button
                  type="button"
                  onClick={() => void approvePayment()}
                  disabled={saving || !order.paymentReceiptUrl}
                >
                  Approve payment
                </Button>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Reject reason (optional)</p>
                  <Input
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. Receipt not clear / amount mismatch"
                    className="mt-2"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void rejectPayment()}
                  disabled={saving}
                >
                  Reject payment
                </Button>
              </div>
            </div>
          ) : null}

          <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Tracking</h2>

            {order.orderStatus === "Shipped" ? (
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Tracking URL</p>
                  <Input
                    value={trackingUrl}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                    placeholder="https://courier.example.com/track/123"
                    className="mt-2"
                  />
                  {order.trackingAddedAt ? (
                    <p className="mt-2 text-xs text-zinc-500">Added: {new Date(order.trackingAddedAt).toLocaleString()}</p>
                  ) : null}
                  {order.trackingUrl ? (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-2 block text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
                    >
                      Preview tracking link
                    </a>
                  ) : null}
                </div>

                <Button type="button" onClick={() => void saveTracking()} disabled={saving}>
                  {saving ? "Saving..." : "Submit Tracking Link"}
                </Button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                Tracking is available when the order status is set to Shipped.
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Totals</h2>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                <span>Items</span>
                <span>{money(order.itemsSubtotal, cur, rate)}</span>
              </div>
              {order.couponCode && Number(order.couponDiscountAmount ?? 0) > 0 ? (
                <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Coupon ({order.couponCode})</span>
                  <span>-{money(Number(order.couponDiscountAmount ?? 0), cur, rate)}</span>
                </div>
              ) : null}
              {order.promotionName && Number(order.promotionDiscountAmount ?? 0) > 0 ? (
                <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Promo ({order.promotionName})</span>
                  <span>-{money(Number(order.promotionDiscountAmount ?? 0), cur, rate)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                <span>Shipping</span>
                <span>{money(order.shippingAmount, cur, rate)}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                <span>Tax</span>
                <span>{money(order.taxAmount, cur, rate)}</span>
              </div>
              {Number(order.discountAmount ?? 0) > 0 &&
              Number(order.couponDiscountAmount ?? 0) <= 0 &&
              Number(order.promotionDiscountAmount ?? 0) <= 0 ? (
                <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                  <span>{order.couponCode ? `Discount (${order.couponCode})` : "Discount"}</span>
                  <span>-{money(order.discountAmount, cur, rate)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between border-t border-zinc-200 pt-2 font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
                <span>Total</span>
                <span>{money(order.totalAmount, cur, rate)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
