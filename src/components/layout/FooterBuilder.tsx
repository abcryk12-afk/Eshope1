"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { footerTemplates, getFooterTemplateById } from "@/lib/footerTemplates";
import { generateFooterFromStoreConfig, type StoreFooterConfigInput } from "@/lib/footerAI";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  resetFooterLayout,
  setFooterBuilderEnabled,
  setFooterScopeMode,
  setFooterScopePaths,
  setFooterLayout,
  type FooterAlign,
  type FooterLayout,
  type FooterMobileView,
  type FooterSection,
  type FooterSectionType,
  type FooterLink,
} from "@/store/footerSlice";

import Footer from "@/components/layout/Footer";

const FOOTER_KEY = "shop.footer.v1";

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function clampInt(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.floor(v)));
}

function newLinksSection(): FooterSection {
  return {
    id: uid("section"),
    type: "links",
    enabled: true,
    title: "Links",
    data: {
      columns: 1,
      links: [
        { id: uid("link"), label: "Contact", href: "/contact" },
        { id: uid("link"), label: "Returns", href: "/returns" },
      ],
    },
  };
}

function newNewsletterSection(): FooterSection {
  return {
    id: uid("section"),
    type: "newsletter",
    enabled: true,
    title: "Newsletter",
    data: {
      description: "Subscribe for updates and deals.",
      placeholder: "Enter your email",
      buttonText: "Subscribe",
    },
  };
}

function newSocialSection(): FooterSection {
  return {
    id: uid("section"),
    type: "social",
    enabled: true,
    title: "Follow",
    data: {
      links: [
        { id: uid("social"), label: "Instagram", href: "https://instagram.com" },
        { id: uid("social"), label: "Facebook", href: "https://facebook.com" },
      ],
    },
  };
}

function newPaymentSection(): FooterSection {
  return {
    id: uid("section"),
    type: "paymentIcons",
    enabled: true,
    title: "Payments",
    data: {
      kinds: ["visa", "mastercard", "paypal"],
    },
  };
}

function newCompanyInfoSection(): FooterSection {
  return {
    id: uid("section"),
    type: "companyInfo",
    enabled: true,
    title: "",
    data: {
      storeName: "Shop",
      description: "Premium products, secure checkout.",
      logoUrl: "",
    },
  };
}

function newContactSection(): FooterSection {
  return {
    id: uid("section"),
    type: "contactInfo",
    enabled: true,
    title: "Contact",
    data: {
      email: "support@example.com",
      phone: "+1 (555) 000-0000",
      addressLines: ["123 Market Street", "City"],
    },
  };
}

function newAppDownloadSection(): FooterSection {
  return {
    id: uid("section"),
    type: "appDownload",
    enabled: true,
    title: "Get the app",
    data: {
      title: "Download on iOS / Android",
      iosUrl: "https://apple.com",
      androidUrl: "https://play.google.com",
    },
  };
}

function newLegalSection(): FooterSection {
  return {
    id: uid("section"),
    type: "legal",
    enabled: true,
    title: "",
    data: {
      copyrightText: "© {year} Shop. All rights reserved.",
      links: [
        { id: uid("legal"), label: "Terms", href: "/terms" },
        { id: uid("legal"), label: "Privacy", href: "/privacy" },
      ],
    },
  };
}

function newCustomHtmlSection(): FooterSection {
  return {
    id: uid("section"),
    type: "customHTML",
    enabled: true,
    title: "Custom HTML",
    data: {
      html: "<p>Custom footer content</p>",
    },
  };
}

function createSectionByType(t: FooterSectionType): FooterSection {
  if (t === "newsletter") return newNewsletterSection();
  if (t === "social") return newSocialSection();
  if (t === "paymentIcons") return newPaymentSection();
  if (t === "companyInfo") return newCompanyInfoSection();
  if (t === "contactInfo") return newContactSection();
  if (t === "appDownload") return newAppDownloadSection();
  if (t === "legal") return newLegalSection();
  if (t === "customHTML") return newCustomHtmlSection();
  return newLinksSection();
}

function move<T>(arr: T[], from: number, to: number) {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function safeParseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function gridColsClass(columns: number) {
  const c = clampInt(columns, 1, 6);
  return c;
}

export default function FooterBuilder() {
  const dispatch = useAppDispatch();
  const footerState = useAppSelector((s) => s.footer);
  const stored = footerState.layout;

  const [draft, setDraft] = useState<FooterLayout>(() => {
    const base = stored ?? getFooterTemplateById("classic-4col");
    return { ...base, sections: [...base.sections] };
  });

  const [selectedId, setSelectedId] = useState<string>(() => draft.sections[0]?.id ?? "");
  const selected = useMemo(() => draft.sections.find((s) => s.id === selectedId) ?? null, [draft.sections, selectedId]);

  const dragIndexRef = useRef<number | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropOverId, setDropOverId] = useState<string | null>(null);

  const columns = gridColsClass(draft.columns);
  const mobileView: FooterMobileView = draft.mobileView === "grid" ? "grid" : "accordion";

  const previewLayout = useMemo(() => {
    return {
      ...draft,
      columns,
      mobileView,
    };
  }, [draft, columns, mobileView]);

  const setAlign = useCallback(
    (align: FooterAlign) => {
      setDraft((prev) => ({ ...prev, align }));
    },
    [setDraft]
  );

  const onStartDrag = useCallback((idx: number) => {
    dragIndexRef.current = idx;
  }, []);

  const onDropOn = useCallback(
    (overIdx: number) => {
      const from = dragIndexRef.current;
      dragIndexRef.current = null;
      setDraggingId(null);
      setDropOverId(null);
      if (from === null) return;
      if (from === overIdx) return;

      setDraft((prev) => ({ ...prev, sections: move(prev.sections, from, overIdx) }));
    },
    [setDraft]
  );

  const cancelDrag = useCallback(() => {
    dragIndexRef.current = null;
    setDraggingId(null);
    setDropOverId(null);
  }, []);

  const updateSection = useCallback(
    (next: FooterSection) => {
      setDraft((prev) => ({ ...prev, sections: prev.sections.map((s) => (s.id === next.id ? next : s)) }));
    },
    [setDraft]
  );

  const removeSection = useCallback(
    (id: string) => {
      setDraft((prev) => {
        const nextSections = prev.sections.filter((s) => s.id !== id);
        return { ...prev, sections: nextSections.length ? nextSections : prev.sections };
      });
      setSelectedId((prev) => (prev === id ? "" : prev));
    },
    [setDraft]
  );

  const addSection = useCallback(
    (t: FooterSectionType) => {
      const section = createSectionByType(t);
      setDraft((prev) => ({ ...prev, sections: [...prev.sections, section] }));
      setSelectedId(section.id);
    },
    [setDraft]
  );

  const applyTemplate = useCallback(
    (templateId: string) => {
      const t = getFooterTemplateById(templateId);
      const cloned: FooterLayout = { ...t, sections: t.sections.map((s) => ({ ...s })) };
      setDraft(cloned);
      setSelectedId(cloned.sections[0]?.id ?? "");
    },
    [setDraft]
  );

  const applyAI = useCallback(
    (payload: StoreFooterConfigInput) => {
      const next = generateFooterFromStoreConfig(payload);
      setDraft(next);
      setSelectedId(next.sections[0]?.id ?? "");
    },
    [setDraft]
  );

  const save = useCallback(() => {
    dispatch(setFooterLayout(draft));
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        FOOTER_KEY,
        JSON.stringify({ layout: draft, updatedAt: Date.now() })
      );
    }
    toast.success("Footer saved");
  }, [dispatch, draft]);

  const reset = useCallback(() => {
    dispatch(resetFooterLayout());
    const base = getFooterTemplateById("classic-4col");
    setDraft({ ...base, sections: [...base.sections] });
    setSelectedId(base.sections[0]?.id ?? "");
  }, [dispatch]);

  const legalEnabled = draft.sections.some((s) => s.type === "legal" && s.enabled);

  const ensureLegal = useCallback(
    (on: boolean) => {
      setDraft((prev) => {
        const has = prev.sections.some((s) => s.type === "legal");
        if (on) {
          if (has) return { ...prev, sections: prev.sections.map((s) => (s.type === "legal" ? { ...s, enabled: true } : s)) };
          return { ...prev, sections: [...prev.sections, newLegalSection()] };
        }
        return { ...prev, sections: prev.sections.map((s) => (s.type === "legal" ? { ...s, enabled: false } : s)) };
      });
    },
    [setDraft]
  );

  const toggleByType = useCallback(
    (type: FooterSectionType, enabled: boolean) => {
      setDraft((prev) => ({
        ...prev,
        sections: prev.sections.map((s) => (s.type === type ? { ...s, enabled } : s)),
      }));
    },
    [setDraft]
  );

  const showNewsletter = draft.sections.some((s) => s.type === "newsletter" && s.enabled);
  const showPayments = draft.sections.some((s) => s.type === "paymentIcons" && s.enabled);
  const showSocial = draft.sections.some((s) => s.type === "social" && s.enabled);

  const edit = selected;

  const setSelectedTitle = useCallback(
    (title: string) => {
      if (!edit) return;
      updateSection({ ...edit, title });
    },
    [edit, updateSection]
  );

  const setSelectedEnabled = useCallback(
    (enabled: boolean) => {
      if (!edit) return;
      updateSection({ ...edit, enabled });
    },
    [edit, updateSection]
  );

  const setSectionData = useCallback(
    (data: FooterSection["data"]) => {
      if (!edit) return;
      updateSection({ ...edit, data });
    },
    [edit, updateSection]
  );

  const sectionTypes: Array<{ type: FooterSectionType; label: string }> = [
    { type: "links", label: "Links" },
    { type: "newsletter", label: "Newsletter" },
    { type: "social", label: "Social" },
    { type: "paymentIcons", label: "Payment Icons" },
    { type: "companyInfo", label: "Company Info" },
    { type: "contactInfo", label: "Contact Info" },
    { type: "appDownload", label: "App Download" },
    { type: "legal", label: "Legal" },
    { type: "customHTML", label: "Custom HTML" },
  ];

  const enabled = Boolean(footerState.enabled);
  const scopeMode = footerState.scopeMode ?? "allowlist";
  const scopePaths = footerState.scopePaths ?? [];

  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
      <div className="min-w-0">
        <div className="rounded-2xl border border-border bg-background">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">Footer Builder</div>
              <div className="text-xs text-muted-foreground">Drag sections to reorder. Click a section to edit.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => {
                    const v = e.target.checked;
                    dispatch(setFooterBuilderEnabled(v));
                    toast.success(v ? "Custom footer enabled" : "Custom footer disabled");
                  }}
                />
                Enable Custom Footer
              </label>
              <button
                type="button"
                onClick={reset}
                className="h-10 rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Reset
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
            <div className="rounded-2xl border border-border bg-background p-3">
              <div className="text-sm font-semibold text-foreground">Storefront scope</div>
              <div className="mt-1 text-xs text-muted-foreground">Safety default: allowlist empty keeps the production footer.</div>
              <div className="mt-3 grid gap-2">
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Mode</span>
                  <select
                    className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
                    value={scopeMode}
                    onChange={(e) => {
                      const v = e.target.value === "denylist" ? "denylist" : "allowlist";
                      dispatch(setFooterScopeMode(v));
                    }}
                  >
                    <option value="allowlist">Allowlist (only these paths use custom footer)</option>
                    <option value="denylist">Denylist (all except these paths use custom footer)</option>
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
                      dispatch(setFooterScopePaths(next));
                    }}
                    placeholder="Examples:\n/\n/product\n/category"
                  />
                </label>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div>
                <div className="text-sm font-semibold text-foreground">Templates</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {footerTemplates.slice(0, 6).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => applyTemplate(t.id)}
                      className={cn(
                        "rounded-2xl border border-border bg-background px-3 py-3 text-left text-sm transition-colors hover:bg-muted",
                        draft.id === t.id ? "ring-2 ring-foreground/25" : ""
                      )}
                    >
                      <div className="font-semibold text-foreground">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.columns} columns</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-foreground">AI Generate</div>
                <div className="mt-3 rounded-2xl border border-border bg-background p-3">
                  <AiPanel onGenerate={applyAI} />
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <div>
                <div className="text-sm font-semibold text-foreground">Layout</div>

                <div className="mt-3 grid gap-3">
                  <label className="grid gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Columns</span>
                    <select
                      className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
                      value={columns}
                      onChange={(e) => setDraft((p) => ({ ...p, columns: clampInt(Number(e.target.value), 1, 6) }))}
                    >
                      {[1, 2, 3, 4, 5, 6].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Alignment</span>
                    <select
                      className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
                      value={draft.align}
                      onChange={(e) => setAlign(e.target.value as FooterAlign)}
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </label>

                  <label className="grid gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Background style</span>
                    <select
                      className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
                      value={draft.style}
                      onChange={(e) => setDraft((p) => ({ ...p, style: e.target.value as FooterLayout["style"] }))}
                    >
                      <option value="solid">Solid</option>
                      <option value="gradient">Gradient</option>
                      <option value="dark">Dark</option>
                    </select>
                  </label>

                  <label className="grid gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Custom background</span>
                    <input
                      className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
                      value={draft.colors.background}
                      placeholder="#ffffff or css color"
                      onChange={(e) => setDraft((p) => ({ ...p, colors: { ...p.colors, background: e.target.value } }))}
                    />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Custom text</span>
                    <input
                      className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
                      value={draft.colors.text}
                      placeholder="#111111 or css color"
                      onChange={(e) => setDraft((p) => ({ ...p, colors: { ...p.colors, text: e.target.value } }))}
                    />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Mobile view</span>
                    <select
                      className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
                      value={draft.mobileView}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          mobileView: (e.target.value === "grid" ? "grid" : "accordion") as FooterMobileView,
                        }))
                      }
                    >
                      <option value="accordion">Accordion (menu style)</option>
                      <option value="grid">Grid (desktop style)</option>
                    </select>
                  </label>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-foreground">Feature toggles</div>

                <div className="mt-3 grid gap-3 rounded-2xl border border-border bg-background p-3">
                  <ToggleRow label="Show newsletter" checked={showNewsletter} onChange={(v) => toggleByType("newsletter", v)} />
                  <ToggleRow label="Show payment icons" checked={showPayments} onChange={(v) => toggleByType("paymentIcons", v)} />
                  <ToggleRow label="Show social icons" checked={showSocial} onChange={(v) => toggleByType("social", v)} />
                  <ToggleRow label="Show legal" checked={legalEnabled} onChange={(v) => ensureLegal(v)} />
                </div>

                <div className="mt-6">
                  <div className="text-sm font-semibold text-foreground">Add section</div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {sectionTypes.map((x) => (
                      <button
                        key={x.type}
                        type="button"
                        onClick={() => addSection(x.type)}
                        className="h-11 rounded-2xl border border-border bg-background px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                      >
                        {x.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <div className="text-sm font-semibold text-foreground">Sections</div>
              <div className="mt-3 grid gap-2">
                {draft.sections.map((s, idx) => {
                  const active = s.id === selectedId;
                  const isDragging = draggingId === s.id;
                  const isDropOver = dropOverId === s.id;

                  return (
                    <div
                      key={s.id}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (draggingId) setDropOverId(s.id);
                      }}
                      onDragLeave={() => {
                        setDropOverId((prev) => (prev === s.id ? null : prev));
                      }}
                      onDrop={() => onDropOn(idx)}
                      onDragEnd={cancelDrag}
                      onClick={() => setSelectedId(s.id)}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-3 py-3",
                        "transition-colors hover:bg-muted",
                        active ? "ring-2 ring-foreground/25" : "",
                        isDragging ? "opacity-70" : "",
                        isDropOver ? "ring-2 ring-primary/30" : ""
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            draggable
                            onDragStart={() => {
                              setDraggingId(s.id);
                              setDropOverId(null);
                              onStartDrag(idx);
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
                          <span className="truncate text-sm font-semibold text-foreground">{labelForSection(s)}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{s.type}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={s.enabled}
                            onChange={(e) => updateSection({ ...s, enabled: e.target.checked })}
                          />
                          Enabled
                        </label>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSection(s.id);
                          }}
                          className="h-9 rounded-2xl border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-background">
          <div className="border-b border-border px-4 py-4">
            <div className="text-sm font-semibold text-foreground">Live preview</div>
            <div className="text-xs text-muted-foreground">This preview uses your current draft layout.</div>
          </div>
          <div className="p-4">
            <Footer fallbackLayout={previewLayout} />
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <div className="rounded-2xl border border-border bg-background 2xl:sticky 2xl:top-6">
          <div className="border-b border-border px-4 py-4">
            <div className="text-sm font-semibold text-foreground">Settings panel</div>
            <div className="text-xs text-muted-foreground">Edit the selected section.</div>
          </div>

          <div className="p-4">
            {!edit ? (
              <div className="text-sm text-muted-foreground">Select a section to edit.</div>
            ) : (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <div className="text-xs font-medium text-muted-foreground">Section title</div>
                  <input
                    className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
                    value={edit.title ?? ""}
                    onChange={(e) => setSelectedTitle(e.target.value)}
                    placeholder="Title (optional)"
                  />
                </div>

                <ToggleRow label="Enabled" checked={edit.enabled} onChange={setSelectedEnabled} />

                <SectionEditor
                  section={edit}
                  onDataChange={setSectionData}
                />

                <button
                  type="button"
                  onClick={() => removeSection(edit.id)}
                  className="h-11 rounded-2xl border border-border bg-background px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Remove this section
                </button>

                <div className="rounded-2xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                  <div className="font-semibold text-foreground">JSON snippet</div>
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap wrap-break-word">
                    {JSON.stringify(edit, null, 2)}
                  </pre>
                </div>

                <div className="rounded-2xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                  <div className="font-semibold text-foreground">Full config</div>
                  <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap wrap-break-word">
                    {JSON.stringify(draft, null, 2)}
                  </pre>
                </div>

                <div className="rounded-2xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                  <div className="font-semibold text-foreground">Import / Export</div>
                  <ImportExport
                    value={JSON.stringify(draft, null, 2)}
                    onImport={(raw) => {
                      const parsed = safeParseJson<FooterLayout>(raw);
                      if (!parsed || !parsed.sections) return;
                      setDraft(parsed);
                      setSelectedId(parsed.sections[0]?.id ?? "");
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function labelForSection(s: FooterSection) {
  const t = s.title?.trim();
  if (t) return t;
  if (s.type === "companyInfo") return "Company";
  if (s.type === "paymentIcons") return "Payments";
  if (s.type === "customHTML") return "Custom HTML";
  return s.type;
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm text-foreground">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function AiPanel({ onGenerate }: { onGenerate: (payload: StoreFooterConfigInput) => void }) {
  const [storeName, setStoreName] = useState("Shop");
  const [hasBlog, setHasBlog] = useState(true);
  const [hasSupport, setHasSupport] = useState(true);
  const [hasMobileApp, setHasMobileApp] = useState(false);
  const [countries, setCountries] = useState("US, UK");

  return (
    <div className="grid gap-3">
      <label className="grid gap-1">
        <span className="text-xs font-medium text-muted-foreground">Store name</span>
        <input
          className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <ToggleRow label="Has blog" checked={hasBlog} onChange={setHasBlog} />
        <ToggleRow label="Has support" checked={hasSupport} onChange={setHasSupport} />
        <ToggleRow label="Has mobile app" checked={hasMobileApp} onChange={setHasMobileApp} />
      </div>

      <label className="grid gap-1">
        <span className="text-xs font-medium text-muted-foreground">Countries (comma-separated)</span>
        <input
          className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
          value={countries}
          onChange={(e) => setCountries(e.target.value)}
        />
      </label>

      <button
        type="button"
        onClick={() =>
          onGenerate({
            storeName,
            hasBlog,
            hasSupport,
            hasMobileApp,
            countries: countries
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean),
          })
        }
        className="h-11 rounded-2xl bg-foreground px-4 text-sm font-semibold text-background transition-opacity hover:opacity-90"
      >
        Generate
      </button>
    </div>
  );
}

function SectionEditor({
  section,
  onDataChange,
}: {
  section: FooterSection;
  onDataChange: (data: FooterSection["data"]) => void;
}) {
  if (section.type === "links") {
    const data = section.data as { links: FooterLink[]; columns?: number };
    const links = Array.isArray(data.links) ? data.links : [];
    const cols = clampInt(Number(data.columns ?? 1), 1, 3);

    return (
      <div className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">Link columns (inside section)</span>
          <select
            className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
            value={cols}
            onChange={(e) => onDataChange({ ...data, columns: clampInt(Number(e.target.value), 1, 3) })}
          >
            {[1, 2, 3].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-2xl border border-border p-3">
          <div className="text-xs font-medium text-muted-foreground">Links</div>
          <div className="mt-3 grid gap-2">
            {links.map((l) => (
              <div key={l.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <input
                  className="h-10 rounded-2xl border border-border bg-background px-3 text-sm"
                  value={l.label}
                  onChange={(e) => {
                    const next = links.map((x) => (x.id === l.id ? { ...x, label: e.target.value } : x));
                    onDataChange({ ...data, links: next });
                  }}
                  placeholder="Label"
                />
                <input
                  className="h-10 rounded-2xl border border-border bg-background px-3 text-sm"
                  value={l.href}
                  onChange={(e) => {
                    const next = links.map((x) => (x.id === l.id ? { ...x, href: e.target.value } : x));
                    onDataChange({ ...data, links: next });
                  }}
                  placeholder="/path"
                />
                <button
                  type="button"
                  className="h-10 rounded-2xl border border-border bg-background px-3 text-xs font-semibold transition-colors hover:bg-muted"
                  onClick={() => {
                    const next = links.filter((x) => x.id !== l.id);
                    onDataChange({ ...data, links: next });
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onDataChange({ ...data, links: [...links, { id: uid("link"), label: "New link", href: "/" }] })}
            className="mt-3 h-10 rounded-2xl border border-border bg-background px-3 text-xs font-semibold transition-colors hover:bg-muted"
          >
            Add link
          </button>
        </div>
      </div>
    );
  }

  if (section.type === "newsletter") {
    const data = section.data as { description?: string; placeholder?: string; buttonText?: string };

    return (
      <div className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">Description</span>
          <input
            className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
            value={data.description ?? ""}
            onChange={(e) => onDataChange({ ...data, description: e.target.value })}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">Placeholder</span>
          <input
            className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
            value={data.placeholder ?? ""}
            onChange={(e) => onDataChange({ ...data, placeholder: e.target.value })}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">Button text</span>
          <input
            className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
            value={data.buttonText ?? ""}
            onChange={(e) => onDataChange({ ...data, buttonText: e.target.value })}
          />
        </label>
      </div>
    );
  }

  if (section.type === "social") {
    const data = section.data as { links: Array<{ id: string; label: string; href: string }> };
    const links = Array.isArray(data.links) ? data.links : [];

    return (
      <div className="grid gap-3">
        <div className="rounded-2xl border border-border p-3">
          <div className="text-xs font-medium text-muted-foreground">Social links</div>
          <div className="mt-3 grid gap-2">
            {links.map((l) => (
              <div key={l.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <input
                  className="h-10 rounded-2xl border border-border bg-background px-3 text-sm"
                  value={l.label}
                  onChange={(e) => {
                    const next = links.map((x) => (x.id === l.id ? { ...x, label: e.target.value } : x));
                    onDataChange({ ...data, links: next });
                  }}
                />
                <input
                  className="h-10 rounded-2xl border border-border bg-background px-3 text-sm"
                  value={l.href}
                  onChange={(e) => {
                    const next = links.map((x) => (x.id === l.id ? { ...x, href: e.target.value } : x));
                    onDataChange({ ...data, links: next });
                  }}
                />
                <button
                  type="button"
                  className="h-10 rounded-2xl border border-border bg-background px-3 text-xs font-semibold transition-colors hover:bg-muted"
                  onClick={() => {
                    const next = links.filter((x) => x.id !== l.id);
                    onDataChange({ ...data, links: next });
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onDataChange({ ...data, links: [...links, { id: uid("social"), label: "New", href: "https://" }] })}
            className="mt-3 h-10 rounded-2xl border border-border bg-background px-3 text-xs font-semibold transition-colors hover:bg-muted"
          >
            Add social link
          </button>
        </div>
      </div>
    );
  }

  if (section.type === "paymentIcons") {
    const data = section.data as { kinds: string[] };
    const kinds = Array.isArray(data.kinds) ? data.kinds : [];

    return (
      <div className="grid gap-2">
        <div className="text-xs font-medium text-muted-foreground">Payment kinds (comma-separated)</div>
        <input
          className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
          value={kinds.join(", ")}
          onChange={(e) =>
            onDataChange({
              ...data,
              kinds: e.target.value
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean),
            })
          }
        />
      </div>
    );
  }

  if (section.type === "companyInfo") {
    const data = section.data as { storeName?: string; description?: string; logoUrl?: string };

    return (
      <div className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">Store name</span>
          <input
            className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
            value={data.storeName ?? ""}
            onChange={(e) => onDataChange({ ...data, storeName: e.target.value })}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">Description</span>
          <input
            className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
            value={data.description ?? ""}
            onChange={(e) => onDataChange({ ...data, description: e.target.value })}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">Logo URL</span>
          <input
            className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
            value={data.logoUrl ?? ""}
            onChange={(e) => onDataChange({ ...data, logoUrl: e.target.value })}
            placeholder="/uploads/logo.png"
          />
        </label>
      </div>
    );
  }

  if (section.type === "contactInfo") {
    const data = section.data as { email?: string; phone?: string; addressLines?: string[] };
    const lines = Array.isArray(data.addressLines) ? data.addressLines : [];

    return (
      <div className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">Email</span>
          <input
            className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
            value={data.email ?? ""}
            onChange={(e) => onDataChange({ ...data, email: e.target.value })}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">Phone</span>
          <input
            className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
            value={data.phone ?? ""}
            onChange={(e) => onDataChange({ ...data, phone: e.target.value })}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">Address (comma-separated)</span>
          <input
            className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
            value={lines.join(", ")}
            onChange={(e) =>
              onDataChange({
                ...data,
                addressLines: e.target.value
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
      </div>
    );
  }

  if (section.type === "appDownload") {
    const data = section.data as { title?: string; iosUrl?: string; androidUrl?: string };

    return (
      <div className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">Title</span>
          <input
            className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
            value={data.title ?? ""}
            onChange={(e) => onDataChange({ ...data, title: e.target.value })}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">iOS URL</span>
          <input
            className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
            value={data.iosUrl ?? ""}
            onChange={(e) => onDataChange({ ...data, iosUrl: e.target.value })}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">Android URL</span>
          <input
            className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
            value={data.androidUrl ?? ""}
            onChange={(e) => onDataChange({ ...data, androidUrl: e.target.value })}
          />
        </label>
      </div>
    );
  }

  if (section.type === "legal") {
    const data = section.data as { copyrightText?: string; links?: FooterLink[] };
    const links = Array.isArray(data.links) ? data.links : [];

    return (
      <div className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">Copyright text</span>
          <input
            className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
            value={data.copyrightText ?? ""}
            onChange={(e) => onDataChange({ ...data, copyrightText: e.target.value })}
          />
        </label>

        <div className="rounded-2xl border border-border p-3">
          <div className="text-xs font-medium text-muted-foreground">Legal links</div>
          <div className="mt-3 grid gap-2">
            {links.map((l) => (
              <div key={l.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <input
                  className="h-10 rounded-2xl border border-border bg-background px-3 text-sm"
                  value={l.label}
                  onChange={(e) => {
                    const next = links.map((x) => (x.id === l.id ? { ...x, label: e.target.value } : x));
                    onDataChange({ ...data, links: next });
                  }}
                />
                <input
                  className="h-10 rounded-2xl border border-border bg-background px-3 text-sm"
                  value={l.href}
                  onChange={(e) => {
                    const next = links.map((x) => (x.id === l.id ? { ...x, href: e.target.value } : x));
                    onDataChange({ ...data, links: next });
                  }}
                />
                <button
                  type="button"
                  className="h-10 rounded-2xl border border-border bg-background px-3 text-xs font-semibold transition-colors hover:bg-muted"
                  onClick={() => {
                    const next = links.filter((x) => x.id !== l.id);
                    onDataChange({ ...data, links: next });
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onDataChange({ ...data, links: [...links, { id: uid("legal"), label: "New", href: "/" }] })}
            className="mt-3 h-10 rounded-2xl border border-border bg-background px-3 text-xs font-semibold transition-colors hover:bg-muted"
          >
            Add legal link
          </button>
        </div>
      </div>
    );
  }

  if (section.type === "customHTML") {
    const data = section.data as { html: string };

    return (
      <div className="grid gap-2">
        <div className="text-xs font-medium text-muted-foreground">HTML</div>
        <textarea
          className="min-h-36 rounded-2xl border border-border bg-background px-3 py-2 text-sm"
          value={data.html ?? ""}
          onChange={(e) => onDataChange({ ...data, html: e.target.value })}
        />
      </div>
    );
  }

  return (
    <div className="text-sm text-muted-foreground">No editor for this section type yet.</div>
  );
}

function ImportExport({ value, onImport }: { value: string; onImport: (raw: string) => void }) {
  const [raw, setRaw] = useState(value);

  return (
    <div className="grid gap-2">
      <textarea
        className="min-h-36 rounded-2xl border border-border bg-background px-3 py-2 text-xs"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="h-10 rounded-2xl border border-border bg-background px-3 text-xs font-semibold transition-colors hover:bg-muted"
          onClick={() => setRaw(value)}
        >
          Reset box
        </button>
        <button
          type="button"
          className="h-10 rounded-2xl bg-foreground px-3 text-xs font-semibold text-background transition-opacity hover:opacity-90"
          onClick={() => onImport(raw)}
        >
          Import
        </button>
      </div>
    </div>
  );
}
