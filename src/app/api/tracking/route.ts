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

  const doc = (await SiteSetting.findOne({ key: "global" }).select("tracking share").lean()) as unknown;
  const root = isRecord(doc) ? doc : null;
  const tracking = root && isRecord(root.tracking) ? root.tracking : {};
  const ga4 = isRecord(tracking.ga4) ? tracking.ga4 : {};
  const googleAds = isRecord(tracking.googleAds) ? tracking.googleAds : {};
  const share = root && isRecord(root.share) ? root.share : {};

  return NextResponse.json(
    {
      tracking: {
        enabled: typeof tracking.enabled === "boolean" ? tracking.enabled : false,
        autoEventsEnabled: typeof tracking.autoEventsEnabled === "boolean" ? tracking.autoEventsEnabled : true,
        manualOverrideMode: typeof tracking.manualOverrideMode === "boolean" ? tracking.manualOverrideMode : false,
        testEventMode: typeof tracking.testEventMode === "boolean" ? tracking.testEventMode : false,
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
        updatedAt: typeof tracking.updatedAt === "number" ? tracking.updatedAt : 0,
      },
      share: {
        enabled: typeof share.enabled === "boolean" ? share.enabled : false,
        updatedAt: typeof share.updatedAt === "number" ? share.updatedAt : 0,
      },
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
