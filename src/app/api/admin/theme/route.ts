import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import SiteSetting from "@/models/SiteSetting";

export const runtime = "nodejs";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

const ColorsSchema = z.object({
  primary: z.string().trim().min(4).max(32),
  secondary: z.string().trim().min(4).max(32),
  accent: z.string().trim().min(4).max(32).optional(),
  background: z.string().trim().min(4).max(32),
  surface: z.string().trim().min(4).max(32),
  header: z.string().trim().min(4).max(32),
  text: z.string().trim().min(4).max(32),
});

const BodySchema = z.object({
  preset: z.enum(["default", "marketplace", "sales", "premium", "daraz", "amazon"]).default("default"),
  colors: ColorsSchema,
});

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readString(v: unknown, fallback: string) {
  const s = typeof v === "string" ? v.trim() : "";
  return s || fallback;
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

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  await dbConnect();

  const doc = (await SiteSetting.findOne({ key: "global" }).lean()) as unknown;
  const root = isRecord(doc) ? doc : null;
  const theme = root && isRecord(root.theme) ? root.theme : null;
  const colors = theme && isRecord(theme.colors) ? theme.colors : null;
  const updatedAt = root && typeof root.themeUpdatedAt === "number" ? root.themeUpdatedAt : 0;

  return NextResponse.json({
    theme: {
      preset: readString(theme?.preset, "default"),
      colors: {
        primary: readString(colors?.primary, "#18181b"),
        secondary: readString(colors?.secondary, "#f4f4f5"),
        accent: readString(colors?.accent, "#ff6a00"),
        background: readString(colors?.background, "#ffffff"),
        surface: readString(colors?.surface, readString(colors?.background, "#ffffff")),
        header: readString(colors?.header, readString(colors?.background, "#ffffff")),
        text: readString(colors?.text, "#171717"),
      },
      updatedAt,
    },
  });
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

  const doc = await SiteSetting.findOneAndUpdate(
    { key: "global" },
    {
      $set: {
        key: "global",
        theme: {
          preset: parsed.data.preset,
          colors: {
            ...parsed.data.colors,
            accent: String(parsed.data.colors.accent ?? "#ff6a00"),
          },
        },
        themeUpdatedAt: now,
      },
    },
    { upsert: true, new: true }
  ).lean();

  const root = isRecord(doc) ? doc : null;
  const theme = root && isRecord(root.theme) ? root.theme : null;
  const colors = theme && isRecord(theme.colors) ? theme.colors : null;
  const updatedAt = root && typeof root.themeUpdatedAt === "number" ? root.themeUpdatedAt : now;

  return NextResponse.json({
    theme: {
      preset: readString(theme?.preset, "default"),
      colors: {
        primary: readString(colors?.primary, "#18181b"),
        secondary: readString(colors?.secondary, "#f4f4f5"),
        accent: readString(colors?.accent, "#ff6a00"),
        background: readString(colors?.background, "#ffffff"),
        surface: readString(colors?.surface, readString(colors?.background, "#ffffff")),
        header: readString(colors?.header, readString(colors?.background, "#ffffff")),
        text: readString(colors?.text, "#171717"),
      },
      updatedAt,
    },
  });
}
