"use client";

import { usePathname } from "next/navigation";

import SiteFooterClient from "@/components/layout/SiteFooterClient";
import Footer from "@/components/layout/Footer";
import { useAppSelector } from "@/store/hooks";
import { isFooterBuilderEnabled } from "@/lib/theme-engine";

type Props = {
  footer: Record<string, unknown> | null;
  legacyFooterText: string;
};

export default function SiteFooterGate({ footer, legacyFooterText }: Props) {
  const pathname = usePathname();
  const footerState = useAppSelector((s) => s.footer);

  if (pathname.startsWith("/admin")) return null;

  // Safety-first enterprise gating:
  // If the feature is not explicitly enabled, always use the production footer.
  if (!isFooterBuilderEnabled()) {
    return <SiteFooterClient footer={footer} legacyFooterText={legacyFooterText} />;
  }

  if (!footerState?.enabled) {
    return <SiteFooterClient footer={footer} legacyFooterText={legacyFooterText} />;
  }

  const scopePaths = footerState.scopePaths ?? [];
  const inScope =
    footerState.scopeMode === "denylist"
      ? !scopePaths.some((p) => p && (pathname === p || pathname.startsWith(p + "/")))
      : scopePaths.some((p) => p && (pathname === p || pathname.startsWith(p + "/")));

  if (!inScope) {
    return <SiteFooterClient footer={footer} legacyFooterText={legacyFooterText} />;
  }

  if (footerState.layout) {
    return <Footer />;
  }

  return <SiteFooterClient footer={footer} legacyFooterText={legacyFooterText} />;
}
