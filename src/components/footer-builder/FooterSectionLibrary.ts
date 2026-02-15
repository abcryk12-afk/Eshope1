import type { FooterSectionType } from "@/store/footerSlice";

export const FOOTER_SECTION_LIBRARY: Array<{ type: FooterSectionType; label: string }> = [
  { type: "companyInfo", label: "Company Info" },
  { type: "links", label: "Links" },
  { type: "newsletter", label: "Newsletter" },
  { type: "contactInfo", label: "Contact Info" },
  { type: "social", label: "Social" },
  { type: "paymentIcons", label: "Payment Icons" },
  { type: "appDownload", label: "App Download" },
  { type: "legal", label: "Legal" },
  { type: "customHTML", label: "Custom HTML" },
];
