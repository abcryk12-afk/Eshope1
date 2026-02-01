"use client";

import { usePathname } from "next/navigation";

import SiteFooterClient from "@/components/layout/SiteFooterClient";

type Props = {
  footer: Record<string, unknown> | null;
  legacyFooterText: string;
};

export default function SiteFooterGate({ footer, legacyFooterText }: Props) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return null;

  return <SiteFooterClient footer={footer} legacyFooterText={legacyFooterText} />;
}
