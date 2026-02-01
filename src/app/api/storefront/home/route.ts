import { NextResponse } from "next/server";

import { dbConnect } from "@/lib/db";
import SiteSetting from "@/models/SiteSetting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export async function GET() {
  await dbConnect();

  const doc = (await SiteSetting.findOne({ key: "global" }).select("homeBanners").lean()) as unknown;
  const root = isRecord(doc) ? doc : {};

  const raw = Array.isArray(root.homeBanners) ? root.homeBanners : [];
  const homeBanners = raw
    .filter((b) => isRecord(b))
    .map((b) => {
      const r = b as Record<string, unknown>;
      return {
        id: String(r._id ?? ""),
        title: typeof r.title === "string" ? r.title : "",
        subtitle: typeof r.subtitle === "string" ? r.subtitle : "",
        image: typeof r.image === "string" ? r.image : "",
        href: typeof r.href === "string" ? r.href : "",
        isActive: typeof r.isActive === "boolean" ? r.isActive : true,
      };
    })
    .filter((b) => b.isActive);

  return NextResponse.json({ homeBanners }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
