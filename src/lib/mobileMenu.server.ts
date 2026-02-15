import "server-only";

import Category from "@/models/Category";

import type { DbCategory } from "@/lib/mobileMenu";

export async function loadActiveCategoriesForMenu() {
  const cats = (await Category.find({ isActive: true })
    .sort({ sortOrder: 1, name: 1 })
    .select("name slug isActive sortOrder parentId icon menuLabel")
    .lean()) as unknown as DbCategory[];

  return Array.isArray(cats) ? cats : [];
}
