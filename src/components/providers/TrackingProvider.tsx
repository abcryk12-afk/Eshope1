"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { useAppSelector } from "@/store/hooks";

type Props = {
  children: React.ReactNode;
};

type TrackingPublicConfig = {
  tracking: {
    enabled: boolean;
    autoEventsEnabled: boolean;
    manualOverrideMode: boolean;
    testEventMode: boolean;
    updatedAt: number;
    ga4: { enabled: boolean; measurementId: string; debug: boolean };
    googleAds: { enabled: boolean; conversionId: string; conversionLabel: string };
    metaPixels: Array<{ pixelId: string; enabled: boolean }>;
  };
  share: { enabled: boolean; updatedAt: number };
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizePublicConfig(input: unknown): TrackingPublicConfig {
  const empty: TrackingPublicConfig = {
    tracking: {
      enabled: false,
      autoEventsEnabled: true,
      manualOverrideMode: false,
      testEventMode: false,
      updatedAt: 0,
      ga4: { enabled: false, measurementId: "", debug: false },
      googleAds: { enabled: false, conversionId: "", conversionLabel: "" },
      metaPixels: [],
    },
    share: { enabled: false, updatedAt: 0 },
  };

  if (!isRecord(input)) return empty;

  const t = isRecord(input.tracking) ? input.tracking : {};
  const ga4 = isRecord(t.ga4) ? t.ga4 : {};
  const ads = isRecord(t.googleAds) ? t.googleAds : {};
  const share = isRecord(input.share) ? input.share : {};

  const metaRaw = Array.isArray(t.metaPixels) ? t.metaPixels : [];
  const metaPixels = metaRaw
    .filter((x) => isRecord(x))
    .map((x) => {
      const r = x as Record<string, unknown>;
      const pixelId = typeof r.pixelId === "string" ? r.pixelId.trim() : "";
      const enabled = typeof r.enabled === "boolean" ? r.enabled : true;
      return { pixelId, enabled };
    })
    .filter((x) => x.pixelId);

  return {
    tracking: {
      enabled: typeof t.enabled === "boolean" ? t.enabled : empty.tracking.enabled,
      autoEventsEnabled: typeof t.autoEventsEnabled === "boolean" ? t.autoEventsEnabled : empty.tracking.autoEventsEnabled,
      manualOverrideMode: typeof t.manualOverrideMode === "boolean" ? t.manualOverrideMode : empty.tracking.manualOverrideMode,
      testEventMode: typeof t.testEventMode === "boolean" ? t.testEventMode : empty.tracking.testEventMode,
      updatedAt: typeof t.updatedAt === "number" ? t.updatedAt : empty.tracking.updatedAt,
      ga4: {
        enabled: typeof ga4.enabled === "boolean" ? ga4.enabled : empty.tracking.ga4.enabled,
        measurementId: typeof ga4.measurementId === "string" ? ga4.measurementId.trim() : empty.tracking.ga4.measurementId,
        debug: typeof ga4.debug === "boolean" ? ga4.debug : empty.tracking.ga4.debug,
      },
      googleAds: {
        enabled: typeof ads.enabled === "boolean" ? ads.enabled : empty.tracking.googleAds.enabled,
        conversionId: typeof ads.conversionId === "string" ? ads.conversionId.trim() : empty.tracking.googleAds.conversionId,
        conversionLabel: typeof ads.conversionLabel === "string" ? ads.conversionLabel.trim() : empty.tracking.googleAds.conversionLabel,
      },
      metaPixels,
    },
    share: {
      enabled: typeof share.enabled === "boolean" ? share.enabled : empty.share.enabled,
      updatedAt: typeof share.updatedAt === "number" ? share.updatedAt : empty.share.updatedAt,
    },
  };
}

function safeTextId(v: string) {
  return String(v || "").trim().replace(/[^A-Za-z0-9_-]/g, "");
}

function fireMeta(event: string, params?: Record<string, unknown>) {
  const w = window as unknown as { fbq?: (...args: unknown[]) => void };
  if (typeof w.fbq !== "function") return;
  try {
    w.fbq("track", event, params ?? {});
  } catch {
    return;
  }
}

function fireGtag(event: string, params?: Record<string, unknown>) {
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag !== "function") return;
  try {
    w.gtag("event", event, params ?? {});
  } catch {
    return;
  }
}

function fireGtagConversion(sendTo: string, params?: Record<string, unknown>) {
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag !== "function") return;
  try {
    w.gtag("event", "conversion", { ...(params ?? {}), send_to: sendTo });
  } catch {
    return;
  }
}

export default function TrackingProvider({ children }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const cart = useAppSelector((s) => s.cart);

  const lastPathRef = useRef<string>("");
  const [config, setConfig] = useState<TrackingPublicConfig | null>(null);

  const [queryUpdatedAt, queryTestMode] = useMemo(() => {
    const u = searchParams?.get("trackingUpdatedAt") ?? "";
    const t = searchParams?.get("trackingTest") ?? "";
    const updatedAt = Number(u);
    return [Number.isFinite(updatedAt) ? updatedAt : 0, t === "1"] as const;
  }, [searchParams]);

  const configUrl = useMemo(() => {
    const qs = new URLSearchParams();
    if (queryUpdatedAt > 0) qs.set("_", String(queryUpdatedAt));
    return `/api/tracking${qs.toString() ? `?${qs.toString()}` : ""}`;
  }, [queryUpdatedAt]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetch(configUrl, { cache: "no-store" }).catch(() => null);
      if (!res || !res.ok) return;
      const json = (await res.json().catch(() => null)) as unknown;
      const normalized = normalizePublicConfig(json);
      if (!cancelled) setConfig(normalized);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [configUrl]);

  const trackingEnabled = Boolean(config?.tracking.enabled);
  const autoEventsEnabled = Boolean(config?.tracking.autoEventsEnabled);

  const ga4Enabled = Boolean(config?.tracking.ga4.enabled && config?.tracking.ga4.measurementId);
  const ga4Id = config?.tracking.ga4.measurementId ?? "";

  const adsEnabled = Boolean(config?.tracking.googleAds.enabled && config?.tracking.googleAds.conversionId);
  const adsId = config?.tracking.googleAds.conversionId ?? "";

  const metaPixelIds = (config?.tracking.metaPixels ?? []).filter((p) => p.enabled).map((p) => p.pixelId);

  const allowInit = trackingEnabled && !Boolean(config?.tracking.manualOverrideMode);
  const testMode = Boolean(queryTestMode || config?.tracking.testEventMode);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const w = window as unknown as {
      __tracking?: {
        enabled: boolean;
        autoEventsEnabled: boolean;
        shareEnabled: boolean;
        trackMeta: (event: string, params?: Record<string, unknown>) => void;
        trackGtag: (event: string, params?: Record<string, unknown>) => void;
        trackAdsConversion: (params?: Record<string, unknown>) => void;
      };
    };

    const conversionId = config?.tracking.googleAds.conversionId ?? "";
    const conversionLabel = config?.tracking.googleAds.conversionLabel ?? "";
    const sendTo = conversionId && conversionLabel ? `AW-${safeTextId(conversionId)}/${safeTextId(conversionLabel)}` : "";

    w.__tracking = {
      enabled: trackingEnabled,
      autoEventsEnabled,
      shareEnabled: Boolean(config?.share.enabled),
      trackMeta: (event, params) => {
        if (!allowInit) return;
        fireMeta(event, params);
      },
      trackGtag: (event, params) => {
        if (!allowInit) return;
        fireGtag(event, params);
      },
      trackAdsConversion: (params) => {
        if (!allowInit) return;
        if (!sendTo) return;
        fireGtagConversion(sendTo, params);
      },
    };

    return () => {
      const ww = window as unknown as { __tracking?: unknown };
      delete ww.__tracking;
    };
  }, [allowInit, autoEventsEnabled, config?.share.enabled, config?.tracking.googleAds.conversionId, config?.tracking.googleAds.conversionLabel, trackingEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!allowInit) return;
    if (!autoEventsEnabled) return;

    const nextPath = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;
    if (lastPathRef.current === nextPath) return;
    lastPathRef.current = nextPath;

    fireMeta("PageView");
    fireGtag("page_view", { page_path: pathname });
  }, [allowInit, autoEventsEnabled, pathname, searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!allowInit) return;
    if (!autoEventsEnabled) return;

    if (!cart?.lastAdded || !cart?.lastAddedAt) return;

    const it = cart.lastAdded;

    const payload = {
      content_ids: [it.productId],
      content_type: "product",
      content_name: it.title,
      currency: undefined,
      value: it.unitPrice,
      contents: [{ id: it.productId, quantity: it.quantity, item_price: it.unitPrice }],
    };

    fireMeta("AddToCart", payload);
    fireGtag("add_to_cart", {
      items: [{ item_id: it.productId, item_name: it.title, quantity: it.quantity, price: it.unitPrice }],
    });
  }, [allowInit, autoEventsEnabled, cart?.lastAddedAt, cart?.lastAdded]);

  const gaSrc = ga4Enabled ? `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}` : "";

  const metaEnabled = Boolean(metaPixelIds.length);

  const metaInitCode = useMemo(() => {
    if (!metaEnabled) return "";

    const ids = metaPixelIds.map((x) => `'${safeTextId(x)}'`).join(",");

    return `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod? n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');var __ids=[${ids}];for(var i=0;i<__ids.length;i++){try{fbq('init', __ids[i]);}catch(e){}}try{fbq('track','PageView');}catch(e){};`;
  }, [metaEnabled, metaPixelIds]);

  const gtagInitCode = useMemo(() => {
    if (!ga4Enabled) return "";
    const debugFlag = config?.tracking.ga4.debug ? "true" : "false";
    return `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config','${safeTextId(ga4Id)}',{debug_mode:${debugFlag}});`;
  }, [ga4Enabled, ga4Id, config?.tracking.ga4.debug]);

  const adsInitCode = useMemo(() => {
    if (!adsEnabled) return "";
    return `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('config','AW-${safeTextId(adsId)}');`;
  }, [adsEnabled, adsId]);

  return (
    <>
      {trackingEnabled && ga4Enabled ? <Script id="ga4-src" src={gaSrc} strategy="afterInteractive" /> : null}
      {trackingEnabled && ga4Enabled && gtagInitCode ? (
        <Script id="ga4-init" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: gtagInitCode }} />
      ) : null}
      {trackingEnabled && adsEnabled && adsInitCode ? (
        <Script id="google-ads-init" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: adsInitCode }} />
      ) : null}
      {trackingEnabled && metaEnabled && metaInitCode ? (
        <Script id="meta-pixel" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: metaInitCode }} />
      ) : null}

      {children}

      {trackingEnabled && testMode ? (
        <div
          className="fixed bottom-3 right-3 z-1000 rounded-2xl border border-border bg-background/95 px-3 py-2 text-xs text-foreground shadow-lg backdrop-blur"
          data-tracking-indicator="1"
        >
          Tracking Test Mode
        </div>
      ) : null}
    </>
  );
}
