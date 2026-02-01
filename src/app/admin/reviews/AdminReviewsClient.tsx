"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import { StarRatingDisplay } from "@/components/ui/StarRating";
import { cn } from "@/lib/utils";

type ReviewItem = {
  id: string;
  userEmail: string;
  userName: string;
  productTitle: string;
  productSlug: string;
  productImage: string;
  orderId: string;
  orderShort: string;
  rating: number;
  comment: string;
  isHidden: boolean;
  createdAt: string | null;
};

type ApiResponse = {
  items: ReviewItem[];
  pagination: { page: number; pages: number; total: number; limit: number };
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function AdminReviewsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<ReviewItem[]>([]);

  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [hidden, setHidden] = useState<"all" | "visible" | "hidden">("all");

  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 250);
    return () => clearTimeout(t);
  }, [qInput]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("limit", "50");
    if (q.trim()) params.set("q", q.trim());
    params.set("hidden", hidden);
    return params.toString();
  }, [hidden, q]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/reviews?${queryString}`, { cache: "no-store" }).catch(() => null);
    if (!res || !res.ok) {
      toast.error("Failed to load reviews");
      setItems([]);
      setLoading(false);
      return;
    }
    const json = (await res.json().catch(() => null)) as ApiResponse | null;
    setItems(Array.isArray(json?.items) ? json!.items : []);
    setLoading(false);
  }, [queryString]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function act(id: string, action: "hide" | "unhide" | "delete") {
    if (action === "delete") {
      const ok = confirm("Delete this review? This cannot be undone.");
      if (!ok) return;
    }

    setSaving(true);

    const res = await fetch(`/api/admin/reviews?id=${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    }).catch(() => null);

    const json = (await res?.json().catch(() => null)) as unknown;

    if (!res || !res.ok) {
      const msg = (json as { message?: string } | null)?.message;
      toast.error(typeof msg === "string" ? msg : "Failed");
      setSaving(false);
      return;
    }

    toast.success("Updated");
    await load();
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Reviews</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Hide or delete reviews. Ratings are calculated from reviews.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <Input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Search user/product/order" />
        <select
          value={hidden}
          onChange={(e) => setHidden(e.target.value as typeof hidden)}
          className={cn(
            "h-11 rounded-xl border border-border bg-surface px-3 text-sm text-foreground",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
        >
          <option value="all">All</option>
          <option value="visible">Visible</option>
          <option value="hidden">Hidden</option>
        </select>
        <Button variant="secondary" onClick={() => void load()} disabled={loading || saving}>Refresh</Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          No reviews.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <div key={r.id} className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 gap-3">
                  {r.productImage ? (
                    <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
                      <Image src={r.productImage} alt={r.productTitle} fill className="object-cover" sizes="56px" />
                    </div>
                  ) : null}

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">{r.productTitle}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <StarRatingDisplay value={r.rating} size="sm" />
                      <span className="text-xs text-zinc-500">{r.isHidden ? "Hidden" : "Visible"}</span>
                      <span className="text-xs text-zinc-500">Order #{r.orderShort}</span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">{r.userEmail || r.userName}</p>
                    {r.comment ? <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{r.comment}</p> : null}
                    {r.createdAt ? <p className="mt-2 text-xs text-zinc-500">{fmtDate(r.createdAt)}</p> : null}

                    <div className="mt-2 flex items-center gap-2">
                      {r.productSlug ? (
                        <Link href={`/product/${encodeURIComponent(r.productSlug)}`} className="text-xs font-semibold text-zinc-900 hover:underline dark:text-zinc-50">
                          Product
                        </Link>
                      ) : null}
                      {r.orderId ? (
                        <Link href={`/admin/orders/${encodeURIComponent(r.orderId)}`} className="text-xs font-semibold text-zinc-900 hover:underline dark:text-zinc-50">
                          Order
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 md:flex-col md:items-stretch">
                  {r.isHidden ? (
                    <Button size="sm" variant="secondary" onClick={() => void act(r.id, "unhide")} disabled={saving}>
                      Unhide
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => void act(r.id, "hide")} disabled={saving}>
                      Hide
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => void act(r.id, "delete")} disabled={saving}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
