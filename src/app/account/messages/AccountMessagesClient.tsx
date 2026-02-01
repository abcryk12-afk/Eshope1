"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

type Msg = {
  id: string;
  title: string;
  preview: string;
  body: string;
  type: string;
  relatedOrderId: string | null;
  isRead: boolean;
  createdAt: string | null;
};

type ListResponse = { items: Msg[] };

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function AccountMessagesClient() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Msg[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(() => items.find((m) => m.id === selectedId) ?? null, [items, selectedId]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/account/messages?limit=100", { cache: "no-store" }).catch(() => null);
    if (!res || !res.ok) {
      setItems([]);
      setLoading(false);
      return;
    }
    const json = (await res.json().catch(() => null)) as ListResponse | null;
    const list = Array.isArray(json?.items) ? json!.items : [];
    setItems(list);
    setSelectedId((cur) => cur ?? (list[0]?.id ?? null));
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function markRead(id: string) {
    await fetch(`/api/account/messages/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRead: true }),
    }).catch(() => null);

    setItems((prev) => prev.map((m) => (m.id === id ? { ...m, isRead: true } : m)));
  }

  function select(id: string) {
    setSelectedId(id);
    const msg = items.find((m) => m.id === id);
    if (msg && !msg.isRead) void markRead(id);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Message Center</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">All system updates in one place.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
        <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Inbox</h2>
            <Button size="sm" variant="secondary" onClick={() => void load()} disabled={loading}>Refresh</Button>
          </div>

          {loading ? (
            <div className="mt-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">No messages.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {items.map((m) => {
                const active = m.id === selectedId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => select(m.id)}
                    className={cn(
                      "w-full rounded-2xl border p-3 text-left",
                      active
                        ? "border-zinc-900 bg-zinc-50 dark:border-zinc-50 dark:bg-zinc-900"
                        : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={cn("text-sm font-semibold truncate", m.isRead ? "text-zinc-700 dark:text-zinc-200" : "text-zinc-900 dark:text-zinc-50")}>
                          {m.title}
                        </p>
                        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">{m.preview}</p>
                      </div>
                      {!m.isRead ? (
                        <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      ) : null}
                    </div>
                    {m.createdAt ? (
                      <p className="mt-2 text-xs text-zinc-500">{fmtDate(m.createdAt)}</p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          {!selected ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Select a message.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{selected.type}</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{selected.title}</h2>
                {selected.createdAt ? (
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{fmtDate(selected.createdAt)}</p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                <pre className="whitespace-pre-wrap font-sans">{selected.body}</pre>
              </div>

              {selected.relatedOrderId ? (
                <div>
                  <Link href={`/account/orders/${encodeURIComponent(selected.relatedOrderId)}`}>
                    <Button variant="secondary">View order</Button>
                  </Link>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
