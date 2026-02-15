"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import MobileMenuDrawer, { type MobileMenuItem } from "@/components/layout/MobileMenuDrawer";
import { cn } from "@/lib/utils";
import {
  buildCategoryTree,
  normalizeMobileMenuConfig,
  type CategoryTreeNode,
  type DbCategory,
  type MobileMenuConfig,
} from "@/lib/mobileMenu";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function readVisibility(v: string): "all" | "mobile" | "desktop" {
  return v === "mobile" || v === "desktop" || v === "all" ? v : "all";
}

type AdminCategoryItem = {
  _id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  parentId?: string | null;
  icon?: string;
  menuLabel?: string;
};

type AdminPageItem = {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
};

type DragPayload = {
  id: string;
};

type PreviewMode = "mobile" | "desktop";

function cloneItems(items: MobileMenuItem[]): MobileMenuItem[] {
  return items.map((x) => ({ ...x, children: x.children ? cloneItems(x.children) : [] }));
}

function cloneItemWithNewIds(item: MobileMenuItem): MobileMenuItem {
  return {
    ...item,
    id: uid("dup"),
    children: Array.isArray(item.children) ? item.children.map(cloneItemWithNewIds) : [],
  };
}

function findAndRemove(list: MobileMenuItem[], id: string): { item: MobileMenuItem | null; next: MobileMenuItem[] } {
  const next = cloneItems(list);

  const walk = (arr: MobileMenuItem[]): MobileMenuItem | null => {
    const idx = arr.findIndex((x) => x.id === id);
    if (idx >= 0) {
      const [it] = arr.splice(idx, 1);
      return it ?? null;
    }
    for (const n of arr) {
      const found = walk(n.children ?? []);
      if (found) return found;
    }
    return null;
  };

  const item = walk(next);
  return { item, next };
}

function insertBefore(list: MobileMenuItem[], targetId: string, item: MobileMenuItem): MobileMenuItem[] {
  const next = cloneItems(list);

  const walk = (arr: MobileMenuItem[]): boolean => {
    const idx = arr.findIndex((x) => x.id === targetId);
    if (idx >= 0) {
      arr.splice(idx, 0, item);
      return true;
    }
    for (const n of arr) {
      if (walk(n.children ?? [])) return true;
    }
    return false;
  };

  if (!walk(next)) next.push(item);
  return next;
}

function insertAsChild(list: MobileMenuItem[], parentId: string, item: MobileMenuItem): MobileMenuItem[] {
  const next = cloneItems(list);

  const walk = (arr: MobileMenuItem[]): boolean => {
    const p = arr.find((x) => x.id === parentId);
    if (p) {
      p.children = Array.isArray(p.children) ? p.children : [];
      p.children.push(item);
      return true;
    }
    for (const n of arr) {
      if (walk(n.children ?? [])) return true;
    }
    return false;
  };

  if (!walk(next)) next.push(item);
  return next;
}

function updateItem(list: MobileMenuItem[], id: string, patch: Partial<MobileMenuItem>): MobileMenuItem[] {
  const next = cloneItems(list);

  const walk = (arr: MobileMenuItem[]): boolean => {
    const idx = arr.findIndex((x) => x.id === id);
    if (idx >= 0) {
      arr[idx] = { ...arr[idx], ...patch };
      return true;
    }
    for (const n of arr) {
      if (walk(n.children ?? [])) return true;
    }
    return false;
  };

  walk(next);
  return next;
}

function depthOf(item: MobileMenuItem, depth: number): number {
  const children = Array.isArray(item.children) ? item.children : [];
  if (children.length === 0) return depth;
  return Math.max(...children.map((c) => depthOf(c, depth + 1)));
}

function maxDepth(list: MobileMenuItem[]): number {
  if (!Array.isArray(list) || list.length === 0) return 0;
  return Math.max(...list.map((it) => depthOf(it, 1)));
}

function containsId(item: MobileMenuItem, id: string): boolean {
  if (item.id === id) return true;
  for (const ch of item.children ?? []) {
    if (containsId(ch, id)) return true;
  }
  return false;
}

function canNestUnder(args: { tree: MobileMenuItem[]; parentId: string; childId: string; max: number }) {
  const { tree, parentId, childId, max } = args;

  const find = (list: MobileMenuItem[], id: string): MobileMenuItem | null => {
    for (const it of list) {
      if (it.id === id) return it;
      const found = find(it.children ?? [], id);
      if (found) return found;
    }
    return null;
  };

  if (parentId === childId) return { ok: false as const, reason: "Cannot nest item into itself" };

  const parent = find(tree, parentId);
  const child = find(tree, childId);
  if (!parent || !child) return { ok: false as const, reason: "Invalid items" };

  if (containsId(child, parentId)) return { ok: false as const, reason: "Circular nesting blocked" };

  const parentDepth = (() => {
    const walk = (list: MobileMenuItem[], depth: number): number | null => {
      for (const it of list) {
        if (it.id === parentId) return depth;
        const d = walk(it.children ?? [], depth + 1);
        if (d !== null) return d;
      }
      return null;
    };
    return walk(tree, 1) ?? 1;
  })();

  const childDepth = depthOf(child, 1);
  if (parentDepth + childDepth > max) return { ok: false as const, reason: `Max depth is ${max}` };

  return { ok: true as const };
}

function ItemRow({
  item,
  depth,
  onPatch,
  onAddChild,
  onDragStart,
  onDropSmart,
  selectedId,
  onSelect,
}: {
  item: MobileMenuItem;
  depth: number;
  onPatch: (id: string, patch: Partial<MobileMenuItem>) => void;
  onAddChild: (parentId: string) => void;
  onDragStart: (id: string) => void;
  onDropSmart: (targetId: string, mode: "before" | "child") => void;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const selected = item.id === selectedId;

  return (
    <div className="w-full">
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-3",
          depth > 0 ? "ml-3" : "",
          selected ? "ring-2 ring-foreground/20" : ""
        )}
        onClick={() => onSelect(item.id)}
        draggable
        onDragStart={(e) => {
          const payload: DragPayload = { id: item.id };
          e.dataTransfer.setData("application/x-menu-item", JSON.stringify(payload));
          e.dataTransfer.effectAllowed = "move";
          onDragStart(item.id);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        onDrop={(e) => {
          e.preventDefault();
          const raw = e.dataTransfer.getData("application/x-menu-item");
          if (!raw) return;
          const parsed = JSON.parse(raw) as DragPayload;
          if (!parsed?.id || parsed.id === item.id) return;
          const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const ratio = (e.clientX - box.left) / Math.max(1, box.width);
          const mode: "before" | "child" = ratio > 0.72 ? "child" : "before";
          onDropSmart(item.id, mode);
        }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-sm font-semibold"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle children"
          >
            {open ? "−" : "+"}
          </button>

          <Input
            value={item.title}
            onChange={(e) => onPatch(item.id, { title: e.target.value })}
            className="h-9"
          />

          <Input
            value={item.href}
            onChange={(e) => onPatch(item.id, { href: e.target.value })}
            className="h-9"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={item.enabled}
            onChange={(e) => onPatch(item.id, { enabled: e.target.checked })}
          />
          Enabled
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(item.openInNewTab)}
            onChange={(e) => onPatch(item.id, { openInNewTab: e.target.checked })}
          />
          New tab
        </label>

        {item.type === "category" ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={typeof item.includeChildren === "boolean" ? item.includeChildren : false}
              onChange={(e) => onPatch(item.id, { includeChildren: e.target.checked })}
            />
            Include children
          </label>
        ) : null}

        <label className="flex items-center gap-2 text-sm">
          <select
            className="h-9 rounded-xl border border-border bg-background px-2"
            value={item.visibility}
            onChange={(e) => onPatch(item.id, { visibility: readVisibility(e.target.value) })}
          >
            <option value="all">All</option>
            <option value="mobile">Mobile</option>
            <option value="desktop">Desktop</option>
          </select>
        </label>

        <Input
          value={item.icon ?? ""}
          onChange={(e) => onPatch(item.id, { icon: e.target.value })}
          className="h-9 w-36"
          placeholder="Icon (lucide)"
        />

        <Input
          value={item.badgeLabel ?? ""}
          onChange={(e) => onPatch(item.id, { badgeLabel: e.target.value })}
          className="h-9 w-28"
          placeholder="Badge"
        />

        <button
          type="button"
          className="h-9 rounded-xl border border-border bg-background px-3 text-sm font-semibold"
          onClick={() => onAddChild(item.id)}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
          onDrop={(e) => {
            e.preventDefault();
            const raw = e.dataTransfer.getData("application/x-menu-item");
            if (!raw) return;
            const parsed = JSON.parse(raw) as DragPayload;
            if (!parsed?.id || parsed.id === item.id) return;
            onDropSmart(item.id, "child");
          }}
        >
          Add Child / Drop Here
        </button>
      </div>

      {open && (item.children?.length ?? 0) > 0 ? (
        <div className="mt-2 grid gap-2">
          {item.children!.map((ch) => (
            <ItemRow
              key={ch.id}
              item={ch}
              depth={depth + 1}
              onPatch={onPatch}
              onAddChild={onAddChild}
              onDragStart={onDragStart}
              onDropSmart={onDropSmart}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function MenuBuilderClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cfg, setCfg] = useState<MobileMenuConfig>(() => normalizeMobileMenuConfig(null));
  const draggedIdRef = useRef<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");

  const [previewMode, setPreviewMode] = useState<PreviewMode>("mobile");

  const [categories, setCategories] = useState<AdminCategoryItem[]>([]);
  const [pages, setPages] = useState<AdminPageItem[]>([]);
  const [catPickId, setCatPickId] = useState<string>("");
  const [catIncludeChildren, setCatIncludeChildren] = useState(true);

  const [leftOpenCats, setLeftOpenCats] = useState(true);
  const [leftOpenPages, setLeftOpenPages] = useState(true);
  const [leftOpenLinks, setLeftOpenLinks] = useState(true);

  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkHref, setNewLinkHref] = useState("/");

  function onSelect(id: string) {
    setSelectedId(id);
  }

  function addPageRef(id: string) {
    const p = pages.find((x) => x.id === id);
    if (!p) return;
    const it: MobileMenuItem = {
      id: uid("page"),
      type: "page",
      title: "",
      href: "",
      refId: p.id,
      openInNewTab: false,
      enabled: true,
      visibility: "all",
      children: [],
    };
    setCfg((prev) => ({ ...prev, items: [...(prev.items as MobileMenuItem[]), it] }));
  }

  function addCustomLinkFromLeft() {
    const t = newLinkLabel.trim();
    const h = newLinkHref.trim();
    if (!t || !h) {
      toast.error("Enter label and href");
      return;
    }

    const it: MobileMenuItem = {
      id: uid("link"),
      type: "link",
      title: t,
      href: h,
      openInNewTab: false,
      enabled: true,
      visibility: "all",
      children: [],
    };

    setCfg((prev) => ({ ...prev, items: [...(prev.items as MobileMenuItem[]), it] }));
    setNewLinkLabel("");
    setNewLinkHref("/");
  }

  function duplicateMenu() {
    setCfg((prev) => ({ ...prev, items: (prev.items as MobileMenuItem[]).map(cloneItemWithNewIds) }));
    toast.success("Menu duplicated");
  }

  function resetToDefault() {
    setCfg((prev) => ({ ...prev, useDefaultMenu: true, items: [] }));
    toast.success("Reset to default");
  }

  async function exportJson() {
    const data = JSON.stringify(cfg.items ?? [], null, 2);
    try {
      await navigator.clipboard.writeText(data);
      toast.success("Exported to clipboard");
    } catch {
      toast.error("Clipboard blocked");
    }
  }

  function importJson() {
    const raw = window.prompt("Paste menu JSON");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        toast.error("Invalid JSON");
        return;
      }
      setCfg((prev) => ({ ...prev, useDefaultMenu: false, items: parsed as MobileMenuItem[] }));
      toast.success("Imported");
    } catch {
      toast.error("Invalid JSON");
    }
  }

  function dropSmart(targetId: string, mode: "before" | "child") {
    const draggedId = draggedIdRef.current;
    if (!draggedId) return;

    setCfg((prev) => {
      const list = prev.items as MobileMenuItem[];
      const { item, next } = findAndRemove(list, draggedId);
      if (!item) return prev;

      if (mode === "child") {
        const guard = canNestUnder({ tree: next, parentId: targetId, childId: draggedId, max: 3 });
        if (!guard.ok) {
          toast.error(guard.reason);
          return prev;
        }
        const candidate = insertAsChild(next, targetId, item);
        if (maxDepth(candidate) > 3) {
          toast.error("Max depth is 3");
          return prev;
        }
        return { ...prev, items: candidate };
      }

      const candidate = insertBefore(next, targetId, item);
      if (maxDepth(candidate) > 3) {
        toast.error("Max depth is 3");
        return prev;
      }
      return { ...prev, items: candidate };
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/menu", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as unknown;
        const mobileMenu = isRecord(json) && isRecord(json.mobileMenu) ? json.mobileMenu : null;
        const normalized = normalizeMobileMenuConfig(mobileMenu);
        if (!cancelled) setCfg(normalized);

        const cres = await fetch("/api/admin/categories", { cache: "no-store" });
        const cjson = (await cres.json().catch(() => null)) as unknown;
        const list = isRecord(cjson) && Array.isArray(cjson.items) ? (cjson.items as AdminCategoryItem[]) : [];
        if (!cancelled) setCategories(list);

        const pres = await fetch("/api/admin/cms/pages?limit=50&page=1", { cache: "no-store" });
        const pjson = (await pres.json().catch(() => null)) as unknown;
        const pitems = isRecord(pjson) && Array.isArray(pjson.items) ? (pjson.items as AdminPageItem[]) : [];
        const published = pitems.filter((p) => Boolean(p && p.isPublished));
        if (!cancelled) setPages(published);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const categoryTree = useMemo(() => {
    const dbCats: DbCategory[] = categories.map((c) => ({
      _id: c._id,
      name: c.name,
      slug: c.slug,
      parentId: c.parentId ?? null,
      icon: c.icon,
      menuLabel: c.menuLabel,
      isActive: Boolean(c.isActive),
      sortOrder: typeof c.sortOrder === "number" ? c.sortOrder : 0,
    }));
    return buildCategoryTree(dbCats);
  }, [categories]);

  const categorySelectOptions = useMemo(() => {
    const out: Array<{ id: string; title: string; depth: number }> = [];
    const walk = (list: CategoryTreeNode[], depth: number) => {
      for (const n of list) {
        out.push({ id: n.id, title: n.menuLabel || n.name, depth });
        walk(n.children ?? [], depth + 1);
      }
    };
    walk(categoryTree, 0);
    return out;
  }, [categoryTree]);

  const resolvedPreviewItems = useMemo(() => {
    if (cfg.useDefaultMenu) return [] as MobileMenuItem[];

    const byId = new Map<string, CategoryTreeNode>();
    const walk = (n: CategoryTreeNode) => {
      byId.set(String(n.id), n);
      for (const ch of n.children ?? []) walk(ch);
    };
    for (const r of categoryTree) walk(r);

    const pagesById = new Map(pages.map((p) => [p.id, p]));

    const resolveList = (list: MobileMenuItem[], depth: number): MobileMenuItem[] => {
      if (!Array.isArray(list) || depth > 20) return [];
      const out: MobileMenuItem[] = [];

      for (const raw of list) {
        if (!raw || !raw.enabled) continue;

        if (raw.type === "category") {
          const cid = (raw.refId || "").trim() || (raw.categoryId || "").trim() || (raw.id.startsWith("cat_") ? raw.id.slice(4) : raw.id);
          const node = cid ? byId.get(cid) : undefined;
          if (!node || !node.isActive) continue;

          const title = String(node.menuLabel || node.name || "").trim();
          const href = `/category/${encodeURIComponent(String(node.slug || "").trim())}`;
          const include = typeof raw.includeChildren === "boolean" ? raw.includeChildren : (cfg.autoSyncCategories ?? true);
          const manualChildren = include ? [] : resolveList(raw.children ?? [], depth + 1);
          const autoChildren = include
            ? (node.children ?? []).filter((c) => c.isActive)
                .map((c) => ({
                  id: `cat_${c.id}`,
                  type: "category" as const,
                  title: String(c.menuLabel || c.name || "").trim(),
                  href: `/category/${encodeURIComponent(String(c.slug || "").trim())}`,
                  refId: c.id,
                  categoryId: c.id,
                  includeChildren: undefined,
                  enabled: true,
                  visibility: "all" as const,
                  icon: typeof c.icon === "string" && c.icon.trim() ? c.icon.trim() : undefined,
                  children: [],
                }))
            : [];

          out.push({
            ...raw,
            title,
            href,
            icon: raw.icon?.trim() ? raw.icon : node.icon,
            children: [...autoChildren, ...manualChildren],
          });
          continue;
        }

        if (raw.type === "page") {
          const pid = (raw.refId || "").trim();
          const p = pid ? pagesById.get(pid) : undefined;
          if (!p) continue;
          const title = raw.title?.trim() ? raw.title.trim() : String(p.title || "").trim();
          const href = `/p/${encodeURIComponent(String(p.slug || "").trim())}`;
          out.push({
            ...raw,
            title,
            href,
            children: resolveList(raw.children ?? [], depth + 1),
          });
          continue;
        }

        out.push({ ...raw, children: resolveList(raw.children ?? [], depth + 1) });
      }

      return out;
    };

    return resolveList(cfg.items as MobileMenuItem[], 0);
  }, [cfg.useDefaultMenu, cfg.items, categoryTree, cfg.autoSyncCategories, pages]);

  const desktopPreviewItems = useMemo(() => {
    const walk = (list: MobileMenuItem[], depth: number): MobileMenuItem[] => {
      if (!Array.isArray(list) || depth > 20) return [];
      return list
        .filter((x) => Boolean(x) && x.enabled)
        .filter((x) => x.visibility !== "mobile")
        .map((x) => ({ ...x, children: walk(x.children ?? [], depth + 1) }));
    };
    return walk(resolvedPreviewItems, 0);
  }, [resolvedPreviewItems]);

  function DesktopPreviewNode({ item, depth }: { item: MobileMenuItem; depth: number }) {
    const hasChildren = (item.children?.length ?? 0) > 0;

    return (
      <div className={cn("w-full", depth > 0 ? "pl-4" : "")} data-depth={depth}>
        <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-foreground hover:bg-muted/60">
          <span className="min-w-0 flex-1 truncate font-semibold">{item.title}</span>
          {item.badgeLabel?.trim() ? (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
              {item.badgeLabel}
            </span>
          ) : null}
          {hasChildren ? <span className="shrink-0 text-muted-foreground">›</span> : null}
        </div>

        {hasChildren ? (
          <div className="grid gap-1">
            {item.children!.map((ch) => (
              <DesktopPreviewNode key={ch.id} item={ch} depth={depth + 1} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobileMenu: {
            useDefaultMenu: cfg.useDefaultMenu,
            autoSyncCategories: cfg.autoSyncCategories ?? true,
            featuredBannerHtml: cfg.featuredBannerHtml ?? "",
            promoBannerHtml: cfg.promoBannerHtml ?? "",
            items: cfg.items,
          },
        }),
      });

      if (!res.ok) {
        toast.error("Failed to save");
        return;
      }

      const json = (await res.json().catch(() => null)) as unknown;
      const mobileMenu = isRecord(json) && isRecord(json.mobileMenu) ? json.mobileMenu : null;
      setCfg(normalizeMobileMenuConfig(mobileMenu));
      toast.success("Saved");
    } finally {
      setSaving(false);
    }
  }

  function patch(id: string, p: Partial<MobileMenuItem>) {
    setCfg((prev) => ({ ...prev, items: updateItem(prev.items as MobileMenuItem[], id, p) }));
  }

  function addTopLink() {
    const it: MobileMenuItem = {
      id: uid("link"),
      type: "link",
      title: "New Link",
      href: "/",
      openInNewTab: false,
      enabled: true,
      visibility: "all",
      children: [],
    };

    setCfg((prev) => ({ ...prev, items: [...(prev.items as MobileMenuItem[]), it] }));
  }

  function addCategoryRef() {
    const cid = String(catPickId || "").trim();
    if (!cid) {
      toast.error("Select a category");
      return;
    }

    const it: MobileMenuItem = {
      id: uid("cat"),
      type: "category",
      title: "",
      href: "",
      refId: cid,
      categoryId: cid,
      includeChildren: catIncludeChildren ? true : false,
      openInNewTab: false,
      enabled: true,
      visibility: "all",
      children: [],
    };

    setCfg((prev) => ({ ...prev, items: [...(prev.items as MobileMenuItem[]), it] }));
  }

  function addChild(parentId: string) {
    const it: MobileMenuItem = {
      id: uid("child"),
      type: "link",
      title: "Child Link",
      href: "/",
      enabled: true,
      visibility: "all",
      children: [],
    };

    setCfg((prev) => ({ ...prev, items: insertAsChild(prev.items as MobileMenuItem[], parentId, it) }));
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr_420px]">
      <div className="space-y-4 rounded-3xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Menu Sources</p>
          <Button type="button" variant="ghost" size="sm" onClick={() => { setLeftOpenCats(true); setLeftOpenPages(true); setLeftOpenLinks(true); }}>
            Expand
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-background p-3">
          <button type="button" className="flex w-full items-center justify-between text-sm font-semibold" onClick={() => setLeftOpenCats((v) => !v)}>
            Categories
            <span className="text-muted-foreground">{leftOpenCats ? "−" : "+"}</span>
          </button>
          {leftOpenCats ? (
            <div className="mt-3 grid gap-2">
              <select
                className="h-9 w-full rounded-xl border border-border bg-background px-2 text-sm"
                value={catPickId}
                onChange={(e) => setCatPickId(e.target.value)}
                disabled={cfg.useDefaultMenu}
              >
                <option value="">Select category...</option>
                {categorySelectOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {"  ".repeat(opt.depth)}{opt.title}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={catIncludeChildren}
                  onChange={(e) => setCatIncludeChildren(e.target.checked)}
                  disabled={cfg.useDefaultMenu}
                />
                Include children
              </label>

              <Button type="button" variant="secondary" onClick={addCategoryRef} disabled={cfg.useDefaultMenu}>
                Add Category
              </Button>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-border bg-background p-3">
          <button type="button" className="flex w-full items-center justify-between text-sm font-semibold" onClick={() => setLeftOpenPages((v) => !v)}>
            Pages
            <span className="text-muted-foreground">{leftOpenPages ? "−" : "+"}</span>
          </button>
          {leftOpenPages ? (
            <div className="mt-3 grid gap-2 max-h-[260px] overflow-auto">
              {pages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No published pages.</p>
              ) : (
                pages.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold hover:bg-muted/60"
                    onClick={() => addPageRef(p.id)}
                    disabled={cfg.useDefaultMenu}
                  >
                    <span className="truncate">{p.title}</span>
                    <span className="text-muted-foreground">Add</span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-border bg-background p-3">
          <button type="button" className="flex w-full items-center justify-between text-sm font-semibold" onClick={() => setLeftOpenLinks((v) => !v)}>
            Custom Link
            <span className="text-muted-foreground">{leftOpenLinks ? "−" : "+"}</span>
          </button>
          {leftOpenLinks ? (
            <div className="mt-3 grid gap-2">
              <Input value={newLinkLabel} onChange={(e) => setNewLinkLabel(e.target.value)} className="h-9" placeholder="Label" />
              <Input value={newLinkHref} onChange={(e) => setNewLinkHref(e.target.value)} className="h-9" placeholder="/path or https://..." />
              <Button type="button" variant="secondary" onClick={addCustomLinkFromLeft} disabled={cfg.useDefaultMenu}>
                Add Link
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">Menu Builder</p>
            <p className="text-sm text-muted-foreground">Drag items to reorder. Drop on “Add Child / Drop Here” to nest.</p>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={addTopLink}>
              Add Link
            </Button>
            <Button type="button" variant="ghost" onClick={duplicateMenu} disabled={cfg.useDefaultMenu}>
              Duplicate
            </Button>
            <Button type="button" variant="ghost" onClick={resetToDefault}>
              Reset
            </Button>
            <Button type="button" variant="ghost" onClick={importJson} disabled={cfg.useDefaultMenu}>
              Import
            </Button>
            <Button type="button" variant="ghost" onClick={exportJson}>
              Export
            </Button>
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-4">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={cfg.useDefaultMenu}
              onChange={(e) => setCfg((prev) => ({ ...prev, useDefaultMenu: e.target.checked }))}
            />
            Use Default Menu
          </label>

          <label className={cn("flex items-center gap-2 text-sm font-semibold", cfg.useDefaultMenu ? "opacity-60" : "")}>
            <input
              type="checkbox"
              checked={Boolean(cfg.autoSyncCategories ?? true)}
              onChange={(e) => setCfg((prev) => ({ ...prev, autoSyncCategories: e.target.checked }))}
              disabled={cfg.useDefaultMenu}
            />
            Auto-sync category children
          </label>

          <div className={cn("min-w-0 flex-1", cfg.useDefaultMenu ? "opacity-60" : "")}>
            <Input
              value={cfg.featuredBannerHtml ?? ""}
              onChange={(e) => setCfg((prev) => ({ ...prev, featuredBannerHtml: e.target.value }))}
              placeholder="Featured banner (text/html)"
              className="h-9"
              disabled={cfg.useDefaultMenu}
            />
          </div>

          <div className={cn("min-w-0 flex-1", cfg.useDefaultMenu ? "opacity-60" : "")}>
            <Input
              value={cfg.promoBannerHtml ?? ""}
              onChange={(e) => setCfg((prev) => ({ ...prev, promoBannerHtml: e.target.value }))}
              placeholder="Promo banner (text/html)"
              className="h-9"
              disabled={cfg.useDefaultMenu}
            />
          </div>
        </div>

        <div className={cn("space-y-3", cfg.useDefaultMenu ? "pointer-events-none opacity-60" : "")}>
          {(cfg.items as MobileMenuItem[]).map((it) => (
            <ItemRow
              key={it.id}
              item={it}
              depth={0}
              onPatch={patch}
              onAddChild={addChild}
              onDragStart={(id) => {
                draggedIdRef.current = id;
              }}
              onDropSmart={dropSmart}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Live Preview</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={cn(
                "h-9 rounded-xl border border-border px-3 text-sm font-semibold",
                previewMode === "mobile" ? "bg-background" : "bg-surface"
              )}
              onClick={() => setPreviewMode("mobile")}
            >
              Mobile
            </button>
            <button
              type="button"
              className={cn(
                "h-9 rounded-xl border border-border px-3 text-sm font-semibold",
                previewMode === "desktop" ? "bg-background" : "bg-surface"
              )}
              onClick={() => setPreviewMode("desktop")}
            >
              Desktop
            </button>
          </div>
        </div>
        <div className="mt-3 rounded-3xl border border-border bg-background p-3">
          {previewMode === "mobile" ? (
            <div className="mx-auto w-[360px] max-w-full">
              <div className="rounded-[28px] border border-border bg-background shadow-sm">
                <div className="px-4 py-3 text-sm font-semibold">Preview Device</div>
                <div className="relative h-[620px] overflow-hidden">
                  <MobileMenuDrawer
                    open
                    title="Menu"
                    items={resolvedPreviewItems}
                    onClose={() => void 0}
                    topAccountSection={
                      <div className="rounded-2xl border border-border bg-surface p-3">
                        <p className="text-sm font-semibold">Account</p>
                        <p className="mt-1 text-xs text-muted-foreground">Pinned section preview</p>
                      </div>
                    }
                    topFeaturedBanner={
                      cfg.featuredBannerHtml?.trim() ? (
                        <div className="rounded-2xl border border-border bg-surface p-3">
                          <div className="text-sm" dangerouslySetInnerHTML={{ __html: cfg.featuredBannerHtml }} />
                        </div>
                      ) : null
                    }
                    topPromoBanner={
                      cfg.promoBannerHtml?.trim() ? (
                        <div className="rounded-2xl border border-border bg-surface p-3">
                          <div className="text-sm" dangerouslySetInnerHTML={{ __html: cfg.promoBannerHtml }} />
                        </div>
                      ) : null
                    }
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-border bg-background p-4">
              <div className="grid grid-cols-1 gap-2">
                {desktopPreviewItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No desktop items.</p>
                ) : (
                  desktopPreviewItems.map((it) => <DesktopPreviewNode key={it.id} item={it} depth={0} />)
                )}
              </div>
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">Default menu preview uses live categories on storefront.</p>
      </div>
    </div>
  );
}
