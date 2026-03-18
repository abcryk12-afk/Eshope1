import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

import { dbConnect } from "@/lib/db";
import VisitorEvent from "@/models/VisitorEvent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  url: z.string().trim().max(1000).optional().default(""),
  path: z.string().trim().max(500).optional().default(""),
  sid: z.string().trim().max(80).optional().default(""),
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

function safeSid(input: string) {
  const v = String(input || "").trim().slice(0, 80);
  if (!v) return "";
  return /^[A-Za-z0-9_-]+$/.test(v) ? v : "";
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
