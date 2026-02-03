import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { normalizeStorefrontSettings } from "@/lib/shipping";
import SiteSetting from "@/models/SiteSetting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

const GridSchema = z.object({
  mobileCols: z.number().int().min(2).max(5),
  tabletCols: z.number().int().min(3).max(5),
  desktopCols: z.number().int().min(4).max(6),
});

const BodySchema = z.object({
  storefrontLayout: z.object({
    grid: GridSchema,
  }),
  cartUx: z.object({
    quickCheckoutEnabled: z.boolean(),
    quickCheckoutAutoHideSeconds: z.number().int().min(1).max(30),
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

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  await dbConnect();

  const doc = (await SiteSetting.findOne({ key: "global" }).select("storefrontLayout cartUx").lean()) as unknown;
  const settings = normalizeStorefrontSettings(doc);

  return NextResponse.json(
    { storefrontLayout: settings.storefrontLayout, cartUx: settings.cartUx },
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

  const doc = (await SiteSetting.findOneAndUpdate(
    { key: "global" },
    {
      $set: {
        key: "global",
        storefrontLayout: parsed.data.storefrontLayout,
        cartUx: parsed.data.cartUx,
      },
    },
    { upsert: true, new: true }
  )
    .select("storefrontLayout cartUx")
    .lean()) as unknown;

  const settings = normalizeStorefrontSettings(doc);

  return NextResponse.json({ storefrontLayout: settings.storefrontLayout, cartUx: settings.cartUx });
}
