import { NextResponse } from "next/server";

import { dbConnect } from "@/lib/db";
import SiteSetting from "@/models/SiteSetting";
import {
  buildCategoryTree,
  normalizeMobileMenuConfig,
  treeToMenuItems,
} from "@/lib/mobileMenu";
import { loadActiveCategoriesForMenu } from "@/lib/mobileMenu.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export async function GET() {
  await dbConnect();

  const doc = (await SiteSetting.findOne({ key: "global" }).select("mobileMenu").lean()) as unknown;
  const root = isRecord(doc) ? doc : null;
  const cfg = normalizeMobileMenuConfig(root?.mobileMenu);

  if (cfg.useDefaultMenu) {
    const cats = await loadActiveCategoriesForMenu();
    const tree = buildCategoryTree(cats);
    const items = treeToMenuItems(tree);

    return NextResponse.json(
      {
        mobileMenu: {
          ...cfg,
          items,
        },
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  return NextResponse.json(
    { mobileMenu: cfg },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
