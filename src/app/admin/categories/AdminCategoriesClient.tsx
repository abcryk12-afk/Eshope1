"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronDown, GripVertical, Plus, RefreshCw, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import { slugify } from "@/lib/slug";

type CategoryItem = {
  _id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  parentId?: string | null;
  level?: number;
  createdAt?: string;
};

type CategoryNode = CategoryItem & {
  children: CategoryNode[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readMessage(json: unknown): string | undefined {
  if (!isRecord(json)) return undefined;
  return typeof json.message === "string" ? json.message : undefined;
}

export default function AdminCategoriesClient() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingTree, setSavingTree] = useState(false);

  const [items, setItems] = useState<CategoryItem[]>([]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const dragIdRef = useRef<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newParentId, setNewParentId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    const res = await fetch("/api/admin/categories", { cache: "no-store" });
    if (!res.ok) {
      toast.error("Failed to load categories");
      setItems([]);
      setLoading(false);
      return;
    }

    const json = (await res.json().catch(() => null)) as unknown;
    const data = isRecord(json) && Array.isArray(json.items) ? (json.items as CategoryItem[]) : [];
    setItems(data);
    setLoading(false);
  }, []);

  async function saveTree(nextItems: Array<{ id: string; parentId: string | null; sortOrder: number }>) {
    setSavingTree(true);
    try {
      const res = await fetch("/api/admin/categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: nextItems }),
      });

      const json = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) {
        toast.error(readMessage(json) ?? "Failed to save order");
        return false;
      }

      return true;
    } finally {
      setSavingTree(false);
    }
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function ensureExpandedForDrop(targetId: string) {
    setExpanded((prev) => ({ ...prev, [targetId]: true }));
  }

  function getSiblings(list: CategoryItem[], parentId: string | null) {
    return list
      .filter((x) => String(x.parentId ?? "") === String(parentId ?? ""))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
  }

  function reindexSiblings(list: CategoryItem[], parentId: string | null) {
    const sib = getSiblings(list, parentId);
    return sib.map((s, idx) => ({ ...s, sortOrder: idx }));
  }

  async function moveItem(dragId: string, dropId: string | null, mode: "into" | "before" | "after") {
    if (!dragId) return;
    if (dragId === dropId && mode === "into") return;

    const dragItem = byId.get(dragId);
    if (!dragItem) return;

    if (dropId) {
      const descendants = descendantSetById.get(dragId);
      if (descendants?.has(dropId)) {
        toast.error("Cannot nest a parent inside its child");
        return;
      }
    }

    let next = items.map((x) => ({ ...x }));

    const dropItem = dropId ? byId.get(dropId) : null;
    const targetParentId =
      mode === "into" ? (dropId ? dropId : null) : (dropItem?.parentId ? String(dropItem.parentId) : null);

    next = next.map((x) => (x._id === dragId ? { ...x, parentId: targetParentId } : x));

    const targetSiblings = getSiblings(next, targetParentId);
    const withoutDrag = targetSiblings.filter((x) => x._id !== dragId);
    const dragNow = next.find((x) => x._id === dragId)!;

    if (mode === "before" && dropId) {
      const idx = withoutDrag.findIndex((x) => x._id === dropId);
      const pos = idx >= 0 ? idx : withoutDrag.length;
      withoutDrag.splice(pos, 0, dragNow);
    } else if (mode === "after" && dropId) {
      const idx = withoutDrag.findIndex((x) => x._id === dropId);
      const pos = idx >= 0 ? idx + 1 : withoutDrag.length;
      withoutDrag.splice(pos, 0, dragNow);
    } else {
      withoutDrag.unshift(dragNow);
      if (dropId) ensureExpandedForDrop(dropId);
    }

    const updatedIds = new Set(withoutDrag.map((x) => x._id));
    next = next.map((x) => {
      if (!updatedIds.has(x._id)) return x;
      const idx = withoutDrag.findIndex((s) => s._id === x._id);
      return { ...x, sortOrder: idx };
    });

    // also reindex old parent siblings to avoid duplicates
    const oldParentId = dragItem.parentId ? String(dragItem.parentId) : null;
    const oldReindexed = reindexSiblings(next, oldParentId);
    const oldSet = new Set(oldReindexed.map((x) => x._id));
    next = next.map((x) => (oldSet.has(x._id) ? oldReindexed.find((r) => r._id === x._id)! : x));

    setItems(next);

    const payload = next.map((x) => ({
      id: x._id,
      parentId: x.parentId ? String(x.parentId) : null,
      sortOrder: Number.isFinite(Number(x.sortOrder)) ? Number(x.sortOrder) : 0,
    }));

    const ok = await saveTree(payload);
    if (ok) {
      toast.success("Order saved");
      await load();
    }
  }

  function onDragStart(id: string) {
    dragIdRef.current = id;
  }

  function onDragEnd() {
    dragIdRef.current = null;
  }

  function getDepth(id: string) {
    const it = byId.get(id);
    const d = typeof it?.level === "number" ? it.level : 0;
    return Math.max(0, Math.min(10, d));
  }

  function renderNode(node: CategoryNode) {
    const hasChildren = (node.children?.length ?? 0) > 0;
    const isOpen = Boolean(expanded[node._id] ?? (getDepth(node._id) === 0));
    const depth = getDepth(node._id);
    const pad = depth * 14;

    const isRowDragging = dragIdRef.current === node._id;

    const disabledParentIds = descendantSetById.get(node._id) ?? new Set<string>();
    disabledParentIds.add(node._id);

    return (
      <div key={node._id} className="space-y-2">
        <div
          className="rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", node._id);
            e.dataTransfer.effectAllowed = "move";
            onDragStart(node._id);
          }}
          onDragEnd={() => onDragEnd()}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
          onDrop={(e) => {
            e.preventDefault();
            const dragId = e.dataTransfer.getData("text/plain") || dragIdRef.current;
            if (!dragId) return;
            void moveItem(dragId, node._id, "into");
          }}
          style={{ opacity: isRowDragging ? 0.55 : 1 }}
        >
          <div
            className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_160px_160px_160px_120px] md:items-center"
            style={{ paddingLeft: pad }}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
                onClick={() => toggleExpanded(node._id)}
                aria-label={hasChildren ? (isOpen ? "Collapse" : "Expand") : "No children"}
                disabled={!hasChildren}
              >
                <ChevronDown className={
                  "h-4 w-4 transition-transform duration-200 " +
                  (hasChildren ? (isOpen ? "rotate-0" : "-rotate-90") : "opacity-30")
                }
              />
              </button>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <GripVertical className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Name</p>
                <Input
                  value={node.name}
                  onChange={(e) =>
                    setItems((prev) => prev.map((x) => (x._id === node._id ? { ...x, name: e.target.value } : x)))
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Slug</p>
              <Input
                value={node.slug}
                onChange={(e) =>
                  setItems((prev) => prev.map((x) => (x._id === node._id ? { ...x, slug: e.target.value } : x)))
                }
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Parent</p>
              <select
                value={node.parentId ? String(node.parentId) : ""}
                onChange={(e) => {
                  const v = e.target.value || "";
                  setItems((prev) =>
                    prev.map((x) => (x._id === node._id ? { ...x, parentId: v ? v : null } : x))
                  );
                }}
                className="h-10 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-zinc-800"
              >
                <option value="">No parent</option>
                {flatForSelect.map((opt) => (
                  <option key={opt.id} value={opt.id} disabled={disabledParentIds.has(opt.id)}>
                    {"  ".repeat(opt.depth)}{opt.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Order</p>
              <Input
                value={String(node.sortOrder ?? 0)}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setItems((prev) =>
                    prev.map((x) => (x._id === node._id ? { ...x, sortOrder: Number.isFinite(n) ? n : 0 } : x))
                  );
                }}
              />
            </div>

            <label className="flex items-center gap-2 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
              <input
                type="checkbox"
                checked={Boolean(node.isActive)}
                onChange={(e) =>
                  setItems((prev) => prev.map((x) => (x._id === node._id ? { ...x, isActive: e.target.checked } : x)))
                }
                className="h-4 w-4"
              />
              Active
            </label>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={savingId === node._id || savingTree}
                onClick={() => void update(node._id, byId.get(node._id) ?? node)}
                className="flex-1"
              >
                {savingId === node._id ? "Saving..." : savingTree ? "Saving order..." : "Save"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="border border-zinc-200 dark:border-zinc-800"
                onClick={() => void remove(node._id)}
                disabled={savingTree}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div
            className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2"
            style={{ paddingLeft: pad + 44 }}
          >
            <div
              className="rounded-2xl border border-zinc-200 p-2 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const dragId = e.dataTransfer.getData("text/plain") || dragIdRef.current;
                if (!dragId) return;
                void moveItem(dragId, node._id, "before");
              }}
            >
              Drop here (before)
            </div>
            <div
              className="rounded-2xl border border-zinc-200 p-2 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const dragId = e.dataTransfer.getData("text/plain") || dragIdRef.current;
                if (!dragId) return;
                void moveItem(dragId, node._id, "after");
              }}
            >
              Drop here (after)
            </div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {hasChildren && isOpen ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="ml-2 space-y-3">
                {node.children.map((ch) => renderNode(ch))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    );
  }

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const computedNewSlug = useMemo(() => slugify(newSlug || newName), [newSlug, newName]);

  const byId = useMemo(() => {
    const m = new Map<string, CategoryItem>();
    for (const it of items) m.set(it._id, it);
    return m;
  }, [items]);

  const tree = useMemo((): CategoryNode[] => {
    const nodes = new Map<string, CategoryNode>();

    for (const it of items) {
      nodes.set(it._id, { ...it, parentId: it.parentId ?? null, children: [] });
    }

    const roots: CategoryNode[] = [];
    for (const node of nodes.values()) {
      const pid = node.parentId ? String(node.parentId) : "";
      if (pid && nodes.has(pid)) nodes.get(pid)!.children.push(node);
      else roots.push(node);
    }

    const sortNode = (n: CategoryNode) => {
      n.children.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
      n.children.forEach(sortNode);
    };
    roots.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
    roots.forEach(sortNode);
    return roots;
  }, [items]);

  const flatForSelect = useMemo(() => {
    const out: Array<{ id: string; title: string; depth: number }> = [];
    const walk = (list: CategoryNode[], depth: number) => {
      for (const n of list) {
        out.push({ id: n._id, title: n.name, depth });
        walk(n.children ?? [], depth + 1);
      }
    };
    walk(tree, 0);
    return out;
  }, [tree]);

  const descendantSetById = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const walk = (n: CategoryNode): Set<string> => {
      const set = new Set<string>();
      for (const ch of n.children ?? []) {
        set.add(ch._id);
        for (const x of walk(ch)) set.add(x);
      }
      map.set(n._id, set);
      return set;
    };
    for (const r of tree) walk(r);
    return map;
  }, [tree]);

  const visibilityLabel = useMemo(() => {
    const active = items.filter((x) => x.isActive).length;
    return `${active}/${items.length}`;
  }, [items]);

  async function create() {
    const name = newName.trim();
    const slug = computedNewSlug;

    if (!name || name.length < 2) {
      toast.error("Name is required");
      return;
    }

    if (!slug) {
      toast.error("Invalid slug");
      return;
    }

    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug, parentId: newParentId }),
    });

    const json = (await res.json().catch(() => null)) as unknown;

    if (!res.ok) {
      toast.error(readMessage(json) ?? "Failed to create");
      return;
    }

    toast.success("Category created");
    setNewName("");
    setNewSlug("");
    setNewParentId(null);
    await load();
  }

  async function update(id: string, patch: Partial<CategoryItem>) {
    setSavingId(id);

    const res = await fetch(`/api/admin/categories/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }
    );

    const json = (await res.json().catch(() => null)) as unknown;

    if (!res.ok) {
      toast.error(readMessage(json) ?? "Failed to update");
      setSavingId(null);
      return;
    }

    toast.success("Saved");
    await load();
    setSavingId(null);
  }

  async function remove(id: string) {
    const ok = window.confirm("Delete this category? This cannot be undone.");
    if (!ok) return;

    const res = await fetch(`/api/admin/categories/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    const json = (await res.json().catch(() => null)) as unknown;

    if (!res.ok) {
      toast.error(readMessage(json) ?? "Failed to delete");
      return;
    }

    toast.success("Deleted");
    await load();
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
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Categories</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Create and manage product categories.</p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin">
            <Button variant="secondary">Back</Button>
          </Link>
          <Button variant="secondary" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">New category</h2>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Name</label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Slug</label>
            <Input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder={computedNewSlug || "auto"} />
            <p className="text-xs text-zinc-500">Final: /category/{computedNewSlug || "-"}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Parent</label>
            <select
              value={newParentId ?? ""}
              onChange={(e) => setNewParentId(e.target.value ? e.target.value : null)}
              className="h-10 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-zinc-800"
            >
              <option value="">No parent</option>
              {flatForSelect.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {"  ".repeat(opt.depth)}{opt.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="button" onClick={() => void create()} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Create
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">All categories</h2>
          <p className="text-xs text-zinc-500">Active: {visibilityLabel}</p>
        </div>

        {items.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">No categories yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {tree.map((n) => renderNode(n))}
          </div>
        )}
      </div>
    </div>
  );
}
