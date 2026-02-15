import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

import Providers from "@/app/providers";
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import HeaderGate from "@/components/layout/HeaderGate";
import SiteFooter from "@/components/layout/SiteFooter";
import { dbConnect } from "@/lib/db";
import { absoluteUrl, buildOrganizationJsonLd, buildWebsiteJsonLd, safeJsonLdStringify } from "@/lib/seo";
import { getPublicSeoSettings } from "@/lib/siteBranding";
import { DEFAULT_THEME, deriveThemeCssText, type ThemeColors } from "@/lib/theme";
import SiteSetting from "@/models/SiteSetting";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSeoSettings();
  const canonical = absoluteUrl("/");

  const siteName = settings.siteName?.trim() || "Shop";
  const description = settings.description?.trim() || "";

  const faviconV = settings.faviconAssetsVersion?.trim();
  const iconsBase = faviconV ? `/branding/favicon/${encodeURIComponent(faviconV)}` : "";

  const ico = iconsBase ? `${iconsBase}/favicon.ico` : "/favicon.ico";

  const ogImageUrl = settings.ogImageUrl?.trim();

  return {
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: siteName,
      description,
      url: canonical,
      siteName,
      type: "website",
      images: ogImageUrl ? [{ url: ogImageUrl }] : undefined,
    },
    twitter: {
      card: ogImageUrl ? "summary_large_image" : "summary",
      title: siteName,
      description,
      images: ogImageUrl ? [ogImageUrl] : undefined,
    },
    icons: iconsBase
      ? {
          icon: [
            { url: ico, type: "image/x-icon" },
            { url: `${iconsBase}/favicon-16x16.png`, sizes: "16x16", type: "image/png" },
            { url: `${iconsBase}/favicon-32x32.png`, sizes: "32x32", type: "image/png" },
          ],
          apple: [{ url: `${iconsBase}/apple-touch-icon.png`, sizes: "180x180", type: "image/png" }],
        }
      : {
          icon: [{ url: ico, type: "image/x-icon" }],
        },
    manifest: iconsBase ? `${iconsBase}/site.webmanifest` : undefined,
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

async function getInitialThemeCss() {
  try {
    await dbConnect();
    const doc = (await SiteSetting.findOne({ key: "global" }).lean()) as unknown;
    const root = isRecord(doc) ? doc : null;
    const theme = root && isRecord(root.theme) ? root.theme : null;
    const colors = theme && isRecord(theme.colors) ? theme.colors : null;

    const parsed: ThemeColors = {
      primary: typeof colors?.primary === "string" ? colors.primary : DEFAULT_THEME.primary,
      secondary: typeof colors?.secondary === "string" ? colors.secondary : DEFAULT_THEME.secondary,
      accent: typeof colors?.accent === "string" ? colors.accent : DEFAULT_THEME.accent,
      background: typeof colors?.background === "string" ? colors.background : DEFAULT_THEME.background,
      surface:
        typeof colors?.surface === "string"
          ? colors.surface
          : typeof colors?.background === "string"
            ? colors.background
            : DEFAULT_THEME.surface,
      header:
        typeof colors?.header === "string"
          ? colors.header
          : typeof colors?.background === "string"
            ? colors.background
            : DEFAULT_THEME.header,
      text: typeof colors?.text === "string" ? colors.text : DEFAULT_THEME.text,
    };

    return deriveThemeCssText(parsed);
  } catch {
    return deriveThemeCssText(DEFAULT_THEME);
  }
}

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeCss = await getInitialThemeCss();
  const seo = await getPublicSeoSettings();
  const orgJsonLd = buildOrganizationJsonLd({ name: seo.siteName || "Shop", logoUrl: seo.logoUrl || undefined });
  const websiteJsonLd = buildWebsiteJsonLd({ siteName: seo.siteName || "Shop", description: seo.description || undefined });

  const cookieStore = await cookies();
  const rawLang = cookieStore.get("shop.lang")?.value ?? "";
  const lang = rawLang === "ur" ? "ur" : "en";
  const dir = lang === "ur" ? "rtl" : "ltr";

  return (
    <html lang={lang} dir={dir}>
      <head>
        <style
          id="theme-vars"
          dangerouslySetInnerHTML={{ __html: themeCss }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(orgJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(websiteJsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <AnnouncementBar />
          <HeaderGate />
          {children}
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
