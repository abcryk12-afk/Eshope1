"use client";

import Footer from "@/components/layout/Footer";
import type { FooterLayout } from "@/store/footerSlice";

export default function FooterPreview({ layout }: { layout?: FooterLayout }) {
  return <Footer fallbackLayout={layout} />;
}
