"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { StarRatingDisplay, StarRatingInput } from "@/components/ui/StarRating";

type EligibleItem = {
  orderId: string;
  productId: string;
  title: string;
  slug: string;
  image: string;
};

type SubmittedItem = {
  id: string;
  orderId: string;
  orderShort: string;
  productId: string;
  productTitle: string;
  productSlug: string;
  productImage: string;
  rating: number;
  comment: string;
  status: "published" | "hidden";
  createdAt: string | null;
};

type ApiResponse = {
  eligible: EligibleItem[];
  submitted: SubmittedItem[];
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function AccountFeedbackClient() {
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState<EligibleItem[]>([]);
  const [submitted, setSubmitted] = useState<SubmittedItem[]>([]);

  const [openKey, setOpenKey] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const openItem = useMemo(() => {
    if (!openKey) return null;
    const [orderId, productId] = openKey.split(":");
    return eligible.find((e) => e.orderId === orderId && e.productId === productId) ?? null;
  }, [eligible, openKey]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/account/feedback", { cache: "no-store" }).catch(() => null);
    if (!res || !res.ok) {
      setEligible([]);
      setSubmitted([]);
      setLoading(false);
      return;
    }
    const json = (await res.json().catch(() => null)) as ApiResponse | null;
    setEligible(Array.isArray(json?.eligible) ? json!.eligible : []);
    setSubmitted(Array.isArray(json?.submitted) ? json!.submitted : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function submit() {
    if (!openItem) return;

    setSaving(true);

    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: openItem.productId,
        orderId: openItem.orderId,
        rating,
        comment,
      }),
    }).catch(() => null);

    const json = (await res?.json().catch(() => null)) as unknown;

    if (!res || !res.ok) {
      const msg = (json as { message?: string } | null)?.message;
      toast.error(typeof msg === "string" ? msg : "Failed to submit review");
      setSaving(false);
      return;
    }

    toast.success("Review submitted");
    setOpenKey(null);
    setComment("");
    setRating(5);
    await load();
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-surface p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Feedback</h1>
        <p className="mt-2 text-sm text-muted-foreground">Verified-buyer reviews from delivered orders.</p>
      </div>

      <div className="rounded-3xl border border-border bg-surface p-6">
        <h2 className="text-sm font-semibold text-foreground">Eligible for feedback</h2>

        {loading ? (
          <div className="mt-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : eligible.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No eligible products right now.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {eligible.map((it) => {
              const key = `${it.orderId}:${it.productId}`;
              const opened = key === openKey;

              return (
                <div key={key} className="rounded-3xl border border-border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex min-w-0 gap-3">
                      {it.image ? (
                        <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-border">
                          <Image src={it.image} alt={it.title} fill className="object-cover" sizes="56px" />
                        </div>
                      ) : null}

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{it.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Order #{it.orderId.slice(-6)}</p>
                        <div className="mt-2 flex items-center gap-2">
                          {it.slug ? (
                            <Link href={`/product/${encodeURIComponent(it.slug)}`} className="text-xs font-semibold text-foreground hover:underline">
                              View product
                            </Link>
                          ) : null}
                          <Link href={`/account/orders/${encodeURIComponent(it.orderId)}`} className="text-xs font-semibold text-foreground hover:underline">
                            View order
                          </Link>
                        </div>
                      </div>
                    </div>

                    <Button variant="secondary" size="sm" onClick={() => {
                      setOpenKey((cur) => (cur === key ? null : key));
                      setRating(5);
                      setComment("");
                    }}>
                      {opened ? "Close" : "Write review"}
                    </Button>
                  </div>

                  {opened ? (
                    <div className="mt-4 rounded-2xl border border-border bg-background p-4">
                      <div className="flex items-center justify-between gap-3">
                        <StarRatingInput value={rating} onChange={setRating} disabled={saving} />
                        <Button onClick={() => void submit()} disabled={saving}>
                          {saving ? "Submitting..." : "Submit"}
                        </Button>
                      </div>

                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                        className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                        placeholder="Write an optional review..."
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-border bg-surface p-6">
        <h2 className="text-sm font-semibold text-foreground">Submitted feedback</h2>

        {loading ? (
          <div className="mt-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : submitted.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No reviews yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {submitted.map((r) => (
              <div key={r.id} className="rounded-3xl border border-border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 gap-3">
                    {r.productImage ? (
                      <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-border">
                        <Image src={r.productImage} alt={r.productTitle} fill className="object-cover" sizes="56px" />
                      </div>
                    ) : null}

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{r.productTitle}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <StarRatingDisplay value={r.rating} size="sm" />
                        <span className="text-xs text-muted-foreground">{r.status === "published" ? "Published" : "Hidden"}</span>
                      </div>
                      {r.comment ? <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p> : null}
                      {r.createdAt ? <p className="mt-2 text-xs text-muted-foreground">{fmtDate(r.createdAt)}</p> : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href={`/account/orders/${encodeURIComponent(r.orderId)}`}>
                      <Button variant="secondary" size="sm">Order</Button>
                    </Link>
                    {r.productSlug ? (
                      <Link href={`/product/${encodeURIComponent(r.productSlug)}`}>
                        <Button variant="secondary" size="sm">Product</Button>
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
