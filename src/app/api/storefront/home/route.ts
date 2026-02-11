import { NextResponse } from "next/server";

import { dbConnect } from "@/lib/db";
import SiteSetting from "@/models/SiteSetting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isSafeImageSrc(src: string) {
  const v = String(src || "").trim();
  if (!v) return false;
  if (v.startsWith("/")) return true;
  if (v.startsWith("http://")) return true;
  if (v.startsWith("https://")) return true;
  return false;
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function clampFloat(n: number, min: number, max: number) {
  const v = Number.isFinite(n) ? n : min;
  return Math.max(min, Math.min(max, v));
}

function readString(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function readNumber(v: unknown, fallback: number) {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function normalizeHeroBannerSettings(raw: unknown) {
  const r = isRecord(raw) ? (raw as Record<string, unknown>) : {};

  const aspectMode = r.aspectMode === "ratio" ? "ratio" : "height";
  const animation = r.animation === "fade" ? "fade" : "slide";
  const fitMode = r.fitMode === "contain" ? "contain" : "cover";
  const aspectRatio = readString(r.aspectRatio) || "16/9";

  return {
    desktopHeightPx: clampInt(readNumber(r.desktopHeightPx, 520), 200, 900),
    mobileHeightPx: clampInt(readNumber(r.mobileHeightPx, 360), 180, 900),
    aspectMode,
    aspectRatio,
    customAspectW: clampInt(readNumber(r.customAspectW, 16), 1, 64),
    customAspectH: clampInt(readNumber(r.customAspectH, 9), 1, 64),
    fitMode,
    autoplayEnabled: typeof r.autoplayEnabled === "boolean" ? r.autoplayEnabled : true,
    autoplayDelayMs: clampInt(readNumber(r.autoplayDelayMs, 5000), 1000, 20000),
    loop: typeof r.loop === "boolean" ? r.loop : true,
    showDots: typeof r.showDots === "boolean" ? r.showDots : true,
    showArrows: typeof r.showArrows === "boolean" ? r.showArrows : true,
    transitionSpeedMs: clampInt(readNumber(r.transitionSpeedMs, 550), 100, 5000),
    animation,
    keyboard: typeof r.keyboard === "boolean" ? r.keyboard : true,
  };
}

function normalizeHeroBanners(raw: unknown) {
  const arr = Array.isArray(raw) ? raw : [];
  return arr
    .filter((b) => isRecord(b))
    .map((b) => {
      const r = b as Record<string, unknown>;
      const image = readString(r.image);
      const desktopImage = readString(r.desktopImage);
      const mobileImage = readString(r.mobileImage);
      return {
        id: String(r._id ?? ""),
        title: readString(r.title),
        subtitle: readString(r.subtitle),
        image,
        desktopImage,
        mobileImage,
        href: readString(r.href),
        buttonText: readString(r.buttonText),
        buttonHref: readString(r.buttonHref),
        textAlign: r.textAlign === "center" ? "center" : r.textAlign === "right" ? "right" : "left",
        verticalAlign: r.verticalAlign === "top" ? "top" : r.verticalAlign === "bottom" ? "bottom" : "center",
        overlayColor: readString(r.overlayColor) || "#000000",
        overlayOpacity: clampFloat(readNumber(r.overlayOpacity, 0.25), 0, 1),
        textColor: readString(r.textColor) || "#ffffff",
        buttonColor: readString(r.buttonColor) || "#ffffff",
        isActive: typeof r.isActive === "boolean" ? r.isActive : true,
      };
    })
    .filter((b) => {
      const src = b.image || b.desktopImage || b.mobileImage;
      return b.isActive && isSafeImageSrc(src);
    });
}

export async function GET() {
  await dbConnect();

  const doc = (await SiteSetting.findOne({ key: "global" })
    .select("homeBanners heroBanners heroBannerSettings")
    .lean()) as unknown;
  const root = isRecord(doc) ? doc : {};

  const raw = Array.isArray(root.homeBanners) ? root.homeBanners : [];
  const homeBanners = raw
    .filter((b) => isRecord(b))
    .map((b) => {
      const r = b as Record<string, unknown>;
      const image = typeof r.image === "string" ? r.image.trim() : "";
      return {
        id: String(r._id ?? ""),
        title: typeof r.title === "string" ? r.title.trim() : "",
        subtitle: typeof r.subtitle === "string" ? r.subtitle.trim() : "",
        image,
        href: typeof r.href === "string" ? r.href.trim() : "",
        isActive: typeof r.isActive === "boolean" ? r.isActive : true,
      };
    })
    .filter((b) => b.isActive && isSafeImageSrc(b.image));

  const heroBanners = normalizeHeroBanners((root as { heroBanners?: unknown }).heroBanners);
  const heroBannerSettings = normalizeHeroBannerSettings(
    (root as { heroBannerSettings?: unknown }).heroBannerSettings
  );

  return NextResponse.json(
    { homeBanners, heroBanners, heroBannerSettings },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
