"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Eye, ShoppingBag, UserCheck, Users } from "lucide-react";

import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";

type AnalyticsOverview = {
  cards: {
    dailyVisitors: number;
    totalVisitors: number;
    uniqueVisitors: number;
    activeUsers: number;
    pageViews: number;
    orders: number;
    revenue: number;
    conversionRate7d: number;
  };
};

type FunnelResponse = {
  range: "today" | "7d" | "30d";
  start: string;
  steps: {
    visitors: number;
    viewItem: number;
    addToCart: number;
    beginCheckout: number;
    purchase: number;
  };
  rates: {
    viewItemRate: number;
    addToCartRate: number;
    beginCheckoutRate: number;
    purchaseRate: number;
    overallConversionRate: number;
  };
};

type TimeseriesResponse = {
  range: "7d" | "30d" | "90d";
  series: Array<{ date: string; visitors: number; pageViews: number; orders: number; revenue: number }>;
};

type BreakdownResponse = {
  range: "today" | "7d" | "30d";
  start: string;
  device: Array<{ key: string; count: number }>;
  source: Array<{ key: string; count: number }>;
};

type RealtimeResponse = {
  activeUsers: number;
  ordersToday: number;
  revenueToday: number;
  activity: Array<{
    id: string;
    createdAt: string;
    eventType: string;
    path: string;
    url: string;
    sourceType: string | null;
    deviceType: string | null;
  }>;
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

function fmtCurrency(v: number) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
  } catch {
    return `$${Math.round(v)}`;
  }
}

function fmtPct(v: number) {
  if (!Number.isFinite(v)) return "0%";
  return `${(v * 100).toFixed(1)}%`;
}

function RangePills({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ key: string; label: string }>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((opt) => (
        <Button
          key={opt.key}
          size="sm"
          variant={value === opt.key ? "primary" : "secondary"}
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}

function MiniBars({
  rows,
}: {
  rows: Array<{ label: string; value: number }>;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[140px_1fr_60px] items-center gap-3">
          <p className="truncate text-xs font-semibold text-zinc-700 dark:text-zinc-300" title={r.label}>
            {r.label}
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
            <div className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          <p className="text-right text-xs font-semibold text-zinc-600 dark:text-zinc-400">{r.value}</p>
        </div>
      ))}
    </div>
  );
}

function SparkLine({ data }: { data: number[] }) {
  const w = 640;
  const h = 120;
  const pad = 8;
  const max = Math.max(1, ...data);
  const min = Math.min(0, ...data);
  const span = Math.max(1, max - min);

  const points = data
    .map((v, i) => {
      const x = pad + (i * (w - pad * 2)) / Math.max(1, data.length - 1);
      const y = pad + (1 - (v - min) / span) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[120px] w-full">
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} className="text-zinc-900 dark:text-zinc-100" />
    </svg>
  );
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

  const realtimeLoadedRef = useRef(false);

  const [range, setRange] = useState<"today" | "7d" | "30d">("7d");
  const [seriesRange, setSeriesRange] = useState<"7d" | "30d" | "90d">("30d");

  const [funnelLoading, setFunnelLoading] = useState(true);
  const [funnel, setFunnel] = useState<FunnelResponse | null>(null);

  const [seriesLoading, setSeriesLoading] = useState(true);
  const [series, setSeries] = useState<TimeseriesResponse | null>(null);

  const [breakdownsLoading, setBreakdownsLoading] = useState(true);
  const [breakdowns, setBreakdowns] = useState<BreakdownResponse | null>(null);

  const [realtimeLoading, setRealtimeLoading] = useState(true);
  const [realtime, setRealtime] = useState<RealtimeResponse | null>(null);

  const [eventsLoading, setEventsLoading] = useState(true);
  const [events, setEvents] = useState<VisitItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/analytics/overview", { cache: "no-store" }).catch(() => null);
    if (!res || !res.ok) {
      setData(null);
      setLoading(false);
      return;
    }

    const json = (await res.json().catch(() => null)) as AnalyticsOverview | null;
    setData(json);
    setLoading(false);
  }, []);

  const loadFunnel = useCallback(async () => {
    setFunnelLoading(true);
    const res = await fetch(`/api/admin/analytics/funnel?range=${encodeURIComponent(range)}`, { cache: "no-store" }).catch(() => null);
    if (!res || !res.ok) {
      setFunnel(null);
      setFunnelLoading(false);
      return;
    }

    const json = (await res.json().catch(() => null)) as FunnelResponse | null;
    setFunnel(json);
    setFunnelLoading(false);
  }, [range]);

  const loadTimeseries = useCallback(async () => {
    setSeriesLoading(true);
    const res = await fetch(`/api/admin/analytics/timeseries?range=${encodeURIComponent(seriesRange)}`, { cache: "no-store" }).catch(() => null);
    if (!res || !res.ok) {
      setSeries(null);
      setSeriesLoading(false);
      return;
    }

    const json = (await res.json().catch(() => null)) as TimeseriesResponse | null;
    setSeries(json);
    setSeriesLoading(false);
  }, [seriesRange]);

  const loadBreakdowns = useCallback(async () => {
    setBreakdownsLoading(true);
    const res = await fetch(`/api/admin/analytics/breakdowns?range=${encodeURIComponent(range)}`, { cache: "no-store" }).catch(() => null);
    if (!res || !res.ok) {
      setBreakdowns(null);
      setBreakdownsLoading(false);
      return;
    }

    const json = (await res.json().catch(() => null)) as BreakdownResponse | null;
    setBreakdowns(json);
    setBreakdownsLoading(false);
  }, [range]);

  const loadRealtime = useCallback(async () => {
    const first = !realtimeLoadedRef.current;
    if (first) setRealtimeLoading(true);
    const res = await fetch("/api/admin/analytics/realtime", { cache: "no-store" }).catch(() => null);
    if (!res || !res.ok) {
      setRealtime(null);
      if (first) setRealtimeLoading(false);
      return;
    }

    const json = (await res.json().catch(() => null)) as RealtimeResponse | null;
    setRealtime(json);
    realtimeLoadedRef.current = true;
    if (first) setRealtimeLoading(false);
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    void loadFunnel();
    void loadBreakdowns();
  }, [loadBreakdowns, loadFunnel]);

  useEffect(() => {
    void loadTimeseries();
  }, [loadTimeseries]);

  useEffect(() => {
    void loadRealtime();
    const t = setInterval(() => void loadRealtime(), 10_000);
    return () => clearInterval(t);
  }, [loadRealtime]);

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

      <div className="flex flex-col gap-3 rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Filters</p>
          <Button variant="secondary" size="sm" onClick={() => void Promise.all([loadOverview(), loadFunnel(), loadTimeseries(), loadBreakdowns(), loadRealtime()])}>
            Refresh all
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Range</p>
            <div className="mt-2">
              <RangePills
                value={range}
                onChange={(v) => setRange(v as "today" | "7d" | "30d")}
                options={[
                  { key: "today", label: "Today" },
                  { key: "7d", label: "7 Days" },
                  { key: "30d", label: "30 Days" },
                ]}
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Timeseries</p>
            <div className="mt-2">
              <RangePills
                value={seriesRange}
                onChange={(v) => setSeriesRange(v as "7d" | "30d" | "90d")}
                options={[
                  { key: "7d", label: "7d" },
                  { key: "30d", label: "30d" },
                  { key: "90d", label: "90d" },
                ]}
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Realtime</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => void loadRealtime()} disabled={realtimeLoading}>
                Refresh
              </Button>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">Auto refresh: 10s</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        {loading || !data ? (
          Array.from({ length: 8 }).map((_, i) => (
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
            <Stat title="Active (5m)" value={String(realtime?.activeUsers ?? data.cards.activeUsers)} icon={<Activity className="h-4 w-4" />} />
            <Stat title="Page Views" value={String(data.cards.pageViews)} icon={<Eye className="h-4 w-4" />} />
            <Stat title="Orders (Today)" value={String(realtime?.ordersToday ?? data.cards.orders)} icon={<ShoppingBag className="h-4 w-4" />} />
            <Stat title="Revenue (Today)" value={fmtCurrency(realtime?.revenueToday ?? data.cards.revenue)} icon={<ShoppingBag className="h-4 w-4" />} />
            <Stat title="Conversion (7d)" value={fmtPct(data.cards.conversionRate7d)} icon={<Activity className="h-4 w-4" />} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Visitors (timeseries)</p>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Unique sessions and page views</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => void loadTimeseries()} disabled={seriesLoading}>
              Refresh
            </Button>
          </div>

          <div className="mt-4">
            {seriesLoading || !series ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-[120px] w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Visitors</p>
                    <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      {series.series.reduce((a, b) => a + (b.visitors ?? 0), 0)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Page views</p>
                    <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      {series.series.reduce((a, b) => a + (b.pageViews ?? 0), 0)}
                    </p>
                  </div>
                </div>
                <SparkLine data={series.series.map((d) => d.visitors)} />
                <div className="grid grid-cols-2 gap-3">
                  <SparkLine data={series.series.map((d) => d.orders)} />
                  <SparkLine data={series.series.map((d) => d.revenue)} />
                </div>
                <div className="grid grid-cols-1 gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <p>
                    Orders: <span className="font-semibold text-zinc-900 dark:text-zinc-50">{series.series.reduce((a, b) => a + (b.orders ?? 0), 0)}</span>
                  </p>
                  <p>
                    Revenue: <span className="font-semibold text-zinc-900 dark:text-zinc-50">{fmtCurrency(series.series.reduce((a, b) => a + (b.revenue ?? 0), 0))}</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Conversion funnel</p>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Session-level steps</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => void loadFunnel()} disabled={funnelLoading}>
              Refresh
            </Button>
          </div>

          <div className="mt-4">
            {funnelLoading || !funnel ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Overall</p>
                    <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{fmtPct(funnel.rates.overallConversionRate)}</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Purchase rate</p>
                    <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{fmtPct(funnel.rates.purchaseRate)}</p>
                  </div>
                </div>

                <MiniBars
                  rows={[
                    { label: "Visitors", value: funnel.steps.visitors },
                    { label: "View item", value: funnel.steps.viewItem },
                    { label: "Add to cart", value: funnel.steps.addToCart },
                    { label: "Begin checkout", value: funnel.steps.beginCheckout },
                    { label: "Purchase", value: funnel.steps.purchase },
                  ]}
                />

                <div className="grid grid-cols-2 gap-3 text-xs text-zinc-600 dark:text-zinc-400">
                  <p>
                    View item: <span className="font-semibold text-zinc-900 dark:text-zinc-50">{fmtPct(funnel.rates.viewItemRate)}</span>
                  </p>
                  <p>
                    Add to cart: <span className="font-semibold text-zinc-900 dark:text-zinc-50">{fmtPct(funnel.rates.addToCartRate)}</span>
                  </p>
                  <p>
                    Begin checkout: <span className="font-semibold text-zinc-900 dark:text-zinc-50">{fmtPct(funnel.rates.beginCheckoutRate)}</span>
                  </p>
                  <p>
                    Purchase: <span className="font-semibold text-zinc-900 dark:text-zinc-50">{fmtPct(funnel.rates.purchaseRate)}</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Device breakdown</p>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Event counts</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => void loadBreakdowns()} disabled={breakdownsLoading}>
              Refresh
            </Button>
          </div>

          <div className="mt-4">
            {breakdownsLoading || !breakdowns ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : breakdowns.device.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">No data.</p>
            ) : (
              <MiniBars rows={breakdowns.device.map((d) => ({ label: d.key, value: d.count }))} />
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Traffic sources</p>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Event counts</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => void loadBreakdowns()} disabled={breakdownsLoading}>
              Refresh
            </Button>
          </div>

          <div className="mt-4">
            {breakdownsLoading || !breakdowns ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : breakdowns.source.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">No data.</p>
            ) : (
              <MiniBars rows={breakdowns.source.map((d) => ({ label: d.key, value: d.count }))} />
            )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Live activity</p>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Latest events (auto refresh)</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void loadRealtime()} disabled={realtimeLoading}>
            Refresh
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Path</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Device</th>
              </tr>
            </thead>
            <tbody>
              {realtimeLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-56" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  </tr>
                ))
              ) : !realtime || realtime.activity.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-600 dark:text-zinc-400">
                    No activity yet.
                  </td>
                </tr>
              ) : (
                realtime.activity.map((a) => (
                  <tr key={a.id} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{fmtDate(a.createdAt)}</td>
                    <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-50">{a.eventType}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400" title={a.url || a.path}>
                      <span className="block max-w-[520px] truncate">{a.path || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{a.sourceType ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{a.deviceType ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
