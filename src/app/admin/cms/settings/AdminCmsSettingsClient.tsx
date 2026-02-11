"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, RefreshCw, Trash2, Upload } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { cn } from "@/lib/utils";

type Banner = {
  title?: string;
  subtitle?: string;
  image?: string;
  desktopImage?: string;
  mobileImage?: string;
  href?: string;
  buttonText?: string;
  buttonHref?: string;
  textAlign?: "left" | "center" | "right";
  verticalAlign?: "top" | "center" | "bottom";
  overlayColor?: string;
  overlayOpacity?: number;
  textColor?: string;
  buttonColor?: string;
  isActive?: boolean;
};

type HeroBannerSettings = {
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

type AnnouncementBarMode = "static" | "slide" | "fade" | "marquee_ltr" | "marquee_rtl";

type AnnouncementBarSettings = {
  enabled: boolean;
  position: "fixed" | "sticky";
  showOn: "all" | "home_only";
  heightPx: number;
  paddingX: number;
  paddingY: number;
  textAlign: "left" | "center" | "right";
  textColor: string;
  background: {
    solid: string;
    gradientEnabled: boolean;
    gradientCss: string;
  };
  border: {
    enabled: boolean;
    color: string;
    thicknessPx: number;
  };
  shadowEnabled: boolean;
  closeButtonEnabled: boolean;
  closeButtonVariant: "minimal" | "pill";
  dismissTtlHours: number;
  mode: AnnouncementBarMode;
  marqueeSpeedPxPerSec: number;
  slideIntervalMs: number;
  transitionMs: number;
  easing: string;
};

type AnnouncementItem = {
  id: string;
  enabled: boolean;
  html: string;
  href: string;
  newTab: boolean;
  schedule: { startAt: number | null; endAt: number | null };
  visibility: { device: "all" | "desktop" | "mobile"; pageMode: "all" | "include" | "exclude"; paths: string[] };
  cta: {
    enabled: boolean;
    label: string;
    href: string;
    newTab: boolean;
    style: { bg: string; text: string; hoverBg: string };
  };
};

type LocalizedText = Record<string, string | undefined>;

type FooterLink = {
  href?: string;
  label?: LocalizedText;
};

type FooterSection = {
  title?: LocalizedText;
  links?: FooterLink[];
};

type FooterSocialLink = {
  kind?: string;
  href?: string;
  label?: LocalizedText;
};

type FooterSettings = {
  text?: LocalizedText;
  sections?: FooterSection[];
  policyLinks?: FooterLink[];
  socialLinks?: FooterSocialLink[];
};

type Settings = {
  homeBanners: Banner[];
  heroBanners: Banner[];
  heroBannerSettings: HeroBannerSettings;
  announcementBar: AnnouncementBarSettings;
  announcements: AnnouncementItem[];
  footerText: string;
  footer: FooterSettings | null;
  globalSeoTitle: string;
  globalSeoDescription: string;
  whatsAppSalesPhone: string;
  whatsAppProductTemplate: string;
  whatsAppOrderTemplate: string;
  returnsWindowDays: number;
  inventoryLowStockThreshold: number;
  shippingDefaultFee: number;
  shippingFreeAboveSubtotal: number | null;
  shippingEtaMinDays: number;
  shippingEtaMaxDays: number;
  shippingCityRules: Array<{
    city: string;
    fee?: number;
    freeAboveSubtotal?: number | null;
    etaMinDays?: number;
    etaMaxDays?: number;
  }>;
};

type ApiResponse = { settings: Settings };

const FOOTER_LANGS = ["en", "ur"] as const;
type FooterLang = (typeof FOOTER_LANGS)[number];

function readLocalized(value: LocalizedText | undefined, lang: FooterLang) {
  const v = value?.[lang];
  return typeof v === "string" ? v : "";
}

function defaultAnnouncementBarSettings(): AnnouncementBarSettings {
  return {
    enabled: false,
    position: "fixed",
    showOn: "all",
    heightPx: 36,
    paddingX: 16,
    paddingY: 6,
    textAlign: "center",
    textColor: "#ffffff",
    background: {
      solid: "#0f172a",
      gradientEnabled: false,
      gradientCss: "linear-gradient(90deg,#0f172a,#111827)",
    },
    border: { enabled: false, color: "rgba(255,255,255,0.12)", thicknessPx: 1 },
    shadowEnabled: false,
    closeButtonEnabled: true,
    closeButtonVariant: "minimal",
    dismissTtlHours: 24,
    mode: "static",
    marqueeSpeedPxPerSec: 60,
    slideIntervalMs: 3500,
    transitionMs: 350,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  };
}

function normalizeAnnouncementBarSettings(raw: unknown): AnnouncementBarSettings {
  const d = defaultAnnouncementBarSettings();
  if (!isRecord(raw)) return d;
  const r = raw as Record<string, unknown>;

  const background = isRecord(r.background) ? (r.background as Record<string, unknown>) : {};
  const border = isRecord(r.border) ? (r.border as Record<string, unknown>) : {};

  const modeRaw = String(r.mode ?? "").trim();
  const mode: AnnouncementBarMode =
    modeRaw === "slide" ||
    modeRaw === "fade" ||
    modeRaw === "marquee_ltr" ||
    modeRaw === "marquee_rtl" ||
    modeRaw === "static"
      ? (modeRaw as AnnouncementBarMode)
      : d.mode;

  return {
    enabled: typeof r.enabled === "boolean" ? r.enabled : d.enabled,
    position: r.position === "sticky" ? "sticky" : "fixed",
    showOn: r.showOn === "home_only" ? "home_only" : "all",
    heightPx: clampInt(typeof r.heightPx === "number" ? r.heightPx : d.heightPx, 24, 120),
    paddingX: clampInt(typeof r.paddingX === "number" ? r.paddingX : d.paddingX, 0, 48),
    paddingY: clampInt(typeof r.paddingY === "number" ? r.paddingY : d.paddingY, 0, 24),
    textAlign: r.textAlign === "left" ? "left" : r.textAlign === "right" ? "right" : "center",
    textColor: typeof r.textColor === "string" && r.textColor.trim() ? r.textColor.trim() : d.textColor,
    background: {
      solid: typeof background.solid === "string" ? background.solid : d.background.solid,
      gradientEnabled: typeof background.gradientEnabled === "boolean" ? background.gradientEnabled : d.background.gradientEnabled,
      gradientCss: typeof background.gradientCss === "string" ? background.gradientCss : d.background.gradientCss,
    },
    border: {
      enabled: typeof border.enabled === "boolean" ? border.enabled : d.border.enabled,
      color: typeof border.color === "string" ? border.color : d.border.color,
      thicknessPx: clampInt(typeof border.thicknessPx === "number" ? border.thicknessPx : d.border.thicknessPx, 0, 6),
    },
    shadowEnabled: typeof r.shadowEnabled === "boolean" ? r.shadowEnabled : d.shadowEnabled,
    closeButtonEnabled: typeof r.closeButtonEnabled === "boolean" ? r.closeButtonEnabled : d.closeButtonEnabled,
    closeButtonVariant: r.closeButtonVariant === "pill" ? "pill" : "minimal",
    dismissTtlHours: clampInt(typeof r.dismissTtlHours === "number" ? r.dismissTtlHours : d.dismissTtlHours, 0, 720),
    mode,
    marqueeSpeedPxPerSec: clampInt(typeof r.marqueeSpeedPxPerSec === "number" ? r.marqueeSpeedPxPerSec : d.marqueeSpeedPxPerSec, 10, 600),
    slideIntervalMs: clampInt(typeof r.slideIntervalMs === "number" ? r.slideIntervalMs : d.slideIntervalMs, 800, 30000),
    transitionMs: clampInt(typeof r.transitionMs === "number" ? r.transitionMs : d.transitionMs, 100, 4000),
    easing: typeof r.easing === "string" && r.easing.trim() ? r.easing.trim() : d.easing,
  };
}

function normalizeAnnouncementItems(raw: unknown): AnnouncementItem[] {
  const arr = Array.isArray(raw) ? raw : [];
  return arr
    .filter((x) => isRecord(x))
    .map((x, idx) => {
      const r = x as Record<string, unknown>;
      const schedule = isRecord(r.schedule) ? (r.schedule as Record<string, unknown>) : {};
      const visibility = isRecord(r.visibility) ? (r.visibility as Record<string, unknown>) : {};
      const cta = isRecord(r.cta) ? (r.cta as Record<string, unknown>) : {};
      const ctaStyle = isRecord(cta.style) ? (cta.style as Record<string, unknown>) : {};

      const id = typeof r.id === "string" && r.id.trim() ? r.id.trim() : `ann_${idx}_${Date.now()}`;

      return {
        id,
        enabled: typeof r.enabled === "boolean" ? r.enabled : true,
        html: typeof r.html === "string" ? r.html : "",
        href: typeof r.href === "string" ? r.href : "",
        newTab: typeof r.newTab === "boolean" ? r.newTab : false,
        schedule: {
          startAt: typeof schedule.startAt === "number" && Number.isFinite(schedule.startAt) ? schedule.startAt : null,
          endAt: typeof schedule.endAt === "number" && Number.isFinite(schedule.endAt) ? schedule.endAt : null,
        },
        visibility: {
          device: visibility.device === "desktop" || visibility.device === "mobile" ? visibility.device : "all",
          pageMode: visibility.pageMode === "include" || visibility.pageMode === "exclude" ? visibility.pageMode : "all",
          paths: Array.isArray(visibility.paths)
            ? (visibility.paths as unknown[]).map((p) => String(p ?? "").trim()).filter(Boolean)
            : [],
        },
        cta: {
          enabled: typeof cta.enabled === "boolean" ? cta.enabled : false,
          label: typeof cta.label === "string" ? cta.label : "",
          href: typeof cta.href === "string" ? cta.href : "",
          newTab: typeof cta.newTab === "boolean" ? cta.newTab : false,
          style: {
            bg: typeof ctaStyle.bg === "string" ? ctaStyle.bg : "#ffffff",
            text: typeof ctaStyle.text === "string" ? ctaStyle.text : "#0f172a",
            hoverBg: typeof ctaStyle.hoverBg === "string" ? ctaStyle.hoverBg : "#e5e7eb",
          },
        },
      };
    });
}

function toDatetimeLocal(ts: number | null) {
  if (!ts) return "";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string) {
  const v = String(value || "").trim();
  if (!v) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : null;
}

function hasMissing(value: LocalizedText | undefined, lang: FooterLang) {
  return !readLocalized(value, lang).trim();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readMessage(json: unknown) {
  if (!isRecord(json)) return null;
  const msg = json.message;
  return typeof msg === "string" ? msg : null;
}

function isSafeImageSrc(src: string) {
  const v = String(src || "").trim();
  if (!v) return false;
  if (v.startsWith("/")) return true;
  if (v.startsWith("http://")) return true;
  if (v.startsWith("https://")) return true;
  return false;
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function defaultHeroBannerSettings(): HeroBannerSettings {
  return {
    desktopHeightPx: 520,
    mobileHeightPx: 360,
    aspectMode: "height",
    aspectRatio: "16/9",
    customAspectW: 16,
    customAspectH: 9,
    fitMode: "cover",
    autoplayEnabled: true,
    autoplayDelayMs: 5000,
    loop: true,
    showDots: true,
    showArrows: true,
    transitionSpeedMs: 550,
    animation: "slide",
    keyboard: true,
  };
}

function normalizeHeroBannerSettings(raw: unknown): HeroBannerSettings {
  const d = defaultHeroBannerSettings();
  if (!isRecord(raw)) return d;
  const r = raw as Record<string, unknown>;
  const aspectMode = r.aspectMode === "ratio" ? "ratio" : "height";
  const fitMode = r.fitMode === "contain" ? "contain" : "cover";
  const animation = r.animation === "fade" ? "fade" : "slide";
  return {
    desktopHeightPx: clampInt(typeof r.desktopHeightPx === "number" ? r.desktopHeightPx : d.desktopHeightPx, 200, 900),
    mobileHeightPx: clampInt(typeof r.mobileHeightPx === "number" ? r.mobileHeightPx : d.mobileHeightPx, 180, 900),
    aspectMode,
    aspectRatio: typeof r.aspectRatio === "string" && r.aspectRatio.trim() ? r.aspectRatio.trim() : d.aspectRatio,
    customAspectW: clampInt(typeof r.customAspectW === "number" ? r.customAspectW : d.customAspectW, 1, 64),
    customAspectH: clampInt(typeof r.customAspectH === "number" ? r.customAspectH : d.customAspectH, 1, 64),
    fitMode,
    autoplayEnabled: typeof r.autoplayEnabled === "boolean" ? r.autoplayEnabled : d.autoplayEnabled,
    autoplayDelayMs: clampInt(typeof r.autoplayDelayMs === "number" ? r.autoplayDelayMs : d.autoplayDelayMs, 1000, 20000),
    loop: typeof r.loop === "boolean" ? r.loop : d.loop,
    showDots: typeof r.showDots === "boolean" ? r.showDots : d.showDots,
    showArrows: typeof r.showArrows === "boolean" ? r.showArrows : d.showArrows,
    transitionSpeedMs: clampInt(typeof r.transitionSpeedMs === "number" ? r.transitionSpeedMs : d.transitionSpeedMs, 100, 5000),
    animation,
    keyboard: typeof r.keyboard === "boolean" ? r.keyboard : d.keyboard,
  };
}

async function uploadBannerImage(file: File) {
  const form = new FormData();
  form.append("files", file);

  const res = await fetch("/api/upload", { method: "POST", body: form });
  const json = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    throw new Error(readMessage(json) ?? "Upload failed");
  }

  if (!isRecord(json) || !Array.isArray(json.urls) || json.urls.some((u) => typeof u !== "string")) {
    throw new Error("Invalid upload response");
  }

  const first = String((json.urls as string[])[0] ?? "").trim();
  if (!first) throw new Error("Upload failed");
  return first;
}

export default function AdminCmsSettingsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);

  const [bannerUploading, setBannerUploading] = useState<Record<number, boolean>>({});
  const bannerFileInputsRef = useRef<Record<number, HTMLInputElement | null>>({});
  const heroFileInputsRef = useRef<Record<number, { desktop?: HTMLInputElement | null; mobile?: HTMLInputElement | null }>>({});
  const [heroUploading, setHeroUploading] = useState<Record<string, boolean>>({});
  const dragFromIndexRef = useRef<number | null>(null);

  const [footerLang, setFooterLang] = useState<FooterLang>("en");

  const load = useCallback(async () => {
    setLoading(true);

    const res = await fetch("/api/admin/cms/settings", { cache: "no-store" });

    if (!res.ok) {
      toast.error("Failed to load settings");
      setSettings(null);
      setLoading(false);
      return;
    }

    const json = (await res.json()) as ApiResponse;
    setSettings({
      ...json.settings,
      heroBanners: Array.isArray((json.settings as unknown as { heroBanners?: unknown }).heroBanners)
        ? json.settings.heroBanners
        : [],
      heroBannerSettings: normalizeHeroBannerSettings(
        (json.settings as unknown as { heroBannerSettings?: unknown }).heroBannerSettings
      ),
      announcementBar: normalizeAnnouncementBarSettings(
        (json.settings as unknown as { announcementBar?: unknown }).announcementBar
      ),
      announcements: normalizeAnnouncementItems((json.settings as unknown as { announcements?: unknown }).announcements),
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function save(nextSettings?: Settings) {
    const root = nextSettings ?? settings;
    if (!root) return;

    const payload: Settings = {
      ...root,
      heroBanners: Array.isArray(root.heroBanners) ? root.heroBanners : [],
      heroBannerSettings: normalizeHeroBannerSettings(root.heroBannerSettings),
      announcementBar: normalizeAnnouncementBarSettings(root.announcementBar),
      announcements: normalizeAnnouncementItems(root.announcements),
    };

    setSaving(true);

    const res = await fetch("/api/admin/cms/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errJson = (await res.json().catch(() => null)) as unknown;
      const msg =
        typeof (errJson as { message?: unknown } | null)?.message === "string"
          ? String((errJson as { message?: string }).message)
          : "Failed to save";
      toast.error(msg);
      setSaving(false);
      return;
    }

    const json = (await res.json()) as ApiResponse;
    setSettings(json.settings);
    toast.success("Saved");

    try {
      const bc = new BroadcastChannel("storefront-settings");
      bc.postMessage({ type: "updated", at: Date.now() });
      bc.close();
    } catch {
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Site settings</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Not available.</p>
          </div>
          <Link href="/admin/cms">
            <Button variant="secondary">Back</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Site settings</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Homepage banners, footer, global SEO.</p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/cms">
            <Button variant="secondary">Back</Button>
          </Link>
          <Button variant="secondary" onClick={() => void load()} disabled={saving}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Announcement bar</h2>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={settings.announcementBar?.enabled ?? false}
                  onChange={(e) =>
                    setSettings((s) =>
                      s
                        ? {
                            ...s,
                            announcementBar: {
                              ...normalizeAnnouncementBarSettings(s.announcementBar),
                              enabled: e.target.checked,
                            },
                          }
                        : s
                    )
                  }
                />
                Enabled
              </label>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Mode</label>
                <p className="mt-1 text-xs text-zinc-500">Choose how announcements animate: static text, rotating slides, or marquee.</p>
                <select
                  value={settings.announcementBar?.mode ?? "static"}
                  onChange={(e) =>
                    setSettings((s) =>
                      s
                        ? {
                            ...s,
                            announcementBar: {
                              ...normalizeAnnouncementBarSettings(s.announcementBar),
                              mode: (e.target.value as AnnouncementBarMode) || "static",
                            },
                          }
                        : s
                    )
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                >
                  <option value="static">Static</option>
                  <option value="slide">Slide</option>
                  <option value="fade">Fade</option>
                  <option value="marquee_ltr">Marquee (L→R)</option>
                  <option value="marquee_rtl">Marquee (R→L)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Show on</label>
                <p className="mt-1 text-xs text-zinc-500">Show the bar on all pages or only on the homepage.</p>
                <select
                  value={settings.announcementBar?.showOn ?? "all"}
                  onChange={(e) =>
                    setSettings((s) =>
                      s
                        ? {
                            ...s,
                            announcementBar: {
                              ...normalizeAnnouncementBarSettings(s.announcementBar),
                              showOn: e.target.value === "home_only" ? "home_only" : "all",
                            },
                          }
                        : s
                    )
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                >
                  <option value="all">All pages</option>
                  <option value="home_only">Homepage only</option>
                </select>
              </div>

              <Input
                type="number"
                value={settings.announcementBar?.heightPx ?? 36}
                onChange={(e) =>
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          announcementBar: {
                            ...normalizeAnnouncementBarSettings(s.announcementBar),
                            heightPx: clampInt(Number(e.target.value || 0), 24, 120),
                          },
                        }
                      : s
                  )
                }
                placeholder="Height (px)"
              />

              <p className="text-xs text-zinc-500">Total bar height. Header will automatically offset by this amount.</p>

              <Input
                type="number"
                value={settings.announcementBar?.slideIntervalMs ?? 3500}
                onChange={(e) =>
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          announcementBar: {
                            ...normalizeAnnouncementBarSettings(s.announcementBar),
                            slideIntervalMs: clampInt(Number(e.target.value || 0), 800, 30000),
                          },
                        }
                      : s
                  )
                }
                placeholder="Slide interval (ms)"
              />

              <p className="text-xs text-zinc-500">Only used for Slide/Fade modes. Lower values rotate faster.</p>

              <Input
                type="number"
                value={settings.announcementBar?.marqueeSpeedPxPerSec ?? 60}
                onChange={(e) =>
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          announcementBar: {
                            ...normalizeAnnouncementBarSettings(s.announcementBar),
                            marqueeSpeedPxPerSec: clampInt(Number(e.target.value || 0), 10, 600),
                          },
                        }
                      : s
                  )
                }
                placeholder="Marquee speed (px/s)"
              />

              <p className="text-xs text-zinc-500">Only used for marquee modes. Higher values scroll faster.</p>

              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">BG</label>
                <p className="text-xs text-zinc-500">Solid background color.</p>
                <input
                  type="color"
                  value={settings.announcementBar?.background?.solid ?? "#0f172a"}
                  className="h-11 w-16 rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950"
                  onChange={(e) =>
                    setSettings((s) =>
                      s
                        ? {
                            ...s,
                            announcementBar: {
                              ...normalizeAnnouncementBarSettings(s.announcementBar),
                              background: {
                                ...normalizeAnnouncementBarSettings(s.announcementBar).background,
                                solid: String(e.target.value || "#0f172a"),
                              },
                            },
                          }
                        : s
                    )
                  }
                />

                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Text</label>
                <p className="text-xs text-zinc-500">Text color for the entire bar.</p>
                <input
                  type="color"
                  value={settings.announcementBar?.textColor ?? "#ffffff"}
                  className="h-11 w-16 rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950"
                  onChange={(e) =>
                    setSettings((s) =>
                      s
                        ? {
                            ...s,
                            announcementBar: {
                              ...normalizeAnnouncementBarSettings(s.announcementBar),
                              textColor: String(e.target.value || "#ffffff"),
                            },
                          }
                        : s
                    )
                  }
                />

                <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                  <input
                    type="checkbox"
                    checked={settings.announcementBar?.background?.gradientEnabled ?? false}
                    onChange={(e) =>
                      setSettings((s) =>
                        s
                          ? {
                              ...s,
                              announcementBar: {
                                ...normalizeAnnouncementBarSettings(s.announcementBar),
                                background: {
                                  ...normalizeAnnouncementBarSettings(s.announcementBar).background,
                                  gradientEnabled: e.target.checked,
                                },
                              },
                            }
                          : s
                      )
                    }
                  />
                  Gradient
                </label>
              </div>

              <Input
                value={settings.announcementBar?.background?.gradientCss ?? ""}
                onChange={(e) =>
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          announcementBar: {
                            ...normalizeAnnouncementBarSettings(s.announcementBar),
                            background: {
                              ...normalizeAnnouncementBarSettings(s.announcementBar).background,
                              gradientCss: e.target.value,
                            },
                          },
                        }
                      : s
                  )
                }
                placeholder="Gradient CSS (e.g. linear-gradient(...))"
              />

              <p className="text-xs text-zinc-500">When gradient is enabled, this CSS is used as the background.</p>

              <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={settings.announcementBar?.closeButtonEnabled ?? true}
                  onChange={(e) =>
                    setSettings((s) =>
                      s
                        ? {
                            ...s,
                            announcementBar: {
                              ...normalizeAnnouncementBarSettings(s.announcementBar),
                              closeButtonEnabled: e.target.checked,
                            },
                          }
                        : s
                    )
                  }
                />
                Close button
              </label>

              <p className="text-xs text-zinc-500">Lets visitors hide the bar temporarily.</p>

              <Input
                type="number"
                value={settings.announcementBar?.dismissTtlHours ?? 24}
                onChange={(e) =>
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          announcementBar: {
                            ...normalizeAnnouncementBarSettings(s.announcementBar),
                            dismissTtlHours: clampInt(Number(e.target.value || 0), 0, 720),
                          },
                        }
                      : s
                  )
                }
                placeholder="Dismiss TTL (hours)"
              />

              <p className="text-xs text-zinc-500">How long the bar stays hidden after a user closes it.</p>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Announcements</h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setSettings((s) => {
                    if (!s) return s;
                    const id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `ann_${Date.now()}`;
                    const next: AnnouncementItem = {
                      id,
                      enabled: true,
                      html: "<p>🔥 Big <span style=\"color:#ef4444\">SALE</span> — Get <span data-gradient=\"linear-gradient(90deg,#f97316,#ef4444)\" style=\"background-image:linear-gradient(90deg,#f97316,#ef4444);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;\">50% OFF</span> <span data-fx=\"blink\">Today</span></p>",
                      href: "",
                      newTab: false,
                      schedule: { startAt: null, endAt: null },
                      visibility: { device: "all", pageMode: "all", paths: [] },
                      cta: { enabled: false, label: "Shop now", href: "", newTab: false, style: { bg: "#ffffff", text: "#0f172a", hoverBg: "#e5e7eb" } },
                    };
                    return { ...s, announcements: [...(s.announcements ?? []), next] };
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>

            <div className="mt-3 space-y-3">
              {(settings.announcements ?? []).map((a, idx) => (
                <div key={a.id} className="rounded-3xl border border-zinc-200 p-4 dark:border-zinc-800">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                        <input
                          type="checkbox"
                          checked={a.enabled}
                          onChange={(e) =>
                            setSettings((s) =>
                              s
                                ? {
                                    ...s,
                                    announcements: (s.announcements ?? []).map((x) =>
                                      x.id === a.id ? { ...x, enabled: e.target.checked } : x
                                    ),
                                  }
                                : s
                            )
                          }
                        />
                        Enabled
                      </label>

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={idx === 0}
                          onClick={() =>
                            setSettings((s) => {
                              if (!s) return s;
                              const list = [...(s.announcements ?? [])];
                              if (idx <= 0) return s;
                              const t = list[idx]!;
                              list[idx] = list[idx - 1]!;
                              list[idx - 1] = t;
                              return { ...s, announcements: list };
                            })
                          }
                        >
                          Up
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={idx === (settings.announcements ?? []).length - 1}
                          onClick={() =>
                            setSettings((s) => {
                              if (!s) return s;
                              const list = [...(s.announcements ?? [])];
                              if (idx >= list.length - 1) return s;
                              const t = list[idx]!;
                              list[idx] = list[idx + 1]!;
                              list[idx + 1] = t;
                              return { ...s, announcements: list };
                            })
                          }
                        >
                          Down
                        </Button>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setSettings((s) =>
                          s
                            ? { ...s, announcements: (s.announcements ?? []).filter((x) => x.id !== a.id) }
                            : s
                        )
                      }
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  </div>

                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Rich text</p>
                    <div className="mt-2">
                      <RichTextEditor
                        value={a.html}
                        onChange={(html) =>
                          setSettings((s) =>
                            s
                              ? {
                                  ...s,
                                  announcements: (s.announcements ?? []).map((x) =>
                                    x.id === a.id ? { ...x, html } : x
                                  ),
                                }
                              : s
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Input
                      value={a.href}
                      onChange={(e) =>
                        setSettings((s) =>
                          s
                            ? {
                                ...s,
                                announcements: (s.announcements ?? []).map((x) =>
                                  x.id === a.id ? { ...x, href: e.target.value } : x
                                ),
                              }
                            : s
                        )
                      }
                      placeholder="Click link (optional)"
                    />

                    <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                      <input
                        type="checkbox"
                        checked={a.newTab}
                        onChange={(e) =>
                          setSettings((s) =>
                            s
                              ? {
                                  ...s,
                                  announcements: (s.announcements ?? []).map((x) =>
                                    x.id === a.id ? { ...x, newTab: e.target.checked } : x
                                  ),
                                }
                              : s
                          )
                        }
                      />
                      Open in new tab
                    </label>

                    <Input
                      value={toDatetimeLocal(a.schedule?.startAt ?? null)}
                      onChange={(e) => {
                        const startAt = fromDatetimeLocal(e.target.value);
                        setSettings((s) =>
                          s
                            ? {
                                ...s,
                                announcements: (s.announcements ?? []).map((x) =>
                                  x.id === a.id ? { ...x, schedule: { ...x.schedule, startAt } } : x
                                ),
                              }
                            : s
                        );
                      }}
                      placeholder="Start (optional)"
                      type="datetime-local"
                    />

                    <Input
                      value={toDatetimeLocal(a.schedule?.endAt ?? null)}
                      onChange={(e) => {
                        const endAt = fromDatetimeLocal(e.target.value);
                        setSettings((s) =>
                          s
                            ? {
                                ...s,
                                announcements: (s.announcements ?? []).map((x) =>
                                  x.id === a.id ? { ...x, schedule: { ...x.schedule, endAt } } : x
                                ),
                              }
                            : s
                        );
                      }}
                      placeholder="End (optional)"
                      type="datetime-local"
                    />
                  </div>

                  <div className="mt-4 rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">CTA button</p>
                      <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                        <input
                          type="checkbox"
                          checked={a.cta?.enabled ?? false}
                          onChange={(e) =>
                            setSettings((s) =>
                              s
                                ? {
                                    ...s,
                                    announcements: (s.announcements ?? []).map((x) =>
                                      x.id === a.id ? { ...x, cta: { ...x.cta, enabled: e.target.checked } } : x
                                    ),
                                  }
                                : s
                            )
                          }
                        />
                        Enabled
                      </label>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Input
                        value={a.cta?.label ?? ""}
                        onChange={(e) =>
                          setSettings((s) =>
                            s
                              ? {
                                  ...s,
                                  announcements: (s.announcements ?? []).map((x) =>
                                    x.id === a.id ? { ...x, cta: { ...x.cta, label: e.target.value } } : x
                                  ),
                                }
                              : s
                          )
                        }
                        placeholder="Button text"
                      />
                      <Input
                        value={a.cta?.href ?? ""}
                        onChange={(e) =>
                          setSettings((s) =>
                            s
                              ? {
                                  ...s,
                                  announcements: (s.announcements ?? []).map((x) =>
                                    x.id === a.id ? { ...x, cta: { ...x.cta, href: e.target.value } } : x
                                  ),
                                }
                              : s
                          )
                        }
                        placeholder="Button link"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Hero banner slider</h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setSettings((s) =>
                    s ? { ...s, heroBanners: [...(s.heroBanners ?? []), { isActive: true, textAlign: "left", verticalAlign: "center" }] } : s
                  )
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>

            <div className="mt-4 rounded-3xl border border-zinc-200 p-4 dark:border-zinc-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Global slider settings</p>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input
                  type="number"
                  value={settings.heroBannerSettings?.desktopHeightPx ?? 520}
                  onChange={(e) =>
                    setSettings((s) =>
                      s
                        ? {
                            ...s,
                            heroBannerSettings: {
                              ...normalizeHeroBannerSettings(s.heroBannerSettings),
                              desktopHeightPx: clampInt(Number(e.target.value || 0), 200, 900),
                            },
                          }
                        : s
                    )
                  }
                  placeholder="Desktop height (px)"
                />
                <Input
                  type="number"
                  value={settings.heroBannerSettings?.mobileHeightPx ?? 360}
                  onChange={(e) =>
                    setSettings((s) =>
                      s
                        ? {
                            ...s,
                            heroBannerSettings: {
                              ...normalizeHeroBannerSettings(s.heroBannerSettings),
                              mobileHeightPx: clampInt(Number(e.target.value || 0), 180, 900),
                            },
                          }
                        : s
                    )
                  }
                  placeholder="Mobile height (px)"
                />

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Aspect mode</label>
                  <select
                    value={settings.heroBannerSettings?.aspectMode ?? "height"}
                    onChange={(e) =>
                      setSettings((s) =>
                        s
                          ? {
                              ...s,
                              heroBannerSettings: {
                                ...normalizeHeroBannerSettings(s.heroBannerSettings),
                                aspectMode: e.target.value === "ratio" ? "ratio" : "height",
                              },
                            }
                          : s
                      )
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  >
                    <option value="height">Fixed height (recommended)</option>
                    <option value="ratio">Aspect ratio</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Fit mode (mobile & desktop)</label>
                  <select
                    value={settings.heroBannerSettings?.fitMode ?? "cover"}
                    onChange={(e) =>
                      setSettings((s) =>
                        s
                          ? {
                              ...s,
                              heroBannerSettings: {
                                ...normalizeHeroBannerSettings(s.heroBannerSettings),
                                fitMode: e.target.value === "contain" ? "contain" : "cover",
                              },
                            }
                          : s
                      )
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  >
                    <option value="cover">Cover (no stretching)</option>
                    <option value="contain">Contain (no crop)</option>
                  </select>
                </div>

                <Input
                  type="number"
                  value={settings.heroBannerSettings?.autoplayDelayMs ?? 5000}
                  onChange={(e) =>
                    setSettings((s) =>
                      s
                        ? {
                            ...s,
                            heroBannerSettings: {
                              ...normalizeHeroBannerSettings(s.heroBannerSettings),
                              autoplayDelayMs: clampInt(Number(e.target.value || 0), 1000, 20000),
                            },
                          }
                        : s
                    )
                  }
                  placeholder="Autoplay delay (ms)"
                />

                <Input
                  type="number"
                  value={settings.heroBannerSettings?.transitionSpeedMs ?? 550}
                  onChange={(e) =>
                    setSettings((s) =>
                      s
                        ? {
                            ...s,
                            heroBannerSettings: {
                              ...normalizeHeroBannerSettings(s.heroBannerSettings),
                              transitionSpeedMs: clampInt(Number(e.target.value || 0), 100, 5000),
                            },
                          }
                        : s
                    )
                  }
                  placeholder="Transition speed (ms)"
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
                  <span>Autoplay</span>
                  <input
                    type="checkbox"
                    checked={settings.heroBannerSettings?.autoplayEnabled ?? true}
                    onChange={(e) =>
                      setSettings((s) =>
                        s
                          ? {
                              ...s,
                              heroBannerSettings: {
                                ...normalizeHeroBannerSettings(s.heroBannerSettings),
                                autoplayEnabled: e.target.checked,
                              },
                            }
                          : s
                      )
                    }
                    className="h-4 w-4"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
                  <span>Loop</span>
                  <input
                    type="checkbox"
                    checked={settings.heroBannerSettings?.loop ?? true}
                    onChange={(e) =>
                      setSettings((s) =>
                        s
                          ? {
                              ...s,
                              heroBannerSettings: {
                                ...normalizeHeroBannerSettings(s.heroBannerSettings),
                                loop: e.target.checked,
                              },
                            }
                          : s
                      )
                    }
                    className="h-4 w-4"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
                  <span>Arrows</span>
                  <input
                    type="checkbox"
                    checked={settings.heroBannerSettings?.showArrows ?? true}
                    onChange={(e) =>
                      setSettings((s) =>
                        s
                          ? {
                              ...s,
                              heroBannerSettings: {
                                ...normalizeHeroBannerSettings(s.heroBannerSettings),
                                showArrows: e.target.checked,
                              },
                            }
                          : s
                      )
                    }
                    className="h-4 w-4"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
                  <span>Dots</span>
                  <input
                    type="checkbox"
                    checked={settings.heroBannerSettings?.showDots ?? true}
                    onChange={(e) =>
                      setSettings((s) =>
                        s
                          ? {
                              ...s,
                              heroBannerSettings: {
                                ...normalizeHeroBannerSettings(s.heroBannerSettings),
                                showDots: e.target.checked,
                              },
                            }
                          : s
                      )
                    }
                    className="h-4 w-4"
                  />
                </label>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Animation</label>
                  <select
                    value={settings.heroBannerSettings?.animation ?? "slide"}
                    onChange={(e) =>
                      setSettings((s) =>
                        s
                          ? {
                              ...s,
                              heroBannerSettings: {
                                ...normalizeHeroBannerSettings(s.heroBannerSettings),
                                animation: e.target.value === "fade" ? "fade" : "slide",
                              },
                            }
                          : s
                      )
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  >
                    <option value="slide">Slide</option>
                    <option value="fade">Fade</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {(settings.heroBanners ?? []).length === 0 ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">No hero banners.</p>
              ) : (
                (settings.heroBanners ?? []).map((b, idx) => {
                  const key = `${idx}`;
                  const busy = Boolean(heroUploading[key]);
                  return (
                    <div
                      key={idx}
                      className="rounded-3xl border border-zinc-200 p-4 dark:border-zinc-800"
                      draggable
                      onDragStart={() => {
                        dragFromIndexRef.current = idx;
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                      }}
                      onDrop={() => {
                        const from = dragFromIndexRef.current;
                        dragFromIndexRef.current = null;
                        if (from === null || from === idx) return;
                        setSettings((s) => {
                          if (!s) return s;
                          const next = [...(s.heroBanners ?? [])];
                          const [moved] = next.splice(from, 1);
                          next.splice(idx, 0, moved);
                          return { ...s, heroBanners: next };
                        });
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="cursor-grab select-none rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
                            Drag
                          </span>
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Slide {idx + 1}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="border border-zinc-200 dark:border-zinc-800"
                          onClick={() =>
                            setSettings((s) =>
                              s ? { ...s, heroBanners: (s.heroBanners ?? []).filter((_, i) => i !== idx) } : s
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <Input
                          value={b.title ?? ""}
                          onChange={(e) =>
                            setSettings((s) => {
                              if (!s) return s;
                              const next = [...(s.heroBanners ?? [])];
                              next[idx] = { ...next[idx], title: e.target.value };
                              return { ...s, heroBanners: next };
                            })
                          }
                          placeholder="Title"
                        />
                        <Input
                          value={b.subtitle ?? ""}
                          onChange={(e) =>
                            setSettings((s) => {
                              if (!s) return s;
                              const next = [...(s.heroBanners ?? [])];
                              next[idx] = { ...next[idx], subtitle: e.target.value };
                              return { ...s, heroBanners: next };
                            })
                          }
                          placeholder="Subtitle"
                        />

                        <Input
                          value={b.href ?? ""}
                          onChange={(e) =>
                            setSettings((s) => {
                              if (!s) return s;
                              const next = [...(s.heroBanners ?? [])];
                              next[idx] = { ...next[idx], href: e.target.value };
                              return { ...s, heroBanners: next };
                            })
                          }
                          placeholder="Slide link (href)"
                        />
                        <Input
                          value={b.buttonText ?? ""}
                          onChange={(e) =>
                            setSettings((s) => {
                              if (!s) return s;
                              const next = [...(s.heroBanners ?? [])];
                              next[idx] = { ...next[idx], buttonText: e.target.value };
                              return { ...s, heroBanners: next };
                            })
                          }
                          placeholder="Button text"
                        />
                        <Input
                          value={b.buttonHref ?? ""}
                          onChange={(e) =>
                            setSettings((s) => {
                              if (!s) return s;
                              const next = [...(s.heroBanners ?? [])];
                              next[idx] = { ...next[idx], buttonHref: e.target.value };
                              return { ...s, heroBanners: next };
                            })
                          }
                          placeholder="Button link (URL)"
                        />

                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Text align</label>
                          <select
                            value={b.textAlign ?? "left"}
                            onChange={(e) =>
                              setSettings((s) => {
                                if (!s) return s;
                                const next = [...(s.heroBanners ?? [])];
                                next[idx] = {
                                  ...next[idx],
                                  textAlign: e.target.value === "center" ? "center" : e.target.value === "right" ? "right" : "left",
                                };
                                return { ...s, heroBanners: next };
                              })
                            }
                            className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                          >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Vertical align</label>
                          <select
                            value={b.verticalAlign ?? "center"}
                            onChange={(e) =>
                              setSettings((s) => {
                                if (!s) return s;
                                const next = [...(s.heroBanners ?? [])];
                                next[idx] = {
                                  ...next[idx],
                                  verticalAlign: e.target.value === "top" ? "top" : e.target.value === "bottom" ? "bottom" : "center",
                                };
                                return { ...s, heroBanners: next };
                              })
                            }
                            className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                          >
                            <option value="top">Top</option>
                            <option value="center">Center</option>
                            <option value="bottom">Bottom</option>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Images</p>
                          <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-[1fr_280px]">
                            <div className="space-y-3">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Desktop image</p>
                                <input
                                  ref={(el) => {
                                    heroFileInputsRef.current[idx] = { ...(heroFileInputsRef.current[idx] ?? {}), desktop: el };
                                  }}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    e.target.value = "";
                                    if (!file) return;
                                    setHeroUploading((m) => ({ ...m, [key]: true }));
                                    try {
                                      const url = await uploadBannerImage(file);
                                      setSettings((s) => {
                                        if (!s) return s;
                                        const next = [...(s.heroBanners ?? [])];
                                        next[idx] = { ...next[idx], desktopImage: url };
                                        return { ...s, heroBanners: next };
                                      });
                                      toast.success("Uploaded");
                                    } catch (err) {
                                      const msg = err instanceof Error ? err.message : "Upload failed";
                                      toast.error(msg);
                                    } finally {
                                      setHeroUploading((m) => ({ ...m, [key]: false }));
                                    }
                                  }}
                                />

                                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    disabled={busy}
                                    onClick={() => heroFileInputsRef.current[idx]?.desktop?.click()}
                                  >
                                    <Upload className="mr-2 h-4 w-4" />
                                    {busy ? "Uploading..." : "Upload"}
                                  </Button>
                                  <Input
                                    value={b.desktopImage ?? ""}
                                    onChange={(e) =>
                                      setSettings((s) => {
                                        if (!s) return s;
                                        const next = [...(s.heroBanners ?? [])];
                                        next[idx] = { ...next[idx], desktopImage: e.target.value };
                                        return { ...s, heroBanners: next };
                                      })
                                    }
                                    placeholder="Desktop image URL (optional)"
                                  />
                                </div>
                              </div>

                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Mobile image</p>
                                <input
                                  ref={(el) => {
                                    heroFileInputsRef.current[idx] = { ...(heroFileInputsRef.current[idx] ?? {}), mobile: el };
                                  }}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    e.target.value = "";
                                    if (!file) return;
                                    setHeroUploading((m) => ({ ...m, [key]: true }));
                                    try {
                                      const url = await uploadBannerImage(file);
                                      setSettings((s) => {
                                        if (!s) return s;
                                        const next = [...(s.heroBanners ?? [])];
                                        next[idx] = { ...next[idx], mobileImage: url };
                                        return { ...s, heroBanners: next };
                                      });
                                      toast.success("Uploaded");
                                    } catch (err) {
                                      const msg = err instanceof Error ? err.message : "Upload failed";
                                      toast.error(msg);
                                    } finally {
                                      setHeroUploading((m) => ({ ...m, [key]: false }));
                                    }
                                  }}
                                />

                                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    disabled={busy}
                                    onClick={() => heroFileInputsRef.current[idx]?.mobile?.click()}
                                  >
                                    <Upload className="mr-2 h-4 w-4" />
                                    {busy ? "Uploading..." : "Upload"}
                                  </Button>
                                  <Input
                                    value={b.mobileImage ?? ""}
                                    onChange={(e) =>
                                      setSettings((s) => {
                                        if (!s) return s;
                                        const next = [...(s.heroBanners ?? [])];
                                        next[idx] = { ...next[idx], mobileImage: e.target.value };
                                        return { ...s, heroBanners: next };
                                      })
                                    }
                                    placeholder="Mobile image URL (optional)"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                              <div className="relative aspect-3/2 w-full">
                                {isSafeImageSrc(b.mobileImage ?? "") || isSafeImageSrc(b.desktopImage ?? "") || isSafeImageSrc(b.image ?? "") ? (
                                  <Image
                                    src={String(b.mobileImage || b.desktopImage || b.image)}
                                    alt={b.title?.trim() ? String(b.title) : "Hero"}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs text-zinc-600 dark:text-zinc-400">
                                    No image selected
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Overlay color</label>
                          <Input
                            type="color"
                            value={b.overlayColor ?? "#000000"}
                            onChange={(e) =>
                              setSettings((s) => {
                                if (!s) return s;
                                const next = [...(s.heroBanners ?? [])];
                                next[idx] = { ...next[idx], overlayColor: e.target.value };
                                return { ...s, heroBanners: next };
                              })
                            }
                            className="mt-2 h-11"
                          />
                        </div>
                        <Input
                          type="number"
                          value={typeof b.overlayOpacity === "number" ? b.overlayOpacity : 0.25}
                          onChange={(e) =>
                            setSettings((s) => {
                              if (!s) return s;
                              const next = [...(s.heroBanners ?? [])];
                              const v = Math.max(0, Math.min(1, Number(e.target.value || 0)));
                              next[idx] = { ...next[idx], overlayOpacity: v };
                              return { ...s, heroBanners: next };
                            })
                          }
                          placeholder="Overlay opacity (0-1)"
                        />
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Text color</label>
                          <Input
                            type="color"
                            value={b.textColor ?? "#ffffff"}
                            onChange={(e) =>
                              setSettings((s) => {
                                if (!s) return s;
                                const next = [...(s.heroBanners ?? [])];
                                next[idx] = { ...next[idx], textColor: e.target.value };
                                return { ...s, heroBanners: next };
                              })
                            }
                            className="mt-2 h-11"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Button color</label>
                          <Input
                            type="color"
                            value={b.buttonColor ?? "#ffffff"}
                            onChange={(e) =>
                              setSettings((s) => {
                                if (!s) return s;
                                const next = [...(s.heroBanners ?? [])];
                                next[idx] = { ...next[idx], buttonColor: e.target.value };
                                return { ...s, heroBanners: next };
                              })
                            }
                            className="mt-2 h-11"
                          />
                        </div>

                        <label className="md:col-span-2 mt-1 flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                          <input
                            type="checkbox"
                            checked={b.isActive ?? true}
                            onChange={(e) =>
                              setSettings((s) => {
                                if (!s) return s;
                                const next = [...(s.heroBanners ?? [])];
                                next[idx] = { ...next[idx], isActive: e.target.checked };
                                return { ...s, heroBanners: next };
                              })
                            }
                            className="h-4 w-4 rounded border-zinc-300"
                          />
                          Enabled
                        </label>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Homepage banners</h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setSettings((s) =>
                    s ? { ...s, homeBanners: [...s.homeBanners, { isActive: true }] } : s
                  )
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>

            <div className="mt-4 space-y-4">
              {settings.homeBanners.length === 0 ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">No banners.</p>
              ) : (
                settings.homeBanners.map((b, idx) => (
                  <div
                    key={idx}
                    className="rounded-3xl border border-zinc-200 p-4 dark:border-zinc-800"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Banner {idx + 1}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="border border-zinc-200 dark:border-zinc-800"
                        onClick={() =>
                          setSettings((s) =>
                            s
                              ? { ...s, homeBanners: s.homeBanners.filter((_, i) => i !== idx) }
                              : s
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Input
                        value={b.title ?? ""}
                        onChange={(e) =>
                          setSettings((s) => {
                            if (!s) return s;
                            const next = [...s.homeBanners];
                            next[idx] = { ...next[idx], title: e.target.value };
                            return { ...s, homeBanners: next };
                          })
                        }
                        placeholder="Title"
                      />
                      <Input
                        value={b.subtitle ?? ""}
                        onChange={(e) =>
                          setSettings((s) => {
                            if (!s) return s;
                            const next = [...s.homeBanners];
                            next[idx] = { ...next[idx], subtitle: e.target.value };
                            return { ...s, homeBanners: next };
                          })
                        }
                        placeholder="Subtitle"
                      />

                      <div className="md:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Image</p>

                        <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-[1fr_280px]">
                          <div>
                            <input
                              ref={(el) => {
                                bannerFileInputsRef.current[idx] = el;
                              }}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0] ?? null;
                                e.target.value = "";
                                if (!file) return;

                                setBannerUploading((m) => ({ ...m, [idx]: true }));
                                try {
                                  const url = await uploadBannerImage(file);
                                  setSettings((s) => {
                                    if (!s) return s;
                                    const next = [...s.homeBanners];
                                    next[idx] = { ...next[idx], image: url };
                                    return { ...s, homeBanners: next };
                                  });
                                  toast.success("Uploaded");
                                } catch (err) {
                                  const msg = err instanceof Error ? err.message : "Upload failed";
                                  toast.error(msg);
                                } finally {
                                  setBannerUploading((m) => ({ ...m, [idx]: false }));
                                }
                              }}
                            />

                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                disabled={Boolean(bannerUploading[idx])}
                                onClick={() => bannerFileInputsRef.current[idx]?.click()}
                              >
                                <Upload className="mr-2 h-4 w-4" />
                                {bannerUploading[idx] ? "Uploading..." : "Upload"}
                              </Button>

                              <Input
                                value={b.image ?? ""}
                                onChange={(e) =>
                                  setSettings((s) => {
                                    if (!s) return s;
                                    const next = [...s.homeBanners];
                                    next[idx] = { ...next[idx], image: e.target.value };
                                    return { ...s, homeBanners: next };
                                  })
                                }
                                placeholder="Paste image URL (optional)"
                              />
                            </div>

                            <div className="mt-2 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                              <p>Desktop recommended: 1200×400 (~3:1)</p>
                              <p>Mobile recommended: 750×500 (~3:2)</p>
                              <p>Image will auto-crop responsively.</p>
                            </div>
                          </div>

                          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                            <div className="relative aspect-3/2 md:aspect-3/1 w-full">
                              {isSafeImageSrc(b.image ?? "") ? (
                                <Image
                                  src={String(b.image)}
                                  alt={b.title?.trim() ? String(b.title) : "Banner"}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs text-zinc-600 dark:text-zinc-400">
                                  No image selected
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <Input
                        value={b.href ?? ""}
                        onChange={(e) =>
                          setSettings((s) => {
                            if (!s) return s;
                            const next = [...s.homeBanners];
                            next[idx] = { ...next[idx], href: e.target.value };
                            return { ...s, homeBanners: next };
                          })
                        }
                        placeholder="Link (href)"
                      />
                    </div>

                    <label className="mt-3 flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                      <input
                        type="checkbox"
                        checked={b.isActive ?? true}
                        onChange={(e) =>
                          setSettings((s) => {
                            if (!s) return s;
                            const next = [...s.homeBanners];
                            next[idx] = { ...next[idx], isActive: e.target.checked };
                            return { ...s, homeBanners: next };
                          })
                        }
                        className="h-4 w-4 rounded border-zinc-300"
                      />
                      Active
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Footer</h2>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {FOOTER_LANGS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setFooterLang(l)}
                  className={cn(
                    "h-9 rounded-xl border px-3 text-sm font-medium",
                    footerLang === l
                      ? "border-zinc-900 bg-zinc-50 text-zinc-900 dark:border-zinc-50 dark:bg-zinc-900 dark:text-zinc-50"
                      : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                  )}
                >
                  {l === "en" ? "English" : "اردو"}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Footer text ({footerLang})</label>
                <Input
                  value={readLocalized(settings.footer?.text, footerLang)}
                  onChange={(e) =>
                    setSettings((s) => {
                      if (!s) return s;
                      const nextFooter: FooterSettings = { ...(s.footer ?? {}) };
                      const nextText: LocalizedText = { ...(nextFooter.text ?? {}) };
                      nextText[footerLang] = e.target.value;
                      nextFooter.text = nextText;
                      return { ...s, footer: nextFooter };
                    })
                  }
                  placeholder={footerLang === "en" ? "Footer text" : "فوٹر متن"}
                />
                {FOOTER_LANGS.some((l) => l !== footerLang && hasMissing(settings.footer?.text, l)) ? (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    Missing translations: {FOOTER_LANGS.filter((l) => l !== footerLang && hasMissing(settings.footer?.text, l)).join(", ")}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Legacy fallback (default)</label>
                <Input
                  value={settings.footerText}
                  onChange={(e) => setSettings((s) => (s ? { ...s, footerText: e.target.value } : s))}
                  placeholder="Footer text (fallback)"
                />
              </div>

              <div className="rounded-3xl border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Sections</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setSettings((s) => {
                        if (!s) return s;
                        const nextFooter: FooterSettings = { ...(s.footer ?? {}) };
                        const nextSections = [...(nextFooter.sections ?? [])];
                        nextSections.push({ title: {}, links: [] });
                        nextFooter.sections = nextSections;
                        return { ...s, footer: nextFooter };
                      })
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                </div>

                <div className="mt-4 space-y-4">
                  {(settings.footer?.sections ?? []).length === 0 ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">No sections.</p>
                  ) : (
                    (settings.footer?.sections ?? []).map((sec, secIdx) => (
                      <div key={secIdx} className="rounded-3xl border border-zinc-200 p-4 dark:border-zinc-800">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Section {secIdx + 1}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="border border-zinc-200 dark:border-zinc-800"
                            onClick={() =>
                              setSettings((s) => {
                                if (!s) return s;
                                const nextFooter: FooterSettings = { ...(s.footer ?? {}) };
                                nextFooter.sections = (nextFooter.sections ?? []).filter((_, i) => i !== secIdx);
                                return { ...s, footer: nextFooter };
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                          <Input
                            value={readLocalized(sec.title, footerLang)}
                            onChange={(e) =>
                              setSettings((s) => {
                                if (!s) return s;
                                const nextFooter: FooterSettings = { ...(s.footer ?? {}) };
                                const nextSections = [...(nextFooter.sections ?? [])];
                                const current = nextSections[secIdx] ?? {};
                                const nextTitle: LocalizedText = { ...(current.title ?? {}) };
                                nextTitle[footerLang] = e.target.value;
                                nextSections[secIdx] = { ...current, title: nextTitle };
                                nextFooter.sections = nextSections;
                                return { ...s, footer: nextFooter };
                              })
                            }
                            placeholder={`Section title (${footerLang})`}
                          />

                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              setSettings((s) => {
                                if (!s) return s;
                                const nextFooter: FooterSettings = { ...(s.footer ?? {}) };
                                const nextSections = [...(nextFooter.sections ?? [])];
                                const current = nextSections[secIdx] ?? {};
                                const nextLinks = [...(current.links ?? [])];
                                nextLinks.push({ href: "", label: {} });
                                nextSections[secIdx] = { ...current, links: nextLinks };
                                nextFooter.sections = nextSections;
                                return { ...s, footer: nextFooter };
                              })
                            }
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add link
                          </Button>
                        </div>

                        {FOOTER_LANGS.some((l) => l !== footerLang && hasMissing(sec.title, l)) ? (
                          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                            Missing title: {FOOTER_LANGS.filter((l) => l !== footerLang && hasMissing(sec.title, l)).join(", ")}
                          </p>
                        ) : null}

                        <div className="mt-4 space-y-3">
                          {(sec.links ?? []).length === 0 ? (
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">No links.</p>
                          ) : (
                            (sec.links ?? []).map((l, linkIdx) => (
                              <div key={linkIdx} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
                                <Input
                                  value={readLocalized(l.label, footerLang)}
                                  onChange={(e) =>
                                    setSettings((s) => {
                                      if (!s) return s;
                                      const nextFooter: FooterSettings = { ...(s.footer ?? {}) };
                                      const nextSections = [...(nextFooter.sections ?? [])];
                                      const current = nextSections[secIdx] ?? {};
                                      const nextLinks = [...(current.links ?? [])];
                                      const curLink = nextLinks[linkIdx] ?? {};
                                      const nextLabel: LocalizedText = { ...(curLink.label ?? {}) };
                                      nextLabel[footerLang] = e.target.value;
                                      nextLinks[linkIdx] = { ...curLink, label: nextLabel };
                                      nextSections[secIdx] = { ...current, links: nextLinks };
                                      nextFooter.sections = nextSections;
                                      return { ...s, footer: nextFooter };
                                    })
                                  }
                                  placeholder={`Label (${footerLang})`}
                                />
                                <Input
                                  value={l.href ?? ""}
                                  onChange={(e) =>
                                    setSettings((s) => {
                                      if (!s) return s;
                                      const nextFooter: FooterSettings = { ...(s.footer ?? {}) };
                                      const nextSections = [...(nextFooter.sections ?? [])];
                                      const current = nextSections[secIdx] ?? {};
                                      const nextLinks = [...(current.links ?? [])];
                                      const curLink = nextLinks[linkIdx] ?? {};
                                      nextLinks[linkIdx] = { ...curLink, href: e.target.value };
                                      nextSections[secIdx] = { ...current, links: nextLinks };
                                      nextFooter.sections = nextSections;
                                      return { ...s, footer: nextFooter };
                                    })
                                  }
                                  placeholder="URL"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="border border-zinc-200 dark:border-zinc-800"
                                  onClick={() =>
                                    setSettings((s) => {
                                      if (!s) return s;
                                      const nextFooter: FooterSettings = { ...(s.footer ?? {}) };
                                      const nextSections = [...(nextFooter.sections ?? [])];
                                      const current = nextSections[secIdx] ?? {};
                                      const nextLinks = (current.links ?? []).filter((_, i) => i !== linkIdx);
                                      nextSections[secIdx] = { ...current, links: nextLinks };
                                      nextFooter.sections = nextSections;
                                      return { ...s, footer: nextFooter };
                                    })
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Policy links</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setSettings((s) => {
                        if (!s) return s;
                        const nextFooter: FooterSettings = { ...(s.footer ?? {}) };
                        const next = [...(nextFooter.policyLinks ?? [])];
                        next.push({ href: "", label: {} });
                        nextFooter.policyLinks = next;
                        return { ...s, footer: nextFooter };
                      })
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                </div>

                <div className="mt-4 space-y-3">
                  {(settings.footer?.policyLinks ?? []).length === 0 ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">No policy links.</p>
                  ) : (
                    (settings.footer?.policyLinks ?? []).map((l, idx) => (
                      <div key={idx} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
                        <Input
                          value={readLocalized(l.label, footerLang)}
                          onChange={(e) =>
                            setSettings((s) => {
                              if (!s) return s;
                              const nextFooter: FooterSettings = { ...(s.footer ?? {}) };
                              const next = [...(nextFooter.policyLinks ?? [])];
                              const cur = next[idx] ?? {};
                              const nextLabel: LocalizedText = { ...(cur.label ?? {}) };
                              nextLabel[footerLang] = e.target.value;
                              next[idx] = { ...cur, label: nextLabel };
                              nextFooter.policyLinks = next;
                              return { ...s, footer: nextFooter };
                            })
                          }
                          placeholder={`Label (${footerLang})`}
                        />
                        <Input
                          value={l.href ?? ""}
                          onChange={(e) =>
                            setSettings((s) => {
                              if (!s) return s;
                              const nextFooter: FooterSettings = { ...(s.footer ?? {}) };
                              const next = [...(nextFooter.policyLinks ?? [])];
                              next[idx] = { ...(next[idx] ?? {}), href: e.target.value };
                              nextFooter.policyLinks = next;
                              return { ...s, footer: nextFooter };
                            })
                          }
                          placeholder="URL"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="border border-zinc-200 dark:border-zinc-800"
                          onClick={() =>
                            setSettings((s) => {
                              if (!s) return s;
                              const nextFooter: FooterSettings = { ...(s.footer ?? {}) };
                              nextFooter.policyLinks = (nextFooter.policyLinks ?? []).filter((_, i) => i !== idx);
                              return { ...s, footer: nextFooter };
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Social links</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setSettings((s) => {
                        if (!s) return s;
                        const nextFooter: FooterSettings = { ...(s.footer ?? {}) };
                        const next = [...(nextFooter.socialLinks ?? [])];
                        next.push({ kind: "", href: "", label: {} });
                        nextFooter.socialLinks = next;
                        return { ...s, footer: nextFooter };
                      })
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                </div>

                <div className="mt-4 space-y-3">
                  {(settings.footer?.socialLinks ?? []).length === 0 ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">No social links.</p>
                  ) : (
                    (settings.footer?.socialLinks ?? []).map((l, idx) => (
                      <div key={idx} className="rounded-3xl border border-zinc-200 p-4 dark:border-zinc-800">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                          <Input
                            value={l.kind ?? ""}
                            onChange={(e) =>
                              setSettings((s) => {
                                if (!s) return s;
                                const nextFooter: FooterSettings = { ...(s.footer ?? {}) };
                                const next = [...(nextFooter.socialLinks ?? [])];
                                next[idx] = { ...(next[idx] ?? {}), kind: e.target.value };
                                nextFooter.socialLinks = next;
                                return { ...s, footer: nextFooter };
                              })
                            }
                            placeholder="Kind (e.g., Instagram)"
                          />
                          <Input
                            value={readLocalized(l.label, footerLang)}
                            onChange={(e) =>
                              setSettings((s) => {
                                if (!s) return s;
                                const nextFooter: FooterSettings = { ...(s.footer ?? {}) };
                                const next = [...(nextFooter.socialLinks ?? [])];
                                const cur = next[idx] ?? {};
                                const nextLabel: LocalizedText = { ...(cur.label ?? {}) };
                                nextLabel[footerLang] = e.target.value;
                                next[idx] = { ...cur, label: nextLabel };
                                nextFooter.socialLinks = next;
                                return { ...s, footer: nextFooter };
                              })
                            }
                            placeholder={`Label (${footerLang})`}
                          />
                          <Input
                            value={l.href ?? ""}
                            onChange={(e) =>
                              setSettings((s) => {
                                if (!s) return s;
                                const nextFooter: FooterSettings = { ...(s.footer ?? {}) };
                                const next = [...(nextFooter.socialLinks ?? [])];
                                next[idx] = { ...(next[idx] ?? {}), href: e.target.value };
                                nextFooter.socialLinks = next;
                                return { ...s, footer: nextFooter };
                              })
                            }
                            placeholder="URL"
                          />
                        </div>

                        <div className="mt-3 flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="border border-zinc-200 dark:border-zinc-800"
                            onClick={() =>
                              setSettings((s) => {
                                if (!s) return s;
                                const nextFooter: FooterSettings = { ...(s.footer ?? {}) };
                                nextFooter.socialLinks = (nextFooter.socialLinks ?? []).filter((_, i) => i !== idx);
                                return { ...s, footer: nextFooter };
                              })
                            }
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Returns</h2>
            <p className="mt-1 text-xs text-zinc-500">Return request window (days after delivery).</p>
            <div className="mt-3">
              <Input
                value={String(settings.returnsWindowDays ?? 14)}
                onChange={(e) =>
                  setSettings((s) => {
                    if (!s) return s;
                    const n = Number(e.target.value);
                    return { ...s, returnsWindowDays: Number.isFinite(n) ? Math.trunc(n) : s.returnsWindowDays };
                  })
                }
                placeholder="14"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Inventory</h2>
            <p className="mt-1 text-xs text-zinc-500">Low stock urgency threshold (Only X left).</p>
            <div className="mt-3">
              <Input
                value={String(settings.inventoryLowStockThreshold ?? 5)}
                onChange={(e) =>
                  setSettings((s) => {
                    if (!s) return s;
                    const n = Number(e.target.value);
                    return {
                      ...s,
                      inventoryLowStockThreshold: Number.isFinite(n) ? Math.trunc(n) : s.inventoryLowStockThreshold,
                    };
                  })
                }
                placeholder="5"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Shipping</h2>
                <p className="mt-1 text-xs text-zinc-500">Configure delivery fee and ETA. City rules override defaults.</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          shippingCityRules: [
                            ...(Array.isArray(s.shippingCityRules) ? s.shippingCityRules : []),
                            { city: "", fee: 0 },
                          ],
                        }
                      : s
                  )
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add city rule
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Default fee (PKR)</label>
                <Input
                  value={String(settings.shippingDefaultFee ?? 0)}
                  onChange={(e) =>
                    setSettings((s) => {
                      if (!s) return s;
                      const n = Number(e.target.value);
                      return { ...s, shippingDefaultFee: Number.isFinite(n) ? Math.max(0, n) : s.shippingDefaultFee };
                    })
                  }
                  placeholder="0"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Free delivery above subtotal (PKR)</label>
                <Input
                  value={settings.shippingFreeAboveSubtotal === null ? "" : String(settings.shippingFreeAboveSubtotal ?? "")}
                  onChange={(e) =>
                    setSettings((s) => {
                      if (!s) return s;
                      const raw = e.target.value.trim();
                      if (!raw) return { ...s, shippingFreeAboveSubtotal: null };
                      const n = Number(raw);
                      return {
                        ...s,
                        shippingFreeAboveSubtotal: Number.isFinite(n) ? Math.max(0, n) : s.shippingFreeAboveSubtotal,
                      };
                    })
                  }
                  placeholder="(disabled)"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">ETA min days</label>
                <Input
                  value={String(settings.shippingEtaMinDays ?? 3)}
                  onChange={(e) =>
                    setSettings((s) => {
                      if (!s) return s;
                      const n = Number(e.target.value);
                      return { ...s, shippingEtaMinDays: Number.isFinite(n) ? Math.trunc(n) : s.shippingEtaMinDays };
                    })
                  }
                  placeholder="3"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">ETA max days</label>
                <Input
                  value={String(settings.shippingEtaMaxDays ?? 5)}
                  onChange={(e) =>
                    setSettings((s) => {
                      if (!s) return s;
                      const n = Number(e.target.value);
                      return { ...s, shippingEtaMaxDays: Number.isFinite(n) ? Math.trunc(n) : s.shippingEtaMaxDays };
                    })
                  }
                  placeholder="5"
                />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {(settings.shippingCityRules ?? []).length === 0 ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">No city rules.</p>
              ) : (
                (settings.shippingCityRules ?? []).map((r, idx) => (
                  <div key={idx} className="rounded-3xl border border-zinc-200 p-4 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">City rule {idx + 1}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="border border-zinc-200 dark:border-zinc-800"
                        onClick={() =>
                          setSettings((s) =>
                            s
                              ? {
                                  ...s,
                                  shippingCityRules: (s.shippingCityRules ?? []).filter((_, i) => i !== idx),
                                }
                              : s
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Input
                        value={r.city ?? ""}
                        onChange={(e) =>
                          setSettings((s) => {
                            if (!s) return s;
                            const next = [...(s.shippingCityRules ?? [])];
                            next[idx] = { ...next[idx], city: e.target.value };
                            return { ...s, shippingCityRules: next };
                          })
                        }
                        placeholder="City (e.g., Lahore)"
                      />
                      <Input
                        value={String(r.fee ?? 0)}
                        onChange={(e) =>
                          setSettings((s) => {
                            if (!s) return s;
                            const n = Number(e.target.value);
                            const next = [...(s.shippingCityRules ?? [])];
                            next[idx] = { ...next[idx], fee: Number.isFinite(n) ? Math.max(0, n) : next[idx].fee };
                            return { ...s, shippingCityRules: next };
                          })
                        }
                        placeholder="Fee (PKR)"
                      />
                      <Input
                        value={r.freeAboveSubtotal === null ? "" : String(r.freeAboveSubtotal ?? "")}
                        onChange={(e) =>
                          setSettings((s) => {
                            if (!s) return s;
                            const raw = e.target.value.trim();
                            const next = [...(s.shippingCityRules ?? [])];
                            if (!raw) {
                              next[idx] = { ...next[idx], freeAboveSubtotal: null };
                              return { ...s, shippingCityRules: next };
                            }
                            const n = Number(raw);
                            next[idx] = {
                              ...next[idx],
                              freeAboveSubtotal: Number.isFinite(n) ? Math.max(0, n) : next[idx].freeAboveSubtotal,
                            };
                            return { ...s, shippingCityRules: next };
                          })
                        }
                        placeholder="Free above (PKR)"
                      />
                      <Input
                        value={typeof r.etaMinDays === "number" ? String(r.etaMinDays) : ""}
                        onChange={(e) =>
                          setSettings((s) => {
                            if (!s) return s;
                            const raw = e.target.value.trim();
                            const next = [...(s.shippingCityRules ?? [])];
                            if (!raw) {
                              next[idx] = { ...next[idx], etaMinDays: undefined };
                              return { ...s, shippingCityRules: next };
                            }
                            const n = Number(raw);
                            next[idx] = { ...next[idx], etaMinDays: Number.isFinite(n) ? Math.trunc(n) : next[idx].etaMinDays };
                            return { ...s, shippingCityRules: next };
                          })
                        }
                        placeholder="ETA min (days)"
                      />
                      <Input
                        value={typeof r.etaMaxDays === "number" ? String(r.etaMaxDays) : ""}
                        onChange={(e) =>
                          setSettings((s) => {
                            if (!s) return s;
                            const raw = e.target.value.trim();
                            const next = [...(s.shippingCityRules ?? [])];
                            if (!raw) {
                              next[idx] = { ...next[idx], etaMaxDays: undefined };
                              return { ...s, shippingCityRules: next };
                            }
                            const n = Number(raw);
                            next[idx] = { ...next[idx], etaMaxDays: Number.isFinite(n) ? Math.trunc(n) : next[idx].etaMaxDays };
                            return { ...s, shippingCityRules: next };
                          })
                        }
                        placeholder="ETA max (days)"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Global SEO</h2>
            <div className="mt-3 space-y-3">
              <Input
                value={settings.globalSeoTitle}
                onChange={(e) => setSettings((s) => (s ? { ...s, globalSeoTitle: e.target.value } : s))}
                placeholder="Global SEO title"
              />
              <textarea
                value={settings.globalSeoDescription}
                onChange={(e) => setSettings((s) => (s ? { ...s, globalSeoDescription: e.target.value } : s))}
                rows={4}
                className={cn(
                  "w-full rounded-2xl border border-zinc-200 bg-white p-3 text-sm text-zinc-900",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10",
                  "dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus-visible:ring-zinc-50/10"
                )}
                placeholder="Global SEO description"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">WhatsApp</h2>
              <Button
                variant="secondary"
                size="sm"
                disabled={saving}
                onClick={() => {
                  const next = { ...settings, whatsAppSalesPhone: "", whatsAppProductTemplate: "", whatsAppOrderTemplate: "" };
                  setSettings(next);
                  void save(next);
                }}
              >
                Reset to Default
              </Button>
            </div>

            <div className="mt-3 space-y-2">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Sales WhatsApp number</p>
              <Input
                value={settings.whatsAppSalesPhone}
                onChange={(e) => setSettings((s) => (s ? { ...s, whatsAppSalesPhone: e.target.value } : s))}
                placeholder="e.g. +92 300 1234567"
              />
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                This is used for the storefront floating WhatsApp button.
              </p>
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Product inquiry template</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Use placeholders:
                {" "}
                <span className="font-mono">
                  {"{{storeName}}"}, {"{{productName}}"}, {"{{productUrl}}"}.
                </span>
              </p>
              <div className="mt-2">
                <textarea
                  value={settings.whatsAppProductTemplate}
                  onChange={(e) => setSettings((s) => (s ? { ...s, whatsAppProductTemplate: e.target.value } : s))}
                  rows={6}
                  className={cn(
                    "w-full rounded-2xl border border-zinc-200 bg-white p-3 text-sm text-zinc-900",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10",
                    "dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus-visible:ring-zinc-50/10"
                  )}
                  placeholder="I want to buy {{productName}}"
                />
              </div>
            </div>

            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Edit the message template. Leaving it blank uses the default template. Use placeholders:
              {" "}
              <span className="font-mono">
                {"{{storeName}}"}, {"{{customerName}}"}, {"{{orderId}}"}, {"{{productList}}"}, {"{{total}}"},
                {"{{paymentMethod}}"}.
              </span>
            </p>
            <div className="mt-3">
              <textarea
                value={settings.whatsAppOrderTemplate}
                onChange={(e) => setSettings((s) => (s ? { ...s, whatsAppOrderTemplate: e.target.value } : s))}
                rows={10}
                className={cn(
                  "w-full rounded-2xl border border-zinc-200 bg-white p-3 text-sm text-zinc-900",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10",
                  "dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus-visible:ring-zinc-50/10"
                )}
                placeholder="WhatsApp order message template"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Help</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Use banner image URLs. If you want upload support, we can add it later.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
