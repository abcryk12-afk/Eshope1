import type { Metadata } from "next";

import StorefrontClient from "@/app/StorefrontClient";
import { absoluteUrl } from "@/lib/seo";
import { getPublicSeoSettings } from "@/lib/siteBranding";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readString(v: string | string[] | undefined) {
  if (!v) return "";
  return Array.isArray(v) ? v[0] ?? "" : v;
}

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

  const title = (settings.siteName?.trim() || "Shop") + " - Products";
  const description = settings.description?.trim() || "";
  const canonical = absoluteUrl("/products");

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

export default async function ProductsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};

  const search = readString(resolvedSearchParams.search);
  const q = readString(resolvedSearchParams.q);

  const merged: Record<string, string | string[] | undefined> = {
    ...resolvedSearchParams,
    q: search.trim() ? search.trim() : q,
  };

  return (
    <StorefrontClient
      key={JSON.stringify(merged)}
      initialSearchParams={merged}
      basePath="/products"
      pageTitle="Products"
    />
  );
}
