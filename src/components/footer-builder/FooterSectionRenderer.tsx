"use client";

import FooterSection from "@/components/layout/FooterSection";
import type { FooterSection as FooterSectionT, FooterAlign } from "@/store/footerSlice";

export default function FooterSectionRenderer({
  section,
  align,
}: {
  section: FooterSectionT;
  align: FooterAlign;
}) {
  return <FooterSection section={section} align={align} />;
}
