"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

type ReturnItem = {
  id: string;
  orderId: string;
  orderShort: string;
  userEmail: string;
  productTitle: string;
  productImage: string;
  storeName: string;
  reason: string;
  comment: string;
  images: string[];
  status: string;
  createdAt: string | null;
  refundProcessedAt: string | null;
};

type ListResponse = { items: ReturnItem[] };

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function AdminReturnsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<ReturnItem[]>([]);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items.filter((it) => {
      if (status !== "all" && it.status !== status) return false;
      if (!qq) return true;
      return (
        it.orderShort.toLowerCase().includes(qq) ||
        it.userEmail.toLowerCase().includes(qq) ||
        it.productTitle.toLowerCase().includes(qq) ||
        it.storeName.toLowerCase().includes(qq)
      );
    });
  }, [items, q, status]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/returns", { cache: "no-store" }).catch(() => null);
    if (!res || !res.ok) {
      toast.error("Failed to load returns");
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

  async function update(id: string, action: "approve" | "reject" | "complete" | "refund") {
    setSaving(true);

    const res = await fetch(`/api/admin/returns/${encodeURIComponent(id)}`, {
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
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Returns</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Review, approve, reject and complete return requests.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order/user/product/store" />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={cn(
            "h-11 rounded-xl border border-border bg-surface px-3 text-sm text-foreground",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
        >
          <option value="all">All</option>
          <option value="requested">Requested</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          No return requests.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((it) => (
            <div key={it.id} className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 gap-3">
                  {it.productImage ? (
                    <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
                      <Image src={it.productImage} alt={it.productTitle} fill className="object-cover" sizes="56px" />
                    </div>
                  ) : null}

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Order #{it.orderShort}</p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 truncate">{it.productTitle}</p>
                    <p className="mt-1 text-xs text-zinc-500 truncate">{it.userEmail}{it.storeName ? ` · ${it.storeName}` : ""}</p>
                    <p className="mt-2 text-xs text-zinc-500">{it.createdAt ? fmtDate(it.createdAt) : ""}</p>
                    <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">Reason: {it.reason}</p>
                    {it.comment ? <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{it.comment}</p> : null}
                    {it.images.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {it.images.map((u) => (
                          <a key={u} href={u} target="_blank" rel="noreferrer noopener" className="text-xs font-semibold text-zinc-900 hover:underline dark:text-zinc-50">
                            View image
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2 md:flex-col md:items-stretch">
                  <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Status: {it.status}</div>
                  {it.refundProcessedAt ? (
                    <div className="text-xs text-zinc-500">Refund: {fmtDate(it.refundProcessedAt)}</div>
                  ) : null}

                  <Button size="sm" variant="secondary" onClick={() => void update(it.id, "approve")} disabled={saving || it.status !== "requested"}>
                    Approve
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => void update(it.id, "reject")} disabled={saving || it.status !== "requested"}>
                    Reject
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => void update(it.id, "complete")} disabled={saving || it.status !== "approved"}>
                    Complete
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void update(it.id, "refund")} disabled={saving || Boolean(it.refundProcessedAt)}>
                    Mark refund processed
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
