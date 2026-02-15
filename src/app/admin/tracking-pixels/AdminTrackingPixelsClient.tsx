"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";

type MetaPixelEntry = {
  id: string;
  pixelId: string;
  enabled: boolean;
};

type ApiPayload = {
  tracking: {
    enabled: boolean;
    autoEventsEnabled: boolean;
    manualOverrideMode: boolean;
    testEventMode: boolean;
    ga4: { enabled: boolean; measurementId: string; debug: boolean };
    googleAds: { enabled: boolean; conversionId: string; conversionLabel: string };
    metaPixels: MetaPixelEntry[];
  };
  share: { enabled: boolean };
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readString(v: unknown) {
  return typeof v === "string" ? v : "";
}

function readBool(v: unknown, fallback: boolean) {
  return typeof v === "boolean" ? v : fallback;
}

function normalize(json: unknown): ApiPayload {
  const empty: ApiPayload = {
    tracking: {
      enabled: false,
      autoEventsEnabled: true,
      manualOverrideMode: false,
      testEventMode: false,
      ga4: { enabled: false, measurementId: "", debug: false },
      googleAds: { enabled: false, conversionId: "", conversionLabel: "" },
      metaPixels: [],
    },
    share: { enabled: false },
  };

  if (!isRecord(json)) return empty;

  const t = isRecord(json.tracking) ? json.tracking : {};
  const ga4 = isRecord(t.ga4) ? t.ga4 : {};
  const ads = isRecord(t.googleAds) ? t.googleAds : {};
  const share = isRecord(json.share) ? json.share : {};

  const metaRaw = Array.isArray(t.metaPixels) ? t.metaPixels : [];
  const metaPixels = metaRaw
    .filter((x) => isRecord(x))
    .map((x) => {
      const r = x as Record<string, unknown>;
      const id = readString(r.id).trim();
      const pixelId = readString(r.pixelId).trim();
      const enabled = readBool(r.enabled, true);
      return { id: id || crypto.randomUUID(), pixelId, enabled };
    })
    .filter((x) => x.pixelId);

  return {
    tracking: {
      enabled: readBool(t.enabled, empty.tracking.enabled),
      autoEventsEnabled: readBool(t.autoEventsEnabled, empty.tracking.autoEventsEnabled),
      manualOverrideMode: readBool(t.manualOverrideMode, empty.tracking.manualOverrideMode),
      testEventMode: readBool(t.testEventMode, empty.tracking.testEventMode),
      ga4: {
        enabled: readBool(ga4.enabled, empty.tracking.ga4.enabled),
        measurementId: readString(ga4.measurementId).trim(),
        debug: readBool(ga4.debug, empty.tracking.ga4.debug),
      },
      googleAds: {
        enabled: readBool(ads.enabled, empty.tracking.googleAds.enabled),
        conversionId: readString(ads.conversionId).trim(),
        conversionLabel: readString(ads.conversionLabel).trim(),
      },
      metaPixels,
    },
    share: { enabled: readBool(share.enabled, empty.share.enabled) },
  };
}

export default function AdminTrackingPixelsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [state, setState] = useState<ApiPayload>(() => normalize(null));

  const previewHintUrl = useMemo(() => "/?trackingTest=1", []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const res = await fetch("/api/admin/tracking", { cache: "no-store" }).catch(() => null);
      if (!res || !res.ok) {
        if (!cancelled) {
          setState(normalize(null));
          setLoading(false);
        }
        return;
      }

      const json = (await res.json().catch(() => null)) as unknown;
      if (!cancelled) {
        setState(normalize(json));
        setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  function setTracking<K extends keyof ApiPayload["tracking"]>(key: K, value: ApiPayload["tracking"][K]) {
    setState((prev) => ({ ...prev, tracking: { ...prev.tracking, [key]: value } }));
  }

  function setGa4<K extends keyof ApiPayload["tracking"]["ga4"]>(key: K, value: ApiPayload["tracking"]["ga4"][K]) {
    setState((prev) => ({ ...prev, tracking: { ...prev.tracking, ga4: { ...prev.tracking.ga4, [key]: value } } }));
  }

  function setAds<K extends keyof ApiPayload["tracking"]["googleAds"]>(key: K, value: ApiPayload["tracking"]["googleAds"][K]) {
    setState((prev) => ({
      ...prev,
      tracking: { ...prev.tracking, googleAds: { ...prev.tracking.googleAds, [key]: value } },
    }));
  }

  function setShareEnabled(enabled: boolean) {
    setState((prev) => ({ ...prev, share: { enabled } }));
  }

  function addMetaPixel() {
    setState((prev) => ({
      ...prev,
      tracking: {
        ...prev.tracking,
        metaPixels: [...prev.tracking.metaPixels, { id: crypto.randomUUID(), pixelId: "", enabled: true }],
      },
    }));
  }

  function updateMetaPixel(id: string, patch: Partial<MetaPixelEntry>) {
    setState((prev) => ({
      ...prev,
      tracking: {
        ...prev.tracking,
        metaPixels: prev.tracking.metaPixels.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      },
    }));
  }

  function removeMetaPixel(id: string) {
    setState((prev) => ({
      ...prev,
      tracking: {
        ...prev.tracking,
        metaPixels: prev.tracking.metaPixels.filter((p) => p.id !== id),
      },
    }));
  }

  async function save() {
    setSaving(true);

    try {
      const payload: ApiPayload = {
        tracking: {
          ...state.tracking,
          metaPixels: state.tracking.metaPixels
            .map((p) => ({ ...p, pixelId: p.pixelId.trim() }))
            .filter((p) => p.pixelId),
          ga4: { ...state.tracking.ga4, measurementId: state.tracking.ga4.measurementId.trim() },
          googleAds: {
            ...state.tracking.googleAds,
            conversionId: state.tracking.googleAds.conversionId.trim(),
            conversionLabel: state.tracking.googleAds.conversionLabel.trim(),
          },
        },
        share: { enabled: state.share.enabled },
      };

      const res = await fetch("/api/admin/tracking", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json().catch(() => null)) as unknown;

      if (!res.ok) {
        const msg = isRecord(json) && typeof json.message === "string" ? json.message : "Failed to save";
        toast.error(msg);
        return;
      }

      setState(normalize(json));
      toast.success("Saved");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Tracking & Pixels</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Tracking & Pixels</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Attach/detach/replace without redeploy. Scripts load async (afterInteractive).
        </p>
        <p className="mt-2 text-xs text-zinc-500">Preview hint: {previewHintUrl}</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Global</h2>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                  <input type="checkbox" checked={state.tracking.enabled} onChange={(e) => setTracking("enabled", e.target.checked)} className="h-4 w-4 rounded border-zinc-300" />
                  Enable Tracking
                </label>

                <label className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={state.tracking.autoEventsEnabled}
                    onChange={(e) => setTracking("autoEventsEnabled", e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300"
                  />
                  Fire events automatically
                </label>

                <label className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={state.tracking.manualOverrideMode}
                    onChange={(e) => setTracking("manualOverrideMode", e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300"
                  />
                  Manual override mode
                </label>

                <label className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={state.tracking.testEventMode}
                    onChange={(e) => setTracking("testEventMode", e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300"
                  />
                  Test event mode
                </label>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Google Analytics (GA4)</h2>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                  <input type="checkbox" checked={state.tracking.ga4.enabled} onChange={(e) => setGa4("enabled", e.target.checked)} className="h-4 w-4 rounded border-zinc-300" />
                  Enable GA4
                </label>

                <label className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                  <input type="checkbox" checked={state.tracking.ga4.debug} onChange={(e) => setGa4("debug", e.target.checked)} className="h-4 w-4 rounded border-zinc-300" />
                  Debug mode
                </label>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Measurement ID</label>
                  <Input value={state.tracking.ga4.measurementId} onChange={(e) => setGa4("measurementId", e.target.value)} placeholder="G-XXXXXXXXXX" />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Google Ads</h2>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                  <input type="checkbox" checked={state.tracking.googleAds.enabled} onChange={(e) => setAds("enabled", e.target.checked)} className="h-4 w-4 rounded border-zinc-300" />
                  Enable Google Ads
                </label>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Conversion ID</label>
                  <Input value={state.tracking.googleAds.conversionId} onChange={(e) => setAds("conversionId", e.target.value)} placeholder="123456789" />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Conversion Label</label>
                  <Input value={state.tracking.googleAds.conversionLabel} onChange={(e) => setAds("conversionLabel", e.target.value)} placeholder="AbCdEfGhIj" />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Meta Pixels</h2>
                <Button type="button" variant="secondary" size="sm" onClick={addMetaPixel}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Pixel
                </Button>
              </div>

              {state.tracking.metaPixels.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">No pixels.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {state.tracking.metaPixels.map((p) => (
                    <div key={p.id} className="rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
                      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <div className="flex-1 space-y-2">
                          <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Pixel ID</label>
                          <Input value={p.pixelId} onChange={(e) => updateMetaPixel(p.id, { pixelId: e.target.value })} placeholder="1234567890" />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                            <input type="checkbox" checked={p.enabled} onChange={(e) => updateMetaPixel(p.id, { enabled: e.target.checked })} className="h-4 w-4 rounded border-zinc-300" />
                            Enabled
                          </label>
                          <Button type="button" variant="ghost" size="sm" className="border border-zinc-200 dark:border-zinc-800" onClick={() => removeMetaPixel(p.id)}>
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

          <div className="space-y-4">
            <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Share System (Global)</h2>

              <label className="mt-4 flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                <input type="checkbox" checked={state.share.enabled} onChange={(e) => setShareEnabled(e.target.checked)} className="h-4 w-4 rounded border-zinc-300" />
                Enable Product Share Buttons
              </label>
            </div>

            <Button type="button" disabled={saving} className="w-full" onClick={save}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
