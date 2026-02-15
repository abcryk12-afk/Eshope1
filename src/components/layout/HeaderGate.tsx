"use client";

import { usePathname } from "next/navigation";

import { useAppSelector } from "@/store/hooks";
import { isHeaderBuilderEnabled } from "@/lib/theme-engine";

import Header from "@/components/layout/Header";
import CustomHeader from "@/components/layout/CustomHeader";

export default function HeaderGate() {
  const pathname = usePathname() || "/";
  const isAdminPath = pathname.startsWith("/admin");

  const header = useAppSelector((s) => s.header);

  if (isAdminPath) return null;

  // Safety-first enterprise gating:
  // If the feature is not explicitly enabled, always use the production header.
  if (!isHeaderBuilderEnabled()) {
    return <Header />;
  }

  // Feature enabled, but builder not enabled/configured => keep production header.
  if (!header?.enabled) {
    return <Header />;
  }

  const scopePaths = header.scopePaths ?? [];
  const inScope =
    header.scopeMode === "denylist"
      ? !scopePaths.some((p) => p && (pathname === p || pathname.startsWith(p + "/")))
      : scopePaths.some((p) => p && (pathname === p || pathname.startsWith(p + "/")));

  if (!inScope) {
    return <Header />;
  }

  if (!header || header.isDefault) {
    return <Header />;
  }

  return <CustomHeader layout={header.customLayout} settings={header.settings} />;
}
