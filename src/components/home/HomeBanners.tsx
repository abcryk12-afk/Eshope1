"use client";

import Image from "next/image";
import Link from "next/link";

import Skeleton from "@/components/ui/Skeleton";
import { useStorefrontSettings } from "@/hooks/useStorefrontSettings";

type Banner = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  href: string;
};

type HomeBannersProps = {
  banners: Banner[];
  loading?: boolean;
};

function isSafeHref(href: string) {
  const v = String(href || "").trim();
  if (!v) return false;
  if (v.startsWith("/")) return true;
  if (v.startsWith("#")) return true;

  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function HomeBanners({ banners, loading }: HomeBannersProps) {
  const { settings } = useStorefrontSettings();
  const style = settings?.storefrontLayout?.productCard?.style ?? "rounded";

  const bannerRadius =
    style === "squared"
      ? "var(--radius-none)"
      : style === "image_first"
        ? "var(--radius-md)"
        : style === "poster"
          ? "var(--radius-lg)"
          : "var(--radius-xl)";

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="overflow-hidden border border-border bg-surface p-3"
            style={{ borderRadius: bannerRadius }}
          >
            <Skeleton className="aspect-16/10 w-full" style={{ borderRadius: bannerRadius }} />
            <Skeleton className="mt-3 h-4 w-2/3" />
            <Skeleton className="mt-2 h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  const safe = banners
    .filter((b) => typeof b?.image === "string" && Boolean(b.image.trim()))
    .slice(0, 3);

  if (!safe.length) return null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {safe.map((b) => {
        const isPoster = style === "poster";
        const isImageFirst = style === "image_first";

        const content = (
          <div
            className="group overflow-hidden border border-border bg-surface"
            style={{ borderRadius: bannerRadius }}
          >
            <div className="relative aspect-3/2 md:aspect-3/1 w-full bg-muted">
              <Image
                src={b.image}
                alt={b.title || "Banner"}
                fill
                className="object-cover transition duration-500 group-hover:scale-[1.03]"
                unoptimized
              />

              {isPoster && (b.title || b.subtitle) ? (
                <div className="absolute inset-x-2 bottom-2">
                  <div
                    className="bg-foreground/60 p-3 text-background backdrop-blur-sm ring-1 ring-foreground/10"
                    style={{ borderRadius: "var(--radius-md)" }}
                  >
                    {b.title ? (
                      <p className="text-sm font-semibold tracking-tight">{b.title}</p>
                    ) : null}
                    {b.subtitle ? (
                      <p className="mt-1 line-clamp-2 text-xs text-background/90">{b.subtitle}</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            {!isPoster && (b.title || b.subtitle) ? (
              <div className={isImageFirst ? "p-2" : "p-4"}>
                {b.title ? (
                  <p className="text-base font-semibold tracking-tight text-foreground">{b.title}</p>
                ) : null}
                {b.subtitle ? (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{b.subtitle}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        );

        return isSafeHref(b.href) ? (
          <Link key={b.id || b.title} href={b.href} className="block">
            {content}
          </Link>
        ) : (
          <div key={b.id || b.title}>{content}</div>
        );
      })}
    </div>
  );
}
