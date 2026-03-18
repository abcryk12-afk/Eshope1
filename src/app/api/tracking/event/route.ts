import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { dbConnect } from "@/lib/db";
import SiteSetting from "@/models/SiteSetting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  eventName: z.string().trim().min(1).max(60),
  eventId: z.string().trim().min(1).max(80),
  eventTime: z.number().int().min(1).optional(),
  eventSourceUrl: z.string().trim().max(1000).optional().default(""),
  customData: z.record(z.string(), z.unknown()).optional().default({}),
});

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readIp(req: NextRequest) {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim();
  return ip || undefined;
}

export async function POST(req: NextRequest) {
  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = BodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Invalid payload" }, { status: 400 });
  }

  await dbConnect();

  const doc = (await SiteSetting.findOne({ key: "global" }).select("tracking").lean()) as unknown;
  const root = isRecord(doc) ? doc : null;
  const tracking = root && isRecord(root.tracking) ? root.tracking : {};

  const metaCapi = isRecord((tracking as Record<string, unknown>).metaCapi)
    ? ((tracking as Record<string, unknown>).metaCapi as Record<string, unknown>)
    : {};

  const metaPixelsRaw = Array.isArray((tracking as Record<string, unknown>).metaPixels)
    ? ((tracking as Record<string, unknown>).metaPixels as unknown[])
    : [];

  const pixelIds = metaPixelsRaw
    .filter((x) => isRecord(x))
    .map((x) => {
      const r = x as Record<string, unknown>;
      const pixelId = typeof r.pixelId === "string" ? r.pixelId.trim() : "";
      const enabled = typeof r.enabled === "boolean" ? r.enabled : true;
      return enabled && pixelId ? pixelId : "";
    })
    .filter(Boolean);

  const capiEnabled = typeof metaCapi.enabled === "boolean" ? metaCapi.enabled : false;
  const accessToken = typeof metaCapi.accessToken === "string" ? metaCapi.accessToken : "";
  const apiVersion = typeof metaCapi.apiVersion === "string" ? metaCapi.apiVersion.trim() : "v18.0";

  if (!capiEnabled || !accessToken || pixelIds.length === 0) {
    return NextResponse.json({ ok: true, skipped: true }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const eventTime = parsed.data.eventTime && Number.isFinite(parsed.data.eventTime) ? parsed.data.eventTime : nowSec;

  const userAgent = req.headers.get("user-agent") ?? "";
  const clientIp = readIp(req);

  const fbp = req.cookies.get("_fbp")?.value;
  const fbc = req.cookies.get("_fbc")?.value;

  const baseUserData: Record<string, unknown> = {
    client_user_agent: userAgent || undefined,
    client_ip_address: clientIp,
    fbp: fbp || undefined,
    fbc: fbc || undefined,
  };

  const eventSourceUrl = parsed.data.eventSourceUrl || req.headers.get("referer") || "";

  const data = pixelIds.map((pixelId) => ({
    pixelId,
    payload: {
      data: [
        {
          event_name: parsed.data.eventName,
          event_time: eventTime,
          event_id: parsed.data.eventId,
          action_source: "website",
          event_source_url: eventSourceUrl || undefined,
          user_data: baseUserData,
          custom_data: parsed.data.customData,
        },
      ],
    },
  }));

  const results = await Promise.all(
    data.map(async ({ pixelId, payload }) => {
      const url = `https://graph.facebook.com/${encodeURIComponent(apiVersion)}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(
        accessToken
      )}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => null);

      const ok = Boolean(res && res.ok);
      return { pixelId, ok };
    })
  );

  return NextResponse.json({ ok: true, results }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
