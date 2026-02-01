"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";

type DealType = "percent" | "fixed";

type ProductListItem = {
  _id: string;
  title: string;
  slug: string;
  category: string;
  categoryId: string;
  isActive: boolean;
};

type DealFormState = {
  name: string;
  type: DealType;
  value: string;
  priority: string;
  startsAt: string;
  expiresAt: string;
  productIds: string[];
  isActive: boolean;
};

type DealFormClientProps =
  | { mode: "create"; dealId?: never }
  | { mode: "edit"; dealId: string };

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

function emptyState(): DealFormState {
  return {
    name: "",
    type: "percent",
    value: "",
    priority: "0",
    startsAt: "",
    expiresAt: "",
    productIds: [],
    isActive: true,
  };
}

export default function DealFormClient(props: DealFormClientProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(props.mode === "edit");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<DealFormState>(() => emptyState());

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [productQuery, setProductQuery] = useState("");

  const dealId = props.mode === "edit" ? props.dealId : null;

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

  const selectedProducts = useMemo(() => {
    const set = new Set(form.productIds);
    return products.filter((p) => set.has(p._id));
  }, [form.productIds, products]);

  const productSuggestions = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return [];
    const selected = new Set(form.productIds);

    return products
      .filter((p) => !selected.has(p._id))
      .filter((p) => `${p.title} ${p.slug} ${p.category}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [productQuery, products, form.productIds]);

  useEffect(() => {
    let cancelled = false;

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

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!dealId) return;

    const id = dealId;
    let cancelled = false;

    async function load() {
      setLoading(true);

      const res = await fetch(`/api/admin/cms/deals/${encodeURIComponent(id)}`, { cache: "no-store" });

      if (cancelled) return;

      if (!res.ok) {
        toast.error("Failed to load deal");
        setLoading(false);
        return;
      }

      const json = (await res.json().catch(() => null)) as unknown;

      if (!isRecord(json) || !isRecord(json.deal)) {
        toast.error("Invalid response");
        setLoading(false);
        return;
      }

      const d = json.deal as Record<string, unknown>;

      const startsAt = typeof d.startsAt === "string" ? d.startsAt : "";
      const expiresAt = typeof d.expiresAt === "string" ? d.expiresAt : "";
      const productIds = Array.isArray(d.productIds)
        ? ((d.productIds as unknown[]).filter((x) => typeof x === "string") as string[])
        : [];

      setForm({
        name: typeof d.name === "string" ? d.name : "",
        type: d.type === "fixed" ? "fixed" : "percent",
        value: d.value != null ? String(d.value) : "",
        priority: d.priority != null ? String(d.priority) : "0",
        startsAt: startsAt ? startsAt.slice(0, 10) : "",
        expiresAt: expiresAt ? expiresAt.slice(0, 10) : "",
        productIds,
        isActive: Boolean(d.isActive),
      });

      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [dealId]);

  async function deleteDeal() {
    if (!dealId) return;
    const ok = window.confirm("Delete this deal?");
    if (!ok) return;

    const res = await fetch(`/api/admin/cms/deals/${encodeURIComponent(dealId)}`, { method: "DELETE" });

    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as unknown;
      toast.error(readMessage(json) ?? "Failed to delete");
      return;
    }

    toast.success("Deleted");
    router.replace("/admin/cms/deals");
  }

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

    const priority = form.priority.trim() ? toInt(form.priority) : 0;
    if (!Number.isFinite(priority)) {
      toast.error("Priority must be an integer");
      return;
    }

    if (!startsIso || !expiresIso) {
      toast.error("Start and expiry dates are required");
      return;
    }

    if (new Date(startsIso).getTime() >= new Date(expiresIso).getTime()) {
      toast.error("Expiry must be after start");
      return;
    }

    if (form.productIds.length === 0) {
      toast.error("Select at least one product");
      return;
    }

    setSaving(true);

    const payload = {
      name,
      type: form.type,
      value,
      priority,
      startsAt: startsIso,
      expiresAt: expiresIso,
      productIds: form.productIds,
      isActive: form.isActive,
    };

    const res = await fetch(
      dealId ? `/api/admin/cms/deals/${encodeURIComponent(dealId)}` : "/api/admin/cms/deals",
      {
        method: dealId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as unknown;
      toast.error(readMessage(json) ?? "Failed to save");
      setSaving(false);
      return;
    }

    const json = (await res.json().catch(() => null)) as unknown;

    if (!dealId) {
      const id = readId(json);
      if (id) {
        toast.success("Created");
        router.replace(`/admin/cms/deals/${encodeURIComponent(id)}`);
      } else {
        toast.success("Created");
        router.replace("/admin/cms/deals");
      }
    } else {
      toast.success("Saved");
    }

    setSaving(false);
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
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {dealId ? "Edit deal" : "New deal"}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Configure a limited-time deal for selected products.</p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/cms/deals">
            <Button variant="secondary">Back</Button>
          </Link>
          {dealId ? (
            <Button variant="secondary" onClick={() => void deleteDeal()} disabled={saving}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          ) : null}
          <Button onClick={() => void 0} disabled={saving} form="deal-form" type="submit">
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <form id="deal-form" onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Name</label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Super Deal" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Active</label>
            <label className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border-zinc-300"
              />
              Enabled
            </label>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as DealType }))}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
            >
              <option value="percent">Percent</option>
              <option value="fixed">Fixed</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Value</label>
            <Input value={form.value} onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))} placeholder={form.type === "percent" ? "10" : "500"} />
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
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Products</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Select products that this deal applies to.</p>

          <div className="mt-4">
            <Input value={productQuery} onChange={(e) => setProductQuery(e.target.value)} placeholder="Search products..." />
          </div>

          {productSuggestions.length ? (
            <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
              {productSuggestions.map((p) => (
                <button
                  key={p._id}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 text-left hover:bg-zinc-50 dark:border-zinc-900 dark:hover:bg-zinc-900"
                  onClick={() => {
                    setForm((s) => ({ ...s, productIds: [...s.productIds, p._id] }));
                    setProductQuery("");
                  }}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">{p.title}</div>
                    <div className="mt-0.5 truncate text-xs text-zinc-500">{p.category} · {p.slug}</div>
                  </div>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Add</span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-4">
            {selectedProducts.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">No products selected.</p>
            ) : (
              <div className="space-y-2">
                {selectedProducts.map((p) => (
                  <div key={p._id} className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 px-4 py-3 dark:border-zinc-800">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">{p.title}</div>
                      <div className="mt-0.5 truncate text-xs text-zinc-500">{p.category} · {p.slug}</div>
                    </div>
                    <button
                      type="button"
                      className="text-sm font-semibold text-zinc-700 hover:underline dark:text-zinc-300"
                      onClick={() => setForm((s) => ({ ...s, productIds: s.productIds.filter((id) => id !== p._id) }))}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
