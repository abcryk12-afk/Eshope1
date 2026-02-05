import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import crypto from "crypto";
import path from "path";
import { mkdir, readFile, writeFile } from "fs/promises";
import sharp from "sharp";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import SiteSetting from "@/models/SiteSetting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

const BrandTextStyleSchema = z.object({
  weight: z.number().int().min(300).max(900),
  italic: z.boolean(),
  letterSpacing: z.enum(["tight", "normal", "wide"]),
  color: z.enum(["foreground", "muted", "primary"]),
  gradientEnabled: z.boolean(),
  embossedEnabled: z.boolean(),
});

const LogoSchema = z.object({
  url: z.string().trim(),
  width: z.number().int().min(1).nullable().optional(),
  height: z.number().int().min(1).nullable().optional(),
  alt: z.string().trim().max(160),
});

const SeoSchema = z.object({
  title: z.string().trim().max(160),
  description: z.string().trim().max(320),
  ogImageUrl: z.string().trim(),
});

const BodySchema = z.object({
  storeName: z.string().trim().min(1).max(80),
  headerBrandText: z.string().trim().max(80),
  logoMode: z.enum(["text", "image", "both"]),
  logoAlignment: z.enum(["left", "center"]),
  hideTextWhenLogoActive: z.boolean(),
  logoMaxHeight: z.number().int().min(16).max(96),
  logo: LogoSchema,
  brandTextStyle: BrandTextStyleSchema,
  seo: SeoSchema,
  faviconSourceUrl: z.string().trim(),
});

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

async function writeExistingFaviconManifest(args: { assetsVersion: string; storeName: string }) {
  const publicRootAbs = path.join(process.cwd(), "public");
  const basePath = path.join(publicRootAbs, "branding", "favicon", args.assetsVersion);

  const manifest = {
    name: args.storeName || "Shop",
    short_name: args.storeName || "Shop",
    start_url: "/",
    display: "standalone",
    icons: [
      {
        src: `/branding/favicon/${args.assetsVersion}/android-chrome-192x192.png`,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: `/branding/favicon/${args.assetsVersion}/android-chrome-512x512.png`,
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };

  await writeFile(path.join(basePath, "site.webmanifest"), JSON.stringify(manifest)).catch(() => null);
}

function readString(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function readErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  const msg = typeof e === "string" ? e : "";
  return msg || "Failed";
}

function readNumber(v: unknown, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
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

function safePublicPath(publicRootAbs: string, urlPath: string) {
  const v = String(urlPath || "").trim();
  if (!v.startsWith("/")) return null;

  const rel = v.replace(/^\/+/, "");

  const joined = path.join(publicRootAbs, rel);
  const normalized = path.normalize(joined);
  const rootNormalized = path.normalize(publicRootAbs + path.sep);

  if (!normalized.startsWith(rootNormalized)) return null;
  return normalized;
}

function buildIcoFromPngs(items: Array<{ size: number; png: Buffer }>) {
  const sorted = [...items]
    .filter((x) => x && typeof x.size === "number" && Buffer.isBuffer(x.png))
    .sort((a, b) => a.size - b.size);

  const count = sorted.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const entries = Buffer.alloc(count * 16);

  let offset = 6 + count * 16;

  for (let i = 0; i < count; i += 1) {
    const it = sorted[i]!;
    const sizeByte = it.size >= 256 ? 0 : it.size;
    const base = i * 16;

    entries.writeUInt8(sizeByte, base + 0);
    entries.writeUInt8(sizeByte, base + 1);
    entries.writeUInt8(0, base + 2);
    entries.writeUInt8(0, base + 3);
    entries.writeUInt16LE(0, base + 4);
    entries.writeUInt16LE(0, base + 6);
    entries.writeUInt32LE(it.png.length, base + 8);
    entries.writeUInt32LE(offset, base + 12);

    offset += it.png.length;
  }

  return Buffer.concat([header, entries, ...sorted.map((x) => x.png)]);
}

async function generateFaviconAssets(args: { sourceUrl: string; storeName: string }) {
  const publicRootAbs = path.join(process.cwd(), "public");
  const srcAbs = safePublicPath(publicRootAbs, args.sourceUrl);
  if (!srcAbs) {
    throw new Error("Invalid favicon source URL");
  }

  const input = await readFile(srcAbs);

  const assetsVersion = crypto.randomUUID();
  const basePath = path.join(publicRootAbs, "branding", "favicon", assetsVersion);
  await mkdir(basePath, { recursive: true });

  async function png(size: number) {
    const buf = await sharp(input)
      .ensureAlpha()
      .resize(size, size, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 9 })
      .toBuffer();

    return buf;
  }

  const png16 = await png(16);
  const png32 = await png(32);
  const png48 = await png(48);

  const apple180 = await png(180);
  const android192 = await png(192);
  const android512 = await png(512);

  const ico = buildIcoFromPngs([
    { size: 16, png: png16 },
    { size: 32, png: png32 },
    { size: 48, png: png48 },
  ]);

  await Promise.all([
    writeFile(path.join(basePath, "favicon-16x16.png"), png16),
    writeFile(path.join(basePath, "favicon-32x32.png"), png32),
    writeFile(path.join(basePath, "apple-touch-icon.png"), apple180),
    writeFile(path.join(basePath, "android-chrome-192x192.png"), android192),
    writeFile(path.join(basePath, "android-chrome-512x512.png"), android512),
    writeFile(path.join(basePath, "favicon.ico"), ico),
  ]);

  const manifest = {
    name: args.storeName || "Shop",
    short_name: args.storeName || "Shop",
    start_url: "/",
    display: "standalone",
    icons: [
      {
        src: `/branding/favicon/${assetsVersion}/android-chrome-192x192.png`,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: `/branding/favicon/${assetsVersion}/android-chrome-512x512.png`,
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };

  await writeFile(path.join(basePath, "site.webmanifest"), JSON.stringify(manifest));

  return {
    assetsVersion,
    updatedAt: Date.now(),
  };
}

async function tryReadLocalImageMeta(urlPath: string) {
  const publicRootAbs = path.join(process.cwd(), "public");
  const srcAbs = safePublicPath(publicRootAbs, urlPath);
  if (!srcAbs) return null;

  const input = await readFile(srcAbs).catch(() => null);
  if (!input) return null;

  const meta = await sharp(input).metadata().catch(() => null);
  const width = typeof meta?.width === "number" && Number.isFinite(meta.width) && meta.width > 0 ? meta.width : null;
  const height = typeof meta?.height === "number" && Number.isFinite(meta.height) && meta.height > 0 ? meta.height : null;

  return { width, height };
}

function normalizeBrandingResponse(doc: unknown) {
  const root = isRecord(doc) ? doc : {};
  const branding = isRecord(root.branding) ? root.branding : {};
  const logo = isRecord(branding.logo) ? branding.logo : {};
  const style = isRecord(branding.brandTextStyle) ? branding.brandTextStyle : {};
  const seo = isRecord(branding.seo) ? branding.seo : {};
  const favicon = isRecord(branding.favicon) ? branding.favicon : {};

  const storeName = readString(branding.storeName) || "Shop";

  return {
    branding: {
      storeName,
      headerBrandText: readString(branding.headerBrandText) || storeName,
      logoMode: readString(branding.logoMode) || "text",
      logoAlignment: readString(branding.logoAlignment) || "left",
      hideTextWhenLogoActive: typeof branding.hideTextWhenLogoActive === "boolean" ? branding.hideTextWhenLogoActive : false,
      logoMaxHeight: Math.max(16, Math.min(96, Math.trunc(readNumber(branding.logoMaxHeight, 28)))),
      logo: {
        url: readString(logo.url),
        width: typeof logo.width === "number" && Number.isFinite(logo.width) ? logo.width : null,
        height: typeof logo.height === "number" && Number.isFinite(logo.height) ? logo.height : null,
        alt: readString(logo.alt) || storeName,
        updatedAt: Math.trunc(readNumber(logo.updatedAt, 0)),
      },
      brandTextStyle: {
        weight: Math.max(300, Math.min(900, Math.trunc(readNumber(style.weight, 600)))),
        italic: typeof style.italic === "boolean" ? style.italic : false,
        letterSpacing: readString(style.letterSpacing) || "tight",
        color: readString(style.color) || "foreground",
        gradientEnabled: typeof style.gradientEnabled === "boolean" ? style.gradientEnabled : false,
        embossedEnabled: typeof style.embossedEnabled === "boolean" ? style.embossedEnabled : false,
      },
      seo: {
        title: readString(seo.title),
        description: readString(seo.description),
        ogImageUrl: readString(seo.ogImageUrl),
      },
      favicon: {
        sourceUrl: readString(favicon.sourceUrl),
        assetsVersion: readString(favicon.assetsVersion),
        updatedAt: Math.trunc(readNumber(favicon.updatedAt, 0)),
      },
    },
    brandingUpdatedAt: Math.trunc(readNumber(root.brandingUpdatedAt, 0)),
  };
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  await dbConnect();

  const doc = (await SiteSetting.findOne({ key: "global" })
    .select("branding brandingUpdatedAt")
    .lean()) as unknown;

  return NextResponse.json(normalizeBrandingResponse(doc), { headers: { "Cache-Control": "no-store, max-age=0" } });
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

  const existing = (await SiteSetting.findOne({ key: "global" }).select("branding").lean()) as unknown;
  const existingRoot = isRecord(existing) ? existing : null;
  const existingBranding = existingRoot && isRecord(existingRoot.branding) ? existingRoot.branding : null;
  const existingFavicon = existingBranding && isRecord(existingBranding.favicon) ? existingBranding.favicon : null;

  const nextNow = Date.now();

  let nextFavicon = {
    sourceUrl: readString(existingFavicon?.sourceUrl),
    assetsVersion: readString(existingFavicon?.assetsVersion),
    updatedAt: typeof existingFavicon?.updatedAt === "number" ? existingFavicon.updatedAt : 0,
  };

  const faviconSourceUrl = parsed.data.faviconSourceUrl.trim();
  const shouldClearFavicon = !faviconSourceUrl;

  if (shouldClearFavicon) {
    nextFavicon = { sourceUrl: "", assetsVersion: "", updatedAt: 0 };
  } else {
    const currentSource = readString(existingFavicon?.sourceUrl);
    const currentVersion = readString(existingFavicon?.assetsVersion);

    if (faviconSourceUrl !== currentSource || !currentVersion) {
      let generated: { assetsVersion: string; updatedAt: number };
      try {
        generated = await generateFaviconAssets({ sourceUrl: faviconSourceUrl, storeName: parsed.data.storeName });
      } catch (e) {
        return NextResponse.json({ message: readErrorMessage(e) }, { status: 400 });
      }
      nextFavicon = {
        sourceUrl: faviconSourceUrl,
        assetsVersion: generated.assetsVersion,
        updatedAt: generated.updatedAt,
      };
    } else if (currentVersion) {
      await writeExistingFaviconManifest({ assetsVersion: currentVersion, storeName: parsed.data.storeName });
    }
  }

  const existingLogo = existingBranding && isRecord(existingBranding.logo) ? existingBranding.logo : null;
  const existingLogoUrl = readString(existingLogo?.url);

  const nextLogoUrl = parsed.data.logo.url.trim();
  const nextLogoUpdatedAt = nextLogoUrl && nextLogoUrl !== existingLogoUrl ? nextNow : Math.trunc(readNumber(existingLogo?.updatedAt, 0));

  const localLogoMeta = nextLogoUrl && nextLogoUrl.startsWith("/") ? await tryReadLocalImageMeta(nextLogoUrl) : null;
  const nextLogoWidth = localLogoMeta?.width ?? parsed.data.logo.width ?? null;
  const nextLogoHeight = localLogoMeta?.height ?? parsed.data.logo.height ?? null;

  const update = {
    $set: {
      key: "global",
      branding: {
        storeName: parsed.data.storeName,
        headerBrandText: parsed.data.headerBrandText,
        logoMode: parsed.data.logoMode,
        logoAlignment: parsed.data.logoAlignment,
        hideTextWhenLogoActive: parsed.data.hideTextWhenLogoActive,
        logoMaxHeight: parsed.data.logoMaxHeight,
        logo: {
          url: nextLogoUrl,
          width: nextLogoWidth,
          height: nextLogoHeight,
          alt: parsed.data.logo.alt,
          updatedAt: nextLogoUpdatedAt,
        },
        brandTextStyle: parsed.data.brandTextStyle,
        seo: parsed.data.seo,
        favicon: nextFavicon,
      },
      brandingUpdatedAt: nextNow,
    },
  };

  const doc = (await SiteSetting.findOneAndUpdate({ key: "global" }, update, { upsert: true, new: true })
    .select("branding brandingUpdatedAt")
    .lean()) as unknown;

  return NextResponse.json(normalizeBrandingResponse(doc));
}
