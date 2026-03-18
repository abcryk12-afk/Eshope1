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
  gap: z.enum(["compact", "normal", "spacious"]).optional().default("normal"),
});

const ListingHeaderSchema = z.object({
  showSearch: z.boolean(),
  showFilters: z.boolean(),
  spacing: z.enum(["compact", "normal"]),
  showSort: z.boolean(),
  enableLayoutSwitcher: z.boolean(),
});

const ProductCardSchema = z.object({
  style: z.enum(["rounded", "squared", "image_first", "poster"]).optional().default("rounded"),
  density: z.enum(["compact", "balanced", "image_focused"]),
  imageAspect: z.enum(["square", "portrait", "auto"]),
  showRating: z.boolean(),
  showSoldCount: z.boolean(),
  showWishlistIcon: z.boolean(),
  showDiscountBadge: z.boolean(),
});

const BodySchema = z.object({
  storefrontLayout: z.object({
    grid: GridSchema,
    productCard: ProductCardSchema,
    listingHeader: ListingHeaderSchema,
  }),
  cartUx: z.object({
    quickCheckoutEnabled: z.boolean(),
    quickCheckoutAutoHideSeconds: z.number().int().min(1).max(30),
    onePageCheckoutEnabled: z.boolean().optional().default(false),
    buyNowEnabled: z.boolean().optional().default(true),
  }),
  performance: z
    .object({
      apiCacheEnabled: z.boolean(),
      apiCacheSMaxAgeSeconds: z.number().int().min(0).max(3600),
      apiCacheStaleWhileRevalidateSeconds: z.number().int().min(0).max(86400),
      productApiCacheEnabled: z.boolean().optional().default(false),
      productApiCacheSMaxAgeSeconds: z.number().int().min(0).max(600).optional().default(20),
      productApiCacheStaleWhileRevalidateSeconds: z.number().int().min(0).max(3600).optional().default(60),
      deferTrackingScripts: z.boolean().optional().default(false),
      fontDisplaySwapEnabled: z.boolean().optional().default(true),
    })
    .optional()
    .default({
      apiCacheEnabled: false,
      apiCacheSMaxAgeSeconds: 60,
      apiCacheStaleWhileRevalidateSeconds: 300,
      productApiCacheEnabled: false,
      productApiCacheSMaxAgeSeconds: 20,
      productApiCacheStaleWhileRevalidateSeconds: 60,
      deferTrackingScripts: false,
      fontDisplaySwapEnabled: true,
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

  const doc = (await SiteSetting.findOne({ key: "global" }).select("storefrontLayout cartUx performance").lean()) as unknown;
  const settings = normalizeStorefrontSettings(doc);

  return NextResponse.json(
    {
      storefrontLayout: settings.storefrontLayout,
      cartUx: settings.cartUx,
      performance: (() => {
        const root = doc && typeof doc === "object" ? (doc as Record<string, unknown>) : {};
        const perf = root && typeof root.performance === "object" && root.performance
          ? (root.performance as Record<string, unknown>)
          : {};
        return {
          apiCacheEnabled: typeof perf.apiCacheEnabled === "boolean" ? perf.apiCacheEnabled : false,
          apiCacheSMaxAgeSeconds:
            typeof perf.apiCacheSMaxAgeSeconds === "number" && Number.isFinite(perf.apiCacheSMaxAgeSeconds)
              ? Math.max(0, Math.min(3600, Math.trunc(perf.apiCacheSMaxAgeSeconds)))
              : 60,
          apiCacheStaleWhileRevalidateSeconds:
            typeof perf.apiCacheStaleWhileRevalidateSeconds === "number" &&
            Number.isFinite(perf.apiCacheStaleWhileRevalidateSeconds)
              ? Math.max(0, Math.min(86400, Math.trunc(perf.apiCacheStaleWhileRevalidateSeconds)))
              : 300,
          productApiCacheEnabled:
            typeof perf.productApiCacheEnabled === "boolean" ? perf.productApiCacheEnabled : false,
          productApiCacheSMaxAgeSeconds:
            typeof perf.productApiCacheSMaxAgeSeconds === "number" && Number.isFinite(perf.productApiCacheSMaxAgeSeconds)
              ? Math.max(0, Math.min(600, Math.trunc(perf.productApiCacheSMaxAgeSeconds)))
              : 20,
          productApiCacheStaleWhileRevalidateSeconds:
            typeof perf.productApiCacheStaleWhileRevalidateSeconds === "number" &&
            Number.isFinite(perf.productApiCacheStaleWhileRevalidateSeconds)
              ? Math.max(0, Math.min(3600, Math.trunc(perf.productApiCacheStaleWhileRevalidateSeconds)))
              : 60,
          deferTrackingScripts: typeof perf.deferTrackingScripts === "boolean" ? perf.deferTrackingScripts : false,
          fontDisplaySwapEnabled:
            typeof perf.fontDisplaySwapEnabled === "boolean" ? perf.fontDisplaySwapEnabled : true,
        };
      })(),
    },
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
        cartUx: {
          quickCheckoutEnabled: parsed.data.cartUx.quickCheckoutEnabled,
          quickCheckoutAutoHideSeconds: parsed.data.cartUx.quickCheckoutAutoHideSeconds,
          onePageCheckoutEnabled: parsed.data.cartUx.onePageCheckoutEnabled,
          buyNowEnabled: parsed.data.cartUx.buyNowEnabled,
        },
        performance: {
          apiCacheEnabled: parsed.data.performance.apiCacheEnabled,
          apiCacheSMaxAgeSeconds: parsed.data.performance.apiCacheSMaxAgeSeconds,
          apiCacheStaleWhileRevalidateSeconds: parsed.data.performance.apiCacheStaleWhileRevalidateSeconds,
          productApiCacheEnabled: parsed.data.performance.productApiCacheEnabled,
          productApiCacheSMaxAgeSeconds: parsed.data.performance.productApiCacheSMaxAgeSeconds,
          productApiCacheStaleWhileRevalidateSeconds: parsed.data.performance.productApiCacheStaleWhileRevalidateSeconds,
          deferTrackingScripts: parsed.data.performance.deferTrackingScripts,
          fontDisplaySwapEnabled: parsed.data.performance.fontDisplaySwapEnabled,
          updatedAt: Date.now(),
        },
      },
    },
    { upsert: true, new: true }
  )
    .select("storefrontLayout cartUx performance")
    .lean()) as unknown;

  const settings = normalizeStorefrontSettings(doc);

  const root = doc && typeof doc === "object" ? (doc as Record<string, unknown>) : {};
  const perf = root && typeof root.performance === "object" && root.performance
    ? (root.performance as Record<string, unknown>)
    : {};

  return NextResponse.json({
    storefrontLayout: settings.storefrontLayout,
    cartUx: settings.cartUx,
    performance: {
      apiCacheEnabled: typeof perf.apiCacheEnabled === "boolean" ? perf.apiCacheEnabled : false,
      apiCacheSMaxAgeSeconds:
        typeof perf.apiCacheSMaxAgeSeconds === "number" && Number.isFinite(perf.apiCacheSMaxAgeSeconds)
          ? Math.max(0, Math.min(3600, Math.trunc(perf.apiCacheSMaxAgeSeconds)))
          : 60,
      apiCacheStaleWhileRevalidateSeconds:
        typeof perf.apiCacheStaleWhileRevalidateSeconds === "number" && Number.isFinite(perf.apiCacheStaleWhileRevalidateSeconds)
          ? Math.max(0, Math.min(86400, Math.trunc(perf.apiCacheStaleWhileRevalidateSeconds)))
          : 300,
      productApiCacheEnabled:
        typeof perf.productApiCacheEnabled === "boolean" ? perf.productApiCacheEnabled : false,
      productApiCacheSMaxAgeSeconds:
        typeof perf.productApiCacheSMaxAgeSeconds === "number" && Number.isFinite(perf.productApiCacheSMaxAgeSeconds)
          ? Math.max(0, Math.min(600, Math.trunc(perf.productApiCacheSMaxAgeSeconds)))
          : 20,
      productApiCacheStaleWhileRevalidateSeconds:
        typeof perf.productApiCacheStaleWhileRevalidateSeconds === "number" &&
        Number.isFinite(perf.productApiCacheStaleWhileRevalidateSeconds)
          ? Math.max(0, Math.min(3600, Math.trunc(perf.productApiCacheStaleWhileRevalidateSeconds)))
          : 60,
      deferTrackingScripts: typeof perf.deferTrackingScripts === "boolean" ? perf.deferTrackingScripts : false,
      fontDisplaySwapEnabled:
        typeof perf.fontDisplaySwapEnabled === "boolean" ? perf.fontDisplaySwapEnabled : true,
    },
  });
}
