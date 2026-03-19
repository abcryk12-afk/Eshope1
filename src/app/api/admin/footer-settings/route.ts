import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import SiteSetting from "@/models/SiteSetting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { ok: false as const, res: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }

  if (!ADMIN_ROLE_SET.has(session.user.role)) {
    return { ok: false as const, res: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true as const };
}

const FooterEcomLinkSchema = z.object({
  id: z.string().trim().min(1).max(80).optional(),
  label: z.string().trim().max(120).optional().default(""),
  href: z.string().trim().max(500).optional().default(""),
  newTab: z.boolean().optional().default(false),
});

const FooterEcomColumnSchema = z.object({
  id: z.string().trim().min(1).max(80).optional(),
  title: z.string().trim().max(80).optional().default(""),
  links: z.array(FooterEcomLinkSchema).optional().default([]),
});

const FooterEcomTrustBadgeSchema = z.object({
  id: z.string().trim().min(1).max(80).optional(),
  label: z.string().trim().max(80).optional().default(""),
  imageUrl: z.string().trim().max(800).optional().default(""),
  href: z.string().trim().max(500).optional().default(""),
});

const FooterEcomSocialSchema = z.object({
  id: z.string().trim().min(1).max(80).optional(),
  kind: z.string().trim().max(40).optional().default(""),
  href: z.string().trim().max(500).optional().default(""),
});

const BodySchema = z.object({
  enabled: z.boolean().optional().default(false),
  columns: z.array(FooterEcomColumnSchema).optional().default([]),

  showAppLinks: z.boolean().optional().default(true),
  appLinks: z
    .object({
      androidUrl: z.string().trim().max(500).optional().default(""),
      iosUrl: z.string().trim().max(500).optional().default(""),
      androidBadgeUrl: z.string().trim().max(800).optional().default(""),
      iosBadgeUrl: z.string().trim().max(800).optional().default(""),
    })
    .optional()
    .default(() => ({ androidUrl: "", iosUrl: "", androidBadgeUrl: "", iosBadgeUrl: "" })),

  showPaymentMethods: z.boolean().optional().default(true),
  paymentKinds: z.array(z.string().trim().max(40)).optional().default([]),

  showTrustBadges: z.boolean().optional().default(true),
  trustBadges: z.array(FooterEcomTrustBadgeSchema).optional().default([]),

  contact: z
    .object({
      email: z.string().trim().max(120).optional().default(""),
      phone: z.string().trim().max(60).optional().default(""),
      addressLines: z.array(z.string().trim().max(80)).optional().default([]),
    })
    .optional()
    .default(() => ({ email: "", phone: "", addressLines: [] })),

  showSocialLinks: z.boolean().optional().default(true),
  socialLinks: z.array(FooterEcomSocialSchema).optional().default([]),

  newsletter: z
    .object({
      enabled: z.boolean().optional().default(true),
      title: z.string().trim().max(80).optional().default("Newsletter"),
      description: z.string().trim().max(200).optional().default("Subscribe for updates and deals."),
      placeholder: z.string().trim().max(80).optional().default("Enter your email"),
      buttonText: z.string().trim().max(40).optional().default("Subscribe"),
    })
    .optional()
    .default(() => ({
      enabled: true,
      title: "Newsletter",
      description: "Subscribe for updates and deals.",
      placeholder: "Enter your email",
      buttonText: "Subscribe",
    })),

  copyrightText: z.string().trim().max(160).optional().default(""),
});

function normalizeFooterEcom(raw: unknown) {
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return BodySchema.parse({ enabled: false });
  }

  const data = parsed.data;
  return {
    ...data,
    columns: data.columns
      .map((c) => ({
        ...c,
        id: String(c.id ?? "").trim() || uid("fc"),
        title: String(c.title ?? "").trim(),
        links: (c.links ?? [])
          .map((l) => ({
            ...l,
            id: String(l.id ?? "").trim() || uid("fl"),
            label: String(l.label ?? "").trim(),
            href: String(l.href ?? "").trim(),
          }))
          .filter((l) => l.label || l.href),
      }))
      .filter((c) => c.title || (c.links ?? []).length > 0),
    paymentKinds: (data.paymentKinds ?? []).map((x) => String(x).trim()).filter(Boolean).slice(0, 20),
    trustBadges: (data.trustBadges ?? [])
      .map((b) => ({ ...b, id: String(b.id ?? "").trim() || uid("tb") }))
      .filter((b) => b.label || b.imageUrl || b.href)
      .slice(0, 12),
    socialLinks: (data.socialLinks ?? [])
      .map((s) => ({ ...s, id: String(s.id ?? "").trim() || uid("sl") }))
      .filter((s) => s.kind || s.href)
      .slice(0, 12),
    contact: {
      email: String(data.contact?.email ?? "").trim(),
      phone: String(data.contact?.phone ?? "").trim(),
      addressLines: Array.isArray(data.contact?.addressLines)
        ? data.contact!.addressLines.map((x) => String(x).trim()).filter(Boolean).slice(0, 6)
        : [],
    },
    updatedAt: Date.now(),
  };
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  await dbConnect();

  const doc = (await SiteSetting.findOne({ key: "global" }).select("footerEcom").lean()) as unknown;
  const root = isRecord(doc) ? doc : null;
  const ecom = root?.footerEcom;

  return NextResponse.json(
    { footerEcom: normalizeFooterEcom(ecom) },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const json = (await req.json().catch(() => null)) as unknown;
  const normalized = normalizeFooterEcom(json);

  await dbConnect();

  const updated = (await SiteSetting.findOneAndUpdate(
    { key: "global" },
    { $set: { key: "global", footerEcom: normalized } },
    { upsert: true, new: true }
  )
    .select("footerEcom")
    .lean()) as unknown;

  const root = isRecord(updated) ? updated : null;

  return NextResponse.json({ footerEcom: normalizeFooterEcom(root?.footerEcom) });
}
