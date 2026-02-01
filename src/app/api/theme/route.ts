import { NextResponse } from "next/server";

import { dbConnect } from "@/lib/db";
import SiteSetting from "@/models/SiteSetting";

export const runtime = "nodejs";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readString(v: unknown, fallback: string) {
  const s = typeof v === "string" ? v.trim() : "";
  return s || fallback;
}

export async function GET() {
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
        background: readString(colors?.background, "#ffffff"),
        surface: readString(colors?.surface, readString(colors?.background, "#ffffff")),
        header: readString(colors?.header, readString(colors?.background, "#ffffff")),
        text: readString(colors?.text, "#171717"),
      },
      updatedAt,
    },
  });
}
