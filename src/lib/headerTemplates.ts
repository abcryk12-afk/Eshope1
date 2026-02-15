import type { HeaderLayout, HeaderSettings } from "@/store/headerSlice";

export type HeaderTemplate = {
  id: string;
  name: string;
  layout: HeaderLayout;
  sticky: boolean;
  transparent: boolean;
  settings?: Partial<HeaderSettings>;
};

function b(id: string, type: HeaderLayout["left"][number]["type"], enabled = true, label?: string, data?: Record<string, unknown>) {
  return { id, type, enabled, label, data };
}

export const headerTemplates: HeaderTemplate[] = [
  {
    id: "classic-store",
    name: "Classic Store Header",
    sticky: true,
    transparent: false,
    layout: {
      left: [b("mobile", "mobileMenu"), b("logo", "logo")],
      center: [b("nav", "navigation")],
      right: [b("search", "search"), b("currency", "currencySelector"), b("lang", "languageSelector"), b("account", "accountIcon"), b("wishlist", "wishlistIcon"), b("cart", "cartIcon")],
    },
  },
  {
    id: "centered-logo",
    name: "Centered Logo",
    sticky: true,
    transparent: false,
    layout: {
      left: [b("mobile", "mobileMenu"), b("nav", "navigation")],
      center: [b("logo", "logo")],
      right: [b("search", "search"), b("account", "accountIcon"), b("cart", "cartIcon")],
    },
    settings: { logoAlignment: "center" },
  },
  {
    id: "split-navigation",
    name: "Split Navigation",
    sticky: true,
    transparent: false,
    layout: {
      left: [b("mobile", "mobileMenu"), b("nav-left", "navigation", true, "Nav", { variant: "left" })],
      center: [b("logo", "logo")],
      right: [b("nav-right", "navigation", true, "Nav", { variant: "right" }), b("search", "search"), b("cart", "cartIcon")],
    },
  },
  {
    id: "mega-menu",
    name: "Mega Menu Header",
    sticky: true,
    transparent: false,
    layout: {
      left: [b("mobile", "mobileMenu"), b("logo", "logo"), b("mega", "megaMenu")],
      center: [b("spacer", "spacer")],
      right: [b("search", "search", true, "Search", { style: "bar" }), b("account", "accountIcon"), b("cart", "cartIcon")],
    },
    settings: { searchStyle: "bar", megaMenuWidthPx: 1100 },
  },
  {
    id: "transparent-hero",
    name: "Transparent Hero Header",
    sticky: true,
    transparent: true,
    layout: {
      left: [b("mobile", "mobileMenu"), b("logo", "logo")],
      center: [b("nav", "navigation")],
      right: [b("search", "search"), b("account", "accountIcon"), b("cart", "cartIcon")],
    },
    settings: { transparent: true, shadow: false, borderBottom: false },
  },
  {
    id: "minimal",
    name: "Minimal Header",
    sticky: true,
    transparent: false,
    layout: {
      left: [b("mobile", "mobileMenu"), b("logo", "logo")],
      center: [b("spacer", "spacer")],
      right: [b("search", "search"), b("cart", "cartIcon")],
    },
  },
  {
    id: "compact",
    name: "Compact Header",
    sticky: true,
    transparent: false,
    layout: {
      left: [b("mobile", "mobileMenu"), b("logo", "logo")],
      center: [b("nav", "navigation")],
      right: [b("cart", "cartIcon")],
    },
    settings: { heightPx: 56, paddingY: 8, iconSpacingPx: 8 },
  },
  {
    id: "search-focused",
    name: "Modern Search-Focused Header",
    sticky: true,
    transparent: false,
    layout: {
      left: [b("mobile", "mobileMenu"), b("logo", "logo")],
      center: [b("search", "search", true, "Search", { style: "bar" })],
      right: [b("account", "accountIcon"), b("wishlist", "wishlistIcon"), b("cart", "cartIcon")],
    },
    settings: { searchStyle: "bar" },
  },
];

export function getHeaderTemplateById(id: string) {
  return headerTemplates.find((t) => t.id === id) ?? headerTemplates[0]!;
}
