"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

type Severity = "error" | "warn";

type SeoIssue = {
  code: string;
  severity: Severity;
  message: string;
};

type AuditItem = {
  id: string;
  title: string;
  slug: string;
  category: string;
  isActive: boolean;
  issues: SeoIssue[];
};

type ApiResponse = {
  generatedAt: number;
  totals: {
    products: number;
    flagged: number;
    errors: number;
    warnings: number;
  };
  items: AuditItem[];
};

type SeverityFilter = "all" | "errors" | "warnings";

async function fetchSeoHealth() {
  const res = await fetch("/api/admin/seo-health", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed");
  return (await res.json()) as ApiResponse;
}

function severityPill(severity: Severity) {
  return severity === "error"
    ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200"
    : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200";
}

export default function SeoHealthClient() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [q, setQ] = useState("");
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [onlyFlagged, setOnlyFlagged] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const next = await fetchSeoHealth();
        if (!cancelled) setData(next);
      } catch {
        if (!cancelled) toast.error("Failed to load SEO health report");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function onRefresh() {
    setLoading(true);
    try {
      const next = await fetchSeoHealth();
      setData(next);
    } catch {
      toast.error("Failed to refresh");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const items = data?.items ?? [];
    const query = q.trim().toLowerCase();

    return items.filter((item) => {
      if (onlyFlagged && item.issues.length === 0) return false;

      const hasError = item.issues.some((x) => x.severity === "error");
      const hasWarn = item.issues.some((x) => x.severity === "warn");

      if (severity === "errors" && !hasError) return false;
      if (severity === "warnings" && !hasWarn) return false;

      if (!query) return true;

      return (
        item.title.toLowerCase().includes(query) ||
        item.slug.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    });
  }, [data?.items, onlyFlagged, q, severity]);

  const totals = data?.totals;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">SEO Health</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Read-only audit of product SEO fields (titles/descriptions/OG/canonical/noindex/images).
          </p>
        </div>

        <Button type="button" variant="secondary" onClick={onRefresh} disabled={loading} className="gap-2">
          <RefreshCw className={cn("h-4 w-4", loading ? "animate-spin" : "")} />
          Refresh
        </Button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {loading || !totals ? (
          <>
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Products</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{totals.products}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Flagged</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{totals.flagged}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Errors</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{totals.errors}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Warnings</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{totals.warnings}</p>
            </div>
          </>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_220px]">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product/title/slug/category" />

        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as SeverityFilter)}
          className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground"
        >
          <option value="all">All severities</option>
          <option value="errors">Errors only</option>
          <option value="warnings">Warnings only</option>
        </select>

        <label className="flex h-11 items-center justify-between rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
          <span>Only flagged</span>
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={onlyFlagged}
            onChange={(e) => setOnlyFlagged(e.target.checked)}
          />
        </label>
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          <>
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
            No results.
          </div>
        ) : (
          filtered.map((item) => {
            const errors = item.issues.filter((x) => x.severity === "error");
            const warns = item.issues.filter((x) => x.severity === "warn");

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/products/${encodeURIComponent(item.id)}`}
                      className="block truncate text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
                    >
                      {item.title || "(Untitled)"}
                    </Link>
                    <p className="mt-1 truncate text-xs text-zinc-500">/{item.slug}</p>
                    <p className="mt-1 truncate text-xs text-zinc-500">{item.category}</p>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-1 font-semibold",
                        item.isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200"
                          : "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200"
                      )}
                    >
                      {item.isActive ? "Active" : "Inactive"}
                    </span>

                    {errors.length > 0 ? (
                      <span className={cn("inline-flex items-center rounded-full border px-2 py-1 font-semibold", severityPill("error"))}>
                        {errors.length} error
                      </span>
                    ) : null}

                    {warns.length > 0 ? (
                      <span className={cn("inline-flex items-center rounded-full border px-2 py-1 font-semibold", severityPill("warn"))}>
                        {warns.length} warn
                      </span>
                    ) : null}
                  </div>
                </div>

                {item.issues.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {item.issues.map((issue, idx) => (
                      <div
                        key={`${issue.code}:${idx}`}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-sm",
                          severityPill(issue.severity)
                        )}
                      >
                        {issue.message}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
