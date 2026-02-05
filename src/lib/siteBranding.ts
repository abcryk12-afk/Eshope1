import { dbConnect } from "@/lib/db";
import { normalizeImageUrl } from "@/lib/seo";
import SiteSetting from "@/models/SiteSetting";

export type PublicSeoSettings = {
  siteName: string;
  description: string;
  ogImageUrl: string;
  faviconAssetsVersion: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readString(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

export async function getPublicSeoSettings(): Promise<PublicSeoSettings> {
  await dbConnect();

  const doc = (await SiteSetting.findOne({ key: "global" })
    .select("branding globalSeoTitle globalSeoDescription")
    .lean()) as unknown;

  const root = isRecord(doc) ? doc : null;

  const branding = root && isRecord(root.branding) ? root.branding : null;
  const brandingSeo = branding && isRecord(branding.seo) ? branding.seo : null;
  const favicon = branding && isRecord(branding.favicon) ? branding.favicon : null;

  const storeName = readString(branding?.storeName) || readString(root?.globalSeoTitle) || "Shop";
  const seoTitle = readString(brandingSeo?.title) || readString(root?.globalSeoTitle) || storeName;
  const description = readString(brandingSeo?.description) || readString(root?.globalSeoDescription) || "";

  const ogImageRaw = readString(brandingSeo?.ogImageUrl) || readString(branding && isRecord(branding.logo) ? branding.logo.url : "");
  const ogImageUrl = ogImageRaw ? normalizeImageUrl(ogImageRaw) : "";

  const faviconAssetsVersion = readString(favicon?.assetsVersion);

  return {
    siteName: seoTitle,
    description,
    ogImageUrl,
    faviconAssetsVersion,
  };
}
