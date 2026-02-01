"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronRight, Plus, RefreshCw, Search, Trash2 } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

type PageItem = {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  createdAt: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

type ApiResponse = {
  items: PageItem[];
  pagination: Pagination;
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readMessage(json: unknown): string | undefined {
  if (!isRecord(json)) return undefined;
  const m = json.message;
  return typeof m === "string" ? m : undefined;
}

export default function AdminCmsPagesClient() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PageItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(qInput);
      setPage(1);
    }, 250);

    return () => clearTimeout(t);
  }, [qInput]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("limit", "20");
    if (q.trim()) p.set("q", q.trim());
    return p.toString();
  }, [page, q]);

  const load = useCallback(async () => {
    setLoading(true);

    const res = await fetch(`/api/admin/cms/pages?${queryString}`, { cache: "no-store" });

    if (!res.ok) {
      toast.error("Failed to load pages");
      setItems([]);
      setPagination(null);
      setLoading(false);
      return;
    }

    const data = (await res.json()) as ApiResponse;
    setItems(data.items ?? []);
    setPagination(data.pagination ?? null);
    setLoading(false);
  }, [queryString]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function deletePage(id: string) {
    const ok = window.confirm("Delete this page?");
    if (!ok) return;

    const res = await fetch(`/api/admin/cms/pages/${encodeURIComponent(id)}`, { method: "DELETE" });

    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as unknown;
      toast.error(readMessage(json) ?? "Failed");
      return;
    }

    toast.success("Deleted");
    void load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">CMS Pages</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Create static pages.</p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/cms">
            <Button variant="secondary">Back</Button>
          </Link>
          <Button variant="secondary" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Link href="/admin/cms/pages/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New page
            </Button>
          </Link>
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Search pages" className="pl-9" />
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-64" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="ml-auto h-8 w-32" /></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-600 dark:text-zinc-400">No pages.</td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr key={p.id} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-50">{p.title}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">/{p.slug}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                          p.isPublished
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300"
                        )}
                      >
                        {p.isPublished ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{fmtDate(p.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link href={`/admin/cms/pages/${p.id}`}>
                          <Button variant="secondary" size="sm">
                            Edit <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="border border-zinc-200 dark:border-zinc-800"
                          onClick={() => void deletePage(p.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
            <p className="text-xs font-semibold text-zinc-500">Page {pagination.page} of {pagination.pages}</p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pagination.page <= 1 || loading}>Prev</Button>
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={pagination.page >= pagination.pages || loading}>Next</Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
