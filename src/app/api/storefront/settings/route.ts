import { NextResponse } from "next/server";

import { dbConnect } from "@/lib/db";
import { normalizeStorefrontSettings } from "@/lib/shipping";
import SiteSetting from "@/models/SiteSetting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await dbConnect();

  const doc = (await SiteSetting.findOne({ key: "global" })
    .select(
      "inventory shipping storefrontLayout storefrontUx cartUx announcementBar announcements branding brandingUpdatedAt whatsAppSalesPhone whatsAppProductTemplate performance"
    )
    .lean()) as unknown;
  const settings = normalizeStorefrontSettings(doc);

  const root = doc && typeof doc === "object" ? (doc as Record<string, unknown>) : {};
  const perf = root && typeof root.performance === "object" && root.performance
    ? (root.performance as Record<string, unknown>)
    : {};

  const cacheEnabled = typeof perf.apiCacheEnabled === "boolean" ? perf.apiCacheEnabled : false;
  const sMaxAge = typeof perf.apiCacheSMaxAgeSeconds === "number" && Number.isFinite(perf.apiCacheSMaxAgeSeconds)
    ? Math.max(0, Math.min(3600, Math.trunc(perf.apiCacheSMaxAgeSeconds)))
    : 60;
  const swr =
    typeof perf.apiCacheStaleWhileRevalidateSeconds === "number" && Number.isFinite(perf.apiCacheStaleWhileRevalidateSeconds)
      ? Math.max(0, Math.min(86400, Math.trunc(perf.apiCacheStaleWhileRevalidateSeconds)))
      : 300;

  const cacheControl = cacheEnabled
    ? `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`
    : "no-store, max-age=0";

  return NextResponse.json({ settings }, { headers: { "Cache-Control": cacheControl } });
}
