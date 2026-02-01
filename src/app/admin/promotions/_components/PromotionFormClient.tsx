"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";

type PromotionType = "percent" | "fixed";

type AppliesTo = "all" | "categories" | "products";

type CategoryItem = {
  _id: string;
  name: string;
  slug: string;
  isActive: boolean;
};

type ProductListItem = {
  _id: string;
  title: string;
  slug: string;
  category: string;
  categoryId: string;
  isActive: boolean;
};

type PromotionFormState = {
  name: string;
  type: PromotionType;
  value: string;
  minOrderAmount: string;
  maxDiscountAmount: string;
  priority: string;
  startsAt: string;
  expiresAt: string;
  appliesTo: AppliesTo;
  categoryIds: string[];
  productIds: string[];
  isActive: boolean;
};

type PromotionFormClientProps =
  | { mode: "create"; promotionId?: never }
  | { mode: "edit"; promotionId: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readMessage(json: unknown): string | undefined {
  if (!isRecord(json)) return undefined;
  const m = json.message;
  return typeof m === "string" ? m : undefined;
}

function readId(json: unknown): string | undefined {
  if (!isRecord(json)) return undefined;
  const id = json.id;
  return typeof id === "string" ? id : undefined;
}

function toNumber(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function toInt(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
}

function emptyState(): PromotionFormState {
  return {
    name: "",
    type: "percent",
    value: "",
    minOrderAmount: "0",
    maxDiscountAmount: "",
    priority: "0",
    startsAt: "",
    expiresAt: "",
    appliesTo: "all",
    categoryIds: [],
    productIds: [],
    isActive: true,
  };
}

export default function PromotionFormClient(props: PromotionFormClientProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(props.mode === "edit");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PromotionFormState>(() => emptyState());

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);

  const promotionId = props.mode === "edit" ? props.promotionId : null;

  const startsIso = useMemo(() => {
    if (!form.startsAt) return "";
    const d = new Date(form.startsAt);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString();
  }, [form.startsAt]);

  const expiresIso = useMemo(() => {
    if (!form.expiresAt) return "";
    const d = new Date(form.expiresAt);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString();
  }, [form.expiresAt]);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      const res = await fetch("/api/admin/categories", { cache: "no-store" }).catch(() => null);
      if (!res || !res.ok) {
        if (!cancelled) setCategories([]);
        return;
      }
      const json = (await res.json().catch(() => null)) as unknown;
      const items = isRecord(json) && Array.isArray(json.items) ? (json.items as CategoryItem[]) : [];
      if (!cancelled) setCategories(items);
    }

    async function loadProducts() {
      const res = await fetch("/api/admin/products", { cache: "no-store" }).catch(() => null);
      if (!res || !res.ok) {
        if (!cancelled) setProducts([]);
        return;
      }
      const json = (await res.json().catch(() => null)) as unknown;
      const items = isRecord(json) && Array.isArray(json.items) ? (json.items as ProductListItem[]) : [];
      if (!cancelled) setProducts(items);
    }

    loadCategories();
    loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!promotionId) return;

    const id = promotionId;

    let cancelled = false;

    async function load() {
      setLoading(true);

      const res = await fetch(`/api/admin/promotions/${encodeURIComponent(id)}`, { cache: "no-store" });

      if (cancelled) return;

      if (!res.ok) {
        toast.error("Failed to load promotion");
        setLoading(false);
        return;
      }

      const json = (await res.json().catch(() => null)) as unknown;

      if (!isRecord(json) || !isRecord(json.promotion)) {
        toast.error("Invalid response");
        setLoading(false);
        return;
      }

      const p = json.promotion as Record<string, unknown>;

      const startsAt = typeof p.startsAt === "string" ? p.startsAt : "";
      const expiresAt = typeof p.expiresAt === "string" ? p.expiresAt : "";

      const appliesTo = p.appliesTo === "categories" ? "categories" : p.appliesTo === "products" ? "products" : "all";
      const categoryIds = Array.isArray(p.categoryIds)
        ? ((p.categoryIds as unknown[]).filter((x) => typeof x === "string") as string[])
        : [];
      const productIds = Array.isArray(p.productIds)
        ? ((p.productIds as unknown[]).filter((x) => typeof x === "string") as string[])
        : [];

      setForm({
        name: typeof p.name === "string" ? p.name : "",
        type: p.type === "fixed" ? "fixed" : "percent",
        value: p.value != null ? String(p.value) : "",
        minOrderAmount: p.minOrderAmount != null ? String(p.minOrderAmount) : "0",
        maxDiscountAmount: p.maxDiscountAmount != null ? String(p.maxDiscountAmount) : "",
        priority: p.priority != null ? String(p.priority) : "0",
        startsAt: startsAt ? startsAt.slice(0, 10) : "",
        expiresAt: expiresAt ? expiresAt.slice(0, 10) : "",
        appliesTo,
        categoryIds,
        productIds,
        isActive: Boolean(p.isActive),
      });

      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [promotionId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const name = form.name.trim();
    if (!name) {
      toast.error("Name is required");
      return;
    }

    const value = toNumber(form.value);
    if (!Number.isFinite(value)) {
      toast.error("Value is required");
      return;
    }

    const minOrderAmount = toNumber(form.minOrderAmount || "0");
    if (!Number.isFinite(minOrderAmount) || minOrderAmount < 0) {
      toast.error("Min order amount must be a number");
      return;
    }

    const maxDiscountAmount = form.maxDiscountAmount.trim() ? toNumber(form.maxDiscountAmount) : undefined;
    if (maxDiscountAmount != null && !Number.isFinite(maxDiscountAmount)) {
      toast.error("Max discount must be a number");
      return;
    }

    const priority = form.priority.trim() ? toInt(form.priority) : 0;
    if (!Number.isFinite(priority)) {
      toast.error("Priority must be an integer");
      return;
    }

    setSaving(true);

    const payload = {
      name,
      type: form.type,
      value,
      minOrderAmount,
      maxDiscountAmount,
      priority,
      startsAt: startsIso || undefined,
      expiresAt: expiresIso || undefined,
      appliesTo: form.appliesTo,
      categoryIds: form.appliesTo === "categories" ? form.categoryIds : [],
      productIds: form.appliesTo === "products" ? form.productIds : [],
      isActive: form.isActive,
    };

    try {
      if (props.mode === "create") {
        const res = await fetch("/api/admin/promotions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json = (await res.json().catch(() => null)) as unknown;

        if (!res.ok) {
          toast.error(readMessage(json) ?? "Failed to create");
          return;
        }

        const id = readId(json);
        if (!id) {
          toast.error("Invalid response");
          return;
        }

        toast.success("Promotion created");
        router.push(`/admin/promotions/${id}`);
        router.refresh();
        return;
      }

      const res = await fetch(`/api/admin/promotions/${encodeURIComponent(props.promotionId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          startsAt: startsIso ? startsIso : null,
          expiresAt: expiresIso ? expiresIso : null,
        }),
      });

      const json = (await res.json().catch(() => null)) as unknown;

      if (!res.ok) {
        toast.error(readMessage(json) ?? "Failed to update");
        return;
      }

      toast.success("Saved");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function deletePromotion() {
    if (props.mode !== "edit") return;

    const ok = window.confirm("Delete this promotion?");
    if (!ok) return;

    const res = await fetch(`/api/admin/promotions/${encodeURIComponent(props.promotionId)}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as unknown;
      toast.error(readMessage(json) ?? "Failed to delete");
      return;
    }

    toast.success("Deleted");
    router.push("/admin/promotions");
    router.refresh();
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Promotions</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {props.mode === "create" ? "New promotion" : "Edit promotion"}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Only one eligible promo applies based on priority.</p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/promotions">
            <Button variant="secondary">Back</Button>
          </Link>
          {props.mode === "edit" ? (
            <Button
              variant="ghost"
              onClick={() => void deletePromotion()}
              className="border border-zinc-200 dark:border-zinc-800"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Details</h2>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Name</label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Weekend Sale" required />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as PromotionType }))}
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              >
                <option value="percent">Percent</option>
                <option value="fixed">Fixed</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Value</label>
              <Input
                value={form.value}
                onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
                placeholder={form.type === "percent" ? "10" : "500"}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Min order amount</label>
              <Input
                value={form.minOrderAmount}
                onChange={(e) => setForm((p) => ({ ...p, minOrderAmount: e.target.value }))}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Max discount amount</label>
              <Input
                value={form.maxDiscountAmount}
                onChange={(e) => setForm((p) => ({ ...p, maxDiscountAmount: e.target.value }))}
                placeholder="(optional)"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Priority</label>
              <Input value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))} placeholder="0" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Starts</label>
              <Input type="date" value={form.startsAt} onChange={(e) => setForm((p) => ({ ...p, startsAt: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Expires</label>
              <Input type="date" value={form.expiresAt} onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Applies to</label>
              <select
                value={form.appliesTo}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    appliesTo: e.target.value as AppliesTo,
                    categoryIds: e.target.value === "categories" ? p.categoryIds : [],
                    productIds: e.target.value === "products" ? p.productIds : [],
                  }))
                }
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              >
                <option value="all">All products</option>
                <option value="categories">Specific categories</option>
                <option value="products">Specific products</option>
              </select>

              {form.appliesTo === "categories" ? (
                <select
                  multiple
                  size={6}
                  value={form.categoryIds}
                  onChange={(e) => {
                    const next = Array.from(e.target.selectedOptions).map((o) => o.value);
                    setForm((p) => ({ ...p, categoryIds: next }));
                  }}
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                >
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : null}

              {form.appliesTo === "products" ? (
                <select
                  multiple
                  size={6}
                  value={form.productIds}
                  onChange={(e) => {
                    const next = Array.from(e.target.selectedOptions).map((o) => o.value);
                    setForm((p) => ({ ...p, productIds: next }));
                  }}
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                >
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Active</label>
              <label className="mt-2 flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                Enabled
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Save</h2>
            <p className="mt-1 text-xs text-zinc-500">This will update the promotion immediately.</p>

            <Button type="submit" className="mt-4 w-full" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
