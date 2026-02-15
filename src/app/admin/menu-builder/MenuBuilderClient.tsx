"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import MobileMenuDrawer, { type MobileMenuItem } from "@/components/layout/MobileMenuDrawer";
import { cn } from "@/lib/utils";
import { normalizeMobileMenuConfig, type MobileMenuConfig } from "@/lib/mobileMenu";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function readVisibility(v: string): "all" | "mobile" | "desktop" {
  return v === "mobile" || v === "desktop" || v === "all" ? v : "all";
}

type DragPayload = {
  id: string;
};

function cloneItems(items: MobileMenuItem[]): MobileMenuItem[] {
  return items.map((x) => ({ ...x, children: x.children ? cloneItems(x.children) : [] }));
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

function ItemRow({
  item,
  depth,
  onPatch,
  onAddChild,
  onDragStart,
  onDropBefore,
  onDropAsChild,
}: {
  item: MobileMenuItem;
  depth: number;
  onPatch: (id: string, patch: Partial<MobileMenuItem>) => void;
  onAddChild: (parentId: string) => void;
  onDragStart: (id: string) => void;
  onDropBefore: (targetId: string) => void;
  onDropAsChild: (parentId: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="w-full">
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-3",
          depth > 0 ? "ml-3" : ""
        )}
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
          onDropBefore(item.id);
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
            onDropAsChild(item.id);
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
              onDropBefore={onDropBefore}
              onDropAsChild={onDropAsChild}
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
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const previewItems = useMemo(() => {
    return cfg.useDefaultMenu ? [] : (cfg.items as MobileMenuItem[]);
  }, [cfg.useDefaultMenu, cfg.items]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobileMenu: {
            useDefaultMenu: cfg.useDefaultMenu,
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

  function dropBefore(targetId: string) {
    const dragged = draggedIdRef.current;
    if (!dragged || dragged === targetId) return;

    setCfg((prev) => {
      const removed = findAndRemove(prev.items as MobileMenuItem[], dragged);
      if (!removed.item) return prev;
      return { ...prev, items: insertBefore(removed.next, targetId, removed.item) };
    });
  }

  function dropAsChild(parentId: string) {
    const dragged = draggedIdRef.current;
    if (!dragged || dragged === parentId) return;

    setCfg((prev) => {
      const removed = findAndRemove(prev.items as MobileMenuItem[], dragged);
      if (!removed.item) return prev;
      return { ...prev, items: insertAsChild(removed.next, parentId, removed.item) };
    });
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
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

          <div className={cn("min-w-0 flex-1", cfg.useDefaultMenu ? "opacity-60" : "")}
          >
            <Input
              value={cfg.featuredBannerHtml ?? ""}
              onChange={(e) => setCfg((prev) => ({ ...prev, featuredBannerHtml: e.target.value }))}
              placeholder="Featured banner (text/html)"
              className="h-9"
              disabled={cfg.useDefaultMenu}
            />
          </div>

          <div className={cn("min-w-0 flex-1", cfg.useDefaultMenu ? "opacity-60" : "")}
          >
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
              onDropBefore={dropBefore}
              onDropAsChild={dropAsChild}
            />
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-surface p-4">
        <p className="text-sm font-semibold">Live Preview</p>
        <div className="mt-3 rounded-3xl border border-border bg-background p-3">
          <div className="mx-auto w-[360px] max-w-full">
            <div className="rounded-[28px] border border-border bg-background shadow-sm">
              <div className="px-4 py-3 text-sm font-semibold">Preview Device</div>
              <div className="relative h-[620px] overflow-hidden">
                <MobileMenuDrawer
                  open
                  title="Menu"
                  items={previewItems}
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
        </div>

        <p className="mt-3 text-xs text-muted-foreground">Default menu preview uses live categories on storefront.</p>
      </div>
    </div>
  );
}
