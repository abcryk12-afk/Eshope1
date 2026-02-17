"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Truck } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type TrackResponse = {
  order: {
    id: string;
    orderStatus: string;
    shippingStatus: string;
    paymentStatus: string;
    isPaid: boolean;
    trackingUrl: string;
    trackingAddedAt: string | null;
    createdAt: string;
    updatedAt: string | null;
  };
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readMessage(json: unknown) {
  return isRecord(json) && typeof json.message === "string" ? json.message : null;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleString();
}

const ORDER_STEPS = ["Pending", "Processing", "Shipped", "Delivered"] as const;

function normalizeOrderStatus(v: string) {
  const s = String(v ?? "").trim();
  return (ORDER_STEPS as readonly string[]).includes(s) || s === "Cancelled" ? s : "Pending";
}

export default function TrackOrderClient() {
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TrackResponse["order"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    const oidOk = orderId.trim().length >= 6;
    const phoneOk = phone.trim().length >= 3;
    return oidOk || phoneOk;
  }, [orderId, phone]);

  async function submit() {
    if (!canSubmit) return;
    setLoading(true);
    setData(null);
    setError(null);

    const res = await fetch("/api/orders/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: orderId.trim(), phone: phone.trim() }),
    }).catch(() => null);

    const json = res ? ((await res.json().catch(() => null)) as unknown) : null;

    if (!res || !res.ok) {
      setError(readMessage(json) ?? "Order not found. Please check the Order ID and phone number.");
      setLoading(false);
      return;
    }

    if (!isRecord(json) || !isRecord(json.order)) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    setData(json.order as TrackResponse["order"]);
    setLoading(false);
  }

  const normalizedStatus = normalizeOrderStatus(data?.orderStatus ?? "");
  const stepIndex = ORDER_STEPS.findIndex((s) => s === normalizedStatus);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-surface p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Track your order</h1>
            <p className="mt-2 text-sm text-muted-foreground">Enter your Order ID and phone number.</p>
          </div>
          <Link href="/">
            <Button variant="secondary">Shop</Button>
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Order ID</label>
            <Input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="e.g. 65f..." />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Phone</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 0300..." />
          </div>
        </div>

        <div className="mt-5">
          <Button onClick={() => void submit()} disabled={!canSubmit || loading} className="w-full">
            {loading ? "Checking..." : "Track Order"}
          </Button>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground">
            {error}
          </div>
        ) : null}
      </div>

      {data ? (
        <div className="rounded-3xl border border-border bg-surface p-6">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Order {data.id}</p>
              <p className="text-xs text-muted-foreground">Placed: {fmtDate(data.createdAt)}</p>
            </div>
            {data.trackingUrl?.trim() ? (
              <a
                href={data.trackingUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-2 inline-flex text-sm font-semibold text-primary md:mt-0"
              >
                <span className="inline-flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  View tracking
                </span>
              </a>
            ) : null}
          </div>

          {normalizedStatus === "Cancelled" ? (
            <p className="mt-4 text-sm font-semibold text-muted-foreground">Status: Cancelled</p>
          ) : (
            <div className="mt-6 space-y-3">
              {ORDER_STEPS.map((step, idx) => {
                const done = stepIndex >= 0 ? idx <= stepIndex : idx === 0;
                const active = stepIndex >= 0 ? idx === stepIndex : idx === 0;

                return (
                  <div key={step} className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {done ? (
                        <CheckCircle2 className={active ? "h-5 w-5 text-primary" : "h-5 w-5 text-muted-foreground"} />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={active ? "text-sm font-semibold text-foreground" : "text-sm text-muted-foreground"}>
                        {step}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs font-semibold text-muted-foreground">Payment</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {data.isPaid ? "Paid" : data.paymentStatus?.trim() ? data.paymentStatus : "Unpaid"}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs font-semibold text-muted-foreground">Shipping</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {data.shippingStatus?.trim() ? data.shippingStatus : data.orderStatus}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {!data && !loading ? (
        <div className="text-xs text-muted-foreground">
          If you can’t find your order, make sure you entered the same phone number used at checkout.
        </div>
      ) : null}
    </div>
  );
}
