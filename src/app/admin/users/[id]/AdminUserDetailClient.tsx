"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";

type AppRole = "user" | "staff" | "admin" | "super_admin";

type UserDetail = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  isBlocked: boolean;
  createdAt: string;
};

type OrderItem = {
  id: string;
  createdAt: string;
  totalAmount: number;
  orderStatus: string;
  isPaid: boolean;
  itemsCount: number;
};

type ApiResponse = {
  user: UserDetail;
  orders: OrderItem[];
};

type Props = {
  userId: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readMessage(json: unknown): string | undefined {
  if (!isRecord(json)) return undefined;
  const m = json.message;
  return typeof m === "string" ? m : undefined;
}

function money(v: number) {
  return `$${Number(v ?? 0).toFixed(2)}`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function AdminUserDetailClient({ userId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [user, setUser] = useState<UserDetail | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);

  const [nextRole, setNextRole] = useState<AppRole>("user");
  const [nextBlocked, setNextBlocked] = useState(false);

  const changed = useMemo(() => {
    if (!user) return false;
    return nextRole !== user.role || nextBlocked !== user.isBlocked;
  }, [nextBlocked, nextRole, user]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, { cache: "no-store" });

      if (cancelled) return;

      if (!res.ok) {
        toast.error("Failed to load user");
        setUser(null);
        setOrders([]);
        setLoading(false);
        return;
      }

      const json = (await res.json()) as ApiResponse;

      setUser(json.user);
      setOrders(json.orders ?? []);
      setNextRole(json.user.role);
      setNextBlocked(Boolean(json.user.isBlocked));
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function save() {
    if (!user) return;

    setSaving(true);

    const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: nextRole, isBlocked: nextBlocked }),
    });

    const json = (await res.json().catch(() => null)) as unknown;

    if (!res.ok) {
      toast.error(readMessage(json) ?? "Failed to save");
      setSaving(false);
      return;
    }

    if (!isRecord(json) || !isRecord(json.user)) {
      toast.error("Invalid response");
      setSaving(false);
      return;
    }

    const updated = json.user as unknown as UserDetail;

    setUser(updated);
    setNextRole(updated.role);
    setNextBlocked(Boolean(updated.isBlocked));

    toast.success("Saved");
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              User
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Not found.</p>
          </div>
          <Link href="/admin/users">
            <Button variant="secondary">Back</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">User</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {user.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {user.email}
          </p>
          <p className="mt-1 text-xs text-zinc-500">{user.id}</p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/users">
            <Button variant="secondary">Back</Button>
          </Link>
          <Button onClick={() => void save()} disabled={!changed || saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Access</h2>

            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Role</p>
                <select
                  value={nextRole}
                  onChange={(e) => setNextRole(e.target.value as AppRole)}
                  className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                >
                  <option value="user">User</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <label className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={nextBlocked}
                  onChange={(e) => setNextBlocked(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                Blocked
              </label>

              <div className="text-xs text-zinc-500">Created: {fmtDate(user.createdAt)}</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Recent orders</h2>

            {orders.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">No orders.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="py-2">Order</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Paid</th>
                      <th className="py-2">Items</th>
                      <th className="py-2">Created</th>
                      <th className="py-2 text-right">Total</th>
                      <th className="py-2 text-right">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="border-t border-zinc-200 dark:border-zinc-800">
                        <td className="py-3 font-semibold text-zinc-900 dark:text-zinc-50">{o.id.slice(-6)}</td>
                        <td className="py-3 text-zinc-600 dark:text-zinc-400">{o.orderStatus}</td>
                        <td className="py-3 text-zinc-600 dark:text-zinc-400">{o.isPaid ? "Yes" : "No"}</td>
                        <td className="py-3 text-zinc-600 dark:text-zinc-400">{o.itemsCount}</td>
                        <td className="py-3 text-zinc-600 dark:text-zinc-400">{fmtDate(o.createdAt)}</td>
                        <td className="py-3 text-right font-semibold text-zinc-900 dark:text-zinc-50">
                          {money(o.totalAmount)}
                        </td>
                        <td className="py-3 text-right">
                          <Link href={`/admin/orders/${o.id}`} className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
