import { NextResponse } from "next/server";

import { dbConnect } from "@/lib/db";
import SiteSetting from "@/models/SiteSetting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizeMetaPixels(input: unknown) {
  const arr = Array.isArray(input) ? input : [];

  return arr
    .filter((x) => isRecord(x))
    .map((x) => {
      const r = x as Record<string, unknown>;
      const pixelId = typeof r.pixelId === "string" ? r.pixelId.trim() : "";
      const enabled = typeof r.enabled === "boolean" ? r.enabled : true;
      return { pixelId, enabled };
    })
    .filter((x) => x.pixelId);
}

export async function GET() {
  await dbConnect();

  const doc = (await SiteSetting.findOne({ key: "global" }).select("tracking share performance").lean()) as unknown;
  const root = isRecord(doc) ? doc : null;
  const tracking = root && isRecord(root.tracking) ? root.tracking : {};
  const gtm = isRecord((tracking as Record<string, unknown>).gtm) ? ((tracking as Record<string, unknown>).gtm as Record<string, unknown>) : {};
  const ga4 = isRecord(tracking.ga4) ? tracking.ga4 : {};
  const googleAds = isRecord(tracking.googleAds) ? tracking.googleAds : {};
  const metaCapi = isRecord((tracking as Record<string, unknown>).metaCapi) ? ((tracking as Record<string, unknown>).metaCapi as Record<string, unknown>) : {};
  const share = root && isRecord(root.share) ? root.share : {};
  const perf = root && isRecord((root as Record<string, unknown>).performance) ? ((root as Record<string, unknown>).performance as Record<string, unknown>) : {};

  return NextResponse.json(
    {
      tracking: {
        enabled: typeof tracking.enabled === "boolean" ? tracking.enabled : false,
        autoEventsEnabled: typeof tracking.autoEventsEnabled === "boolean" ? tracking.autoEventsEnabled : true,
        manualOverrideMode: typeof tracking.manualOverrideMode === "boolean" ? tracking.manualOverrideMode : false,
        testEventMode: typeof tracking.testEventMode === "boolean" ? tracking.testEventMode : false,
        gtm: {
          enabled: typeof gtm.enabled === "boolean" ? gtm.enabled : false,
          containerId: typeof gtm.containerId === "string" ? gtm.containerId.trim() : "",
        },
        ga4: {
          enabled: typeof ga4.enabled === "boolean" ? ga4.enabled : false,
          measurementId: typeof ga4.measurementId === "string" ? ga4.measurementId.trim() : "",
          debug: typeof ga4.debug === "boolean" ? ga4.debug : false,
        },
        googleAds: {
          enabled: typeof googleAds.enabled === "boolean" ? googleAds.enabled : false,
          conversionId: typeof googleAds.conversionId === "string" ? googleAds.conversionId.trim() : "",
          conversionLabel: typeof googleAds.conversionLabel === "string" ? googleAds.conversionLabel.trim() : "",
        },
        metaPixels: normalizeMetaPixels(tracking.metaPixels),
        metaCapi: {
          enabled: typeof metaCapi.enabled === "boolean" ? metaCapi.enabled : false,
          apiVersion: typeof metaCapi.apiVersion === "string" ? metaCapi.apiVersion.trim() : "v18.0",
        },
        updatedAt: typeof tracking.updatedAt === "number" ? tracking.updatedAt : 0,
      },
      performance: {
        deferTrackingScripts: typeof perf.deferTrackingScripts === "boolean" ? perf.deferTrackingScripts : false,
      },
      share: {
        enabled: typeof share.enabled === "boolean" ? share.enabled : false,
        updatedAt: typeof share.updatedAt === "number" ? share.updatedAt : 0,
      },
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
