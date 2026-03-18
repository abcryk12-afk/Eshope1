import { NextResponse } from "next/server";

import { dbConnect } from "@/lib/db";
import SiteSetting from "@/models/SiteSetting";
import CmsPage from "@/models/CmsPage";
import {
  buildCategoryTree,
  normalizeMobileMenuConfig,
  treeToMenuItems,
} from "@/lib/mobileMenu";
import { loadActiveCategoriesForMenu } from "@/lib/mobileMenu.server";
import { resolveMenuItemsWithCategories } from "@/lib/mobileMenuResolve.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export async function GET() {
  await dbConnect();

  const doc = (await SiteSetting.findOne({ key: "global" }).select("mobileMenu performance").lean()) as unknown;
  const root = isRecord(doc) ? doc : null;
  const cfg = normalizeMobileMenuConfig(root?.mobileMenu);

  const perf =
    root && typeof (root as Record<string, unknown>).performance === "object" && (root as Record<string, unknown>).performance
      ? ((root as Record<string, unknown>).performance as Record<string, unknown>)
      : {};

  const cacheEnabled = typeof perf.apiCacheEnabled === "boolean" ? perf.apiCacheEnabled : false;
  const sMaxAge =
    typeof perf.apiCacheSMaxAgeSeconds === "number" && Number.isFinite(perf.apiCacheSMaxAgeSeconds)
      ? Math.max(0, Math.min(3600, Math.trunc(perf.apiCacheSMaxAgeSeconds)))
      : 60;
  const swr =
    typeof perf.apiCacheStaleWhileRevalidateSeconds === "number" &&
    Number.isFinite(perf.apiCacheStaleWhileRevalidateSeconds)
      ? Math.max(0, Math.min(86400, Math.trunc(perf.apiCacheStaleWhileRevalidateSeconds)))
      : 300;

  const cacheControl = cacheEnabled
    ? `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`
    : "no-store, max-age=0";

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
      { headers: { "Cache-Control": cacheControl } }
    );
  }

  // Smart-sync: resolve category references against live category tree.
  const cats = await loadActiveCategoriesForMenu();
  const tree = buildCategoryTree(cats);

  const pages = (await CmsPage.find({ isPublished: true })
    .select("title slug")
    .lean()) as unknown as Array<{ _id: unknown; title?: unknown; slug?: unknown }>;
  const pagesById = new Map(
    (Array.isArray(pages) ? pages : []).map((p) => [
      String(p._id),
      { id: String(p._id), title: String(p.title ?? ""), slug: String(p.slug ?? "") },
    ])
  );

  const resolved = resolveMenuItemsWithCategories({
    items: cfg.items,
    tree,
    pagesById,
    autoSyncCategories: cfg.autoSyncCategories ?? true,
  });

  return NextResponse.json(
    { mobileMenu: { ...cfg, items: resolved } },
    { headers: { "Cache-Control": cacheControl } }
  );
}
