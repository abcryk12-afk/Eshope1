"use client";

import Image from "next/image";
import Link from "next/link";

import Skeleton from "@/components/ui/Skeleton";

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
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="overflow-hidden rounded-3xl border border-border bg-surface p-3">
            <Skeleton className="aspect-16/10 w-full rounded-2xl" />
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
        const content = (
          <div className="group overflow-hidden rounded-3xl border border-border bg-surface">
            <div className="relative aspect-3/2 md:aspect-3/1 w-full bg-muted">
              <Image
                src={b.image}
                alt={b.title || "Banner"}
                fill
                className="object-cover transition duration-500 group-hover:scale-[1.03]"
                unoptimized
              />
            </div>

            {(b.title || b.subtitle) ? (
              <div className="p-4">
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
