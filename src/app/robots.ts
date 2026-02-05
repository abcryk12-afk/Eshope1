import type { MetadataRoute } from "next";

import { getSiteOrigin } from "@/lib/seo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();
  let host = origin;

  try {
    host = new URL(origin).hostname;
  } catch {
    host = origin.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/admin/",
          "/account/",
          "/checkout/",
          "/cart/",
          "/my-orders/",
          "/order/",
          "/api/",
          "/login",
          "/signup",
        ],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host,
  };
}
