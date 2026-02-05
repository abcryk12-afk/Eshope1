import { NextResponse } from "next/server";

import { dbConnect } from "@/lib/db";
import { normalizeStorefrontSettings } from "@/lib/shipping";
import SiteSetting from "@/models/SiteSetting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await dbConnect();

  const doc = (await SiteSetting.findOne({ key: "global" })
    .select("inventory shipping storefrontLayout cartUx branding brandingUpdatedAt")
    .lean()) as unknown;
  const settings = normalizeStorefrontSettings(doc);

  return NextResponse.json({ settings }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
