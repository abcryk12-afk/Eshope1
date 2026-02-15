import "server-only";

import type { CategoryTreeNode, MobileMenuItem } from "@/lib/mobileMenu";
import { treeToMenuItems } from "@/lib/mobileMenu";

function toCategoryId(id: string) {
  return id.startsWith("cat_") ? id.slice(4) : id;
}

function mergeChildren(a: MobileMenuItem[], b: MobileMenuItem[]) {
  if (!a.length) return b;
  if (!b.length) return a;
  return [...a, ...b];
}

export function resolveMenuItemsWithCategories(args: {
  items: MobileMenuItem[];
  tree: CategoryTreeNode[];
  autoSyncCategories?: boolean;
  pagesById?: Map<string, { id: string; title: string; slug: string }>;
}): MobileMenuItem[] {
  const { items, tree, pagesById, autoSyncCategories = true } = args;

  const byId = new Map<string, CategoryTreeNode>();
  const walk = (n: CategoryTreeNode) => {
    byId.set(String(n.id), n);
    for (const ch of n.children ?? []) walk(ch);
  };
  for (const r of tree) walk(r);

  const resolveList = (list: MobileMenuItem[], depth: number): MobileMenuItem[] => {
    if (!Array.isArray(list) || depth > 20) return [];

    const out: MobileMenuItem[] = [];

    for (const raw of list) {
      if (!raw || !raw.enabled) continue;

      if (raw.type === "category") {
        const cid = raw.refId?.trim() || raw.categoryId?.trim() || toCategoryId(raw.id);
        const node = cid ? byId.get(cid) : undefined;
        if (!node || !node.isActive) continue;

        const title = String(node.menuLabel || node.name || "").trim();
        const href = `/category/${encodeURIComponent(String(node.slug || "").trim())}`;

        const include = typeof raw.includeChildren === "boolean" ? raw.includeChildren : autoSyncCategories;
        const dynamicChildren = include ? treeToMenuItems(node.children ?? []) : [];
        const manualChildren = include ? [] : resolveList(raw.children ?? [], depth + 1);

        out.push({
          ...raw,
          id: raw.id,
          title,
          href,
          icon: raw.icon?.trim() ? raw.icon : node.icon,
          children: mergeChildren(dynamicChildren, manualChildren),
        });

        continue;
      }

      if (raw.type === "page") {
        const pid = raw.refId?.trim() || "";
        const p = pid && pagesById ? pagesById.get(pid) : undefined;
        if (!p) continue;
        const baseTitle = String(p.title || "").trim();
        const title = raw.title?.trim() ? raw.title.trim() : baseTitle;
        const href = `/p/${encodeURIComponent(String(p.slug || "").trim())}`;
        out.push({
          ...raw,
          title,
          href,
          children: resolveList(raw.children ?? [], depth + 1),
        });
        continue;
      }

      // link
      out.push({
        ...raw,
        children: resolveList(raw.children ?? [], depth + 1),
      });
    }

    return out;
  };

  return resolveList(items, 0);
}
