export function getSiteOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
    "http://localhost:3000";

  try {
    const url = new URL(raw);
    return url.origin;
  } catch {
    return "http://localhost:3000";
  }
}

export function absoluteUrl(pathname: string): string {
  const origin = getSiteOrigin();
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${origin}${path}`;
}

export function stripHtmlToText(html: string): string {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(text: string, maxLen: number): string {
  const s = String(text || "").trim();
  if (s.length <= maxLen) return s;
  return `${s.slice(0, Math.max(0, maxLen - 1)).trim()}…`;
}

export function normalizeImageUrl(src: string): string {
  const v = String(src || "").trim();
  if (!v) return "";

  if (v.startsWith("/")) {
    return absoluteUrl(v);
  }

  return v;
}

export function safeJsonLdStringify(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

type ProductForJsonLd = {
  _id: string;
  title: string;
  slug: string;
  description: string;
  images?: string[];
  basePrice?: number;
  compareAtPrice?: number;
  stock?: number;
  variants?: Array<{ _id: string; sku: string; price: number; stock: number; images?: string[] }>;
  brand?: string;
  storeName?: string;
  ratingAvg?: number;
  ratingCount?: number;
  category?: string;
};

function computeOffer(product: ProductForJsonLd) {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const prices = [
    typeof product.basePrice === "number" ? product.basePrice : undefined,
    ...variants.map((v) => (typeof v.price === "number" ? v.price : undefined)),
  ].filter((x): x is number => typeof x === "number" && Number.isFinite(x) && x >= 0);

  const price = prices.length ? Math.min(...prices) : 0;

  const hasVariantStock = variants.some((v) => typeof v.stock === "number" && v.stock > 0);
  const hasStock =
    typeof product.stock === "number"
      ? product.stock > 0
      : variants.length
        ? hasVariantStock
        : true;

  const availability = hasStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";

  return { price, availability };
}

export function buildProductJsonLd(product: ProductForJsonLd) {
  const url = absoluteUrl(`/product/${encodeURIComponent(product.slug)}`);

  const imagesRaw = [
    ...(Array.isArray(product.images) ? product.images : []),
    ...((product.variants ?? []).flatMap((v) => (Array.isArray(v.images) ? v.images : [])) ?? []),
  ]
    .map(normalizeImageUrl)
    .filter(Boolean)
    .slice(0, 10);

  const descText = truncate(stripHtmlToText(product.description ?? ""), 5000);

  const offer = computeOffer(product);

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: descText,
    image: imagesRaw.length ? imagesRaw : undefined,
    sku: (product.variants?.[0]?.sku || product.slug || product._id) ?? undefined,
    url,
    brand: product.brand || product.storeName ? { "@type": "Brand", name: product.brand || product.storeName } : undefined,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "PKR",
      price: offer.price,
      availability: offer.availability,
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  if (typeof product.ratingCount === "number" && product.ratingCount > 0) {
    const ratingValue = typeof product.ratingAvg === "number" ? product.ratingAvg : 0;

    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Math.max(1, Math.min(5, Number(ratingValue.toFixed(2)))),
      reviewCount: product.ratingCount,
    };
  }

  return jsonLd;
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: it.name,
      item: it.url,
    })),
  };
}
