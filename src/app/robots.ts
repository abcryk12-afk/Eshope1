import type { MetadataRoute } from "next";

import { getSiteOrigin } from "@/lib/seo";

export const runtime = "nodejs";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();

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
    host: origin,
  };
}
