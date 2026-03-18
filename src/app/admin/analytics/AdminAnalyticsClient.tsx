"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Eye, UserCheck, Users } from "lucide-react";

import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";

type AnalyticsOverview = {
  cards: {
    dailyVisitors: number;
    totalVisitors: number;
    uniqueVisitors: number;
    activeUsers: number;
    pageViews: number;
  };
};

type VisitItem = {
  id: string;
  createdAt: string;
  sessionId: string;
  userId: string | null;
  ip: string | null;
  userAgent: string;
  url: string;
  path: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

type EventsResponse = {
  items: VisitItem[];
  pagination: Pagination;
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

function Stat({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</p>
        <div className="text-zinc-500">{icon}</div>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{value}</p>
    </div>
  );
}

export default function AdminAnalyticsClient() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsOverview | null>(null);

  const [eventsLoading, setEventsLoading] = useState(true);
  const [events, setEvents] = useState<VisitItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const res = await fetch("/api/admin/analytics/overview", { cache: "no-store" }).catch(() => null);
      if (cancelled) return;

      if (!res || !res.ok) {
        setData(null);
        setLoading(false);
        return;
      }

      const json = (await res.json().catch(() => null)) as AnalyticsOverview | null;
      setData(json);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("limit", "20");
    return p.toString();
  }, [page]);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);

    const res = await fetch(`/api/admin/analytics/events?${queryString}`, { cache: "no-store" }).catch(() => null);
    if (!res || !res.ok) {
      setEvents([]);
      setPagination(null);
      setEventsLoading(false);
      return;
    }

    const json = (await res.json().catch(() => null)) as EventsResponse | null;
    setEvents(json?.items ?? []);
    setPagination(json?.pagination ?? null);
    setEventsLoading(false);
  }, [queryString]);

  useEffect(() => {
    const t = setTimeout(() => void loadEvents(), 0);
    return () => clearTimeout(t);
  }, [loadEvents]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Analytics</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Traffic and visitor insights.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {loading || !data ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-4 h-8 w-32" />
            </div>
          ))
        ) : (
          <>
            <Stat title="Daily Visitors" value={String(data.cards.dailyVisitors)} icon={<Users className="h-4 w-4" />} />
            <Stat title="Total Visitors" value={String(data.cards.totalVisitors)} icon={<UserCheck className="h-4 w-4" />} />
            <Stat title="Unique (30d)" value={String(data.cards.uniqueVisitors)} icon={<Users className="h-4 w-4" />} />
            <Stat title="Active (5m)" value={String(data.cards.activeUsers)} icon={<Activity className="h-4 w-4" />} />
            <Stat title="Page Views" value={String(data.cards.pageViews)} icon={<Eye className="h-4 w-4" />} />
          </>
        )}
      </div>

      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Recent visits</p>
          <Button variant="secondary" size="sm" onClick={() => void loadEvents()} disabled={eventsLoading}>
            Refresh
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Path</th>
                <th className="px-4 py-3">IP</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">User Agent</th>
              </tr>
            </thead>
            <tbody>
              {eventsLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-56" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-64" /></td>
                  </tr>
                ))
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-600 dark:text-zinc-400">
                    No visits yet.
                  </td>
                </tr>
              ) : (
                events.map((e) => (
                  <tr key={e.id} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{fmtDate(e.createdAt)}</td>
                    <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-50" title={e.url || e.path}>
                      {e.path || "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{e.ip ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{e.userId ? e.userId.slice(-6) : "—"}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400" title={e.userAgent}>
                      <span className="block max-w-[520px] truncate">{e.userAgent || "—"}</span>
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
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1 || eventsLoading}
              >
                Prev
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={pagination.page >= pagination.pages || eventsLoading}
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
