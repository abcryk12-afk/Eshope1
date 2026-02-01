"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import { applyThemeToDocument, DEFAULT_THEME, PRESET_THEMES, type ThemeColors, type ThemePresetId } from "@/lib/theme";
import { useAppDispatch } from "@/store/hooks";
import { hydrateTheme } from "@/store/slices/themeSlice";

type ThemePayload = {
  preset: ThemePresetId;
  colors: ThemeColors;
  updatedAt: number;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizeTheme(json: unknown): ThemePayload {
  const fallback: ThemePayload = { preset: "default", colors: DEFAULT_THEME, updatedAt: 0 };
  if (!isRecord(json) || !isRecord(json.theme)) return fallback;
  const t = json.theme;

  const preset = (t.preset === "default" || t.preset === "daraz" || t.preset === "amazon") ? (t.preset as ThemePresetId) : "default";
  const colors = isRecord(t.colors)
    ? {
        primary: String(t.colors.primary ?? DEFAULT_THEME.primary),
        secondary: String(t.colors.secondary ?? DEFAULT_THEME.secondary),
        background: String(t.colors.background ?? DEFAULT_THEME.background),
        surface: String(t.colors.surface ?? t.colors.background ?? DEFAULT_THEME.surface),
        header: String(t.colors.header ?? t.colors.background ?? DEFAULT_THEME.header),
        text: String(t.colors.text ?? DEFAULT_THEME.text),
      }
    : DEFAULT_THEME;
  const updatedAt = typeof t.updatedAt === "number" ? t.updatedAt : 0;

  return { preset, colors, updatedAt };
}

export default function AdminThemeSettingsClient() {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [preset, setPreset] = useState<ThemePresetId>("default");
  const [colors, setColors] = useState<ThemeColors>(DEFAULT_THEME);
  const [updatedAt, setUpdatedAt] = useState(0);

  const originalRef = useRef<ThemeColors | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    const res = await fetch("/api/admin/theme", { cache: "no-store" });
    if (!res.ok) {
      toast.error("Failed to load theme");
      setLoading(false);
      return;
    }

    const json = (await res.json().catch(() => null)) as unknown;
    const t = normalizeTheme(json);

    setPreset(t.preset);
    setColors(t.colors);
    setUpdatedAt(t.updatedAt);

    dispatch(hydrateTheme({ preset: t.preset, colors: t.colors, updatedAt: t.updatedAt }));

    originalRef.current = t.colors;
    applyThemeToDocument(t.colors);

    setLoading(false);
  }, [dispatch]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    applyThemeToDocument(colors);
  }, [colors]);

  useEffect(() => {
    return () => {
      if (originalRef.current) {
        applyThemeToDocument(originalRef.current);
      }
    };
  }, []);

  const presets = useMemo(() => {
    return [
      { id: "default" as const, label: "Default" },
      { id: "daraz" as const, label: "Daraz" },
      { id: "amazon" as const, label: "Amazon" },
    ];
  }, []);

  function applyPreset(id: ThemePresetId) {
    setPreset(id);
    setColors(PRESET_THEMES[id]);
  }

  async function save() {
    setSaving(true);

    const res = await fetch("/api/admin/theme", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preset, colors }),
    });

    const json = (await res.json().catch(() => null)) as unknown;

    if (!res.ok) {
      toast.error(isRecord(json) && typeof json.message === "string" ? json.message : "Failed to save");
      setSaving(false);
      return;
    }

    const t = normalizeTheme(json);
    setPreset(t.preset);
    setColors(t.colors);
    setUpdatedAt(t.updatedAt);

    dispatch(hydrateTheme({ preset: t.preset, colors: t.colors, updatedAt: t.updatedAt }));

    originalRef.current = t.colors;
    applyThemeToDocument(t.colors);

    toast.success("Theme saved");
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Appearance</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Manage global colors. Changes apply across the site instantly.</p>
          <p className="mt-1 text-xs text-zinc-500">Last saved: {updatedAt ? new Date(updatedAt).toLocaleString() : "Never"}</p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/cms/settings">
            <Button variant="secondary">Back</Button>
          </Link>
          <Button variant="secondary" onClick={() => void load()} disabled={saving}>
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
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Preset themes</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {presets.map((p) => (
                <Button
                  key={p.id}
                  type="button"
                  variant={preset === p.id ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => applyPreset(p.id)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Colors</h2>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Primary</label>
                <div className="mt-2 flex items-center gap-2">
                  <input type="color" value={colors.primary} onChange={(e) => setColors((c) => ({ ...c, primary: e.target.value }))} className="h-11 w-14 rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950" />
                  <Input value={colors.primary} onChange={(e) => setColors((c) => ({ ...c, primary: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Secondary</label>
                <div className="mt-2 flex items-center gap-2">
                  <input type="color" value={colors.secondary} onChange={(e) => setColors((c) => ({ ...c, secondary: e.target.value }))} className="h-11 w-14 rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950" />
                  <Input value={colors.secondary} onChange={(e) => setColors((c) => ({ ...c, secondary: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Background</label>
                <div className="mt-2 flex items-center gap-2">
                  <input type="color" value={colors.background} onChange={(e) => setColors((c) => ({ ...c, background: e.target.value }))} className="h-11 w-14 rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950" />
                  <Input value={colors.background} onChange={(e) => setColors((c) => ({ ...c, background: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Surface / Card</label>
                <div className="mt-2 flex items-center gap-2">
                  <input type="color" value={colors.surface} onChange={(e) => setColors((c) => ({ ...c, surface: e.target.value }))} className="h-11 w-14 rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950" />
                  <Input value={colors.surface} onChange={(e) => setColors((c) => ({ ...c, surface: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Header</label>
                <div className="mt-2 flex items-center gap-2">
                  <input type="color" value={colors.header} onChange={(e) => setColors((c) => ({ ...c, header: e.target.value }))} className="h-11 w-14 rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950" />
                  <Input value={colors.header} onChange={(e) => setColors((c) => ({ ...c, header: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Text</label>
                <div className="mt-2 flex items-center gap-2">
                  <input type="color" value={colors.text} onChange={(e) => setColors((c) => ({ ...c, text: e.target.value }))} className="h-11 w-14 rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950" />
                  <Input value={colors.text} onChange={(e) => setColors((c) => ({ ...c, text: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Live preview</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Preview uses the real global CSS variables.
            </p>

            <div className="mt-4 space-y-3 rounded-2xl border border-border bg-surface p-4">
              <p className="text-sm font-semibold" style={{ color: "var(--theme-foreground)" }}>
                Sample card
              </p>
              <p className="text-sm" style={{ color: "var(--theme-foreground)" }}>
                This is how buttons, inputs, and accents will look.
              </p>
              <Input placeholder="Search..." />
              <div className="flex items-center gap-2">
                <Button size="sm">Primary</Button>
                <Button size="sm" variant="secondary">
                  Secondary
                </Button>
              </div>
              <a href="#" className="text-sm underline" style={{ color: "var(--theme-primary)" }}>
                Example link
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-4 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
            Tip: for full-site consistency, gradually replace hard-coded <code>bg-zinc-900</code> / <code>text-zinc-900</code> in custom buttons with <code>Button</code> or theme variables.
          </div>
        </div>
      </div>
    </div>
  );
}
