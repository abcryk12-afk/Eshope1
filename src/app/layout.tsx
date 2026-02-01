import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

import Providers from "@/app/providers";
import Header from "@/components/layout/Header";
import SiteFooter from "@/components/layout/SiteFooter";
import { dbConnect } from "@/lib/db";
import { DEFAULT_THEME, deriveThemeVars, type ThemeColors } from "@/lib/theme";
import SiteSetting from "@/models/SiteSetting";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shop",
  description: "Modern eCommerce",
};

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

    const vars = deriveThemeVars(parsed);
    const cssVars = Object.entries(vars)
      .map(([k, v]) => `${k}:${v}`)
      .join(";");

    return `:root{${cssVars}}`;
  } catch {
    const vars = deriveThemeVars(DEFAULT_THEME);
    const cssVars = Object.entries(vars)
      .map(([k, v]) => `${k}:${v}`)
      .join(";");
    return `:root{${cssVars}}`;
  }
}

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeCss = await getInitialThemeCss();

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
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <Header />
          {children}
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
