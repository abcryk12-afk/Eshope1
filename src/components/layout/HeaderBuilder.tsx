"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { getHeaderTemplateById, headerTemplates } from "@/lib/headerTemplates";
import { clampInt, headerUid, normalizeLayout, normalizeSettings } from "@/lib/headerUtils";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  restoreDefaultHeader,
  setHeaderBuilderEnabled,
  setHeaderScopeMode,
  setHeaderScopePaths,
  setHeaderLayout,
  setHeaderSettings,
  setHeaderTemplate,
  type HeaderBlock,
  type HeaderBlockType,
  type HeaderLayout,
  type HeaderSettings,
} from "@/store/headerSlice";

import CustomHeader from "@/components/layout/CustomHeader";

type ZoneKey = keyof HeaderLayout;

type DragPayload = {
  fromZone: ZoneKey;
  fromIndex: number;
  blockId: string;
};

const HEADER_KEY = "shop.header.v1";

function labelForType(t: HeaderBlockType) {
  switch (t) {
    case "logo":
      return "Logo";
    case "navigation":
      return "Navigation";
    case "megaMenu":
      return "Mega menu";
    case "search":
      return "Search";
    case "cartIcon":
      return "Cart";
    case "accountIcon":
      return "Account";
    case "wishlistIcon":
      return "Wishlist";
    case "languageSelector":
      return "Language";
    case "currencySelector":
      return "Currency";
    case "announcementBar":
      return "Announcement bar";
    case "customHTML":
      return "Custom HTML";
    case "divider":
      return "Divider";
    case "spacer":
      return "Spacer";
    case "socialIcons":
      return "Social icons";
    case "mobileMenu":
      return "Mobile menu";
    default:
      return "Block";
  }
}

function newBlock(type: HeaderBlockType): HeaderBlock {
  return {
    id: headerUid(type),
    type,
    enabled: true,
    label: labelForType(type),
    data: type === "customHTML" ? { html: "<div>Custom HTML</div>" } : undefined,
  };
}

function updateZone(layout: HeaderLayout, zone: ZoneKey, nextList: HeaderBlock[]): HeaderLayout {
  return { ...layout, [zone]: nextList };
}

export default function HeaderBuilder() {
  const dispatch = useAppDispatch();
  const stored = useAppSelector((s) => s.header);

  const initialTemplate = useMemo(() => getHeaderTemplateById(stored?.activeTemplateId || "classic-store"), [stored?.activeTemplateId]);

  const [draftLayout, setDraftLayout] = useState<HeaderLayout>(() =>
    normalizeLayout(stored?.customLayout ?? initialTemplate.layout)
  );

  const [draftSettings, setDraftSettingsState] = useState<HeaderSettings>(() =>
    normalizeSettings({ ...stored?.settings, sticky: initialTemplate.sticky, transparent: initialTemplate.transparent })
  );

  const [selectedZone, setSelectedZone] = useState<ZoneKey>("left");
  const [selectedBlockId, setSelectedBlockId] = useState<string>(draftLayout.left[0]?.id ?? "");

  const dragRef = useRef<DragPayload | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ zone: ZoneKey; blockId: string } | null>(null);

  const allBlocks = useMemo(() => {
    return [...draftLayout.left, ...draftLayout.center, ...draftLayout.right];
  }, [draftLayout]);

  const selected = useMemo(() => {
    return allBlocks.find((b) => b.id === selectedBlockId) ?? null;
  }, [allBlocks, selectedBlockId]);

  const setDraftSettings = useCallback((patch: Partial<HeaderSettings>) => {
    setDraftSettingsState((p) => normalizeSettings({ ...p, ...patch }));
  }, []);

  const applyTemplate = useCallback(
    (id: string) => {
      const tpl = getHeaderTemplateById(id);
      dispatch(setHeaderTemplate({ templateId: tpl.id, layout: tpl.layout, settings: { sticky: tpl.sticky, transparent: tpl.transparent, ...(tpl.settings ?? {}) } }));
      setDraftLayout(normalizeLayout(tpl.layout));
      setDraftSettingsState((p) => normalizeSettings({ ...p, sticky: tpl.sticky, transparent: tpl.transparent, ...(tpl.settings ?? {}) }));
      setSelectedZone("left");
      setSelectedBlockId(tpl.layout.left[0]?.id ?? "");
      toast.success("Template applied");
    },
    [dispatch]
  );

  const resetToTemplate = useCallback(() => {
    const tpl = getHeaderTemplateById(stored?.activeTemplateId || "classic-store");
    setDraftLayout(normalizeLayout(tpl.layout));
    setDraftSettingsState((p) => normalizeSettings({ ...p, sticky: tpl.sticky, transparent: tpl.transparent, ...(tpl.settings ?? {}) }));
    toast.success("Reset to template");
  }, [stored?.activeTemplateId]);

  const save = useCallback(() => {
    dispatch(setHeaderLayout(draftLayout));
    dispatch(setHeaderSettings(draftSettings));

    if (typeof window !== "undefined") {
      const payload = {
        state: {
          isDefault: false,
          activeTemplateId: stored?.activeTemplateId || "classic-store",
          customLayout: draftLayout,
          settings: draftSettings,
          updatedAt: Date.now(),
        },
        updatedAt: Date.now(),
      };
      window.localStorage.setItem(HEADER_KEY, JSON.stringify(payload));
    }

    toast.success("Header saved");
  }, [dispatch, draftLayout, draftSettings, stored?.activeTemplateId]);

  const resetToDefault = useCallback(() => {
    dispatch(restoreDefaultHeader());
    toast.success("Restored default header");
  }, [dispatch]);

  const cancelDrag = useCallback(() => {
    dragRef.current = null;
    setDraggingId(null);
    setDropTarget(null);
  }, []);

  const onDropOn = useCallback(
    (toZone: ZoneKey, toIndex: number) => {
      const payload = dragRef.current;
      cancelDrag();
      if (!payload) return;

      const { fromZone, fromIndex } = payload;
      if (fromZone === toZone && fromIndex === toIndex) return;

      setDraftLayout((prev) => {
        const fromList = prev[fromZone].slice();
        const [item] = fromList.splice(fromIndex, 1);
        if (!item) return prev;

        const toList = fromZone === toZone ? fromList : prev[toZone].slice();
        const safeToIndex = Math.min(toList.length, Math.max(0, toIndex));
        toList.splice(safeToIndex, 0, item);

        const next = { ...prev, [fromZone]: fromList, [toZone]: toList } as HeaderLayout;
        return next;
      });
    },
    [cancelDrag]
  );

  const removeBlock = useCallback(() => {
    if (!selected) return;

    setDraftLayout((prev) => {
      for (const zone of ["left", "center", "right"] as ZoneKey[]) {
        const idx = prev[zone].findIndex((b) => b.id === selected.id);
        if (idx >= 0) {
          const nextList = prev[zone].slice();
          nextList.splice(idx, 1);
          return updateZone(prev, zone, nextList);
        }
      }
      return prev;
    });

    setSelectedBlockId("");
  }, [selected]);

  const toggleBlockEnabled = useCallback((enabled: boolean) => {
    if (!selected) return;

    setDraftLayout((prev) => {
      const next: HeaderLayout = { ...prev };
      (Object.keys(next) as ZoneKey[]).forEach((zone) => {
        next[zone] = next[zone].map((b) => (b.id === selected.id ? { ...b, enabled } : b));
      });
      return next;
    });
  }, [selected]);

  const blockLibrary: Array<{ type: HeaderBlockType; label: string }> = [
    { type: "logo", label: "Logo" },
    { type: "navigation", label: "Navigation" },
    { type: "megaMenu", label: "Mega menu" },
    { type: "search", label: "Search" },
    { type: "cartIcon", label: "Cart" },
    { type: "accountIcon", label: "Account" },
    { type: "wishlistIcon", label: "Wishlist" },
    { type: "languageSelector", label: "Language" },
    { type: "currencySelector", label: "Currency" },
    { type: "divider", label: "Divider" },
    { type: "spacer", label: "Spacer" },
    { type: "customHTML", label: "Custom HTML" },
    { type: "mobileMenu", label: "Mobile menu" },
  ];

  const previewState = useMemo(() => {
    return {
      customLayout: draftLayout,
      settings: draftSettings,
    };
  }, [draftLayout, draftSettings]);

  const renderZoneEditor = useCallback(
    (zone: ZoneKey) => {
      const list = draftLayout[zone];

      return (
        <div className="rounded-2xl border border-border bg-background p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-foreground">{zone.toUpperCase()}</div>
            <button
              type="button"
              onClick={() => {
                setSelectedZone(zone);
                setSelectedBlockId(list[0]?.id ?? "");
              }}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Focus
            </button>
          </div>

          <div className="mt-3 grid gap-2">
            {list.length === 0 ? (
              <div
                className={cn(
                  "rounded-2xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground",
                  dropTarget?.zone === zone ? "ring-2 ring-primary/30" : ""
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggingId) setDropTarget({ zone, blockId: "__empty__" });
                }}
                onDrop={() => onDropOn(zone, 0)}
              >
                Drop here
              </div>
            ) : (
              list.map((b, idx) => {
                const active = b.id === selectedBlockId;
                const over = dropTarget?.zone === zone && dropTarget?.blockId === b.id;

                return (
                  <div
                    key={b.id}
                    onClick={() => {
                      setSelectedZone(zone);
                      setSelectedBlockId(b.id);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggingId) setDropTarget({ zone, blockId: b.id });
                    }}
                    onDrop={() => onDropOn(zone, idx)}
                    onDragEnd={cancelDrag}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-3 py-3",
                      "transition-colors hover:bg-muted",
                      active ? "ring-2 ring-foreground/25" : "",
                      draggingId === b.id ? "opacity-70" : "",
                      over ? "ring-2 ring-primary/30" : ""
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          draggable
                          onDragStart={() => {
                            dragRef.current = { fromZone: zone, fromIndex: idx, blockId: b.id };
                            setDraggingId(b.id);
                            setDropTarget(null);
                          }}
                          onDragEnd={cancelDrag}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            "cursor-grab select-none rounded-md px-1 text-xs text-muted-foreground",
                            "transition-colors hover:bg-muted"
                          )}
                          aria-label="Drag to reorder"
                        >
                          ≡
                        </button>
                        <span className="truncate text-sm font-semibold text-foreground">{labelForType(b.type)}</span>
                        {!b.enabled ? <span className="text-xs font-semibold text-muted-foreground">(hidden)</span> : null}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{b.type}</div>
                    </div>

                    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={b.enabled}
                        onChange={(e) => {
                          const v = e.target.checked;
                          setDraftLayout((prev) => updateZone(prev, zone, prev[zone].map((x) => (x.id === b.id ? { ...x, enabled: v } : x))));
                        }}
                      />
                      Enabled
                    </label>
                  </div>
                );
              })
            )}
          </div>
        </div>
      );
    },
    [cancelDrag, draftLayout, draggingId, dropTarget, onDropOn, selectedBlockId]
  );

  const enabled = Boolean(stored?.enabled);
  const scopeMode = stored?.scopeMode ?? "allowlist";
  const scopePaths = stored?.scopePaths ?? [];

  return (
    <div className="grid gap-6 2xl:grid-cols-[560px_1fr]">
      <section className="rounded-3xl border border-border bg-background p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-foreground">Header Builder</div>
            <div className="mt-1 text-xs text-muted-foreground">Enable to allow the custom header engine (feature-flag gated).</div>
          </div>

          <label className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => {
                const v = e.target.checked;
                dispatch(setHeaderBuilderEnabled(v));
                toast.success(v ? "Custom header enabled" : "Custom header disabled");
              }}
            />
            Enable Custom Header
          </label>
        </div>

        <div className="mt-5" />

        <div className="grid gap-4">
          <div className="rounded-2xl border border-border bg-background p-3">
            <div className="text-sm font-semibold text-foreground">Storefront scope</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Safety default: allowlist empty means the storefront keeps the production header.
            </div>

            <div className="mt-3 grid gap-2">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-muted-foreground">Mode</span>
                <select
                  className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
                  value={scopeMode}
                  onChange={(e) => {
                    const v = e.target.value === "denylist" ? "denylist" : "allowlist";
                    dispatch(setHeaderScopeMode(v));
                  }}
                >
                  <option value="allowlist">Allowlist (only these paths use custom header)</option>
                  <option value="denylist">Denylist (all except these paths use custom header)</option>
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
                    dispatch(setHeaderScopePaths(next));
                  }}
                  placeholder="Examples:\n/\n/product\n/category"
                />
              </label>
            </div>
          </div>

          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">Header Builder</div>
            <div className="text-xs text-muted-foreground">Drag blocks between Left / Center / Right. Your current storefront header stays default until you disable Default mode.</div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">Header Builder</div>
              <div className="text-xs text-muted-foreground">Drag blocks between Left / Center / Right. Your current storefront header stays default until you disable Default mode.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={resetToTemplate}
                className="h-10 rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Reset to template
              </button>
              <button
                type="button"
                onClick={resetToDefault}
                className="h-10 rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Restore default
              </button>
              <button
                type="button"
                onClick={save}
                className="h-10 rounded-2xl bg-foreground px-4 text-sm font-semibold text-background transition-opacity hover:opacity-90"
              >
                Save
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="grid gap-6 xl:grid-cols-2">
              <div>
                <div className="text-sm font-semibold text-foreground">Templates</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {headerTemplates.slice(0, 8).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => applyTemplate(t.id)}
                      className={cn(
                        "rounded-2xl border border-border bg-background px-3 py-3 text-left text-sm transition-colors hover:bg-muted",
                        stored?.activeTemplateId === t.id ? "ring-2 ring-foreground/25" : ""
                      )}
                    >
                      <div className="font-semibold text-foreground">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.id}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-foreground">Layout + settings</div>
                <div className="mt-3 grid gap-3 rounded-2xl border border-border bg-background p-3">
                  <label className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">Sticky</span>
                    <input type="checkbox" checked={draftSettings.sticky} onChange={(e) => setDraftSettings({ sticky: e.target.checked })} />
                  </label>

                  <label className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">Transparent</span>
                    <input type="checkbox" checked={draftSettings.transparent} onChange={(e) => setDraftSettings({ transparent: e.target.checked })} />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Header height (px)</span>
                    <input
                      type="number"
                      className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
                      value={draftSettings.heightPx}
                      onChange={(e) => setDraftSettings({ heightPx: clampInt(Number(e.target.value), 44, 120) })}
                    />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Search style</span>
                    <select
                      className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
                      value={draftSettings.searchStyle}
                      onChange={(e) => setDraftSettings({ searchStyle: e.target.value === "bar" ? "bar" : "icon" })}
                    >
                      <option value="icon">Icon</option>
                      <option value="bar">Full bar</option>
                    </select>
                  </label>

                  <label className="grid gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Dropdown speed (ms)</span>
                    <input
                      type="number"
                      className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
                      value={draftSettings.dropdownSpeedMs}
                      onChange={(e) => setDraftSettings({ dropdownSpeedMs: clampInt(Number(e.target.value), 80, 800) })}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm font-semibold text-foreground">Blocks</div>
              <div className="mt-3 grid gap-6 lg:grid-cols-3">
                {renderZoneEditor("left")}
                {renderZoneEditor("center")}
                {renderZoneEditor("right")}
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm font-semibold text-foreground">Add block</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {blockLibrary.map((x) => (
                  <button
                    key={x.type}
                    type="button"
                    onClick={() => {
                      const z = selectedZone;
                      const created = newBlock(x.type);
                      setDraftLayout((prev) => updateZone(prev, z, [...prev[z], created]));
                      setSelectedBlockId(created.id);
                    }}
                    className="rounded-2xl border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                  >
                    {x.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-background">
          <div className="border-b border-border px-4 py-4">
            <div className="text-sm font-semibold text-foreground">Live preview</div>
            <div className="text-xs text-muted-foreground">This preview updates instantly and does not reload the page.</div>
          </div>
          <div className="p-4">
            <CustomHeader layout={previewState.customLayout} settings={previewState.settings} />
          </div>
        </div>
      </section>

      <div className="min-w-0">
        <div className="rounded-2xl border border-border bg-background 2xl:sticky 2xl:top-6">
          <div className="border-b border-border px-4 py-4">
            <div className="text-sm font-semibold text-foreground">Selected block</div>
            <div className="text-xs text-muted-foreground">Edit visibility and advanced options.</div>
          </div>

          <div className="p-4">
            {!selected ? (
              <div className="text-sm text-muted-foreground">Select a block to edit.</div>
            ) : (
              <div className="grid gap-4">
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Label</span>
                  <input
                    className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
                    value={selected.label ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDraftLayout((prev) => {
                        const next: HeaderLayout = { ...prev };
                        (Object.keys(next) as ZoneKey[]).forEach((zone) => {
                          next[zone] = next[zone].map((b) => (b.id === selected.id ? { ...b, label: v } : b));
                        });
                        return next;
                      });
                    }}
                  />
                </label>

                <label className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Enabled</span>
                  <input type="checkbox" checked={selected.enabled} onChange={(e) => toggleBlockEnabled(e.target.checked)} />
                </label>

                {selected.type === "customHTML" ? (
                  <label className="grid gap-1">
                    <span className="text-xs font-medium text-muted-foreground">HTML</span>
                    <textarea
                      className="min-h-28 rounded-2xl border border-border bg-background px-3 py-3 text-xs"
                      value={String(selected.data?.html ?? "")}
                      onChange={(e) => {
                        const html = e.target.value;
                        setDraftLayout((prev) => {
                          const next: HeaderLayout = { ...prev };
                          (Object.keys(next) as ZoneKey[]).forEach((zone) => {
                            next[zone] = next[zone].map((b) => (b.id === selected.id ? { ...b, data: { ...(b.data ?? {}), html } } : b));
                          });
                          return next;
                        });
                      }}
                    />
                  </label>
                ) : null}

                <button
                  type="button"
                  onClick={removeBlock}
                  className="h-11 rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Remove block
                </button>

                <div className="rounded-2xl border border-border bg-background p-3 text-xs text-muted-foreground">
                  Blocks like navigation/mega-menu use existing data sources. This builder only controls layout, visibility, and presentation.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
