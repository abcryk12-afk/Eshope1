"use client";

import { useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  applyProductCardPreset,
  publishProductCardEngine,
  resetProductCardEngine,
  setProductCardBlocks,
  setProductCardEngineEnabled,
  setProductCardEngineMode,
  setProductCardScopeMode,
  setProductCardScopePaths,
  updateProductCardSettings,
  type ProductCardBlock,
  type ProductCardBlockType,
  type ProductCardEngineMode,
  type ProductCardPresetId,
} from "@/store/productCardEngineSlice";

const PRESETS: Array<{ id: ProductCardPresetId; name: string }> = [
  { id: "daraz", name: "Daraz Style" },
  { id: "aliexpress", name: "AliExpress Style" },
  { id: "temu", name: "Temu Style" },
  { id: "amazon", name: "Amazon Style" },
  { id: "premium-minimal", name: "Premium Minimal" },
  { id: "glass-modern", name: "Glass Modern" },
];

function labelForBlock(t: ProductCardBlockType) {
  switch (t) {
    case "image":
      return "Image";
    case "badges":
      return "Badges";
    case "wishlist":
      return "Wishlist";
    case "title":
      return "Title";
    case "rating":
      return "Rating";
    case "price":
      return "Price";
    case "actions":
      return "Actions";
    case "meta":
      return "Meta";
    default:
      return "Block";
  }
}

function moveItem<T>(arr: T[], from: number, to: number) {
  const next = [...arr];
  const item = next.splice(from, 1)[0];
  next.splice(to, 0, item);
  return next;
}

export default function ProductCardBuilderApp() {
  const dispatch = useAppDispatch();
  const engine = useAppSelector((s) => s.productCardEngine);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  const enabled = Boolean(engine.enabled);
  const scopeMode = engine.scopeMode ?? "allowlist";
  const scopePaths = engine.scopePaths ?? [];

  const previewUrl = useMemo(() => "/?productCardEngine=1", []);

  const blocks = engine.blocks;

  function onDragStart(idx: number, id: string) {
    dragIndexRef.current = idx;
    setDraggingId(id);
  }

  function onDrop(idx: number) {
    const from = dragIndexRef.current;
    dragIndexRef.current = null;
    setDraggingId(null);
    if (typeof from !== "number" || from === idx) return;
    dispatch(setProductCardBlocks(moveItem(blocks, from, idx)));
  }

  return (
    <div className="grid gap-6 2xl:grid-cols-[560px_1fr]">
      <section className="rounded-3xl border border-border bg-background p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-foreground">Product Card Builder</div>
            <div className="mt-1 text-xs text-muted-foreground">Parallel engine (safe by default). Enable + scope paths to activate.</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ModeButton mode={engine.mode} value="default" onClick={(v) => dispatch(setProductCardEngineMode(v))} />
            <ModeButton mode={engine.mode} value="preview" onClick={(v) => dispatch(setProductCardEngineMode(v))} />
            <ModeButton mode={engine.mode} value="published" onClick={(v) => dispatch(setProductCardEngineMode(v))} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground">
            <input type="checkbox" checked={enabled} onChange={(e) => dispatch(setProductCardEngineEnabled(e.target.checked))} />
            Enable Engine
          </label>

          <button
            type="button"
            onClick={() => dispatch(publishProductCardEngine())}
            className="rounded-2xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Publish
          </button>

          <button
            type="button"
            onClick={() => dispatch(resetProductCardEngine())}
            className="rounded-2xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
          >
            Reset
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-background p-3">
          <div className="text-sm font-semibold text-foreground">Storefront scope</div>
          <div className="mt-1 text-xs text-muted-foreground">Safety default: allowlist empty keeps the production product card.</div>
          <div className="mt-3 grid gap-2">
            <label className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">Mode</span>
              <select
                className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
                value={scopeMode}
                onChange={(e) => dispatch(setProductCardScopeMode(e.target.value === "denylist" ? "denylist" : "allowlist"))}
              >
                <option value="allowlist">Allowlist (only these paths use engine)</option>
                <option value="denylist">Denylist (all except these paths use engine)</option>
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">Paths (one per line)</span>
              <textarea
                className="min-h-24 rounded-2xl border border-border bg-background px-3 py-3 text-xs"
                value={scopePaths.join("\n")}
                onChange={(e) => {
                  const next = e.target.value
                    .split(/\r?\n/g)
                    .map((x) => x.trim())
                    .filter(Boolean);
                  dispatch(setProductCardScopePaths(next));
                }}
                placeholder="Examples:\n/\n/product\n/category"
              />
            </label>
          </div>
        </div>

        <div className="mt-4 grid gap-4">
          <div className="rounded-2xl border border-border bg-background p-3">
            <div className="text-sm font-semibold text-foreground">Presets</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => dispatch(applyProductCardPreset(p.id))}
                  className={cn(
                    "rounded-2xl border border-border bg-background px-3 py-3 text-left text-sm transition-colors hover:bg-muted",
                    engine.activePresetId === p.id ? "ring-2 ring-primary/30" : ""
                  )}
                >
                  <div className="font-semibold text-foreground">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.id}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background p-3">
            <div className="text-sm font-semibold text-foreground">Blocks (drag to reorder)</div>
            <div className="mt-3 grid gap-2">
              {blocks.map((b, idx) => (
                <div
                  key={b.id}
                  draggable
                  onDragStart={() => onDragStart(idx, b.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(idx)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-3 py-3",
                    "transition-colors hover:bg-muted",
                    draggingId === b.id ? "opacity-70" : ""
                  )}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{labelForBlock(b.type)}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{b.type}</div>
                  </div>

                  <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={b.enabled}
                      onChange={(e) => {
                        const v = e.target.checked;
                        const next = blocks.map((x) => (x.id === b.id ? { ...x, enabled: v } : x));
                        dispatch(setProductCardBlocks(next as ProductCardBlock[]));
                      }}
                    />
                    Enabled
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background p-3">
            <div className="text-sm font-semibold text-foreground">Style</div>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-muted-foreground">Radius (px)</span>
                <input
                  type="number"
                  className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
                  value={engine.settings.radiusPx}
                  onChange={(e) => dispatch(updateProductCardSettings({ radiusPx: Number(e.target.value) }))}
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-medium text-muted-foreground">Density</span>
                <select
                  className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
                  value={engine.settings.density}
                  onChange={(e) => {
                    const v = e.target.value;
                    dispatch(updateProductCardSettings({ density: v === "compact" ? "compact" : v === "spacious" ? "spacious" : "balanced" }));
                  }}
                >
                  <option value="compact">Compact</option>
                  <option value="balanced">Balanced</option>
                  <option value="spacious">Spacious</option>
                </select>
              </label>

              <label className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Enable image zoom</span>
                <input
                  type="checkbox"
                  checked={engine.settings.enableImageZoom}
                  onChange={(e) => dispatch(updateProductCardSettings({ enableImageZoom: e.target.checked }))}
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-background p-3 md:p-4">
        <div className="flex items-center justify-between gap-3 px-2 py-2">
          <div className="text-sm font-semibold text-foreground">Live Preview</div>
          <div className="text-xs text-muted-foreground">Enable with <code className="font-mono">?productCardEngine=1</code></div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border">
          <iframe title="Product card preview" src={previewUrl} className="h-[78vh] w-full bg-white" />
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
  mode: ProductCardEngineMode;
  value: ProductCardEngineMode;
  onClick: (v: ProductCardEngineMode) => void;
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
