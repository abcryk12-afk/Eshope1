"use client";

import { useMemo, useState } from "react";

import { THEME_PRESETS, type BuilderThemeId } from "@/lib/themes/presets";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  applyPreset,
  importTheme,
  publishTheme,
  redo,
  resetToDefault,
  setMode,
  undo,
  updateToken,
  type ThemeBuilderMode,
} from "@/store/themeBuilderSlice";

type JsonPanelState = {
  text: string;
  error: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function safeJsonParse(raw: string) {
  try {
    return { ok: true as const, value: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false as const, value: null };
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export default function ThemeBuilderApp() {
  const dispatch = useAppDispatch();
  const builder = useAppSelector((s) => s.themeBuilder);

  const [jsonPanel, setJsonPanel] = useState<JsonPanelState>({ text: "", error: "" });

  const exportJson = useMemo(() => {
    return JSON.stringify(
      {
        activeThemeId: builder.activeThemeId,
        tokens: builder.customTokens,
        mode: builder.mode,
      },
      null,
      2
    );
  }, [builder.activeThemeId, builder.customTokens, builder.mode]);

  const previewUrl = useMemo(() => {
    // Enable the override provider in the preview window without affecting storefront users.
    return "/?themeBuilderPreview=1";
  }, []);

  return (
    <div className="grid gap-6 2xl:grid-cols-[520px_1fr]">
      <section className="rounded-3xl border border-border bg-background p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-foreground">Theme Builder</div>
            <div className="mt-1 text-xs text-muted-foreground">Parallel SaaS theme system (safe by default).</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ModeButton mode={builder.mode} value="default" onClick={(v) => dispatch(setMode(v))} />
            <ModeButton mode={builder.mode} value="preview" onClick={(v) => dispatch(setMode(v))} />
            <ModeButton mode={builder.mode} value="published" onClick={(v) => dispatch(setMode(v))} />
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          <div className="grid gap-2">
            <div className="text-sm font-semibold text-foreground">Presets</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {THEME_PRESETS.map((p) => {
                const active = builder.activeThemeId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => dispatch(applyPreset(p.id as BuilderThemeId))}
                    className={cn(
                      "rounded-2xl border border-border bg-background px-3 py-3 text-left",
                      "transition-colors hover:bg-muted",
                      active ? "ring-2 ring-primary/30" : ""
                    )}
                  >
                    <div className="text-sm font-semibold text-foreground">{p.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{p.id}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-foreground">History</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => dispatch(undo())}
                  className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  Undo
                </button>
                <button
                  type="button"
                  onClick={() => dispatch(redo())}
                  className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  Redo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => dispatch(resetToDefault())}
                className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => dispatch(publishTheme())}
                className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Publish
              </button>
              <div className="flex items-center justify-end text-xs text-muted-foreground">
                {builder.isDirty ? "Unsaved changes" : "Clean"}
              </div>
            </div>
          </div>

          <TokenSection title="Colors">
            <ColorRow
              label="Primary"
              value={builder.customTokens.colors.primary}
              onChange={(v) => dispatch(updateToken({ path: ["colors", "primary"], value: v }))}
            />
            <ColorRow
              label="Accent"
              value={builder.customTokens.colors.accent}
              onChange={(v) => dispatch(updateToken({ path: ["colors", "accent"], value: v }))}
            />
            <ColorRow
              label="Background"
              value={builder.customTokens.colors.background}
              onChange={(v) => dispatch(updateToken({ path: ["colors", "background"], value: v }))}
            />
            <ColorRow
              label="Surface"
              value={builder.customTokens.colors.surface}
              onChange={(v) => dispatch(updateToken({ path: ["colors", "surface"], value: v }))}
            />
            <ColorRow
              label="Muted"
              value={builder.customTokens.colors.muted}
              onChange={(v) => dispatch(updateToken({ path: ["colors", "muted"], value: v }))}
            />
            <ColorRow
              label="Destructive"
              value={builder.customTokens.colors.destructive}
              onChange={(v) => dispatch(updateToken({ path: ["colors", "destructive"], value: v }))}
            />
            <ColorRow
              label="Success"
              value={builder.customTokens.colors.success}
              onChange={(v) => dispatch(updateToken({ path: ["colors", "success"], value: v }))}
            />
          </TokenSection>

          <TokenSection title="Radius">
            <SliderRow
              label="SM"
              value={builder.customTokens.radius.sm}
              min={0}
              max={24}
              step={1}
              onChange={(n) => dispatch(updateToken({ path: ["radius", "sm"], value: n }))}
            />
            <SliderRow
              label="MD"
              value={builder.customTokens.radius.md}
              min={0}
              max={32}
              step={1}
              onChange={(n) => dispatch(updateToken({ path: ["radius", "md"], value: n }))}
            />
            <SliderRow
              label="LG"
              value={builder.customTokens.radius.lg}
              min={0}
              max={40}
              step={1}
              onChange={(n) => dispatch(updateToken({ path: ["radius", "lg"], value: n }))}
            />
            <SliderRow
              label="XL"
              value={builder.customTokens.radius.xl}
              min={0}
              max={56}
              step={1}
              onChange={(n) => dispatch(updateToken({ path: ["radius", "xl"], value: n }))}
            />
          </TokenSection>

          <TokenSection title="Shadows">
            <TextRow
              label="SM"
              value={builder.customTokens.shadows.sm}
              onChange={(v) => dispatch(updateToken({ path: ["shadows", "sm"], value: v }))}
            />
            <TextRow
              label="MD"
              value={builder.customTokens.shadows.md}
              onChange={(v) => dispatch(updateToken({ path: ["shadows", "md"], value: v }))}
            />
            <TextRow
              label="LG"
              value={builder.customTokens.shadows.lg}
              onChange={(v) => dispatch(updateToken({ path: ["shadows", "lg"], value: v }))}
            />
          </TokenSection>

          <TokenSection title="Motion">
            <SliderRow
              label="Fast"
              value={builder.customTokens.motion.fastMs}
              min={50}
              max={400}
              step={10}
              onChange={(n) => dispatch(updateToken({ path: ["motion", "fastMs"], value: n }))}
            />
            <SliderRow
              label="Normal"
              value={builder.customTokens.motion.normalMs}
              min={80}
              max={800}
              step={10}
              onChange={(n) => dispatch(updateToken({ path: ["motion", "normalMs"], value: n }))}
            />
            <SliderRow
              label="Slow"
              value={builder.customTokens.motion.slowMs}
              min={120}
              max={1200}
              step={10}
              onChange={(n) => dispatch(updateToken({ path: ["motion", "slowMs"], value: n }))}
            />
            <TextRow
              label="Ease"
              value={builder.customTokens.motion.easeStandard}
              onChange={(v) => dispatch(updateToken({ path: ["motion", "easeStandard"], value: v }))}
            />
          </TokenSection>

          <TokenSection title="Typography">
            <TextRow
              label="Font family"
              value={builder.customTokens.typography.fontFamilyBase}
              onChange={(v) => dispatch(updateToken({ path: ["typography", "fontFamilyBase"], value: v }))}
            />
            <SliderRow
              label="Base size"
              value={builder.customTokens.typography.fontSizeBasePx}
              min={12}
              max={20}
              step={1}
              onChange={(n) => dispatch(updateToken({ path: ["typography", "fontSizeBasePx"], value: n }))}
            />
            <SliderRow
              label="Scale"
              value={Math.round(builder.customTokens.typography.fontScale * 100)}
              min={90}
              max={120}
              step={1}
              onChange={(n) => dispatch(updateToken({ path: ["typography", "fontScale"], value: clamp(n / 100, 0.9, 1.2) }))}
            />
          </TokenSection>

          <TokenSection title="Import / Export">
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setJsonPanel({ text: exportJson, error: "" });
                  }}
                  className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  Export JSON
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const parsed = safeJsonParse(jsonPanel.text);
                    if (!parsed.ok || !isRecord(parsed.value)) {
                      setJsonPanel((p) => ({ ...p, error: "Invalid JSON" }));
                      return;
                    }

                    const v = parsed.value;
                    dispatch(
                      importTheme({
                        activeThemeId: typeof v.activeThemeId === "string" ? v.activeThemeId : undefined,
                        tokens: isRecord(v.tokens) ? (v.tokens as unknown as typeof builder.customTokens) : undefined,
                      })
                    );
                    setJsonPanel((p) => ({ ...p, error: "" }));
                  }}
                  className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Import JSON
                </button>
              </div>

              <textarea
                value={jsonPanel.text}
                onChange={(e) => setJsonPanel({ text: e.target.value, error: "" })}
                rows={8}
                className="w-full rounded-2xl border border-border bg-background p-3 font-mono text-xs text-foreground"
                placeholder="Paste theme JSON here..."
              />
              {jsonPanel.error ? <div className="text-xs font-semibold text-destructive">{jsonPanel.error}</div> : null}
            </div>
          </TokenSection>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-background p-3 md:p-4">
        <div className="flex items-center justify-between gap-3 px-2 py-2">
          <div className="text-sm font-semibold text-foreground">Live Preview</div>
          <div className="text-xs text-muted-foreground">
            Preview uses <code className="font-mono">?themeBuilderPreview=1</code>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border">
          <iframe title="Theme preview" src={previewUrl} className="h-[78vh] w-full bg-white" />
        </div>
      </section>
    </div>
  );
}

function ModeButton({
  mode,
  value,
  onClick,
}: {
  mode: ThemeBuilderMode;
  value: ThemeBuilderMode;
  onClick: (v: ThemeBuilderMode) => void;
}) {
  const active = mode === value;
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={cn(
        "rounded-xl border border-border px-3 py-2 text-xs font-semibold",
        active ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-muted"
      )}
    >
      {value}
    </button>
  );
}

function TokenSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-3">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="mt-3 grid gap-3">{children}</div>
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-xs font-semibold text-foreground">{label}</div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 rounded-md border border-border bg-background"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-28 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
        />
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid grid-cols-[92px_1fr_64px] items-center gap-3">
      <div className="text-xs font-semibold text-foreground">{label}</div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
      />
    </div>
  );
}

function TextRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-2">
      <div className="text-xs font-semibold text-foreground">{label}</div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground"
      />
    </div>
  );
}
