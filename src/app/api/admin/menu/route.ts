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
  z
  .object({
    id: z.string().trim().min(1).max(80),
    type: z.enum(["category", "link", "page"]),
    title: z.string().trim().max(120).optional().default(""),
    href: z.string().trim().max(500).optional().default(""),
    refId: z.string().trim().max(60).optional().default(""),
    categoryId: z.string().trim().max(60).optional().default(""),
    includeChildren: z.boolean().optional().default(false),
    openInNewTab: z.boolean().optional().default(false),
    enabled: z.boolean(),
    visibility: VisibilitySchema,
    icon: z.string().trim().max(80).optional().default(""),
    badgeLabel: z.string().trim().max(20).optional().default(""),
    featured: z.boolean().optional().default(false),
    children: z.array(MenuItemSchema).optional().default([]),
  })
  .superRefine((val, ctx) => {
    const t = String(val.title || "").trim();
    const h = String(val.href || "").trim();
    const rid = String(val.refId || "").trim();
    const cid = String(val.categoryId || "").trim();
    const ref = rid || cid;

    if (val.type === "link") {
      if (!t || !h) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Link items must have title and href" });
      }
      return;
    }

    // category/page
    if (!ref && (!t || !h)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ref items must have refId or title+href" });
    }
  })
);

const BodySchema = z.object({
  mobileMenu: z.object({
    useDefaultMenu: z.boolean(),
    autoSyncCategories: z.boolean().optional().default(true),
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
          autoSyncCategories: parsed.data.mobileMenu.autoSyncCategories ?? true,
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
