"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";

type LetterSpacing = "tight" | "normal" | "wide";
type BrandColor = "foreground" | "muted" | "primary";

type BrandingPayload = {
  branding: {
    storeName: string;
    headerBrandText: string;
    logoMode: "text" | "image" | "both";
    logoAlignment: "left" | "center";
    hideTextWhenLogoActive: boolean;
    logoMaxHeight: number;
    logo: { url: string; width: number | null; height: number | null; alt: string; updatedAt: number };
    brandTextStyle: {
      weight: number;
      italic: boolean;
      letterSpacing: LetterSpacing;
      color: BrandColor;
      customColorEnabled: boolean;
      customColor: string;
      gradientEnabled: boolean;
      embossedEnabled: boolean;
      embossedIntensity: number;

      glowEnabled: boolean;
      glowColor: string;
      glowIntensity: number;

      blinkEnabled: boolean;
      blinkSpeedMs: number;
    };
    seo: { title: string; description: string; ogImageUrl: string };
    favicon: { sourceUrl: string; assetsVersion: string; updatedAt: number };
  };
  brandingUpdatedAt: number;
};

type FormState = {
  storeName: string;
  headerBrandText: string;
  logoMode: "text" | "image" | "both";
  logoAlignment: "left" | "center";
  hideTextWhenLogoActive: boolean;
  logoMaxHeight: number;
  logoUrl: string;
  logoWidth: number | null;
  logoHeight: number | null;
  logoAlt: string;

  weight: number;
  italic: boolean;
  letterSpacing: LetterSpacing;
  color: BrandColor;
  customColorEnabled: boolean;
  customColor: string;
  gradientEnabled: boolean;
  embossedEnabled: boolean;
  embossedIntensity: number;

  glowEnabled: boolean;
  glowColor: string;
  glowIntensity: number;

  blinkEnabled: boolean;
  blinkSpeedMs: number;

  seoTitle: string;
  seoDescription: string;
  ogImageUrl: string;

  faviconSourceUrl: string;
  faviconAssetsVersion: string;
  faviconUpdatedAt: number;

  updatedAt: number;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readMessage(json: unknown) {
  return isRecord(json) && typeof json.message === "string" ? json.message : null;
}

function clampInt(n: unknown, min: number, max: number, fallback: number) {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(v)));
}

function emptyForm(): FormState {
  return {
    storeName: "Shop",
    headerBrandText: "Shop",
    logoMode: "text",
    logoAlignment: "left",
    hideTextWhenLogoActive: false,
    logoMaxHeight: 28,
    logoUrl: "",
    logoWidth: null,
    logoHeight: null,
    logoAlt: "Shop",

    weight: 600,
    italic: false,
    letterSpacing: "tight",
    color: "foreground",
    customColorEnabled: false,
    customColor: "#171717",
    gradientEnabled: false,
    embossedEnabled: false,
    embossedIntensity: 18,

    glowEnabled: false,
    glowColor: "#ffffff",
    glowIntensity: 14,

    blinkEnabled: false,
    blinkSpeedMs: 1400,

    seoTitle: "",
    seoDescription: "",
    ogImageUrl: "",

    faviconSourceUrl: "",
    faviconAssetsVersion: "",
    faviconUpdatedAt: 0,

    updatedAt: 0,
  };
}

function normalizePayload(json: unknown): FormState {
  const fallback = emptyForm();
  if (!isRecord(json) || !isRecord(json.branding)) return fallback;
  const b = json.branding as Record<string, unknown>;

  const logo = isRecord(b.logo) ? (b.logo as Record<string, unknown>) : {};
  const style = isRecord(b.brandTextStyle) ? (b.brandTextStyle as Record<string, unknown>) : {};
  const seo = isRecord(b.seo) ? (b.seo as Record<string, unknown>) : {};
  const favicon = isRecord(b.favicon) ? (b.favicon as Record<string, unknown>) : {};

  const storeName = typeof b.storeName === "string" && b.storeName.trim() ? b.storeName.trim() : "Shop";

  return {
    storeName,
    headerBrandText:
      typeof b.headerBrandText === "string" && b.headerBrandText.trim() ? b.headerBrandText.trim() : storeName,
    logoMode: b.logoMode === "image" || b.logoMode === "both" ? (b.logoMode as FormState["logoMode"]) : "text",
    logoAlignment: b.logoAlignment === "center" ? "center" : "left",
    hideTextWhenLogoActive: typeof b.hideTextWhenLogoActive === "boolean" ? b.hideTextWhenLogoActive : false,
    logoMaxHeight: clampInt(b.logoMaxHeight, 16, 96, 28),
    logoUrl: typeof logo.url === "string" ? logo.url.trim() : "",
    logoWidth: typeof logo.width === "number" && Number.isFinite(logo.width) ? logo.width : null,
    logoHeight: typeof logo.height === "number" && Number.isFinite(logo.height) ? logo.height : null,
    logoAlt:
      typeof logo.alt === "string" && logo.alt.trim()
        ? logo.alt.trim()
        : storeName,

    weight: clampInt(style.weight, 300, 900, 600),
    italic: typeof style.italic === "boolean" ? style.italic : false,
    letterSpacing: style.letterSpacing === "normal" || style.letterSpacing === "wide" ? (style.letterSpacing as LetterSpacing) : "tight",
    color: style.color === "muted" || style.color === "primary" ? (style.color as BrandColor) : "foreground",
    customColorEnabled: typeof style.customColorEnabled === "boolean" ? style.customColorEnabled : false,
    customColor: typeof style.customColor === "string" && style.customColor.trim() ? style.customColor.trim() : "#171717",
    gradientEnabled: typeof style.gradientEnabled === "boolean" ? style.gradientEnabled : false,
    embossedEnabled: typeof style.embossedEnabled === "boolean" ? style.embossedEnabled : false,
    embossedIntensity: clampInt(style.embossedIntensity, 0, 60, 18),

    glowEnabled: typeof style.glowEnabled === "boolean" ? style.glowEnabled : false,
    glowColor: typeof style.glowColor === "string" && style.glowColor.trim() ? style.glowColor.trim() : "#ffffff",
    glowIntensity: clampInt(style.glowIntensity, 0, 60, 14),

    blinkEnabled: typeof style.blinkEnabled === "boolean" ? style.blinkEnabled : false,
    blinkSpeedMs: clampInt(style.blinkSpeedMs, 200, 6000, 1400),

    seoTitle: typeof seo.title === "string" ? seo.title.trim() : "",
    seoDescription: typeof seo.description === "string" ? seo.description.trim() : "",
    ogImageUrl: typeof seo.ogImageUrl === "string" ? seo.ogImageUrl.trim() : "",

    faviconSourceUrl: typeof favicon.sourceUrl === "string" ? favicon.sourceUrl.trim() : "",
    faviconAssetsVersion: typeof favicon.assetsVersion === "string" ? favicon.assetsVersion.trim() : "",
    faviconUpdatedAt: typeof favicon.updatedAt === "number" ? Math.trunc(favicon.updatedAt) : 0,

    updatedAt: typeof (json as BrandingPayload).brandingUpdatedAt === "number" ? Math.trunc((json as BrandingPayload).brandingUpdatedAt) : 0,
  };
}

async function uploadImage(file: File) {
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

export default function AdminBrandingSettingsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState>(() => emptyForm());
  const originalRef = useRef<FormState | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    const res = await fetch("/api/admin/branding", { cache: "no-store" });
    const json = (await res.json().catch(() => null)) as unknown;

    if (!res.ok) {
      toast.error(readMessage(json) ?? "Failed to load branding");
      setLoading(false);
      return;
    }

    const next = normalizePayload(json);
    setForm(next);
    originalRef.current = next;

    setLoading(false);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const canSave = useMemo(() => {
    return Boolean(form.storeName.trim());
  }, [form.storeName]);

  const previewHasLogo = Boolean(form.logoUrl.trim());
  const previewLogoActive = previewHasLogo && (form.logoMode === "image" || form.logoMode === "both");
  const previewShowText =
    form.logoMode !== "image" && (!form.hideTextWhenLogoActive || !previewLogoActive);

  const previewLogoMaxH = Math.max(16, Math.min(96, Math.trunc(Number(form.logoMaxHeight) || 28)));
  const previewAspect =
    form.logoWidth && form.logoHeight && form.logoWidth > 0 && form.logoHeight > 0
      ? form.logoWidth / form.logoHeight
      : null;
  const previewLogoW = previewAspect ? Math.round(previewLogoMaxH * previewAspect) : previewLogoMaxH;

  async function save() {
    if (!canSave) return;
    setSaving(true);

    const payload = {
      storeName: form.storeName,
      headerBrandText: form.headerBrandText,
      logoMode: form.logoMode,
      logoAlignment: form.logoAlignment,
      hideTextWhenLogoActive: form.hideTextWhenLogoActive,
      logoMaxHeight: form.logoMaxHeight,
      logo: {
        url: form.logoUrl,
        width: form.logoWidth,
        height: form.logoHeight,
        alt: form.logoAlt,
      },
      brandTextStyle: {
        weight: form.weight,
        italic: form.italic,
        letterSpacing: form.letterSpacing,
        color: form.color,
        customColorEnabled: form.customColorEnabled,
        customColor: form.customColor,
        gradientEnabled: form.gradientEnabled,
        embossedEnabled: form.embossedEnabled,
        embossedIntensity: form.embossedIntensity,
        glowEnabled: form.glowEnabled,
        glowColor: form.glowColor,
        glowIntensity: form.glowIntensity,
        blinkEnabled: form.blinkEnabled,
        blinkSpeedMs: form.blinkSpeedMs,
      },
      seo: {
        title: form.seoTitle,
        description: form.seoDescription,
        ogImageUrl: form.ogImageUrl,
      },
      faviconSourceUrl: form.faviconSourceUrl,
    };

    const res = await fetch("/api/admin/branding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = (await res.json().catch(() => null)) as unknown;

    if (!res.ok) {
      toast.error(readMessage(json) ?? "Failed to save");
      setSaving(false);
      return;
    }

    const next = normalizePayload(json);
    setForm(next);
    originalRef.current = next;

    toast.success("Branding saved");

    try {
      const bc = new BroadcastChannel("storefront-settings");
      bc.postMessage({ type: "updated", at: Date.now() });
      bc.close();
    } catch {
    }

    setSaving(false);
  }

  async function onPickLogo(file: File) {
    try {
      const url = await uploadImage(file);
      setForm((s) => ({
        ...s,
        logoUrl: url,
        logoMode: s.logoMode === "text" ? "both" : s.logoMode,
      }));
      toast.success("Logo uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
  }

  async function onPickFavicon(file: File) {
    try {
      const url = await uploadImage(file);
      setForm((s) => ({ ...s, faviconSourceUrl: url }));
      toast.success("Favicon source uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Branding</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Manage store name, header logo, favicon, and SEO branding.
          </p>
          <p className="mt-1 text-xs text-zinc-500">Last saved: {form.updatedAt ? new Date(form.updatedAt).toLocaleString() : "Never"}</p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/cms/settings">
            <Button variant="secondary">Back</Button>
          </Link>
          <Button variant="secondary" onClick={() => void load()} disabled={saving}>
            Refresh
          </Button>
          <Button onClick={() => void save()} disabled={saving || !canSave}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Store identity</h2>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Store name</label>
                <Input value={form.storeName} onChange={(e) => setForm((s) => ({ ...s, storeName: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Header brand text</label>
                <Input
                  value={form.headerBrandText}
                  onChange={(e) => setForm((s) => ({ ...s, headerBrandText: e.target.value }))}
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Logo mode</label>
                <select
                  value={form.logoMode}
                  onChange={(e) => setForm((s) => ({ ...s, logoMode: e.target.value === "image" ? "image" : e.target.value === "both" ? "both" : "text" }))}
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                >
                  <option value="text">Text</option>
                  <option value="image">Image</option>
                  <option value="both">Text + image</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Logo alignment</label>
                <select
                  value={form.logoAlignment}
                  onChange={(e) => setForm((s) => ({ ...s, logoAlignment: e.target.value === "center" ? "center" : "left" }))}
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Logo max height (px)</label>
                <Input
                  type="number"
                  min={16}
                  max={96}
                  value={form.logoMaxHeight}
                  onChange={(e) => setForm((s) => ({ ...s, logoMaxHeight: clampInt(e.target.value, 16, 96, 28) }))}
                />
              </div>

              <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
                <span>Hide text when logo is active</span>
                <input
                  type="checkbox"
                  checked={form.hideTextWhenLogoActive}
                  onChange={(e) => setForm((s) => ({ ...s, hideTextWhenLogoActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-zinc-300"
                />
              </label>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Logo image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onPickLogo(f);
                  }}
                  className="block w-full text-sm text-zinc-700 file:mr-3 file:rounded-xl file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white dark:text-zinc-300 dark:file:bg-zinc-50 dark:file:text-zinc-900"
                />
                {form.logoUrl ? <p className="text-xs text-zinc-500 break-all">{form.logoUrl}</p> : null}
                {form.logoUrl ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      setForm((s) => ({
                        ...s,
                        logoUrl: "",
                        logoWidth: null,
                        logoHeight: null,
                        logoMode: "text",
                      }))
                    }
                    disabled={saving}
                  >
                    Remove logo
                  </Button>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Logo alt text</label>
                <Input value={form.logoAlt} onChange={(e) => setForm((s) => ({ ...s, logoAlt: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Brand text styling</h2>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Font weight</label>
                <Input
                  type="number"
                  min={300}
                  max={900}
                  step={100}
                  value={form.weight}
                  onChange={(e) => setForm((s) => ({ ...s, weight: clampInt(e.target.value, 300, 900, 600) }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Letter spacing</label>
                <select
                  value={form.letterSpacing}
                  onChange={(e) => setForm((s) => ({ ...s, letterSpacing: e.target.value === "wide" ? "wide" : e.target.value === "normal" ? "normal" : "tight" }))}
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                >
                  <option value="tight">Tight</option>
                  <option value="normal">Normal</option>
                  <option value="wide">Wide</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Text color</label>
                <select
                  value={form.color}
                  onChange={(e) => setForm((s) => ({ ...s, color: e.target.value === "primary" ? "primary" : e.target.value === "muted" ? "muted" : "foreground" }))}
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                >
                  <option value="foreground">Foreground</option>
                  <option value="muted">Muted</option>
                  <option value="primary">Primary</option>
                </select>
              </div>

              <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
                <span>Custom color</span>
                <input
                  type="checkbox"
                  checked={form.customColorEnabled}
                  onChange={(e) => setForm((s) => ({ ...s, customColorEnabled: e.target.checked }))}
                  className="h-4 w-4 rounded border-zinc-300"
                />
              </label>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Custom color (HEX)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.customColor}
                    onChange={(e) => setForm((s) => ({ ...s, customColor: e.target.value }))}
                    className="h-11 w-14 rounded-xl border border-zinc-200 bg-white px-2 dark:border-zinc-800 dark:bg-zinc-950"
                    disabled={!form.customColorEnabled}
                  />
                  <Input
                    value={form.customColor}
                    onChange={(e) => setForm((s) => ({ ...s, customColor: e.target.value }))}
                    disabled={!form.customColorEnabled}
                  />
                </div>
              </div>

              <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
                <span>Italic</span>
                <input
                  type="checkbox"
                  checked={form.italic}
                  onChange={(e) => setForm((s) => ({ ...s, italic: e.target.checked }))}
                  className="h-4 w-4 rounded border-zinc-300"
                />
              </label>

              <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
                <span>Gradient</span>
                <input
                  type="checkbox"
                  checked={form.gradientEnabled}
                  onChange={(e) => setForm((s) => ({ ...s, gradientEnabled: e.target.checked }))}
                  className="h-4 w-4 rounded border-zinc-300"
                />
              </label>

              <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
                <span>Embossed</span>
                <input
                  type="checkbox"
                  checked={form.embossedEnabled}
                  onChange={(e) => setForm((s) => ({ ...s, embossedEnabled: e.target.checked }))}
                  className="h-4 w-4 rounded border-zinc-300"
                />
              </label>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Emboss intensity</label>
                <Input
                  type="number"
                  min={0}
                  max={60}
                  value={form.embossedIntensity}
                  onChange={(e) => setForm((s) => ({ ...s, embossedIntensity: clampInt(e.target.value, 0, 60, 18) }))}
                  disabled={!form.embossedEnabled}
                />
              </div>

              <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
                <span>Glow</span>
                <input
                  type="checkbox"
                  checked={form.glowEnabled}
                  onChange={(e) => setForm((s) => ({ ...s, glowEnabled: e.target.checked }))}
                  className="h-4 w-4 rounded border-zinc-300"
                />
              </label>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Glow color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.glowColor}
                    onChange={(e) => setForm((s) => ({ ...s, glowColor: e.target.value }))}
                    className="h-11 w-14 rounded-xl border border-zinc-200 bg-white px-2 dark:border-zinc-800 dark:bg-zinc-950"
                    disabled={!form.glowEnabled}
                  />
                  <Input
                    value={form.glowColor}
                    onChange={(e) => setForm((s) => ({ ...s, glowColor: e.target.value }))}
                    disabled={!form.glowEnabled}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Glow intensity</label>
                <Input
                  type="number"
                  min={0}
                  max={60}
                  value={form.glowIntensity}
                  onChange={(e) => setForm((s) => ({ ...s, glowIntensity: clampInt(e.target.value, 0, 60, 14) }))}
                  disabled={!form.glowEnabled}
                />
              </div>

              <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
                <span>Blinking</span>
                <input
                  type="checkbox"
                  checked={form.blinkEnabled}
                  onChange={(e) => setForm((s) => ({ ...s, blinkEnabled: e.target.checked }))}
                  className="h-4 w-4 rounded border-zinc-300"
                />
              </label>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Blink speed (ms)</label>
                <Input
                  type="number"
                  min={200}
                  max={6000}
                  value={form.blinkSpeedMs}
                  onChange={(e) => setForm((s) => ({ ...s, blinkSpeedMs: clampInt(e.target.value, 200, 6000, 1400) }))}
                  disabled={!form.blinkEnabled}
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">SEO branding</h2>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Site title</label>
                <Input value={form.seoTitle} onChange={(e) => setForm((s) => ({ ...s, seoTitle: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Meta description</label>
                <Input
                  value={form.seoDescription}
                  onChange={(e) => setForm((s) => ({ ...s, seoDescription: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">OG image URL (optional)</label>
                <Input value={form.ogImageUrl} onChange={(e) => setForm((s) => ({ ...s, ogImageUrl: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Favicon</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Upload a square image. On save, the system generates all recommended favicon sizes + manifest.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Favicon source image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onPickFavicon(f);
                  }}
                  className="block w-full text-sm text-zinc-700 file:mr-3 file:rounded-xl file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white dark:text-zinc-300 dark:file:bg-zinc-50 dark:file:text-zinc-900"
                />
                {form.faviconSourceUrl ? <p className="text-xs text-zinc-500 break-all">{form.faviconSourceUrl}</p> : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Generated assets</label>
                <p className="text-xs text-zinc-500">Version: {form.faviconAssetsVersion || "Not generated"}</p>
                <p className="text-xs text-zinc-500">Updated: {form.faviconUpdatedAt ? new Date(form.faviconUpdatedAt).toLocaleString() : "—"}</p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setForm((s) => ({ ...s, faviconSourceUrl: "", faviconAssetsVersion: "", faviconUpdatedAt: 0 }))}
                  disabled={saving}
                >
                  Reset to default
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Live preview</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Preview uses the live theme tokens.
            </p>

            <div className="mt-4 rounded-2xl border border-border bg-header p-4">
              <div
                className="flex items-center"
                style={{ justifyContent: form.logoAlignment === "center" ? "center" : "flex-start" }}
              >
                <div className="inline-flex items-center gap-2">
                  {previewLogoActive ? (
                    <span className="relative block shrink-0" style={{ height: previewLogoMaxH, width: previewLogoW }}>
                      <Image
                        src={form.logoUrl}
                        alt={form.logoAlt || form.storeName}
                        fill
                        className="object-contain"
                        unoptimized
                        sizes={`${previewLogoW}px`}
                      />
                    </span>
                  ) : null}

                  {previewShowText ? (
                    <span
                      style={{
                        fontWeight: form.weight,
                        fontStyle: form.italic ? "italic" : "normal",
                        letterSpacing: form.letterSpacing === "wide" ? "0.08em" : form.letterSpacing === "normal" ? "0" : "-0.02em",
                        color:
                          form.gradientEnabled
                            ? "transparent"
                            : form.customColorEnabled
                              ? form.customColor
                              : form.color === "primary"
                                ? "var(--theme-primary)"
                                : form.color === "muted"
                                  ? "var(--theme-muted-foreground)"
                                  : "var(--theme-foreground)",
                        backgroundImage: form.gradientEnabled
                          ? "linear-gradient(90deg, var(--theme-primary), var(--theme-foreground))"
                          : undefined,
                        WebkitBackgroundClip: form.gradientEnabled ? "text" : undefined,
                        backgroundClip: form.gradientEnabled ? "text" : undefined,
                        textShadow: form.embossedEnabled
                          ? `0 1px 0 color-mix(in srgb, var(--theme-foreground) ${Math.max(0, Math.min(60, form.embossedIntensity))}%, transparent), 0 -1px 0 color-mix(in srgb, var(--theme-background) ${Math.max(0, Math.min(60, form.embossedIntensity))}%, transparent)`
                          : form.glowEnabled
                            ? `0 0 ${Math.max(0, Math.min(60, form.glowIntensity))}px ${form.glowColor}`
                            : undefined,
                        animation: form.blinkEnabled ? `brandTextBlink ${Math.max(200, Math.min(6000, form.blinkSpeedMs))}ms infinite` : undefined,
                      }}
                      className="text-base"
                    >
                      {form.headerBrandText || form.storeName}
                    </span>
                  ) : null}
                </div>
              </div>

              <p className="mt-3 text-xs text-zinc-500">Header bg uses <code>bg-header</code> token.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-4 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
            Tip: Upload logo + favicon via the uploader, then click Save to generate favicon sizes and update SEO.
          </div>
        </div>
      </div>
    </div>
  );
}
