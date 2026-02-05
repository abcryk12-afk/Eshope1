"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { StarRatingInput } from "@/components/ui/StarRating";
import { formatMoneyFromPkr, type CurrencyCode } from "@/lib/currency";

type OrderItem = {
  productId: string;
  variantId: string;
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
  trackingUrl?: string;
  trackingAddedAt?: string | null;
  createdAt: string;
};

type Props = {
  orderId: string;
};

type ReturnEligibilityItem = {
  productId: string;
  variantId: string;
  eligible: boolean;
  ineligibleReason: string | null;
  requestStatus: string | null;
  storeName: string;
};

type ReturnsEligibilityResponse = {
  windowDays: number;
  items: ReturnEligibilityItem[];
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

export default function AccountOrderDetailClient({ orderId }: Props) {
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderDetail | null>(null);

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUploading, setReceiptUploading] = useState(false);

  const [reviewForProductId, setReviewForProductId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);

  const [returnsLoading, setReturnsLoading] = useState(false);
  const [returnsWindowDays, setReturnsWindowDays] = useState<number | null>(null);
  const [returnsByKey, setReturnsByKey] = useState<Map<string, ReturnEligibilityItem>>(new Map());

  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnForKey, setReturnForKey] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState<
    "Damaged product" | "Wrong item received" | "Not as described" | "Missing items" | "Other"
  >("Damaged product");
  const [returnComment, setReturnComment] = useState("");
  const [returnImages, setReturnImages] = useState<File[]>([]);
  const [returnSubmitting, setReturnSubmitting] = useState(false);

  const totals = useMemo(() => {
    if (!order) return null;
    return {
      itemsSubtotal: order.itemsSubtotal,
      discountAmount: order.discountAmount,
      couponDiscountAmount: order.couponDiscountAmount ?? 0,
      promotionDiscountAmount: order.promotionDiscountAmount ?? 0,
      shippingAmount: order.shippingAmount,
      taxAmount: order.taxAmount,
      totalAmount: order.totalAmount,
    };
  }, [order]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { cache: "no-store" });

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
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;

    async function loadEligibility() {
      if (!order) return;
      if (order.orderStatus !== "Delivered") {
        setReturnsWindowDays(null);
        setReturnsByKey(new Map());
        return;
      }

      setReturnsLoading(true);

      const res = await fetch(`/api/account/returns/eligibility?orderId=${encodeURIComponent(orderId)}`, {
        cache: "no-store",
      }).catch(() => null);

      if (cancelled) return;

      if (!res || !res.ok) {
        setReturnsWindowDays(null);
        setReturnsByKey(new Map());
        setReturnsLoading(false);
        return;
      }

      const json = (await res.json().catch(() => null)) as ReturnsEligibilityResponse | null;
      const list = Array.isArray(json?.items) ? json!.items : [];

      const map = new Map<string, ReturnEligibilityItem>();
      for (const it of list) {
        const key = `${it.productId}:${it.variantId}`;
        map.set(key, it);
      }

      setReturnsWindowDays(typeof json?.windowDays === "number" ? json.windowDays : null);
      setReturnsByKey(map);
      setReturnsLoading(false);
    }

    void loadEligibility();

    return () => {
      cancelled = true;
    };
  }, [order, orderId]);

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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Order</h1>
            <p className="mt-1 text-sm text-muted-foreground">Not found.</p>
          </div>
          <Link href="/account/orders">
            <Button variant="secondary">Back</Button>
          </Link>
        </div>
      </div>
    );
  }

  const cur: CurrencyCode = order.currency ?? "PKR";
  const rate = order.pkrPerUsd;
  const canRate = order.orderStatus === "Delivered";
  const trackingUrl = String(order.trackingUrl ?? "").trim();

  const canTrack = order.orderStatus === "Shipped" && trackingUrl;

  const paymentMethod = String(order.paymentMethod ?? "");
  const paymentStatus = String(order.paymentStatus ?? (order.isPaid ? "Paid" : "Unpaid"));
  const paymentStatusLabel =
    paymentStatus === "ProofSubmitted"
      ? "Payment Proof Submitted"
      : paymentStatus === "Rejected"
        ? "Payment Rejected"
        : paymentStatus;
  const receiptUrl = String(order.paymentReceiptUrl ?? "").trim();
  const receiptUploadedAt = order.paymentReceiptUploadedAt ?? null;
  const rejectReason = String(order.paymentReceiptRejectedReason ?? "").trim();

  const canUploadReceipt =
    paymentMethod === "manual" && paymentStatus !== "Paid" && !order.isPaid;

  const showReceiptSection = paymentMethod === "manual";

  async function uploadReceipt() {
    if (!receiptFile) {
      toast.error("Please choose a file");
      return;
    }

    setReceiptUploading(true);

    const form = new FormData();
    form.append("file", receiptFile);

    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/payment-receipt`, {
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

    const refreshed = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { cache: "no-store" }).catch(() => null);
    if (refreshed?.ok) {
      const json = (await refreshed.json().catch(() => null)) as unknown;
      if (isRecord(json) && isRecord(json.order)) {
        setOrder(json.order as unknown as OrderDetail);
      }
    }

    setReceiptUploading(false);
  }

  async function submitReview(productId: string) {
    setReviewSaving(true);

    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        orderId,
        rating: reviewRating,
        comment: reviewComment,
      }),
    }).catch(() => null);

    if (!res || !res.ok) {
      const json = res ? ((await res.json().catch(() => null)) as unknown) : null;
      const msg = isRecord(json) && typeof json.message === "string" ? json.message : "Failed to submit review";
      toast.error(msg);
      setReviewSaving(false);
      return;
    }

    toast.success("Review submitted");
    setReviewForProductId(null);
    setReviewComment("");
    setReviewRating(5);
    setReviewSaving(false);
  }

  function openReturnModal(productId: string, variantId: string) {
    const key = `${productId}:${variantId}`;
    setReturnForKey(key);
    setReturnReason("Damaged product");
    setReturnComment("");
    setReturnImages([]);
    setReturnModalOpen(true);
  }

  async function submitReturn() {
    if (!order) return;
    if (!returnForKey) return;

    const [productId, variantId] = returnForKey.split(":");
    if (!productId || !variantId) {
      toast.error("Invalid return item");
      return;
    }

    if (returnImages.length > 5) {
      toast.error("You can upload up to 5 images");
      return;
    }

    setReturnSubmitting(true);

    const form = new FormData();
    form.set("orderId", orderId);
    form.set("productId", productId);
    form.set("variantId", variantId);
    form.set("reason", returnReason);
    form.set("comment", returnComment);
    for (const f of returnImages) form.append("images", f);

    const res = await fetch("/api/account/returns", { method: "POST", body: form }).catch(() => null);

    if (!res || !res.ok) {
      const json = res ? ((await res.json().catch(() => null)) as unknown) : null;
      const msg = isRecord(json) && typeof json.message === "string" ? json.message : "Failed to submit return";
      toast.error(msg);
      setReturnSubmitting(false);
      return;
    }

    toast.success("Return request submitted");
    setReturnModalOpen(false);
    setReturnForKey(null);
    setReturnImages([]);
    setReturnComment("");
    setReturnSubmitting(false);

    const refreshed = await fetch(`/api/account/returns/eligibility?orderId=${encodeURIComponent(orderId)}`, {
      cache: "no-store",
    }).catch(() => null);
    if (refreshed?.ok) {
      const json = (await refreshed.json().catch(() => null)) as ReturnsEligibilityResponse | null;
      const list = Array.isArray(json?.items) ? json!.items : [];
      const map = new Map<string, ReturnEligibilityItem>();
      for (const it of list) map.set(`${it.productId}:${it.variantId}`, it);
      setReturnsWindowDays(typeof json?.windowDays === "number" ? json.windowDays : null);
      setReturnsByKey(map);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Order</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{order.id}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {fmtDate(order.createdAt)}
          </p>
        </div>
        <Link href="/account/orders">
          <Button variant="secondary">Back</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {showReceiptSection ? (
            <div className="rounded-3xl border border-border bg-surface p-4">
              <h2 className="text-sm font-semibold text-foreground">Manual payment receipt</h2>
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
                      <div className="relative max-h-72 w-full overflow-hidden rounded-xl bg-muted">
                        <Image
                          src={receiptUrl}
                          alt="Payment receipt"
                          width={1200}
                          height={900}
                          className="max-h-72 w-full object-contain"
                          unoptimized
                        />
                      </div>
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

          {canTrack ? (
            <div className="rounded-3xl border border-border bg-surface p-4">
              <h2 className="text-sm font-semibold text-foreground">Track Your Order</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your order has been shipped. Use the tracking link below.
              </p>
              {order.trackingAddedAt ? (
                <p className="mt-1 text-xs text-muted-foreground">Added: {fmtDate(order.trackingAddedAt)}</p>
              ) : null}
              <div className="mt-4">
                <a href={trackingUrl} target="_blank" rel="noreferrer noopener">
                  <Button>Track Your Order</Button>
                </a>
              </div>
            </div>
          ) : null}

          <div className="rounded-3xl border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold text-foreground">Items</h2>

            {order.orderStatus === "Delivered" && returnsWindowDays ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Returns window: {returnsWindowDays} days after delivery.
              </p>
            ) : null}

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2">Product</th>
                    <th className="py-2">Qty</th>
                    <th className="py-2 text-right">Unit</th>
                    <th className="py-2 text-right">Line</th>
                    <th className="py-2 text-right">Review</th>
                    <th className="py-2 text-right">Return</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((it, idx) => (
                    <Fragment key={`${it.productId}:${idx}`}>
                      {(() => {
                        const returnKey = `${it.productId}:${it.variantId}`;
                        const ret = returnsByKey.get(returnKey) ?? null;
                        const canRequest = Boolean(ret?.eligible);
                        const existingStatus = ret?.requestStatus;

                        return (
                          <tr className="border-t border-border">
                            <td className="py-3 font-medium text-foreground">{it.title}</td>
                            <td className="py-3 text-muted-foreground">{it.quantity}</td>
                            <td className="py-3 text-right text-muted-foreground">{money(it.unitPrice, cur, rate)}</td>
                            <td className="py-3 text-right font-semibold text-foreground">
                              {money(it.unitPrice * it.quantity, cur, rate)}
                            </td>
                            <td className="py-3 text-right">
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                disabled={!canRate || reviewSaving || !it.productId}
                                onClick={() => {
                                  if (!canRate || !it.productId) return;
                                  setReviewForProductId((curId) => (curId === it.productId ? null : it.productId));
                                  setReviewRating(5);
                                  setReviewComment("");
                                }}
                              >
                                Rate
                              </Button>
                            </td>
                            <td className="py-3 text-right">
                              {order.orderStatus !== "Delivered" ? (
                                <span className="text-xs text-muted-foreground">—</span>
                              ) : returnsLoading ? (
                                <span className="text-xs text-muted-foreground">Loading…</span>
                              ) : existingStatus ? (
                                <span className="text-xs font-semibold text-foreground-secondary">
                                  {existingStatus}
                                </span>
                              ) : canRequest ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => openReturnModal(it.productId, it.variantId)}
                                >
                                  Request Return
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground" title={ret?.ineligibleReason ?? ""}>
                                  Not eligible
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })()}

                      {reviewForProductId === it.productId ? (
                        <tr className="border-t border-border">
                          <td colSpan={6} className="py-4">
                            <div className="rounded-2xl border border-border bg-background p-4">
                              <p className="text-sm font-semibold text-foreground">Rate this product</p>

                              <div className="mt-3 flex items-center justify-between gap-3">
                                <StarRatingInput value={reviewRating} onChange={setReviewRating} disabled={reviewSaving} />
                                <Button
                                  type="button"
                                  onClick={() => void submitReview(it.productId)}
                                  disabled={reviewSaving}
                                >
                                  {reviewSaving ? "Submitting..." : "Submit"}
                                </Button>
                              </div>

                              <textarea
                                value={reviewComment}
                                onChange={(e) => setReviewComment(e.target.value)}
                                rows={3}
                                className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                                placeholder="Write an optional review..."
                              />

                              <div className="mt-2 flex items-center justify-end">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  disabled={reviewSaving}
                                  onClick={() => setReviewForProductId(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {!canRate ? (
              <p className="mt-3 text-sm text-muted-foreground">
                You can review products after the order is delivered.
              </p>
            ) : null}
          </div>

          <div className="rounded-3xl border border-border bg-surface p-4">
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
          <div className="rounded-3xl border border-border bg-surface p-4">
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

          <div className="rounded-3xl border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold text-foreground">Totals</h2>

            {totals ? (
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-foreground">{money(totals.itemsSubtotal, cur, rate)}</span>
                </div>
                {order.couponCode && Number(totals.couponDiscountAmount ?? 0) > 0 ? (
                  <div className="flex items-center justify-between">
                    <span>Coupon ({order.couponCode})</span>
                    <span className="font-semibold text-foreground">-{money(Number(totals.couponDiscountAmount ?? 0), cur, rate)}</span>
                  </div>
                ) : null}
                {order.promotionName && Number(totals.promotionDiscountAmount ?? 0) > 0 ? (
                  <div className="flex items-center justify-between">
                    <span>Promo ({order.promotionName})</span>
                    <span className="font-semibold text-foreground">-{money(Number(totals.promotionDiscountAmount ?? 0), cur, rate)}</span>
                  </div>
                ) : null}
                {Number(totals.discountAmount ?? 0) > 0 &&
                Number(totals.couponDiscountAmount ?? 0) <= 0 &&
                Number(totals.promotionDiscountAmount ?? 0) <= 0 ? (
                  <div className="flex items-center justify-between">
                    <span>{order.couponCode ? `Discount (${order.couponCode})` : "Discount"}</span>
                    <span className="font-semibold text-foreground">-{money(totals.discountAmount, cur, rate)}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between">
                  <span>Shipping</span>
                  <span className="font-semibold text-foreground">{money(totals.shippingAmount, cur, rate)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tax</span>
                  <span className="font-semibold text-foreground">{money(totals.taxAmount, cur, rate)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-foreground font-semibold">Total</span>
                  <span className="text-foreground font-semibold">{money(totals.totalAmount, cur, rate)}</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {returnModalOpen && returnForKey ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-surface p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Return request</p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">Request a return</h3>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (returnSubmitting) return;
                  setReturnModalOpen(false);
                  setReturnForKey(null);
                }}
              >
                Close
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Reason</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value as typeof returnReason)}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                >
                  <option value="Damaged product">Damaged product</option>
                  <option value="Wrong item received">Wrong item received</option>
                  <option value="Not as described">Not as described</option>
                  <option value="Missing items">Missing items</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Comment (optional)</label>
                <textarea
                  value={returnComment}
                  onChange={(e) => setReturnComment(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                  placeholder="Add any helpful details..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Images (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setReturnImages(Array.from(e.target.files ?? []).slice(0, 5))}
                  className="block w-full text-sm text-foreground-secondary"
                />
                {returnImages.length ? (
                  <p className="text-xs text-muted-foreground">Selected: {returnImages.length} image(s)</p>
                ) : null}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={returnSubmitting}
                onClick={() => {
                  setReturnModalOpen(false);
                  setReturnForKey(null);
                }}
              >
                Cancel
              </Button>
              <Button type="button" disabled={returnSubmitting} onClick={() => void submitReturn()}>
                {returnSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
