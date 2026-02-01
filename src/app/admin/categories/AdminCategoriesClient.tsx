"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, RefreshCw, Trash2 } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import { slugify } from "@/lib/slug";

type CategoryItem = {
  _id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readMessage(json: unknown): string | undefined {
  if (!isRecord(json)) return undefined;
  return typeof json.message === "string" ? json.message : undefined;
}

export default function AdminCategoriesClient() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [items, setItems] = useState<CategoryItem[]>([]);

  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");

  const load = useCallback(async () => {
    setLoading(true);

    const res = await fetch("/api/admin/categories", { cache: "no-store" });
    if (!res.ok) {
      toast.error("Failed to load categories");
      setItems([]);
      setLoading(false);
      return;
    }

    const json = (await res.json().catch(() => null)) as unknown;
    const data = isRecord(json) && Array.isArray(json.items) ? (json.items as CategoryItem[]) : [];
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const computedNewSlug = useMemo(() => slugify(newSlug || newName), [newSlug, newName]);

  async function create() {
    const name = newName.trim();
    const slug = computedNewSlug;

    if (!name || name.length < 2) {
      toast.error("Name is required");
      return;
    }

    if (!slug) {
      toast.error("Invalid slug");
      return;
    }

    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug }),
    });

    const json = (await res.json().catch(() => null)) as unknown;

    if (!res.ok) {
      toast.error(readMessage(json) ?? "Failed to create");
      return;
    }

    toast.success("Category created");
    setNewName("");
    setNewSlug("");
    await load();
  }

  async function update(id: string, patch: Partial<CategoryItem>) {
    setSavingId(id);

    const res = await fetch(`/api/admin/categories/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    const json = (await res.json().catch(() => null)) as unknown;

    if (!res.ok) {
      toast.error(readMessage(json) ?? "Failed to update");
      setSavingId(null);
      return;
    }

    toast.success("Saved");
    await load();
    setSavingId(null);
  }

  async function remove(id: string) {
    const ok = window.confirm("Delete this category? This cannot be undone.");
    if (!ok) return;

    const res = await fetch(`/api/admin/categories/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    const json = (await res.json().catch(() => null)) as unknown;

    if (!res.ok) {
      toast.error(readMessage(json) ?? "Failed to delete");
      return;
    }

    toast.success("Deleted");
    await load();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Categories</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Create and manage product categories.</p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin">
            <Button variant="secondary">Back</Button>
          </Link>
          <Button variant="secondary" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">New category</h2>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Name</label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Slug</label>
            <Input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder={computedNewSlug || "auto"} />
            <p className="text-xs text-zinc-500">Final: /category/{computedNewSlug || "-"}</p>
          </div>
          <div className="flex items-end">
            <Button type="button" onClick={() => void create()} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Create
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">All categories</h2>

        {items.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">No categories yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {items.map((c) => (
              <div
                key={c._id}
                className="rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_120px_120px_120px] md:items-center">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Name</p>
                    <Input
                      value={c.name}
                      onChange={(e) =>
                        setItems((prev) => prev.map((x) => (x._id === c._id ? { ...x, name: e.target.value } : x)))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Slug</p>
                    <Input
                      value={c.slug}
                      onChange={(e) =>
                        setItems((prev) => prev.map((x) => (x._id === c._id ? { ...x, slug: e.target.value } : x)))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Order</p>
                    <Input
                      value={String(c.sortOrder ?? 0)}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        setItems((prev) =>
                          prev.map((x) => (x._id === c._id ? { ...x, sortOrder: Number.isFinite(n) ? n : 0 } : x))
                        );
                      }}
                    />
                  </div>

                  <label className="flex items-center gap-2 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
                    <input
                      type="checkbox"
                      checked={Boolean(c.isActive)}
                      onChange={(e) =>
                        setItems((prev) => prev.map((x) => (x._id === c._id ? { ...x, isActive: e.target.checked } : x)))
                      }
                      className="h-4 w-4"
                    />
                    Active
                  </label>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={savingId === c._id}
                      onClick={() => void update(c._id, c)}
                      className="flex-1"
                    >
                      {savingId === c._id ? "Saving..." : "Save"}
                    </Button>
                    <Button type="button" variant="ghost" className="border border-zinc-200 dark:border-zinc-800" onClick={() => void remove(c._id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
