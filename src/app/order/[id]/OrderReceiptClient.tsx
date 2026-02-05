"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { formatMoneyFromPkr, type CurrencyCode } from "@/lib/currency";

type PaymentAccount = {
  label?: string;
  bankName?: string;
  accountTitle?: string;
  accountNumber?: string;
  iban?: string;
};

type PaymentsSettings = {
  codEnabled: boolean;
  manual: { enabled: boolean; instructions: string; accounts: PaymentAccount[] };
  online: { enabled: boolean; provider: string; instructions: string };
};

type PaymentsApiResponse = { payments: PaymentsSettings };

type OrderItem = {
  title: string;
  slug: string;
  image: string;
  quantity: number;
  unitPrice: number;
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
  id: string;
  customerEmail?: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  paymentStatus?: string;
  paymentReceiptUrl?: string;
  paymentReceiptUploadedAt?: string | null;
  paymentReceiptRejectedReason?: string;
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
  orderStatus: string;
  isPaid: boolean;
  createdAt: string;
};

type Props = {
  orderId: string;
  email?: string;
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

export default function OrderReceiptClient({ orderId, email }: Props) {
  const { data: session } = useSession();
  const isSignedIn = Boolean(session?.user?.id);

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderDetail | null>(null);

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUploading, setReceiptUploading] = useState(false);

  const [paymentSettings, setPaymentSettings] = useState<PaymentsSettings | null>(null);

  const query = useMemo(() => {
    const e = (email ?? "").trim().toLowerCase();
    return e ? `?email=${encodeURIComponent(e)}` : "";
  }, [email]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}${query}`, { cache: "no-store" });

      if (cancelled) return;

      if (!res.ok) {
        setOrder(null);
        setLoading(false);
        return;
      }

      const json = (await res.json().catch(() => null)) as unknown;

      if (!isRecord(json) || !isRecord(json.order)) {
        setOrder(null);
        setLoading(false);
        return;
      }

      setOrder(json.order as unknown as OrderDetail);
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [orderId, query]);

  useEffect(() => {
    let cancelled = false;

    async function loadPayments() {
      const res = await fetch("/api/payments", { cache: "no-store" }).catch(() => null);
      if (!res || !res.ok) return;
      const json = (await res.json().catch(() => null)) as PaymentsApiResponse | null;
      if (!cancelled) setPaymentSettings(json?.payments ?? null);
    }

    loadPayments();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isSignedIn && !email?.trim()) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Order receipt</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This receipt link requires the email used during checkout.
        </p>
        <div className="mt-6">
          <Link href="/">
            <Button variant="secondary">Continue shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Order receipt</h1>
        <p className="mt-2 text-sm text-muted-foreground">Not found.</p>
        <div className="mt-6">
          <Link href="/">
            <Button variant="secondary">Continue shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  const method = String(order.paymentMethod ?? "");
  const paymentStatus = String(order.paymentStatus ?? (order.isPaid ? "Paid" : "Unpaid"));
  const cur: CurrencyCode = order.currency ?? "PKR";
  const rate = order.pkrPerUsd;

  const receiptUrl = String(order.paymentReceiptUrl ?? "").trim();
  const receiptUploadedAt = order.paymentReceiptUploadedAt ?? null;
  const rejectReason = String(order.paymentReceiptRejectedReason ?? "").trim();

  const paymentStatusLabel =
    paymentStatus === "ProofSubmitted"
      ? "Payment Proof Submitted"
      : paymentStatus === "Rejected"
        ? "Payment Rejected"
        : paymentStatus;

  const canUploadReceipt = method === "manual" && paymentStatus !== "Paid" && !order.isPaid;

  async function uploadReceipt() {
    if (!receiptFile) {
      toast.error("Please choose a file");
      return;
    }

    setReceiptUploading(true);

    const form = new FormData();
    form.append("file", receiptFile);

    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/payment-receipt${query}`, {
      method: "POST",
      body: form,
    }).catch(() => null);

    if (!res || !res.ok) {
      const json = res ? ((await res.json().catch(() => null)) as unknown) : null;
      const msg = isRecord(json) && typeof json.message === "string" ? json.message : "Failed to upload receipt";
      toast.error(msg);
      setReceiptUploading(false);
      return;
    }

    toast.success("Payment receipt uploaded");
    setReceiptFile(null);

    const refreshed = await fetch(`/api/orders/${encodeURIComponent(orderId)}${query}`, { cache: "no-store" }).catch(
      () => null
    );
    if (refreshed?.ok) {
      const json = (await refreshed.json().catch(() => null)) as unknown;
      if (isRecord(json) && isRecord(json.order)) {
        setOrder(json.order as unknown as OrderDetail);
      }
    }

    setReceiptUploading(false);
  }

  const methodLabel =
    method === "cod"
      ? "Cash on Delivery"
      : method === "manual"
        ? "Manual / Bank Transfer"
        : method === "online"
          ? "Online Payment"
          : method || "Payment";

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-surface p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Order confirmed
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Order number: <span className="font-semibold text-foreground">{order.id}</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Order date: {fmtDate(order.createdAt)}</p>
          </div>

          <div className="rounded-2xl border border-border bg-background p-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Order status</span>
              <span className="font-semibold text-foreground">{order.orderStatus}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Payment status</span>
              <span className="font-semibold text-foreground">{paymentStatus}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Payment method</span>
              <span className="font-semibold text-foreground">{methodLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {method === "cod" ? (
        <div className="rounded-3xl border border-success/30 bg-success/10 p-6 text-foreground">
          <h2 className="text-sm font-semibold">Pay on delivery</h2>
          <p className="mt-2 text-sm opacity-90">
            Please keep cash ready. Our rider will contact you before delivery.
          </p>
        </div>
      ) : null}

      {method === "manual" ? (
        <div className="rounded-3xl border border-border bg-surface p-6">
          <h2 className="text-sm font-semibold text-foreground">Upload payment receipt</h2>
          <p className="mt-2 text-sm text-muted-foreground">Status: {paymentStatusLabel}</p>

          {paymentStatus === "Rejected" && rejectReason ? (
            <p className="mt-2 text-sm text-destructive">Rejected: {rejectReason}</p>
          ) : null}

          {receiptUrl ? (
            <div className="mt-4 space-y-2">
              {receiptUploadedAt ? (
                <p className="text-xs text-muted-foreground">Uploaded: {fmtDate(receiptUploadedAt)}</p>
              ) : null}

              <div className="rounded-2xl border border-border bg-background p-3">
                {receiptUrl.toLowerCase().endsWith(".pdf") ? (
                  <p className="text-sm text-foreground-secondary">PDF receipt uploaded.</p>
                ) : (
                  <Image
                    src={receiptUrl}
                    alt="Payment receipt"
                    width={1200}
                    height={900}
                    className="max-h-72 w-full rounded-xl object-contain"
                    unoptimized
                  />
                )}
              </div>

              <a href={receiptUrl} target="_blank" rel="noreferrer noopener">
                <Button variant="secondary" size="sm">Download receipt</Button>
              </a>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No receipt uploaded yet.</p>
          )}

          {canUploadReceipt ? (
            <div className="mt-4 space-y-3">
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-foreground-secondary"
              />
              <Button type="button" onClick={() => void uploadReceipt()} disabled={receiptUploading}>
                {receiptUploading ? "Uploading..." : receiptUrl ? "Re-upload receipt" : "Upload Payment Receipt"}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {method === "manual" ? (
        <div className="rounded-3xl border border-warning/30 bg-warning/10 p-6 text-foreground">
          <h2 className="text-sm font-semibold">Bank transfer instructions</h2>
          {paymentSettings?.manual?.instructions ? (
            <p className="mt-2 text-sm opacity-90">{paymentSettings.manual.instructions}</p>
          ) : (
            <p className="mt-2 text-sm opacity-90">
              Transfer the total amount to the bank details below. After payment, share the transaction reference with us.
            </p>
          )}

          {paymentSettings?.manual?.accounts?.length ? (
            <div className="mt-4 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
              {paymentSettings.manual.accounts.map((a, idx) => (
                <div
                  key={`${a.label ?? a.bankName ?? "acc"}:${idx}`}
                  className="rounded-2xl border border-border bg-surface p-4"
                >
                  <div className="text-xs font-semibold uppercase tracking-wide opacity-70">{a.label || "Bank account"}</div>
                  <div className="mt-2 space-y-1">
                    {a.bankName ? <div className="font-semibold">{a.bankName}</div> : null}
                    {a.accountTitle ? <div className="font-semibold">{a.accountTitle}</div> : null}
                    {a.accountNumber ? <div className="font-semibold">{a.accountNumber}</div> : null}
                    {a.iban ? <div className="font-semibold">{a.iban}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {method === "online" ? (
        <div className="rounded-3xl border border-primary/25 bg-primary/10 p-6 text-foreground">
          <h2 className="text-sm font-semibold">Complete your payment</h2>
          {paymentSettings?.online?.provider ? (
            <p className="mt-2 text-sm opacity-90">Provider: {paymentSettings.online.provider}</p>
          ) : null}
          {paymentSettings?.online?.instructions ? (
            <p className="mt-2 text-sm opacity-90">{paymentSettings.online.instructions}</p>
          ) : (
            <p className="mt-2 text-sm opacity-90">Click Pay Now to complete your payment and confirm the order.</p>
          )}
          <div className="mt-4">
            <Button
              variant="accent"
              onClick={() =>
                toast.info(
                  paymentSettings?.online?.enabled
                    ? "Online payment flow is not implemented yet."
                    : "Online payment is not configured yet."
                )
              }
              disabled={paymentStatus === "Paid"}
            >
              {paymentStatus === "Paid" ? "Paid" : "Pay Now"}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-3xl border border-border bg-surface p-6">
            <h2 className="text-sm font-semibold text-foreground">Items</h2>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2">Product</th>
                    <th className="py-2">Qty</th>
                    <th className="py-2 text-right">Unit</th>
                    <th className="py-2 text-right">Line</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((it, idx) => (
                    <tr key={idx} className="border-t border-border">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-muted">
                            {it.image ? (
                              <Image
                                src={it.image}
                                alt={it.title}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : null}
                          </div>
                          <Link
                            href={it.slug ? `/product/${it.slug}` : "#"}
                            className="font-medium text-foreground hover:underline"
                          >
                            {it.title}
                          </Link>
                        </div>
                      </td>
                      <td className="py-3 text-muted-foreground">{it.quantity}</td>
                      <td className="py-3 text-right text-muted-foreground">{money(it.unitPrice, cur, rate)}</td>
                      <td className="py-3 text-right font-semibold text-foreground">
                        {money(it.unitPrice * it.quantity, cur, rate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-surface p-6">
            <h2 className="text-sm font-semibold text-foreground">Shipping</h2>
            <div className="mt-3 text-sm text-foreground-secondary">
              <div className="font-semibold text-foreground">{order.shippingAddress.fullName}</div>
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
          <div className="rounded-3xl border border-border bg-surface p-6">
            <h2 className="text-sm font-semibold text-foreground">Status</h2>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Order status</span>
                <span className="font-semibold text-foreground">{order.orderStatus}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Payment</span>
                <span className="font-semibold text-foreground">{order.isPaid ? "Paid" : "Unpaid"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Method</span>
                <span className="font-semibold text-foreground">{order.paymentMethod}</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-surface p-6">
            <h2 className="text-sm font-semibold text-foreground">Totals</h2>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-foreground">{money(order.itemsSubtotal, cur, rate)}</span>
              </div>
              {order.couponCode && Number(order.couponDiscountAmount ?? 0) > 0 ? (
                <div className="flex items-center justify-between">
                  <span>Coupon ({order.couponCode})</span>
                  <span className="font-semibold text-foreground">-{money(Number(order.couponDiscountAmount ?? 0), cur, rate)}</span>
                </div>
              ) : null}
              {order.promotionName && Number(order.promotionDiscountAmount ?? 0) > 0 ? (
                <div className="flex items-center justify-between">
                  <span>Promo ({order.promotionName})</span>
                  <span className="font-semibold text-foreground">-{money(Number(order.promotionDiscountAmount ?? 0), cur, rate)}</span>
                </div>
              ) : null}
              {Number(order.discountAmount ?? 0) > 0 &&
              Number(order.couponDiscountAmount ?? 0) <= 0 &&
              Number(order.promotionDiscountAmount ?? 0) <= 0 ? (
                <div className="flex items-center justify-between">
                  <span>{order.couponCode ? `Discount (${order.couponCode})` : "Discount"}</span>
                  <span className="font-semibold text-foreground">-{money(order.discountAmount, cur, rate)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <span>Shipping</span>
                <span className="font-semibold text-foreground">{money(order.shippingAmount, cur, rate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Tax</span>
                <span className="font-semibold text-foreground">{money(order.taxAmount, cur, rate)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
                <span className="text-foreground font-semibold">Total</span>
                <span className="text-foreground font-semibold">{money(order.totalAmount, cur, rate)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/">
              <Button variant="secondary">Continue shopping</Button>
            </Link>
            {isSignedIn ? (
              <Link href="/my-orders">
                <Button>My orders</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button>Sign in</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
