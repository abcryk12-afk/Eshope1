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

  if (!banners.length) return null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {banners.slice(0, 3).map((b) => {
        const content = (
          <div className="group overflow-hidden rounded-3xl border border-border bg-surface">
            <div className="relative aspect-16/10 w-full bg-muted">
              {b.image ? (
                <Image
                  src={b.image}
                  alt={b.title || "Banner"}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  unoptimized
                />
              ) : null}
              <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/45 via-black/10 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-4">
                {b.title ? (
                  <p className="text-base font-semibold tracking-tight text-white">
                    {b.title}
                  </p>
                ) : null}
                {b.subtitle ? (
                  <p className="mt-1 line-clamp-2 text-sm text-white/85">
                    {b.subtitle}
                  </p>
                ) : null}
              </div>
            </div>
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
