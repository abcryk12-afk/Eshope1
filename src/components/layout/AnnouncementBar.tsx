"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useStorefrontSettings } from "@/hooks/useStorefrontSettings";
import type { AnnouncementItem } from "@/lib/shipping";

function safeParseJson<T>(v: string | null): T | null {
  if (!v) return null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

function matchesPath(item: AnnouncementItem, pathname: string) {
  const mode = item.visibility.pageMode;
  const paths = item.visibility.paths;
  if (mode === "all" || paths.length === 0) return true;

  const hit = paths.some((p) => {
    const raw = String(p ?? "").trim();
    if (!raw) return false;
    if (raw === pathname) return true;
    if (raw.endsWith("*") && pathname.startsWith(raw.slice(0, -1))) return true;
    return false;
  });

  return mode === "include" ? hit : !hit;
}

function matchesDevice(item: AnnouncementItem) {
  if (typeof window === "undefined") return true;
  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  if (item.visibility.device === "all") return true;
  if (item.visibility.device === "mobile") return isMobile;
  return !isMobile;
}

function ensureIds(list: AnnouncementItem[]) {
  return list.map((a, idx) => ({ ...a, id: a.id || `a_${idx}` }));
}

const STORAGE_KEY = "shop.announcement_bar.dismiss";

type DismissState = {
  at: number;
};

export default function AnnouncementBar() {
  const { settings } = useStorefrontSettings();
  const pathname = usePathname() || "/";

  const cfg = settings?.announcementBar;
  const announcements = settings?.announcements;

  const [dismissedAt, setDismissedAt] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const trackRef = useRef<HTMLDivElement | null>(null);
  const marqueeContentRef = useRef<HTMLDivElement | null>(null);
  const marqueeRafRef = useRef<number | null>(null);

  useEffect(() => {
    const s = safeParseJson<DismissState>(typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null);
    const t = typeof s?.at === "number" ? s.at : 0;
    setDismissedAt(t);
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const filtered = useMemo(() => {
    if (!cfg?.enabled) return [] as AnnouncementItem[];
    if (cfg.showOn === "home_only" && pathname !== "/") return [] as AnnouncementItem[];

    const list = announcements ?? [];

    return ensureIds(list)
      .filter((a) => a.enabled)
      .filter((a) => a.html)
      .filter((a) => matchesPath(a, pathname))
      .filter((a) => matchesDevice(a));
  }, [cfg?.enabled, cfg?.showOn, announcements, pathname]);

  const canShow = Boolean(cfg?.enabled) && filtered.length > 0;
  const ttlMs = Math.max(0, Math.trunc((cfg?.dismissTtlHours ?? 24) * 3600 * 1000));
  const dismissed = dismissedAt > 0 && (ttlMs === 0 ? true : now - dismissedAt < ttlMs);

  const visible = canShow && !dismissed;

  useEffect(() => {
    if (!visible) {
      document.documentElement.style.setProperty("--announcement-offset", "0px");
      return;
    }

    const h = Math.max(0, Math.trunc(cfg?.heightPx ?? 36));
    document.documentElement.style.setProperty("--announcement-offset", `${h}px`);

    return () => {
      document.documentElement.style.setProperty("--announcement-offset", "0px");
    };
  }, [visible, cfg?.heightPx]);

  useEffect(() => {
    if (!visible) return;
    setActiveIndex(0);
  }, [visible, filtered.length]);

  useEffect(() => {
    if (!visible) return;
    if (!cfg) return;

    if (cfg.mode !== "slide" && cfg.mode !== "fade") return;
    if (filtered.length <= 1) return;

    const interval = Math.max(800, Math.trunc(cfg.slideIntervalMs || 3500));
    const t = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % filtered.length);
    }, interval);

    return () => window.clearInterval(t);
  }, [visible, cfg, filtered.length]);

  useEffect(() => {
    if (!visible) return;
    if (!cfg) return;
    if (cfg.mode !== "marquee_ltr" && cfg.mode !== "marquee_rtl") return;

    const speedSetting = Math.max(10, Math.min(600, Math.trunc(cfg.marqueeSpeedPxPerSec || 60)));

    function tick() {
      const content = marqueeContentRef.current;
      const track = trackRef.current;
      if (!content || !track) {
        marqueeRafRef.current = window.requestAnimationFrame(tick);
        return;
      }

      const contentW = content.scrollWidth;
      const trackW = track.clientWidth;

      const speed = speedSetting;
      const distance = Math.max(1, contentW + trackW);
      const duration = Math.max(4, Math.round((distance / speed) * 100) / 100);

      track.style.setProperty("--marquee-duration", `${duration}s`);
      marqueeRafRef.current = window.requestAnimationFrame(tick);
    }

    marqueeRafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (marqueeRafRef.current) window.cancelAnimationFrame(marqueeRafRef.current);
      marqueeRafRef.current = null;
    };
  }, [visible, cfg]);

  function dismiss() {
    const at = Date.now();
    setDismissedAt(at);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ at } satisfies DismissState));
    } catch {
    }
  }

  if (!visible || !cfg) return null;

  const bgStyle: React.CSSProperties = cfg.background.gradientEnabled
    ? { backgroundImage: cfg.background.gradientCss }
    : { backgroundColor: cfg.background.solid };

  const textStyle: React.CSSProperties = {
    color: cfg.textColor || "#ffffff",
  };

  const borderStyle: React.CSSProperties = cfg.border.enabled
    ? { borderBottom: `${Math.max(0, Math.trunc(cfg.border.thicknessPx || 1))}px solid ${cfg.border.color}` }
    : {};

  const baseClass = cn(
    "announcement-bar",
    cfg.position === "sticky" ? "sticky" : "fixed",
    "left-0 right-0 top-0 z-[60]",
    cfg.shadowEnabled && "shadow-lg",
    "text-sm"
  );

  const innerClass = cn("mx-auto relative flex w-full max-w-6xl items-center");

  const rowJustifyClass =
    cfg.textAlign === "center" ? "justify-center" : cfg.textAlign === "right" ? "justify-end" : "justify-start";

  const paddingStyle: React.CSSProperties = {
    paddingLeft: Math.max(0, Math.trunc(cfg.paddingX || 0)),
    paddingRight: Math.max(0, Math.trunc(cfg.paddingX || 0)),
    paddingTop: Math.max(0, Math.trunc(cfg.paddingY || 0)),
    paddingBottom: Math.max(0, Math.trunc(cfg.paddingY || 0)),
    height: Math.max(24, Math.trunc(cfg.heightPx || 36)),
  };

  const transition = `${Math.max(100, Math.trunc(cfg.transitionMs || 350))}ms ${cfg.easing || "cubic-bezier(0.22, 1, 0.36, 1)"}`;

  const active = filtered[Math.min(activeIndex, filtered.length - 1)]!;

  const contentNode = (
    <div
      className={cn(
        "min-w-0 whitespace-nowrap",
        "[&_p]:m-0 [&_p]:inline",
        "[&_p+_p]:before:content-['\\00a0']",
        "[&_a]:underline [&_a]:underline-offset-2",
        "[&_[data-fx='blink']]:animate-announcement-blink",
        "[&_[data-fx='pulse']]:animate-announcement-pulse"
      )}
      dangerouslySetInnerHTML={{ __html: active.html }}
    />
  );

  const clickable = Boolean(active.href && active.href.trim());

  function wrapNode(node: React.ReactNode) {
    if (!clickable) return node;
    return (
      <Link
        href={active.href}
        className="min-w-0"
        target={active.newTab ? "_blank" : undefined}
        rel={active.newTab ? "noreferrer" : undefined}
      >
        {node}
      </Link>
    );
  }

  return (
    <div className={baseClass} style={{ ...bgStyle, ...borderStyle, ...textStyle }}>
      <div className={innerClass} style={paddingStyle}>
        <div className={cn("flex w-full min-w-0 items-center gap-3", rowJustifyClass)}>
          {cfg.mode === "marquee_ltr" || cfg.mode === "marquee_rtl" ? (
            <div
              ref={trackRef}
              className={cn(
                "w-full overflow-hidden",
                "[--marquee-duration:12s]"
              )}
            >
              <div
                className={cn(
                  "flex w-max items-center gap-10",
                  cfg.mode === "marquee_rtl" ? "animate-announcement-marquee-rtl" : "animate-announcement-marquee-ltr"
                )}
                style={{ animationDuration: "var(--marquee-duration)" }}
              >
                <div ref={marqueeContentRef} className="flex items-center gap-10">
                  {wrapNode(contentNode)}
                  {active.cta?.enabled && active.cta.label && active.cta.href ? (
                    <Link
                      href={active.cta.href}
                      target={active.cta.newTab ? "_blank" : undefined}
                      rel={active.cta.newTab ? "noreferrer" : undefined}
                      className="shrink-0"
                    >
                      <span
                        className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition"
                        style={{ backgroundColor: active.cta.style.bg, color: active.cta.style.text }}
                      >
                        {active.cta.label}
                      </span>
                    </Link>
                  ) : null}
                </div>
                <div className="flex items-center gap-10" aria-hidden="true">
                  {wrapNode(contentNode)}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex w-full min-w-0 items-center justify-between gap-3">
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="relative w-full min-h-[1.25rem] overflow-hidden">
                  {filtered.map((a, idx) => {
                    const show = idx === activeIndex;
                    const mode = cfg.mode;
                    const base = cn("absolute inset-0 flex w-full items-center", rowJustifyClass);
                    const cls =
                      mode === "fade"
                        ? cn(base, show ? "opacity-100" : "opacity-0")
                        : cn(
                            base,
                            show ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                          );

                    return (
                      <div
                        key={a.id}
                        className={cls}
                        style={{ transition }}
                        aria-hidden={!show}
                      >
                        <div
                          className={cn(
                            "min-w-0 whitespace-nowrap",
                            "[&_p]:m-0 [&_p]:inline",
                            "[&_p+_p]:before:content-['\\00a0']",
                            "[&_a]:underline [&_a]:underline-offset-2",
                            "[&_[data-fx='blink']]:animate-announcement-blink",
                            "[&_[data-fx='pulse']]:animate-announcement-pulse"
                          )}
                        >
                          {a.href ? (
                            <Link
                              href={a.href}
                              target={a.newTab ? "_blank" : undefined}
                              rel={a.newTab ? "noreferrer" : undefined}
                              dangerouslySetInnerHTML={{ __html: a.html }}
                            />
                          ) : (
                            <span dangerouslySetInnerHTML={{ __html: a.html }} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {active.cta?.enabled && active.cta.label && active.cta.href ? (
                <Link
                  href={active.cta.href}
                  target={active.cta.newTab ? "_blank" : undefined}
                  rel={active.cta.newTab ? "noreferrer" : undefined}
                  className="shrink-0"
                >
                  <span
                    className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition"
                    style={{ backgroundColor: active.cta.style.bg, color: active.cta.style.text }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = active.cta.style.hoverBg;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = active.cta.style.bg;
                    }}
                  >
                    {active.cta.label}
                  </span>
                </Link>
              ) : null}
            </div>
          )}
        </div>

        {cfg.closeButtonEnabled ? (
          <button
            type="button"
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2",
              cfg.closeButtonVariant === "pill"
                ? "inline-flex h-8 items-center gap-1 rounded-full bg-white/10 px-2 text-xs font-semibold hover:bg-white/15"
                : "inline-flex h-8 w-8 items-center justify-center rounded-xl hover:bg-white/10",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            )}
            onClick={dismiss}
            aria-label="Dismiss announcement"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
