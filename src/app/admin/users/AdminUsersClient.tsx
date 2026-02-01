"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronRight, RefreshCw, Search, ShieldAlert } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";

type AppRole = "user" | "staff" | "admin" | "super_admin";

type UserListItem = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  isBlocked: boolean;
  createdAt: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

type ListResponse = {
  items: UserListItem[];
  pagination: Pagination;
};

type RoleFilter = "all" | AppRole;

type BlockFilter = "all" | "blocked" | "active";

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readMessage(json: unknown): string | undefined {
  if (!isRecord(json)) return undefined;
  const m = json.message;
  return typeof m === "string" ? m : undefined;
}

export default function AdminUsersClient() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<UserListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [role, setRole] = useState<RoleFilter>("all");
  const [blocked, setBlocked] = useState<BlockFilter>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(qInput);
      setPage(1);
    }, 250);

    return () => clearTimeout(t);
  }, [qInput]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "20");

    if (q.trim()) params.set("q", q.trim());
    if (role !== "all") params.set("role", role);
    if (blocked !== "all") params.set("blocked", blocked);

    return params.toString();
  }, [blocked, page, q, role]);

  const load = useCallback(async () => {
    setLoading(true);

    const res = await fetch(`/api/admin/users?${queryString}`, { cache: "no-store" });

    if (!res.ok) {
      toast.error("Failed to load users");
      setItems([]);
      setPagination(null);
      setLoading(false);
      return;
    }

    const data = (await res.json()) as ListResponse;

    setItems(data.items ?? []);
    setPagination(data.pagination ?? null);
    setLoading(false);
  }, [queryString]);

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 0);

    return () => clearTimeout(t);
  }, [load]);

  async function setBlockedState(id: string, next: boolean) {
    const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isBlocked: next }),
    });

    const json = (await res.json().catch(() => null)) as unknown;

    if (!res.ok) {
      toast.error(readMessage(json) ?? "Failed");
      return;
    }

    toast.success(next ? "User blocked" : "User unblocked");
    void load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Users
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Search, block/unblock, and manage roles.
          </p>
        </div>

        <Button variant="secondary" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Search by user id, email, name"
              className="pl-9"
            />
          </div>

          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value as RoleFilter);
              setPage(1);
            }}
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          >
            <option value="all">All roles</option>
            <option value="user">User</option>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>

          <select
            value={blocked}
            onChange={(e) => {
              setBlocked(e.target.value as BlockFilter);
              setPage(1);
            }}
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          >
            <option value="all">All users</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>

        <div className="text-xs font-semibold text-zinc-500">
          {pagination ? `${pagination.total} users` : ""}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-56" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-44" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="ml-auto h-8 w-32" /></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-600 dark:text-zinc-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                items.map((u) => (
                  <tr key={u.id} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-50">{u.name}</div>
                      <div className="mt-0.5 text-xs text-zinc-500">{u.email}</div>
                      <div className="mt-0.5 text-[11px] text-zinc-500">{u.id}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{u.role}</td>
                    <td className="px-4 py-3">
                      {u.isBlocked ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300">
                          <ShieldAlert className="h-4 w-4" /> Blocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{fmtDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => void setBlockedState(u.id, !u.isBlocked)}
                          disabled={loading}
                        >
                          {u.isBlocked ? "Unblock" : "Block"}
                        </Button>
                        <Link href={`/admin/users/${u.id}`}>
                          <Button variant="secondary" size="sm">
                            View <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        </Link>
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
            <p className="text-xs font-semibold text-zinc-500">
              Page {pagination.page} of {pagination.pages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1 || loading}
              >
                Prev
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={pagination.page >= pagination.pages || loading}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
