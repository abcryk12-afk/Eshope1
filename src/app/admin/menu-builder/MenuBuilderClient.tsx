"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import BottomSheet from "@/components/ui/BottomSheet";
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

type DragOverState = {
  targetId: string;
  mode: "before" | "after" | "child";
} | null;

type PreviewMode = "mobile" | "desktop";

type SubmenuPickerMode = "category" | "page" | "link";

const ICON_OPTIONS = [
  "home",
  "tag",
  "shopping-bag",
  "shopping-cart",
  "heart",
  "star",
  "gift",
  "flame",
  "sparkles",
  "percent",
  "badge-percent",
  "truck",
  "phone",
  "mail",
  "help-circle",
  "info",
  "user",
  "settings",
  "folder",
  "grid-2x2",
  "layout-grid",
  "store",
  "box",
  "shirt",
  "watch",
  "smartphone",
  "laptop",
  "camera",
  "gamepad-2",
  "book-open",
  "ticket",
  "calendar",
  "map-pin",
  "globe",
  "external-link",
  "chevron-right",
  "chevrons-right",
];

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

function findParentAndIndex(list: MobileMenuItem[], id: string): { parent: MobileMenuItem | null; index: number; siblings: MobileMenuItem[] } | null {
  const walk = (arr: MobileMenuItem[], parent: MobileMenuItem | null): { parent: MobileMenuItem | null; index: number; siblings: MobileMenuItem[] } | null => {
    const idx = arr.findIndex((x) => x.id === id);
    if (idx >= 0) return { parent, index: idx, siblings: arr };
    for (const it of arr) {
      const found = walk(it.children ?? [], it);
      if (found) return found;
    }
    return null;
  };

  return walk(list, null);
}

function moveSibling(list: MobileMenuItem[], id: string, dir: -1 | 1): MobileMenuItem[] {
  const next = cloneItems(list);
  const info = findParentAndIndex(next, id);
  if (!info) return next;
  const { siblings, index } = info;
  const to = index + dir;
  if (to < 0 || to >= siblings.length) return next;
  const [it] = siblings.splice(index, 1);
  if (!it) return next;
  siblings.splice(to, 0, it);
  return next;
}

function indentOneLevel(list: MobileMenuItem[], id: string): MobileMenuItem[] {
  const next = cloneItems(list);
  const info = findParentAndIndex(next, id);
  if (!info) return next;
  const { siblings, index } = info;
  if (index <= 0) return next;
  const prevSibling = siblings[index - 1];
  if (!prevSibling) return next;

  const { item, next: removed } = findAndRemove(next, id);
  if (!item) return next;

  const candidate = insertAsChild(removed, prevSibling.id, item);
  if (maxDepth(candidate) > 3) return next;
  return candidate;
}

function outdentOneLevel(list: MobileMenuItem[], id: string): MobileMenuItem[] {
  const next = cloneItems(list);
  const info = findParentAndIndex(next, id);
  if (!info || !info.parent) return next;

  const parentId = info.parent.id;
  const { item, next: removed } = findAndRemove(next, id);
  if (!item) return next;

  const candidate = insertAfter(removed, parentId, item);
  if (maxDepth(candidate) > 3) return next;
  return candidate;
}

function moveToEdge(list: MobileMenuItem[], id: string, edge: "top" | "bottom"): MobileMenuItem[] {
  const next = cloneItems(list);
  const info = findParentAndIndex(next, id);
  if (!info) return next;
  const { siblings, index } = info;
  const [it] = siblings.splice(index, 1);
  if (!it) return next;
  if (edge === "top") siblings.unshift(it);
  else siblings.push(it);
  return next;
}

function deleteItem(list: MobileMenuItem[], id: string): MobileMenuItem[] {
  const { next } = findAndRemove(list, id);
  return next;
}

function duplicateItem(list: MobileMenuItem[], id: string): MobileMenuItem[] {
  const next = cloneItems(list);
  const info = findParentAndIndex(next, id);
  if (!info) return next;
  const src = info.siblings[info.index];
  if (!src) return next;
  const dup = cloneItemWithNewIds(src);
  info.siblings.splice(info.index + 1, 0, dup);
  return next;
}

function findItemById(list: MobileMenuItem[], id: string): MobileMenuItem | null {
  for (const it of list) {
    if (it.id === id) return it;
    const found = findItemById(it.children ?? [], id);
    if (found) return found;
  }
  return null;
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

function insertAfter(list: MobileMenuItem[], targetId: string, item: MobileMenuItem): MobileMenuItem[] {
  const next = cloneItems(list);

  const walk = (arr: MobileMenuItem[]): boolean => {
    const idx = arr.findIndex((x) => x.id === targetId);
    if (idx >= 0) {
      arr.splice(idx + 1, 0, item);
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
  onOpenSubmenuPicker,
  onDelete,
  onMove,
  onMoveEdge,
  onIndent,
  onOutdent,
  onDuplicate,
  onDragStart,
  onDropSmart,
  dragOver,
  onDragOverItem,
  onClearDragOver,
  selectedId,
  onSelect,
}: {
  item: MobileMenuItem;
  depth: number;
  onPatch: (id: string, patch: Partial<MobileMenuItem>) => void;
  onOpenSubmenuPicker: (parentId: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onMoveEdge: (id: string, edge: "top" | "bottom") => void;
  onIndent: (id: string) => void;
  onOutdent: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDragStart: (id: string) => void;
  onDropSmart: (targetId: string, mode: "before" | "after" | "child") => void;
  dragOver: DragOverState;
  onDragOverItem: (args: { targetId: string; box: DOMRect; clientX: number; clientY: number }) => void;
  onClearDragOver: () => void;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const hasChildren = (item.children?.length ?? 0) > 0;
  const [open, setOpen] = useState(true);
  const selected = item.id === selectedId;
  const isDragTarget = dragOver?.targetId === item.id;

  return (
    <div className="w-full">
      <div
        className={cn(
          "relative flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-3",
          depth > 0 ? "ml-3" : "",
          selected ? "ring-2 ring-primary/40" : ""
        )}
        style={depth > 0 ? { marginLeft: `${Math.min(48, depth * 18)}px` } : undefined}
        onClick={() => onSelect(item.id)}
        title={
          item.type === "category"
            ? "Category item"
            : item.type === "page"
              ? "Page item"
              : "Custom link"
        }
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

          const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
          onDragOverItem({ targetId: item.id, box, clientX: e.clientX, clientY: e.clientY });
        }}
        onDragLeave={() => onClearDragOver()}
        onDrop={(e) => {
          e.preventDefault();
          const raw = e.dataTransfer.getData("application/x-menu-item");
          if (!raw) return;
          const parsed = JSON.parse(raw) as DragPayload;
          if (!parsed?.id || parsed.id === item.id) return;
          if (dragOver?.targetId !== item.id) return;
          onDropSmart(item.id, dragOver.mode);
          onClearDragOver();
        }}
      >

        {isDragTarget && dragOver?.mode === "before" ? (
          <div className="pointer-events-none absolute left-3 right-3 top-0 h-1 -translate-y-1/2 rounded-full bg-primary" />
        ) : null}

        {isDragTarget && dragOver?.mode === "after" ? (
          <div className="pointer-events-none absolute left-3 right-3 bottom-0 h-1 translate-y-1/2 rounded-full bg-primary" />
        ) : null}

        {isDragTarget && dragOver?.mode === "child" ? (
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-primary/50" />
        ) : null}

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-sm font-semibold"
            onClick={() => {
              if (!hasChildren) return;
              setOpen((v) => !v);
            }}
            aria-label="Toggle children"
          >
            {hasChildren ? (open ? "−" : "+") : "•"}
          </button>

          <button
            type="button"
            className={cn(
              "min-w-0 flex-1 truncate text-left text-sm font-semibold",
              item.enabled ? "text-foreground" : "text-muted-foreground line-through"
            )}
          >
            {item.title?.trim() ? item.title : item.type === "category" ? "Category" : item.type === "page" ? "Page" : "Link"}
          </button>

          <span
            className={cn(
              "hidden sm:inline rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-semibold",
              item.type === "category"
                ? "text-emerald-700"
                : item.type === "page"
                  ? "text-blue-700"
                  : "text-muted-foreground"
            )}
          >
            {item.type === "category" ? "Category" : item.type === "page" ? "Page" : "Link"}
          </span>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={item.enabled}
            onChange={(e) => onPatch(item.id, { enabled: e.target.checked })}
          />
          <span className="hidden sm:inline">Enabled</span>
        </label>

        <button
          type="button"
          className="h-9 rounded-xl border border-border bg-background px-3 text-sm font-semibold"
          onClick={() => onOpenSubmenuPicker(item.id)}
        >
          Add Submenu
        </button>

        <button
          type="button"
          className="h-9 rounded-xl border border-border bg-background px-3 text-sm font-semibold"
          onClick={() => onSelect(item.id)}
        >
          Settings
        </button>

        <button
          type="button"
          className="h-9 rounded-xl border border-border bg-background px-3 text-sm font-semibold"
          onClick={() => onMove(item.id, -1)}
          aria-label="Move up"
        >
          ↑
        </button>
        <button
          type="button"
          className="h-9 rounded-xl border border-border bg-background px-3 text-sm font-semibold"
          onClick={() => onMove(item.id, 1)}
          aria-label="Move down"
        >
          ↓
        </button>

        <button
          type="button"
          className="h-9 rounded-xl border border-border bg-background px-3 text-sm font-semibold"
          onClick={() => onOutdent(item.id)}
          aria-label="Move left (outdent)"
        >
          ←
        </button>
        <button
          type="button"
          className="h-9 rounded-xl border border-border bg-background px-3 text-sm font-semibold"
          onClick={() => onIndent(item.id)}
          aria-label="Move right (indent)"
        >
          →
        </button>

        <button
          type="button"
          className="h-9 rounded-xl border border-border bg-background px-3 text-sm font-semibold"
          onClick={() => onMoveEdge(item.id, "top")}
          aria-label="Move to top"
        >
          ⇈
        </button>
        <button
          type="button"
          className="h-9 rounded-xl border border-border bg-background px-3 text-sm font-semibold"
          onClick={() => onMoveEdge(item.id, "bottom")}
          aria-label="Move to bottom"
        >
          ⇊
        </button>

        <button
          type="button"
          className="h-9 rounded-xl border border-border bg-background px-3 text-sm font-semibold"
          onClick={() => onDuplicate(item.id)}
        >
          Duplicate
        </button>

        <button
          type="button"
          className="h-9 rounded-xl border border-border bg-background px-3 text-sm font-semibold"
          onClick={() => onDelete(item.id)}
        >
          Delete
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
              onOpenSubmenuPicker={onOpenSubmenuPicker}
              onDelete={onDelete}
              onMove={onMove}
              onMoveEdge={onMoveEdge}
              onIndent={onIndent}
              onOutdent={onOutdent}
              onDuplicate={onDuplicate}
              onDragStart={onDragStart}
              onDropSmart={onDropSmart}
              dragOver={dragOver}
              onDragOverItem={onDragOverItem}
              onClearDragOver={onClearDragOver}
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

  const [dragOver, setDragOver] = useState<DragOverState>(null);

  const [previewMode, setPreviewMode] = useState<PreviewMode>("mobile");

  const [categories, setCategories] = useState<AdminCategoryItem[]>([]);
  const [pages, setPages] = useState<AdminPageItem[]>([]);
  const [catIncludeChildren, setCatIncludeChildren] = useState(true);

  const [sourceSearch, setSourceSearch] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);

  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkHref, setNewLinkHref] = useState("/");

  const [submenuSheetOpen, setSubmenuSheetOpen] = useState(false);
  const [submenuParentId, setSubmenuParentId] = useState<string>("");
  const [submenuMode, setSubmenuMode] = useState<SubmenuPickerMode>("category");
  const [submenuSearch, setSubmenuSearch] = useState("");
  const [submenuSelectedCategoryIds, setSubmenuSelectedCategoryIds] = useState<string[]>([]);
  const [submenuSelectedPageIds, setSubmenuSelectedPageIds] = useState<string[]>([]);
  const [submenuLinkLabel, setSubmenuLinkLabel] = useState("");
  const [submenuLinkHref, setSubmenuLinkHref] = useState("/");

  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string>("");

  function onSelect(id: string) {
    setSelectedId(id);
  }

  function openSubmenuPicker(parentId: string) {
    setSubmenuParentId(parentId);
    setSubmenuSheetOpen(true);
    setSubmenuMode("category");
    setSubmenuSearch("");
    setSubmenuSelectedCategoryIds([]);
    setSubmenuSelectedPageIds([]);
    setSubmenuLinkLabel("");
    setSubmenuLinkHref("/");
  }

  function addItemToMenu(it: MobileMenuItem) {
    setCfg((prev) => ({ ...prev, useDefaultMenu: false, items: [...(prev.items as MobileMenuItem[]), it] }));
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
    addItemToMenu(it);
  }

  function addPageAsChild(parentId: string, pageId: string) {
    const p = pages.find((x) => x.id === pageId);
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
    setCfg((prev) => ({ ...prev, items: insertAsChild(prev.items as MobileMenuItem[], parentId, it) }));
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

    addItemToMenu(it);
    setNewLinkLabel("");
    setNewLinkHref("/");
  }

  function addCustomLinkAsChild(parentId: string, label: string, href: string) {
    const t = label.trim();
    const h = href.trim();
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
    setCfg((prev) => ({ ...prev, items: insertAsChild(prev.items as MobileMenuItem[], parentId, it) }));
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

  function dropSmart(targetId: string, mode: "before" | "after" | "child") {
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

      const candidate = mode === "after" ? insertAfter(next, targetId, item) : insertBefore(next, targetId, item);
      if (maxDepth(candidate) > 3) {
        toast.error("Max depth is 3");
        return prev;
      }
      return { ...prev, items: candidate };
    });
  }

  const onDragOverItem = useMemo(() => {
    return (args: { targetId: string; box: DOMRect; clientX: number; clientY: number }) => {
      const xRatio = (args.clientX - args.box.left) / Math.max(1, args.box.width);
      const yRatio = (args.clientY - args.box.top) / Math.max(1, args.box.height);

      const mode: "before" | "after" | "child" =
        yRatio > 0.7 ? "after" : yRatio < 0.3 ? "before" : xRatio > 0.66 ? "child" : "after";

      setDragOver({ targetId: args.targetId, mode });
    };
  }, []);

  const filteredPages = useMemo(() => {
    const q = sourceSearch.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter((p) => String(p.title || "").toLowerCase().includes(q) || String(p.slug || "").toLowerCase().includes(q));
  }, [pages, sourceSearch]);

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

  const filteredCategorySelectOptions = useMemo(() => {
    const q = sourceSearch.trim().toLowerCase();
    if (!q) return categorySelectOptions;
    return categorySelectOptions.filter((x) => x.title.toLowerCase().includes(q));
  }, [categorySelectOptions, sourceSearch]);

  const submenuFilteredCats = useMemo(() => {
    const q = submenuSearch.trim().toLowerCase();
    if (!q) return categorySelectOptions;
    return categorySelectOptions.filter((x) => x.title.toLowerCase().includes(q));
  }, [categorySelectOptions, submenuSearch]);

  const submenuFilteredPages = useMemo(() => {
    const q = submenuSearch.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter((p) => String(p.title || "").toLowerCase().includes(q) || String(p.slug || "").toLowerCase().includes(q));
  }, [pages, submenuSearch]);

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

  const selectedItem = useMemo(() => {
    if (!selectedId) return null;
    return findItemById(cfg.items as MobileMenuItem[], selectedId);
  }, [cfg.items, selectedId]);

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

    addItemToMenu(it);
  }

  function addCategoryRefWithId(cid: string) {
    const id = String(cid || "").trim();
    if (!id) {
      toast.error("Select a category");
      return;
    }

    const it: MobileMenuItem = {
      id: uid("cat"),
      type: "category",
      title: "",
      href: "",
      refId: id,
      categoryId: id,
      includeChildren: catIncludeChildren ? true : false,
      openInNewTab: false,
      enabled: true,
      visibility: "all",
      children: [],
    };

    setCfg((prev) => ({ ...prev, items: [...(prev.items as MobileMenuItem[]), it] }));
  }

  function addCategoryAsChild(parentId: string, cid: string) {
    const id = String(cid || "").trim();
    if (!id) return;
    const it: MobileMenuItem = {
      id: uid("cat"),
      type: "category",
      title: "",
      href: "",
      refId: id,
      categoryId: id,
      includeChildren: typeof cfg.autoSyncCategories === "boolean" ? cfg.autoSyncCategories : true,
      openInNewTab: false,
      enabled: true,
      visibility: "all",
      children: [],
    };
    setCfg((prev) => ({ ...prev, items: insertAsChild(prev.items as MobileMenuItem[], parentId, it) }));
  }

  function addChild(parentId: string) {
    openSubmenuPicker(parentId);
  }

  function onDelete(id: string) {
    setDeleteTargetId(id);
    setDeleteSheetOpen(true);
  }

  function confirmDelete() {
    const id = String(deleteTargetId || "").trim();
    if (!id) {
      setDeleteSheetOpen(false);
      return;
    }

    setCfg((prev) => ({ ...prev, items: deleteItem(prev.items as MobileMenuItem[], id) }));
    if (selectedId === id) setSelectedId("");
    setDeleteTargetId("");
    setDeleteSheetOpen(false);
    toast.success("Deleted");
  }

  function onMove(id: string, dir: -1 | 1) {
    setCfg((prev) => ({ ...prev, items: moveSibling(prev.items as MobileMenuItem[], id, dir) }));
  }

  function onMoveEdge(id: string, edge: "top" | "bottom") {
    setCfg((prev) => ({ ...prev, items: moveToEdge(prev.items as MobileMenuItem[], id, edge) }));
  }

  function onIndent(id: string) {
    setCfg((prev) => {
      const candidate = indentOneLevel(prev.items as MobileMenuItem[], id);
      if (candidate === (prev.items as MobileMenuItem[])) {
        return prev;
      }
      if (maxDepth(candidate) > 3) {
        toast.error("Max depth is 3");
        return prev;
      }
      return { ...prev, items: candidate };
    });
  }

  function onOutdent(id: string) {
    setCfg((prev) => ({ ...prev, items: outdentOneLevel(prev.items as MobileMenuItem[], id) }));
  }

  function onDuplicate(id: string) {
    setCfg((prev) => ({ ...prev, items: duplicateItem(prev.items as MobileMenuItem[], id) }));
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr_420px]">
      <div className="space-y-4 rounded-3xl border border-border bg-surface p-4">
        <div>
          <p className="text-sm font-semibold">1) Menu Sources</p>
          <p className="mt-1 text-sm text-muted-foreground">Search, then click “Add to Menu”.</p>
        </div>

        <Input
          value={sourceSearch}
          onChange={(e) => setSourceSearch(e.target.value)}
          placeholder="Search categories/pages…"
          className="h-10"
        />

        <div className={cn("rounded-2xl border border-border bg-background p-3", cfg.useDefaultMenu ? "opacity-60" : "")}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Categories</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                for (const id of selectedCategoryIds) addCategoryRefWithId(id);
                setSelectedCategoryIds([]);
              }}
              disabled={cfg.useDefaultMenu || selectedCategoryIds.length === 0}
            >
              Add Selected
            </Button>
          </div>

          <div className="mt-3 grid gap-2">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={catIncludeChildren}
                onChange={(e) => setCatIncludeChildren(e.target.checked)}
                disabled={cfg.useDefaultMenu}
              />
              Include subcategories automatically
            </label>

            <div className="max-h-65 overflow-auto rounded-2xl border border-border">
              {filteredCategorySelectOptions.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">No categories found.</p>
              ) : (
                filteredCategorySelectOptions.slice(0, 80).map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 last:border-b-0">
                    <label className="flex min-w-0 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedCategoryIds.includes(c.id)}
                        onChange={(e) =>
                          setSelectedCategoryIds((prev) =>
                            e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id)
                          )
                        }
                        disabled={cfg.useDefaultMenu}
                      />
                      <span className="truncate">{"  ".repeat(c.depth)}{c.title}</span>
                    </label>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        addCategoryRefWithId(c.id);
                      }}
                      disabled={cfg.useDefaultMenu}
                    >
                      + Add
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className={cn("rounded-2xl border border-border bg-background p-3", cfg.useDefaultMenu ? "opacity-60" : "")}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Pages</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                for (const id of selectedPageIds) addPageRef(id);
                setSelectedPageIds([]);
              }}
              disabled={cfg.useDefaultMenu || selectedPageIds.length === 0}
            >
              Add Selected
            </Button>
          </div>

          <div className="mt-3 max-h-65 overflow-auto rounded-2xl border border-border">
            {filteredPages.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">No published pages found.</p>
            ) : (
              filteredPages.slice(0, 80).map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 last:border-b-0">
                  <label className="flex min-w-0 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedPageIds.includes(p.id)}
                      onChange={(e) =>
                        setSelectedPageIds((prev) =>
                          e.target.checked ? [...prev, p.id] : prev.filter((x) => x !== p.id)
                        )
                      }
                      disabled={cfg.useDefaultMenu}
                    />
                    <span className="truncate">{p.title}</span>
                  </label>
                  <Button type="button" variant="secondary" size="sm" onClick={() => addPageRef(p.id)} disabled={cfg.useDefaultMenu}>
                    + Add
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={cn("rounded-2xl border border-border bg-background p-3", cfg.useDefaultMenu ? "opacity-60" : "")}>
          <p className="text-sm font-semibold">Custom Link</p>
          <p className="mt-1 text-sm text-muted-foreground">Add any URL (like a promo landing page).</p>
          <div className="mt-3 grid gap-2">
            <Input value={newLinkLabel} onChange={(e) => setNewLinkLabel(e.target.value)} className="h-9" placeholder="Label" />
            <Input value={newLinkHref} onChange={(e) => setNewLinkHref(e.target.value)} className="h-9" placeholder="/path or https://..." />
            <Button type="button" variant="secondary" onClick={addCustomLinkFromLeft} disabled={cfg.useDefaultMenu}>
              + Add to Menu
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">2) Menu Structure</p>
            <p className="text-sm text-muted-foreground">Click an item to edit. Use “Add Submenu” to build hierarchy (drag-and-drop is optional).</p>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={addTopLink}>
              Add Link
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (!selectedId) {
                  toast.error("Select a parent menu item");
                  return;
                }
                addChild(selectedId);
              }}
              disabled={cfg.useDefaultMenu}
            >
              Add Submenu
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
            Auto include subcategories
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
              onOpenSubmenuPicker={openSubmenuPicker}
              onDelete={onDelete}
              onMove={onMove}
              onMoveEdge={onMoveEdge}
              onIndent={onIndent}
              onOutdent={onOutdent}
              onDuplicate={onDuplicate}
              onDragStart={(id) => {
                draggedIdRef.current = id;
              }}
              onDropSmart={dropSmart}
              dragOver={dragOver}
              onDragOverItem={onDragOverItem}
              onClearDragOver={() => setDragOver(null)}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>

      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
        <div className="rounded-3xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">3) Item Settings</p>
            {selectedItem ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedId("")}> 
                Close
              </Button>
            ) : null}
          </div>

          {!selectedItem ? (
            <p className="mt-2 text-sm text-muted-foreground">Select a menu item in the middle panel to edit its settings.</p>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="rounded-2xl border border-border bg-background p-3">
                <p className="text-sm font-semibold">Basic</p>
                <p className="mt-1 text-xs text-muted-foreground">Tip: Use “Add Submenu” on an item to create nested menus without dragging.</p>

                <div className="mt-3 grid grid-cols-1 gap-2">
                  <Input
                    value={selectedItem.title}
                    onChange={(e) => patch(selectedItem.id, { title: e.target.value })}
                    className="h-9"
                    placeholder="Label"
                    disabled={cfg.useDefaultMenu}
                  />

                  <Input
                    value={selectedItem.href}
                    onChange={(e) => patch(selectedItem.id, { href: e.target.value })}
                    className="h-9"
                    placeholder="/path or https://..."
                    disabled={cfg.useDefaultMenu}
                  />

                  <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2 text-sm">
                    <span className="font-semibold">Enabled</span>
                    <input
                      type="checkbox"
                      checked={selectedItem.enabled}
                      onChange={(e) => patch(selectedItem.id, { enabled: e.target.checked })}
                      disabled={cfg.useDefaultMenu}
                    />
                  </label>

                  <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2 text-sm">
                    <span className="font-semibold">Open in new tab</span>
                    <input
                      type="checkbox"
                      checked={Boolean(selectedItem.openInNewTab)}
                      onChange={(e) => patch(selectedItem.id, { openInNewTab: e.target.checked })}
                      disabled={cfg.useDefaultMenu}
                    />
                  </label>

                  <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2 text-sm">
                    <span className="font-semibold">Visibility</span>
                    <select
                      className="h-9 rounded-xl border border-border bg-background px-2"
                      value={selectedItem.visibility}
                      onChange={(e) => patch(selectedItem.id, { visibility: readVisibility(e.target.value) })}
                      disabled={cfg.useDefaultMenu}
                    >
                      <option value="all">All</option>
                      <option value="mobile">Mobile</option>
                      <option value="desktop">Desktop</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background p-3">
                <p className="text-sm font-semibold">Decorations</p>
                <div className="mt-3 grid grid-cols-1 gap-2">
                  <Input
                    value={selectedItem.icon ?? ""}
                    onChange={(e) => patch(selectedItem.id, { icon: e.target.value })}
                    className="h-9"
                    placeholder="Icon (lucide name)"
                    list="menu-icon-options"
                    disabled={cfg.useDefaultMenu}
                  />
                  <Input
                    value={selectedItem.badgeLabel ?? ""}
                    onChange={(e) => patch(selectedItem.id, { badgeLabel: e.target.value })}
                    className="h-9"
                    placeholder="Badge label (e.g. Sale)"
                    disabled={cfg.useDefaultMenu}
                  />
                </div>
              </div>

              {selectedItem.type === "category" ? (
                <div className="rounded-2xl border border-border bg-background p-3">
                  <p className="text-sm font-semibold">Category behavior</p>
                  <label className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2 text-sm">
                    <div>
                      <div className="font-semibold">Auto include subcategories</div>
                      <div className="text-xs text-muted-foreground">If enabled, subcategories appear in the menu even if you don’t add them manually.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={typeof selectedItem.includeChildren === "boolean" ? selectedItem.includeChildren : false}
                      onChange={(e) => patch(selectedItem.id, { includeChildren: e.target.checked })}
                      disabled={cfg.useDefaultMenu}
                    />
                  </label>

                  {typeof selectedItem.includeChildren === "boolean" && selectedItem.includeChildren ? (
                    <div className="mt-3 rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                      Auto-included subcategories will show in Live Preview.
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="secondary" onClick={() => openSubmenuPicker(selectedItem.id)} disabled={cfg.useDefaultMenu}>
                  Add Submenu
                </Button>
                <Button type="button" variant="secondary" onClick={() => onDuplicate(selectedItem.id)} disabled={cfg.useDefaultMenu}>
                  Duplicate
                </Button>
                <Button type="button" variant="secondary" onClick={() => onOutdent(selectedItem.id)} disabled={cfg.useDefaultMenu}>
                  Move Left
                </Button>
                <Button type="button" variant="secondary" onClick={() => onIndent(selectedItem.id)} disabled={cfg.useDefaultMenu}>
                  Move Right
                </Button>
                <Button type="button" variant="secondary" onClick={() => onMoveEdge(selectedItem.id, "top")} disabled={cfg.useDefaultMenu}>
                  Move to Top
                </Button>
                <Button type="button" variant="secondary" onClick={() => onMoveEdge(selectedItem.id, "bottom")} disabled={cfg.useDefaultMenu}>
                  Move to Bottom
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onDelete(selectedItem.id)}
                  disabled={cfg.useDefaultMenu}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
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
          <div className="mt-3 max-h-[calc(100vh-18rem)] overflow-auto rounded-3xl border border-border bg-background p-3">
            {previewMode === "mobile" ? (
              <div className="mx-auto w-[360px] max-w-full">
                <div className="rounded-[28px] border border-border bg-background shadow-sm">
                  <div className="px-4 py-3 text-sm font-semibold">Preview Device</div>
                  <div className="relative h-[70dvh] max-h-[620px] overflow-hidden">
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

      <datalist id="menu-icon-options">
        {ICON_OPTIONS.map((x) => (
          <option key={x} value={x} />
        ))}
      </datalist>

      <BottomSheet
        open={deleteSheetOpen}
        title="Delete menu item"
        onClose={() => {
          setDeleteSheetOpen(false);
          setDeleteTargetId("");
        }}
        rightAction={
          <Button type="button" variant="secondary" onClick={confirmDelete} disabled={cfg.useDefaultMenu}>
            Delete
          </Button>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-foreground">This will delete the selected item and all of its submenus.</p>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDeleteSheetOpen(false);
                setDeleteTargetId("");
              }}
            >
              Cancel
            </Button>
            <Button type="button" variant="secondary" onClick={confirmDelete} disabled={cfg.useDefaultMenu}>
              Confirm Delete
            </Button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={submenuSheetOpen}
        title="Add submenu items"
        onClose={() => {
          setSubmenuSheetOpen(false);
          setSubmenuParentId("");
        }}
        rightAction={
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const parentId = String(submenuParentId || "").trim();
              if (!parentId) {
                setSubmenuSheetOpen(false);
                return;
              }

              if (submenuMode === "category") {
                if (submenuSelectedCategoryIds.length === 0) {
                  toast.error("Select at least one category");
                  return;
                }
                for (const id of submenuSelectedCategoryIds) addCategoryAsChild(parentId, id);
              } else if (submenuMode === "page") {
                if (submenuSelectedPageIds.length === 0) {
                  toast.error("Select at least one page");
                  return;
                }
                for (const id of submenuSelectedPageIds) addPageAsChild(parentId, id);
              } else {
                addCustomLinkAsChild(parentId, submenuLinkLabel, submenuLinkHref);
              }

              toast.success("Added to submenu");
              setSubmenuSheetOpen(false);
              setSubmenuParentId("");
            }}
            disabled={cfg.useDefaultMenu}
          >
            Add
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <Button type="button" variant={submenuMode === "category" ? "secondary" : "ghost"} onClick={() => setSubmenuMode("category")}>
              Category
            </Button>
            <Button type="button" variant={submenuMode === "page" ? "secondary" : "ghost"} onClick={() => setSubmenuMode("page")}>
              Page
            </Button>
            <Button type="button" variant={submenuMode === "link" ? "secondary" : "ghost"} onClick={() => setSubmenuMode("link")}>
              Custom Link
            </Button>
          </div>

          {submenuMode !== "link" ? (
            <Input
              value={submenuSearch}
              onChange={(e) => setSubmenuSearch(e.target.value)}
              placeholder={submenuMode === "category" ? "Search categories…" : "Search pages…"}
              className="h-10"
              disabled={cfg.useDefaultMenu}
            />
          ) : null}

          {submenuMode === "category" ? (
            <div className="max-h-[48dvh] overflow-auto rounded-2xl border border-border bg-background">
              {submenuFilteredCats.slice(0, 120).map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center justify-between gap-3 border-b border-border px-3 py-2 last:border-b-0">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{"  ".repeat(c.depth)}{c.title}</div>
                    <div className="text-xs text-muted-foreground">Category</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={submenuSelectedCategoryIds.includes(c.id)}
                    onChange={(e) =>
                      setSubmenuSelectedCategoryIds((prev) =>
                        e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id)
                      )
                    }
                    disabled={cfg.useDefaultMenu}
                  />
                </label>
              ))}
            </div>
          ) : null}

          {submenuMode === "page" ? (
            <div className="max-h-[48dvh] overflow-auto rounded-2xl border border-border bg-background">
              {submenuFilteredPages.slice(0, 120).map((p) => (
                <label key={p.id} className="flex cursor-pointer items-center justify-between gap-3 border-b border-border px-3 py-2 last:border-b-0">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{p.title}</div>
                    <div className="text-xs text-muted-foreground">Page</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={submenuSelectedPageIds.includes(p.id)}
                    onChange={(e) =>
                      setSubmenuSelectedPageIds((prev) =>
                        e.target.checked ? [...prev, p.id] : prev.filter((x) => x !== p.id)
                      )
                    }
                    disabled={cfg.useDefaultMenu}
                  />
                </label>
              ))}
            </div>
          ) : null}

          {submenuMode === "link" ? (
            <div className="grid gap-2">
              <Input
                value={submenuLinkLabel}
                onChange={(e) => setSubmenuLinkLabel(e.target.value)}
                placeholder="Label"
                className="h-10"
                disabled={cfg.useDefaultMenu}
              />
              <Input
                value={submenuLinkHref}
                onChange={(e) => setSubmenuLinkHref(e.target.value)}
                placeholder="/path or https://..."
                className="h-10"
                disabled={cfg.useDefaultMenu}
              />
              <p className="text-xs text-muted-foreground">This will add a link submenu item under the selected parent.</p>
            </div>
          ) : null}
        </div>
      </BottomSheet>
    </div>
  );
}
