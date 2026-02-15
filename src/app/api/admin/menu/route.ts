import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import SiteSetting from "@/models/SiteSetting";
import { normalizeMobileMenuConfig } from "@/lib/mobileMenu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

const VisibilitySchema = z.enum(["all", "mobile", "desktop"]);

const MenuItemSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    id: z.string().trim().min(1).max(80),
    type: z.enum(["category", "link"]),
    title: z.string().trim().min(1).max(120),
    href: z.string().trim().min(1).max(500),
    enabled: z.boolean(),
    visibility: VisibilitySchema,
    icon: z.string().trim().max(80).optional().default(""),
    badgeLabel: z.string().trim().max(20).optional().default(""),
    featured: z.boolean().optional().default(false),
    children: z.array(MenuItemSchema).optional().default([]),
  })
);

const BodySchema = z.object({
  mobileMenu: z.object({
    useDefaultMenu: z.boolean(),
    featuredBannerHtml: z.string().optional().default(""),
    promoBannerHtml: z.string().optional().default(""),
    items: z.array(MenuItemSchema).default([]),
  }),
});

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

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  await dbConnect();

  const doc = (await SiteSetting.findOne({ key: "global" }).select("mobileMenu").lean()) as unknown;
  const root = isRecord(doc) ? doc : null;
  const cfg = normalizeMobileMenuConfig(root?.mobileMenu);

  return NextResponse.json(
    { mobileMenu: cfg },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
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

  const updated = (await SiteSetting.findOneAndUpdate(
    { key: "global" },
    {
      $set: {
        key: "global",
        mobileMenu: {
          useDefaultMenu: parsed.data.mobileMenu.useDefaultMenu,
          featuredBannerHtml: parsed.data.mobileMenu.featuredBannerHtml,
          promoBannerHtml: parsed.data.mobileMenu.promoBannerHtml,
          items: parsed.data.mobileMenu.items,
          updatedAt: now,
        },
      },
    },
    { upsert: true, new: true }
  )
    .select("mobileMenu")
    .lean()) as unknown;

  const root = isRecord(updated) ? updated : null;
  const cfg = normalizeMobileMenuConfig(root?.mobileMenu);

  return NextResponse.json({ mobileMenu: cfg });
}
