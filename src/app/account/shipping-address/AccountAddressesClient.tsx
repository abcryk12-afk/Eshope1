"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

type AddressType = "shipping" | "billing";

type AddressItem = {
  id: string;
  type: AddressType;
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  province: string;
  country: string;
  postalCode: string;
  isDefault: boolean;
  createdAt?: string | null;
};

type ListResponse = { items: AddressItem[] };

function emptyForm(type: AddressType) {
  return {
    type,
    label: "",
    fullName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    province: "",
    country: "",
    postalCode: "",
    isDefault: false,
  };
}

export default function AccountAddressesClient({ initialTab }: { initialTab?: AddressType }) {
  const [tab, setTab] = useState<AddressType>(initialTab ?? "shipping");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<AddressItem[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(() => emptyForm("shipping"));

  const filtered = useMemo(() => items.filter((i) => i.type === tab), [items, tab]);

  const load = useCallback(async () => {
    setLoading(true);

    const res = await fetch("/api/account/addresses", { cache: "no-store" }).catch(() => null);

    if (!res || !res.ok) {
      setItems([]);
      setLoading(false);
      toast.error("Failed to load addresses");
      return;
    }

    const json = (await res.json().catch(() => null)) as ListResponse | null;
    setItems(Array.isArray(json?.items) ? json!.items! : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (editingId) return;
    setForm((f) => ({ ...f, type: tab }));
  }, [tab, editingId]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm(tab));
    setFormOpen(true);
  }

  function openEdit(a: AddressItem) {
    setEditingId(a.id);
    setForm({
      type: a.type,
      label: a.label ?? "",
      fullName: a.fullName ?? "",
      phone: a.phone ?? "",
      addressLine1: a.addressLine1 ?? "",
      addressLine2: a.addressLine2 ?? "",
      city: a.city ?? "",
      province: a.province ?? "",
      country: a.country ?? "",
      postalCode: a.postalCode ?? "",
      isDefault: Boolean(a.isDefault),
    });
    setFormOpen(true);
  }

  async function submit() {
    setSaving(true);

    const payload = {
      ...form,
      label: form.label.trim() || undefined,
      addressLine2: form.addressLine2.trim() || undefined,
    };

    const url = editingId ? `/api/account/addresses/${encodeURIComponent(editingId)}` : "/api/account/addresses";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);

    if (!res || !res.ok) {
      const json = res ? ((await res.json().catch(() => null)) as unknown) : null;
      const msg = (json as { message?: string } | null)?.message;
      toast.error(typeof msg === "string" ? msg : "Failed to save address");
      setSaving(false);
      return;
    }

    toast.success(editingId ? "Address updated" : "Address added");
    setFormOpen(false);
    setEditingId(null);
    await load();
    setSaving(false);
  }

  async function del(id: string) {
    if (!confirm("Delete this address?") ) return;

    setSaving(true);
    const res = await fetch(`/api/account/addresses/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => null);

    if (!res || !res.ok) {
      const json = res ? ((await res.json().catch(() => null)) as unknown) : null;
      const msg = (json as { message?: string } | null)?.message;
      toast.error(typeof msg === "string" ? msg : "Failed to delete");
      setSaving(false);
      return;
    }

    toast.success("Deleted");
    await load();
    setSaving(false);
  }

  async function setDefault(id: string) {
    setSaving(true);

    const res = await fetch(`/api/account/addresses/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    }).catch(() => null);

    if (!res || !res.ok) {
      const json = res ? ((await res.json().catch(() => null)) as unknown) : null;
      const msg = (json as { message?: string } | null)?.message;
      toast.error(typeof msg === "string" ? msg : "Failed to set default");
      setSaving(false);
      return;
    }

    toast.success("Default address updated");
    await load();
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Addresses</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Manage shipping and billing addresses.</p>
          </div>
          <Button onClick={openCreate} disabled={saving}>Add address</Button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab("shipping")}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-semibold",
              tab === "shipping"
                ? "border-zinc-900 bg-zinc-50 text-zinc-900 dark:border-zinc-50 dark:bg-zinc-900 dark:text-zinc-50"
                : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
            )}
          >
            Shipping
          </button>
          <button
            type="button"
            onClick={() => setTab("billing")}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-semibold",
              tab === "billing"
                ? "border-zinc-900 bg-zinc-50 text-zinc-900 dark:border-zinc-50 dark:bg-zinc-900 dark:text-zinc-50"
                : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
            )}
          >
            Billing
          </button>
        </div>
      </div>

      {formOpen ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {editingId ? "Edit address" : "Add address"}
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input value={form.label} onChange={(e) => setForm((s) => ({ ...s, label: e.target.value }))} placeholder="Label (optional)" />
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((s) => ({ ...s, isDefault: e.target.checked }))}
                className="h-4 w-4 rounded border-zinc-300"
              />
              Set as default
            </div>
            <Input value={form.fullName} onChange={(e) => setForm((s) => ({ ...s, fullName: e.target.value }))} placeholder="Full name" />
            <Input value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} placeholder="Phone" />
            <Input value={form.addressLine1} onChange={(e) => setForm((s) => ({ ...s, addressLine1: e.target.value }))} placeholder="Address line 1" className="md:col-span-2" />
            <Input value={form.addressLine2} onChange={(e) => setForm((s) => ({ ...s, addressLine2: e.target.value }))} placeholder="Address line 2 (optional)" className="md:col-span-2" />
            <Input value={form.city} onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))} placeholder="City" />
            <Input value={form.province} onChange={(e) => setForm((s) => ({ ...s, province: e.target.value }))} placeholder="Province / State" />
            <Input value={form.country} onChange={(e) => setForm((s) => ({ ...s, country: e.target.value }))} placeholder="Country" />
            <Input value={form.postalCode} onChange={(e) => setForm((s) => ({ ...s, postalCode: e.target.value }))} placeholder="Postal code" />
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => { setFormOpen(false); setEditingId(null); }} disabled={saving}>Cancel</Button>
            <Button onClick={() => void submit()} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{tab === "shipping" ? "Shipping" : "Billing"} addresses</h2>

        {loading ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">No addresses yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {filtered.map((a) => (
              <div key={a.id} className="rounded-3xl border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{a.label || a.fullName}</p>
                      {a.isDefault ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
                          Default
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{a.phone}</p>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {a.addressLine1}{a.addressLine2 ? `, ${a.addressLine2}` : ""}
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {a.city}, {a.province}, {a.country} {a.postalCode}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 md:flex-col md:items-stretch">
                    {!a.isDefault ? (
                      <Button size="sm" variant="secondary" onClick={() => void setDefault(a.id)} disabled={saving}>Set default</Button>
                    ) : null}
                    <Button size="sm" variant="secondary" onClick={() => openEdit(a)} disabled={saving}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => void del(a.id)} disabled={saving}>Delete</Button>
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
