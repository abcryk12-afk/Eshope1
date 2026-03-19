import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

import { dbConnect } from "@/lib/db";
import VisitorEvent from "@/models/VisitorEvent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EventTypeSchema = z.enum(["page_view", "view_item", "add_to_cart", "begin_checkout", "purchase"]);

const BodySchema = z.object({
  eventType: EventTypeSchema,
  url: z.string().trim().max(1000).optional().default(""),
  path: z.string().trim().max(500).optional().default(""),
  sid: z.string().trim().max(80).optional().default(""),
  referrer: z.string().trim().max(1000).optional().default(""),
  utm: z
    .object({
      source: z.string().trim().max(80).optional(),
      medium: z.string().trim().max(80).optional(),
      campaign: z.string().trim().max(120).optional(),
      term: z.string().trim().max(120).optional(),
      content: z.string().trim().max(120).optional(),
    })
    .optional(),
  productId: z.string().trim().max(80).optional(),
  orderId: z.string().trim().max(80).optional(),
  value: z.number().finite().optional(),
  currency: z.string().trim().max(10).optional(),
});

function readIp(req: NextRequest) {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim();
  return ip || undefined;
}

function safePath(input: string) {
  const v = String(input || "").trim();
  if (!v) return "";
  if (v.startsWith("/")) return v.slice(0, 500);
  return "";
}

function safeUrl(input: string) {
  const v = String(input || "").trim();
  if (!v) return "";
  try {
    const u = new URL(v);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString().slice(0, 1000);
  } catch {
    return "";
  }
  return "";
}

function safeSid(input: string) {
  const v = String(input || "").trim().slice(0, 80);
  if (!v) return "";
  return /^[A-Za-z0-9_-]+$/.test(v) ? v : "";
}

function getOrCreateSessionId(req: NextRequest) {
  const fromCookie = req.cookies.get("visitor.sid")?.value ?? "";
  const cleaned = fromCookie.trim().slice(0, 80);
  if (cleaned) return { id: cleaned, setCookie: false as const };

  let id = "";
  try {
    id = crypto.randomUUID();
  } catch {
    id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  return { id: id.slice(0, 80), setCookie: true as const };
}

function normalizeReferrer(input: string) {
  const v = String(input || "").trim();
  if (!v) return "";
  try {
    const u = new URL(v);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return u.toString().slice(0, 1000);
  } catch {
    return "";
  }
}

function deviceTypeFromUa(ua: string) {
  const v = String(ua || "").toLowerCase();
  if (!v) return undefined;
  if (/ipad|tablet/.test(v)) return "tablet";
  if (/mobi|iphone|android/.test(v)) return "mobile";
  return "desktop";
}

function sourceTypeFrom(utmSource?: string, referrer?: string) {
  const u = String(utmSource || "").toLowerCase();
  if (u) {
    if (/(facebook|instagram|tiktok|snapchat|twitter|x|linkedin|pinterest)/.test(u)) return "social";
    if (/(google|bing|yahoo|duckduckgo)/.test(u)) return "search";
    if (/(mail|email|newsletter)/.test(u)) return "email";
    if (/(ads|ad|cpc|ppc)/.test(u)) return "ads";
    return "campaign";
  }

  const r = String(referrer || "").trim();
  if (!r) return "direct";

  try {
    const ru = new URL(r);
    const host = (ru.hostname || "").toLowerCase();
    if (!host) return "referral";

    if (/(facebook|instagram|tiktok|snapchat|twitter|x\.com|linkedin|pinterest)/.test(host)) return "social";
    if (/(google|bing|yahoo|duckduckgo)/.test(host)) return "search";
    return "referral";
  } catch {
    return "referral";
  }
}

export async function POST(req: NextRequest) {
  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = BodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Invalid payload" }, { status: 400 });
  }

  const sidFromBody = safeSid(parsed.data.sid);
  const sid = sidFromBody ? { id: sidFromBody, setCookie: true as const } : getOrCreateSessionId(req);

  const userAgent = (req.headers.get("user-agent") ?? "").slice(0, 500);
  const ip = readIp(req);

  const url = safeUrl(parsed.data.url);
  const path = safePath(parsed.data.path);

  const referrer = normalizeReferrer(parsed.data.referrer);

  const utm = parsed.data.utm
    ? {
        source: parsed.data.utm.source?.slice(0, 80),
        medium: parsed.data.utm.medium?.slice(0, 80),
        campaign: parsed.data.utm.campaign?.slice(0, 120),
        term: parsed.data.utm.term?.slice(0, 120),
        content: parsed.data.utm.content?.slice(0, 120),
      }
    : undefined;

  const deviceType = deviceTypeFromUa(userAgent);
  const sourceType = sourceTypeFrom(utm?.source, referrer);

  let userId: string | null = null;
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const tid = token?.id ? String(token.id) : "";
    userId = tid || null;
  } catch {
    userId = null;
  }

  await dbConnect();

  await VisitorEvent.create({
    sessionId: sid.id,
    userId: userId || undefined,
    ip,
    userAgent,
    url,
    path,
    eventType: parsed.data.eventType,
    referrer: referrer || undefined,
    utm,
    deviceType,
    sourceType,
    productId: parsed.data.productId ? String(parsed.data.productId).slice(0, 80) : undefined,
    orderId: parsed.data.orderId ? String(parsed.data.orderId).slice(0, 80) : undefined,
    value: typeof parsed.data.value === "number" ? parsed.data.value : undefined,
    currency: parsed.data.currency ? String(parsed.data.currency).slice(0, 10) : undefined,
  }).catch(() => null);

  const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store, max-age=0" } });

  if (sid.setCookie) {
    res.cookies.set({
      name: "visitor.sid",
      value: sid.id,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return res;
}
