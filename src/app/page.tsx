import type { Metadata } from "next";

import StorefrontClient from "@/app/StorefrontClient";
import { dbConnect } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo";
import SiteSetting from "@/models/SiteSetting";

type PageProps = {
  searchParams: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
};

type GlobalSeoSettings = {
  globalSeoTitle?: string;
  globalSeoDescription?: string;
};

function hasAnyQueryParams(sp: Record<string, string | string[] | undefined>) {
  for (const v of Object.values(sp)) {
    if (!v) continue;
    if (Array.isArray(v)) {
      if (v.some((x) => String(x ?? "").trim().length > 0)) return true;
      continue;
    }
    if (String(v).trim().length > 0) return true;
  }
  return false;
}

async function getGlobalSeoSettings(): Promise<GlobalSeoSettings> {
  await dbConnect();

  const settings = (await SiteSetting.findOne({ key: "global" })
    .select("globalSeoTitle globalSeoDescription")
    .lean()) as unknown;

  const root = settings as Record<string, unknown> | null;

  return {
    globalSeoTitle: typeof root?.globalSeoTitle === "string" ? root.globalSeoTitle : undefined,
    globalSeoDescription:
      typeof root?.globalSeoDescription === "string" ? root.globalSeoDescription : undefined,
  };
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const hasQuery = hasAnyQueryParams(resolvedSearchParams);

  const settings = await getGlobalSeoSettings();

  const title = settings.globalSeoTitle?.trim() || "Shop";
  const description = settings.globalSeoDescription?.trim() || "";
  const canonical = absoluteUrl("/");

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    robots: {
      index: !hasQuery,
      follow: true,
    },
  };
}

export default async function Home({ searchParams }: PageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);

  return (
    <StorefrontClient
      key={JSON.stringify(resolvedSearchParams)}
      initialSearchParams={resolvedSearchParams}
    />
  );
}
