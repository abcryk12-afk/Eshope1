import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import SiteSetting from "@/models/SiteSetting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

const MetaPixelEntrySchema = z.object({
  id: z.string().trim().min(1).max(60),
  pixelId: z.string().trim().min(1).max(40),
  enabled: z.boolean().optional().default(true),
});

const BodySchema = z.object({
  tracking: z.object({
    enabled: z.boolean().optional().default(false),
    autoEventsEnabled: z.boolean().optional().default(true),
    manualOverrideMode: z.boolean().optional().default(false),
    testEventMode: z.boolean().optional().default(false),
    ga4: z
      .object({
        enabled: z.boolean().optional().default(false),
        measurementId: z.string().trim().max(40).optional().default(""),
        debug: z.boolean().optional().default(false),
      })
      .optional()
      .default({ enabled: false, measurementId: "", debug: false }),
    googleAds: z
      .object({
        enabled: z.boolean().optional().default(false),
        conversionId: z.string().trim().max(40).optional().default(""),
        conversionLabel: z.string().trim().max(80).optional().default(""),
      })
      .optional()
      .default({ enabled: false, conversionId: "", conversionLabel: "" }),
    metaPixels: z.array(MetaPixelEntrySchema).optional().default([]),
  }),
  share: z
    .object({
      enabled: z.boolean().optional().default(false),
    })
    .optional()
    .default({ enabled: false }),
});

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizeMetaPixels(input: unknown) {
  const arr = Array.isArray(input) ? input : [];

  return arr
    .filter((x) => isRecord(x))
    .map((x) => {
      const r = x as Record<string, unknown>;
      const id = typeof r.id === "string" ? r.id.trim() : "";
      const pixelId = typeof r.pixelId === "string" ? r.pixelId.trim() : "";
      const enabled = typeof r.enabled === "boolean" ? r.enabled : true;
      return { id, pixelId, enabled };
    })
    .filter((x) => x.id && x.pixelId);
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

function readTracking(doc: unknown) {
  const root = isRecord(doc) ? doc : null;
  const tracking = root && isRecord(root.tracking) ? root.tracking : {};
  const ga4 = isRecord(tracking.ga4) ? tracking.ga4 : {};
  const googleAds = isRecord(tracking.googleAds) ? tracking.googleAds : {};
  const share = root && isRecord(root.share) ? root.share : {};

  return {
    tracking: {
      enabled: typeof tracking.enabled === "boolean" ? tracking.enabled : false,
      autoEventsEnabled: typeof tracking.autoEventsEnabled === "boolean" ? tracking.autoEventsEnabled : true,
      manualOverrideMode: typeof tracking.manualOverrideMode === "boolean" ? tracking.manualOverrideMode : false,
      testEventMode: typeof tracking.testEventMode === "boolean" ? tracking.testEventMode : false,
      updatedAt: typeof tracking.updatedAt === "number" ? tracking.updatedAt : 0,
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
    },
    share: {
      enabled: typeof share.enabled === "boolean" ? share.enabled : false,
      updatedAt: typeof share.updatedAt === "number" ? share.updatedAt : 0,
    },
  };
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  await dbConnect();

  const doc = (await SiteSetting.findOne({ key: "global" }).select("tracking share").lean()) as unknown;

  return NextResponse.json(readTracking(doc), { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = BodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  await dbConnect();

  const now = Date.now();
  const metaPixels = parsed.data.tracking.metaPixels.map((p) => ({
    _id: p.id,
    pixelId: p.pixelId,
    enabled: p.enabled,
  }));

  const doc = (await SiteSetting.findOneAndUpdate(
    { key: "global" },
    {
      $set: {
        key: "global",
        tracking: {
          enabled: parsed.data.tracking.enabled,
          autoEventsEnabled: parsed.data.tracking.autoEventsEnabled,
          manualOverrideMode: parsed.data.tracking.manualOverrideMode,
          testEventMode: parsed.data.tracking.testEventMode,
          ga4: parsed.data.tracking.ga4,
          googleAds: parsed.data.tracking.googleAds,
          metaPixels,
          updatedAt: now,
        },
        share: {
          enabled: parsed.data.share.enabled,
          updatedAt: now,
        },
      },
    },
    { upsert: true, new: true }
  )
    .select("tracking share")
    .lean()) as unknown;

  return NextResponse.json(readTracking(doc));
}
