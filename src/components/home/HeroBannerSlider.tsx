"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type React from "react";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade, Keyboard, Navigation, Pagination } from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export type HeroBanner = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  desktopImage: string;
  mobileImage: string;
  href: string;
  buttonText: string;
  buttonHref: string;
  textAlign: "left" | "center" | "right";
  verticalAlign: "top" | "center" | "bottom";
  overlayColor: string;
  overlayOpacity: number;
  textColor: string;
  buttonColor: string;
};

export type HeroBannerSettings = {
  desktopHeightPx: number;
  mobileHeightPx: number;
  aspectMode: "height" | "ratio";
  aspectRatio: string;
  customAspectW: number;
  customAspectH: number;
  fitMode: "cover" | "contain";
  autoplayEnabled: boolean;
  autoplayDelayMs: number;
  loop: boolean;
  showDots: boolean;
  showArrows: boolean;
  transitionSpeedMs: number;
  animation: "slide" | "fade";
  keyboard: boolean;
};

type Props = {
  banners: HeroBanner[];
  settings: HeroBannerSettings;
};

function safeSrc(src: string) {
  const v = String(src || "").trim();
  if (!v) return "";
  if (v.startsWith("/")) return v;
  if (v.startsWith("http://")) return v;
  if (v.startsWith("https://")) return v;
  return "";
}

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

export default function HeroBannerSlider({ banners, settings }: Props) {
  const router = useRouter();

  const safe = (banners ?? []).filter((b) => {
    const src = safeSrc(b.mobileImage) || safeSrc(b.desktopImage) || safeSrc(b.image);
    return Boolean(src);
  });

  if (!safe.length) return null;

  const baseRatio = settings.aspectRatio?.trim() || "16/9";
  const customRatio = `${Math.max(1, Math.trunc(settings.customAspectW || 16))} / ${Math.max(1, Math.trunc(settings.customAspectH || 9))}`;
  const ratio = baseRatio === "custom" ? customRatio : baseRatio;

  const heightMode = settings.aspectMode !== "ratio";

  const rootStyle: React.CSSProperties = {
    ...(heightMode
      ? {
          ["--hero-h-mobile" as string]: `${Math.max(180, Math.trunc(settings.mobileHeightPx || 360))}px`,
          ["--hero-h-desktop" as string]: `${Math.max(200, Math.trunc(settings.desktopHeightPx || 520))}px`,
        }
      : {
          aspectRatio: ratio,
        }),
  };

  return (
    <section
      className={cn(
        "w-full",
        heightMode
          ? "h-[var(--hero-h-mobile)] md:h-[var(--hero-h-desktop)]"
          : "h-auto"
      )}
      style={rootStyle}
    >
      <Swiper
        modules={[Autoplay, Pagination, Navigation, Keyboard, EffectFade]}
        className="h-full w-full"
        slidesPerView={1}
        centeredSlides
        loop={settings.loop}
        speed={settings.transitionSpeedMs}
        effect={settings.animation === "fade" ? "fade" : "slide"}
        fadeEffect={settings.animation === "fade" ? { crossFade: true } : undefined}
        autoplay={
          settings.autoplayEnabled
            ? { delay: settings.autoplayDelayMs, disableOnInteraction: false, pauseOnMouseEnter: true }
            : false
        }
        pagination={settings.showDots ? { clickable: true } : false}
        navigation={settings.showArrows}
        keyboard={settings.keyboard ? { enabled: true } : false}
        watchSlidesProgress
      >
        {safe.map((b, idx) => {
          const desktopSrc = safeSrc(b.desktopImage) || safeSrc(b.image);
          const mobileSrc = safeSrc(b.mobileImage) || desktopSrc;

          const hasLink = isSafeHref(b.href);
          const hasButtonLink = isSafeHref(b.buttonHref);

          const textAlignClass =
            b.textAlign === "center" ? "items-center text-center" : b.textAlign === "right" ? "items-end text-right" : "items-start text-left";

          const vAlignClass =
            b.verticalAlign === "top" ? "justify-start" : b.verticalAlign === "bottom" ? "justify-end" : "justify-center";

          const imgClass = settings.fitMode === "contain" ? "object-contain" : "object-cover";

          const content = (
            <div className="relative h-full w-full overflow-hidden">
              <div className="absolute inset-0">
                <Image
                  src={desktopSrc}
                  alt={b.title?.trim() || "Hero banner"}
                  fill
                  sizes="100vw"
                  className={cn(imgClass, "hidden md:block")}
                  priority={idx === 0}
                />
                <Image
                  src={mobileSrc}
                  alt={b.title?.trim() || "Hero banner"}
                  fill
                  sizes="100vw"
                  className={cn(imgClass, "block md:hidden")}
                  priority={idx === 0}
                />
              </div>

              <div
                className="absolute inset-0"
                style={{ backgroundColor: b.overlayColor || "#000000", opacity: Math.max(0, Math.min(1, b.overlayOpacity ?? 0.25)) }}
              />

              <div className={cn("relative h-full w-full", "flex")}
                style={{ color: b.textColor || "#ffffff" }}
              >
                <div className={cn("mx-auto flex h-full w-full max-w-6xl px-4 py-10", vAlignClass)}>
                  <div className={cn("flex w-full max-w-2xl flex-col gap-3", textAlignClass)}>
                    {b.title?.trim() ? (
                      <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
                        {b.title}
                      </h2>
                    ) : null}
                    {b.subtitle?.trim() ? (
                      <p className="text-pretty text-sm opacity-95 sm:text-base md:text-lg">
                        {b.subtitle}
                      </p>
                    ) : null}

                    {(hasButtonLink || hasLink) && (b.buttonText?.trim() || "Shop now") ? (
                      <div className={cn("pt-2", b.textAlign === "center" ? "flex justify-center" : b.textAlign === "right" ? "flex justify-end" : "flex justify-start")}>
                        <Link href={hasButtonLink ? b.buttonHref : b.href}>
                          <Button
                            variant="secondary"
                            className="border border-white/20"
                            style={{
                              backgroundColor: b.buttonColor || "#ffffff",
                              color: "#000000",
                            }}
                          >
                            {(b.buttonText?.trim() || "Shop now")}
                          </Button>
                        </Link>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );

          return (
            <SwiperSlide key={b.id || String(idx)} className="h-full w-full">
              {hasLink ? (
                <div
                  role="link"
                  tabIndex={0}
                  className="block h-full w-full cursor-pointer"
                  onClick={() => router.push(b.href!)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(b.href!);
                    }
                  }}
                >
                  {content}
                </div>
              ) : (
                content
              )}
            </SwiperSlide>
          );
        })}
      </Swiper>
    </section>
  );
}
