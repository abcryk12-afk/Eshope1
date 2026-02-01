"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

type PaymentAccount = {
  label?: string;
  bankName?: string;
  accountTitle?: string;
  accountNumber?: string;
  iban?: string;
};

type PaymentsSettings = {
  codEnabled: boolean;
  manual: {
    enabled: boolean;
    instructions: string;
    accounts: PaymentAccount[];
  };
  online: {
    enabled: boolean;
    provider: string;
    instructions: string;
  };
};

type ApiResponse = { payments: PaymentsSettings };

function emptySettings(): PaymentsSettings {
  return {
    codEnabled: true,
    manual: { enabled: true, instructions: "", accounts: [] },
    online: { enabled: false, provider: "", instructions: "" },
  };
}

export default function AdminPaymentsSettingsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PaymentsSettings | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    const res = await fetch("/api/admin/payments", { cache: "no-store" });

    if (!res.ok) {
      toast.error("Failed to load payment settings");
      setSettings(null);
      setLoading(false);
      return;
    }

    const json = (await res.json()) as ApiResponse;
    setSettings(json.payments ?? emptySettings());
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function save() {
    if (!settings) return;

    setSaving(true);

    const res = await fetch("/api/admin/payments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });

    if (!res.ok) {
      toast.error("Failed to save");
      setSaving(false);
      return;
    }

    const json = (await res.json()) as ApiResponse;
    setSettings(json.payments ?? settings);
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
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Payments</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Not available.</p>
          </div>
          <Link href="/admin">
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
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Payments</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Configure payment methods and instructions shown during checkout.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin">
            <Button variant="secondary">Back</Button>
          </Link>
          <Button variant="secondary" onClick={() => void load()} disabled={saving}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Cash on delivery</h2>
          <label className="mt-3 flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={settings.codEnabled}
              onChange={(e) => setSettings((s) => (s ? { ...s, codEnabled: e.target.checked } : s))}
              className="h-4 w-4 rounded border-zinc-300"
            />
            Enabled
          </label>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Manual / Bank transfer</h2>
            <label className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={settings.manual.enabled}
                onChange={(e) =>
                  setSettings((s) => (s ? { ...s, manual: { ...s.manual, enabled: e.target.checked } } : s))
                }
                className="h-4 w-4 rounded border-zinc-300"
              />
              Enabled
            </label>
          </div>

          <div className="mt-3 space-y-2">
            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Instructions</label>
            <textarea
              value={settings.manual.instructions}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, manual: { ...s.manual, instructions: e.target.value } } : s))
              }
              rows={5}
              className={cn(
                "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground",
                "placeholder:text-muted-foreground",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
              placeholder="Write bank transfer instructions for customers..."
            />
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Bank accounts</label>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          manual: {
                            ...s.manual,
                            accounts: [...s.manual.accounts, { label: "", bankName: "", accountTitle: "" }],
                          },
                        }
                      : s
                  )
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>

            {settings.manual.accounts.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">No bank accounts added.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {settings.manual.accounts.map((acc, idx) => (
                  <div key={idx} className="rounded-3xl border border-zinc-200 p-4 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Account {idx + 1}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="border border-zinc-200 dark:border-zinc-800"
                        onClick={() =>
                          setSettings((s) =>
                            s
                              ? {
                                  ...s,
                                  manual: { ...s.manual, accounts: s.manual.accounts.filter((_, i) => i !== idx) },
                                }
                              : s
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Input
                        value={acc.label ?? ""}
                        onChange={(e) =>
                          setSettings((s) => {
                            if (!s) return s;
                            const next = [...s.manual.accounts];
                            next[idx] = { ...next[idx], label: e.target.value };
                            return { ...s, manual: { ...s.manual, accounts: next } };
                          })
                        }
                        placeholder="Label (e.g. HBL / Easypaisa)"
                      />
                      <Input
                        value={acc.bankName ?? ""}
                        onChange={(e) =>
                          setSettings((s) => {
                            if (!s) return s;
                            const next = [...s.manual.accounts];
                            next[idx] = { ...next[idx], bankName: e.target.value };
                            return { ...s, manual: { ...s.manual, accounts: next } };
                          })
                        }
                        placeholder="Bank name"
                      />
                      <Input
                        value={acc.accountTitle ?? ""}
                        onChange={(e) =>
                          setSettings((s) => {
                            if (!s) return s;
                            const next = [...s.manual.accounts];
                            next[idx] = { ...next[idx], accountTitle: e.target.value };
                            return { ...s, manual: { ...s.manual, accounts: next } };
                          })
                        }
                        placeholder="Account title"
                      />
                      <Input
                        value={acc.accountNumber ?? ""}
                        onChange={(e) =>
                          setSettings((s) => {
                            if (!s) return s;
                            const next = [...s.manual.accounts];
                            next[idx] = { ...next[idx], accountNumber: e.target.value };
                            return { ...s, manual: { ...s.manual, accounts: next } };
                          })
                        }
                        placeholder="Account number"
                      />
                      <Input
                        value={acc.iban ?? ""}
                        onChange={(e) =>
                          setSettings((s) => {
                            if (!s) return s;
                            const next = [...s.manual.accounts];
                            next[idx] = { ...next[idx], iban: e.target.value };
                            return { ...s, manual: { ...s.manual, accounts: next } };
                          })
                        }
                        placeholder="IBAN (optional)"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Online payment</h2>
            <label className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={settings.online.enabled}
                onChange={(e) =>
                  setSettings((s) => (s ? { ...s, online: { ...s.online, enabled: e.target.checked } } : s))
                }
                className="h-4 w-4 rounded border-zinc-300"
              />
              Enabled
            </label>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Provider</label>
              <Input
                value={settings.online.provider}
                onChange={(e) =>
                  setSettings((s) => (s ? { ...s, online: { ...s.online, provider: e.target.value } } : s))
                }
                placeholder="e.g. Stripe, JazzCash, Easypaisa"
              />
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Instructions</label>
            <textarea
              value={settings.online.instructions}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, online: { ...s.online, instructions: e.target.value } } : s))
              }
              rows={4}
              className={cn(
                "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground",
                "placeholder:text-muted-foreground",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
              placeholder="Explain how online payment works (or what is required to enable it)..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
