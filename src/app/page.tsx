import type { Metadata } from "next";

import StorefrontClient from "@/app/StorefrontClient";
import { absoluteUrl } from "@/lib/seo";
import { getPublicSeoSettings } from "@/lib/siteBranding";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
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

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const resolvedSearchParams = (await searchParams) ?? {};
  const hasQuery = hasAnyQueryParams(resolvedSearchParams);

  const settings = await getPublicSeoSettings();

  const title = settings.siteName?.trim() || "Shop";
  const description = settings.description?.trim() || "";
  const canonical = absoluteUrl("/");

  return {
    title: { absolute: title },
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
  const resolvedSearchParams = (await searchParams) ?? {};

  return (
    <StorefrontClient
      key={JSON.stringify(resolvedSearchParams)}
      initialSearchParams={resolvedSearchParams}
    />
  );
}
