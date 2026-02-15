import type { FooterLayout } from "@/store/footerSlice";

function l(id: string, label: string, href: string) {
  return { id, label, href };
}

export const footerTemplates: FooterLayout[] = [
  {
    id: "minimal-2col",
    name: "Minimal 2-Column",
    columns: 2,
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
      paddingY: "py-10",
      gap: "gap-8",
    },
    sections: [
      {
        id: "company",
        type: "companyInfo",
        enabled: true,
        title: "Store",
        data: {
          storeName: "Shop",
          description: "Quality products, fast delivery.",
        },
      },
      {
        id: "links",
        type: "links",
        enabled: true,
        title: "Quick Links",
        data: {
          links: [
            l("minimal.links.1", "Shop", "/"),
            l("minimal.links.2", "Contact", "/contact"),
            l("minimal.links.3", "Returns", "/returns"),
            l("minimal.links.4", "Privacy", "/privacy"),
          ],
          columns: 1,
        },
      },
      {
        id: "legal",
        type: "legal",
        enabled: true,
        title: "",
        data: {
          copyrightText: "© {year} Shop. All rights reserved.",
          links: [
            l("minimal.legal.1", "Terms", "/terms"),
            l("minimal.legal.2", "Privacy", "/privacy"),
          ],
        },
      },
    ],
  },

  {
    id: "classic-4col",
    name: "Classic 4-Column Store",
    columns: 4,
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
    sections: [
      {
        id: "about",
        type: "companyInfo",
        enabled: true,
        title: "About",
        data: {
          storeName: "Shop",
          description: "Premium picks for everyday needs.",
        },
      },
      {
        id: "shop-links",
        type: "links",
        enabled: true,
        title: "Shop",
        data: {
          columns: 1,
          links: [
            l("classic.shop.1", "New Arrivals", "/new"),
            l("classic.shop.2", "Best Sellers", "/best-sellers"),
            l("classic.shop.3", "Deals", "/deals"),
            l("classic.shop.4", "Gift Cards", "/gift-cards"),
          ],
        },
      },
      {
        id: "help-links",
        type: "links",
        enabled: true,
        title: "Help",
        data: {
          columns: 1,
          links: [
            l("classic.help.1", "Contact", "/contact"),
            l("classic.help.2", "Shipping", "/shipping"),
            l("classic.help.3", "Returns", "/returns"),
            l("classic.help.4", "FAQs", "/faq"),
          ],
        },
      },
      {
        id: "contact",
        type: "contactInfo",
        enabled: true,
        title: "Contact",
        data: {
          email: "support@example.com",
          phone: "+1 (555) 000-0000",
          addressLines: ["123 Market Street", "City, Country"],
        },
      },
      {
        id: "legal",
        type: "legal",
        enabled: true,
        title: "",
        data: {
          copyrightText: "© {year} Shop. All rights reserved.",
          links: [
            l("classic.legal.1", "Terms", "/terms"),
            l("classic.legal.2", "Privacy", "/privacy"),
          ],
        },
      },
    ],
  },

  {
    id: "store-newsletter",
    name: "Store + Newsletter",
    columns: 3,
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
    sections: [
      {
        id: "company",
        type: "companyInfo",
        enabled: true,
        title: "Store",
        data: {
          storeName: "Shop",
          description: "Get product drops and offers in your inbox.",
        },
      },
      {
        id: "links",
        type: "links",
        enabled: true,
        title: "Explore",
        data: {
          columns: 2,
          links: [
            l("news.explore.1", "Shop", "/"),
            l("news.explore.2", "Blog", "/blog"),
            l("news.explore.3", "Support", "/support"),
            l("news.explore.4", "Contact", "/contact"),
            l("news.explore.5", "Shipping", "/shipping"),
            l("news.explore.6", "Returns", "/returns"),
          ],
        },
      },
      {
        id: "newsletter",
        type: "newsletter",
        enabled: true,
        title: "Newsletter",
        data: {
          description: "Subscribe for early access and weekly deals.",
          placeholder: "Enter your email",
          buttonText: "Subscribe",
        },
      },
      {
        id: "legal",
        type: "legal",
        enabled: true,
        title: "",
        data: {
          copyrightText: " {year} Shop. All rights reserved.",
          links: [
            l("news.legal.1", "Terms", "/terms"),
            l("news.legal.2", "Privacy", "/privacy"),
          ],
        },
      },
    ],
  },

  {
    id: "social-payment",
    name: "Store + Social + Payment Icons",
    columns: 4,
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
    sections: [
      {
        id: "company",
        type: "companyInfo",
        enabled: true,
        title: "Store",
        data: {
          storeName: "Shop",
          description: "Secure checkout, trusted delivery.",
        },
      },
      {
        id: "links",
        type: "links",
        enabled: true,
        title: "Links",
        data: {
          columns: 1,
          links: [
            l("socpay.links.1", "Shop", "/"),
            l("socpay.links.2", "Contact", "/contact"),
            l("socpay.links.3", "Orders", "/account/orders"),
            l("socpay.links.4", "Returns", "/returns"),
          ],
        },
      },
      {
        id: "social",
        type: "social",
        enabled: true,
        title: "Follow",
        data: {
          links: [
            l("socpay.social.1", "Instagram", "https://instagram.com"),
            l("socpay.social.2", "Facebook", "https://facebook.com"),
            l("socpay.social.3", "X", "https://x.com"),
          ],
        },
      },
      {
        id: "payments",
        type: "paymentIcons",
        enabled: true,
        title: "Payments",
        data: {
          kinds: ["visa", "mastercard", "amex", "paypal"],
        },
      },
      {
        id: "legal",
        type: "legal",
        enabled: true,
        title: "",
        data: {
          copyrightText: " {year} Shop. All rights reserved.",
          links: [
            l("socpay.legal.1", "Terms", "/terms"),
            l("socpay.legal.2", "Privacy", "/privacy"),
          ],
        },
      },
    ],
  },

  {
    id: "mega-6col",
    name: "Mega Footer (6 columns)",
    columns: 6,
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
      paddingY: "py-14",
      gap: "gap-10",
    },
    sections: [
      {
        id: "company",
        type: "companyInfo",
        enabled: true,
        title: "Store",
        data: {
          storeName: "Shop",
          description: "Everything you need, delivered.",
        },
      },
      {
        id: "shop",
        type: "links",
        enabled: true,
        title: "Shop",
        data: {
          columns: 1,
          links: [
            l("mega.shop.1", "New", "/new"),
            l("mega.shop.2", "Popular", "/popular"),
            l("mega.shop.3", "Deals", "/deals"),
          ],
        },
      },
      {
        id: "company-links",
        type: "links",
        enabled: true,
        title: "Company",
        data: {
          columns: 1,
          links: [
            l("mega.company.1", "About", "/about"),
            l("mega.company.2", "Careers", "/careers"),
            l("mega.company.3", "Press", "/press"),
          ],
        },
      },
      {
        id: "support",
        type: "links",
        enabled: true,
        title: "Support",
        data: {
          columns: 1,
          links: [
            l("mega.support.1", "Contact", "/contact"),
            l("mega.support.2", "Shipping", "/shipping"),
            l("mega.support.3", "Returns", "/returns"),
            l("mega.support.4", "FAQs", "/faq"),
          ],
        },
      },
      {
        id: "newsletter",
        type: "newsletter",
        enabled: true,
        title: "Newsletter",
        data: {
          description: "Weekly deals and new drops.",
          placeholder: "Email address",
          buttonText: "Join",
        },
      },
      {
        id: "payments",
        type: "paymentIcons",
        enabled: true,
        title: "Payments",
        data: {
          kinds: ["visa", "mastercard", "paypal"],
        },
      },
      {
        id: "legal",
        type: "legal",
        enabled: true,
        title: "",
        data: {
          copyrightText: " {year} Shop. All rights reserved.",
          links: [
            l("mega.legal.1", "Terms", "/terms"),
            l("mega.legal.2", "Privacy", "/privacy"),
            l("mega.legal.3", "Cookies", "/cookies"),
          ],
        },
      },
    ],
  },

  {
    id: "modern-centered",
    name: "Modern Centered",
    columns: 3,
    style: "solid",
    align: "center",
    mobileView: "accordion",
    darkMode: false,
    colors: {
      background: "",
      text: "",
      accent: "",
    },
    spacing: {
      paddingY: "py-12",
      gap: "gap-8",
    },
    sections: [
      {
        id: "company",
        type: "companyInfo",
        enabled: true,
        title: "",
        data: {
          storeName: "Shop",
          description: "Designed for modern commerce.",
        },
      },
      {
        id: "social",
        type: "social",
        enabled: true,
        title: "",
        data: {
          links: [
            l("modern.social.1", "Instagram", "https://instagram.com"),
            l("modern.social.2", "Facebook", "https://facebook.com"),
            l("modern.social.3", "X", "https://x.com"),
          ],
        },
      },
      {
        id: "legal",
        type: "legal",
        enabled: true,
        title: "",
        data: {
          copyrightText: "© {year} Shop. All rights reserved.",
          links: [
            l("modern.legal.1", "Terms", "/terms"),
            l("modern.legal.2", "Privacy", "/privacy"),
          ],
        },
      },
    ],
  },
];

export function getFooterTemplateById(id: string) {
  return footerTemplates.find((t) => t.id === id) ?? footerTemplates[0];
}
