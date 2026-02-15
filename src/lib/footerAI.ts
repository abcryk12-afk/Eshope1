import type { FooterLayout, FooterSection } from "@/store/footerSlice";

export type StoreFooterConfigInput = {
  storeName: string;
  hasBlog: boolean;
  hasSupport: boolean;
  hasMobileApp: boolean;
  countries: string[];
};

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildLinksSection(title: string, links: Array<{ label: string; href: string }>, columns = 1): FooterSection {
  return {
    id: uid("links"),
    type: "links",
    enabled: true,
    title,
    data: {
      columns,
      links: links.map((l) => ({ id: uid("link"), ...l })),
    },
  };
}

export function generateFooterFromStoreConfig(input: StoreFooterConfigInput): FooterLayout {
  const storeName = input.storeName?.trim() || "Shop";

  const sections: FooterSection[] = [];

  sections.push({
    id: uid("company"),
    type: "companyInfo",
    enabled: true,
    title: "",
    data: {
      storeName,
      description: "Premium products, secure checkout.",
    },
  });

  const shopLinks = [
    { label: "Shop", href: "/" },
    { label: "New Arrivals", href: "/new" },
    { label: "Deals", href: "/deals" },
  ];

  if (input.hasBlog) shopLinks.push({ label: "Blog", href: "/blog" });

  sections.push(buildLinksSection("Shop", shopLinks, 1));

  const helpLinks = [{ label: "Contact", href: "/contact" }, { label: "Shipping", href: "/shipping" }, { label: "Returns", href: "/returns" }];
  if (input.hasSupport) helpLinks.push({ label: "Support", href: "/support" });
  helpLinks.push({ label: "FAQs", href: "/faq" });

  sections.push(buildLinksSection("Help", helpLinks, 1));

  sections.push({
    id: uid("contact"),
    type: "contactInfo",
    enabled: true,
    title: "Contact",
    data: {
      email: "support@example.com",
      phone: "+1 (555) 000-0000",
      addressLines: ["123 Market Street", "City, Country"],
      countries: input.countries ?? [],
    },
  });

  sections.push({
    id: uid("social"),
    type: "social",
    enabled: true,
    title: "Follow",
    data: {
      links: [
        { id: uid("social"), label: "Instagram", href: "https://instagram.com" },
        { id: uid("social"), label: "Facebook", href: "https://facebook.com" },
      ],
    },
  });

  sections.push({
    id: uid("payments"),
    type: "paymentIcons",
    enabled: true,
    title: "Payments",
    data: {
      kinds: ["visa", "mastercard", "amex", "paypal"],
    },
  });

  if (input.hasMobileApp) {
    sections.push({
      id: uid("app"),
      type: "appDownload",
      enabled: true,
      title: "Get the app",
      data: {
        title: "Download on iOS / Android",
        iosUrl: "https://apple.com",
        androidUrl: "https://play.google.com",
      },
    });
  }

  sections.push({
    id: uid("legal"),
    type: "legal",
    enabled: true,
    title: "",
    data: {
      copyrightText: `© {year} ${storeName}. All rights reserved.`,
      links: [
        { id: uid("legal"), label: "Terms", href: "/terms" },
        { id: uid("legal"), label: "Privacy", href: "/privacy" },
        { id: uid("legal"), label: "Cookies", href: "/cookies" },
      ],
    },
  });

  // Column count heuristic
  const baseColumns = Math.min(6, Math.max(2, input.hasMobileApp ? 5 : input.hasBlog ? 4 : 4));

  return {
    id: "ai-generated",
    name: "AI Generated",
    columns: baseColumns,
    style: "solid",
    align: "left",
    mobileView: "accordion",
    darkMode: false,
    colors: {
      background: "",
      text: "",
      accent: "",
    },
    spacing: {
      paddingY: "py-12",
      gap: "gap-10",
    },
    sections,
  };
}
