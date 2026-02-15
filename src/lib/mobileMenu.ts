export type MobileMenuVisibility = "all" | "mobile" | "desktop";

export type MobileMenuItem = {
  id: string;
  type: "category" | "link";
  title: string;
  href: string;
  categoryId?: string;
  includeChildren?: boolean;
  enabled: boolean;
  visibility: MobileMenuVisibility;
  icon?: string;
  badgeLabel?: string;
  featured?: boolean;
  children?: MobileMenuItem[];
};

export type MobileMenuConfig = {
  useDefaultMenu: boolean;
  items: MobileMenuItem[];
  featuredBannerHtml?: string;
  promoBannerHtml?: string;
  updatedAt: number;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readString(v: unknown) {
  return typeof v === "string" ? v : "";
}

function readBool(v: unknown, fallback: boolean) {
  return typeof v === "boolean" ? v : fallback;
}

function readOptionalString(v: unknown) {
  return typeof v === "string" ? v : undefined;
}

function readVisibility(v: unknown): MobileMenuVisibility {
  return v === "mobile" || v === "desktop" || v === "all" ? v : "all";
}

function normalizeItem(input: unknown, depth: number): MobileMenuItem | null {
  if (!isRecord(input) || depth > 20) return null;

  const id = readString(input.id).trim();
  const type = input.type === "category" || input.type === "link" ? input.type : "link";
  const title = readString(input.title).trim();
  const href = readString(input.href).trim();

  const categoryId = readOptionalString(input.categoryId)?.trim() || undefined;
  const includeChildren = readBool(input.includeChildren, false);

  if (!id) return null;
  // Back-compat: allow category items to omit title/href when categoryId is provided.
  if ((!title || !href) && !(type === "category" && categoryId)) return null;

  const childrenRaw = Array.isArray(input.children) ? input.children : [];
  const children = childrenRaw.map((c) => normalizeItem(c, depth + 1)).filter(Boolean) as MobileMenuItem[];

  return {
    id,
    type,
    title,
    href,
    categoryId,
    includeChildren,
    enabled: readBool(input.enabled, true),
    visibility: readVisibility(input.visibility),
    icon: readString(input.icon).trim() || undefined,
    badgeLabel: readString(input.badgeLabel).trim() || undefined,
    featured: readBool(input.featured, false),
    children,
  };
}

export function normalizeMobileMenuConfig(input: unknown): MobileMenuConfig {
  const empty: MobileMenuConfig = {
    useDefaultMenu: true,
    items: [],
    featuredBannerHtml: "",
    promoBannerHtml: "",
    updatedAt: 0,
  };

  if (!isRecord(input)) return empty;

  const itemsRaw = Array.isArray(input.items) ? input.items : [];
  const items = itemsRaw.map((x) => normalizeItem(x, 0)).filter(Boolean) as MobileMenuItem[];

  return {
    useDefaultMenu: readBool(input.useDefaultMenu, true),
    items,
    featuredBannerHtml: readString(input.featuredBannerHtml),
    promoBannerHtml: readString(input.promoBannerHtml),
    updatedAt: typeof input.updatedAt === "number" ? input.updatedAt : 0,
  };
}

export type DbCategory = {
  _id: unknown;
  name: string;
  slug: string;
  parentId?: unknown | null;
  icon?: string;
  menuLabel?: string;
  isActive: boolean;
  sortOrder: number;
};

export type CategoryTreeNode = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  icon?: string;
  menuLabel?: string;
  isActive: boolean;
  sortOrder: number;
  children: CategoryTreeNode[];
};

export function buildCategoryTree(categories: DbCategory[]): CategoryTreeNode[] {
  const byId = new Map<string, CategoryTreeNode>();

  for (const c of categories) {
    const id = String(c._id ?? "");
    if (!id) continue;
    byId.set(id, {
      id,
      name: String(c.name ?? ""),
      slug: String(c.slug ?? ""),
      parentId: c.parentId ? String(c.parentId) : null,
      icon: typeof c.icon === "string" && c.icon.trim() ? c.icon.trim() : undefined,
      menuLabel: typeof c.menuLabel === "string" && c.menuLabel.trim() ? c.menuLabel.trim() : undefined,
      isActive: Boolean(c.isActive),
      sortOrder: typeof c.sortOrder === "number" ? c.sortOrder : 0,
      children: [],
    });
  }

  const roots: CategoryTreeNode[] = [];

  for (const node of byId.values()) {
    const pid = node.parentId;
    if (pid && byId.has(pid)) {
      byId.get(pid)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNode = (node: CategoryTreeNode) => {
    node.children.sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || String(a.name).localeCompare(String(b.name))
    );
    node.children.forEach(sortNode);
  };

  roots.sort(
    (a, b) =>
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || String(a.name).localeCompare(String(b.name))
  );
  roots.forEach(sortNode);

  return roots;
}

export function treeToMenuItems(nodes: CategoryTreeNode[], depth = 0): MobileMenuItem[] {
  if (!Array.isArray(nodes) || depth > 20) return [];

  return nodes
    .filter((n) => Boolean(n) && Boolean(n.isActive))
    .map((n) => {
      const title = String(n.menuLabel || n.name || "").trim();
      const slug = String(n.slug || "").trim();

      const children = treeToMenuItems(n.children ?? [], depth + 1);

      return {
        id: `cat_${n.id}`,
        type: "category" as const,
        title,
        href: `/category/${encodeURIComponent(slug)}`,
        enabled: true,
        visibility: "all" as const,
        icon: typeof n.icon === "string" && n.icon.trim() ? n.icon.trim() : undefined,
        children,
      };
    })
    .filter((x) => x.title && x.href);
}
