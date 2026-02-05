"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, RefreshCw, Trash2, Upload } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

type Banner = {
  title?: string;
  subtitle?: string;
  image?: string;
  href?: string;
  isActive?: boolean;
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
    setSettings(json.settings);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function save(nextSettings?: Settings) {
    const payload = nextSettings ?? settings;
    if (!payload) return;

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
