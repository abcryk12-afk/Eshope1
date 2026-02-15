import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type FooterSectionType =
  | "links"
  | "newsletter"
  | "social"
  | "paymentIcons"
  | "companyInfo"
  | "contactInfo"
  | "appDownload"
  | "legal"
  | "customHTML";

export type FooterLink = {
  id: string;
  label: string;
  href: string;
};

export type FooterLinksData = {
  links: FooterLink[];
  columns?: number;
};

export type FooterNewsletterData = {
  description?: string;
  placeholder?: string;
  buttonText?: string;
};

export type FooterSocialData = {
  links: Array<{ id: string; label: string; href: string }>;
};

export type FooterPaymentIconsData = {
  kinds: string[];
};

export type FooterCompanyInfoData = {
  storeName?: string;
  description?: string;
  logoUrl?: string;
};

export type FooterContactInfoData = {
  email?: string;
  phone?: string;
  addressLines?: string[];
  countries?: string[];
};

export type FooterAppDownloadData = {
  title?: string;
  iosUrl?: string;
  androidUrl?: string;
};

export type FooterLegalData = {
  copyrightText?: string;
  links?: FooterLink[];
};

export type FooterCustomHtmlData = {
  html: string;
};

export type FooterSection = {
  id: string;
  type: FooterSectionType;
  enabled: boolean;
  title?: string;
  data:
    | FooterLinksData
    | FooterNewsletterData
    | FooterSocialData
    | FooterPaymentIconsData
    | FooterCompanyInfoData
    | FooterContactInfoData
    | FooterAppDownloadData
    | FooterLegalData
    | FooterCustomHtmlData;
};

export type FooterStyle = "solid" | "gradient" | "dark";
export type FooterAlign = "left" | "center" | "right";
export type FooterMobileView = "accordion" | "grid";

export type FooterLayout = {
  id: string;
  name: string;
  columns: number;
  sections: FooterSection[];
  style: FooterStyle;
  align: FooterAlign;
  mobileView?: FooterMobileView;
  darkMode: boolean;
  colors: {
    background: string;
    text: string;
    accent: string;
  };
  spacing: {
    paddingY: string; // Tailwind class e.g. py-12
    gap: string; // Tailwind class e.g. gap-10
  };
};

export type FooterState = {
  enabled: boolean;
  scopeMode: "allowlist" | "denylist";
  scopePaths: string[];
  layout: FooterLayout | null;
  updatedAt: number;
};

const DEFAULT_STATE: FooterState = {
  enabled: false,
  scopeMode: "allowlist",
  scopePaths: [],
  layout: null,
  updatedAt: 0,
};

type HydratePayload = {
  enabled?: boolean;
  scopeMode?: FooterState["scopeMode"];
  scopePaths?: string[];
  layout?: FooterLayout | null;
  updatedAt?: number;
};

const footerSlice = createSlice({
  name: "footer",
  initialState: DEFAULT_STATE,
  reducers: {
    hydrateFooter(state, action: PayloadAction<HydratePayload>) {
      const { layout, updatedAt, enabled, scopeMode, scopePaths } = action.payload;
      if (typeof updatedAt === "number") state.updatedAt = updatedAt;
      if (typeof enabled === "boolean") state.enabled = enabled;
      if (scopeMode === "allowlist" || scopeMode === "denylist") state.scopeMode = scopeMode;
      if (Array.isArray(scopePaths)) state.scopePaths = scopePaths.map((x) => String(x));
      if (layout !== undefined) state.layout = layout;
    },
    setFooterBuilderEnabled(state, action: PayloadAction<boolean>) {
      state.enabled = action.payload;
      state.updatedAt = Date.now();
    },
    setFooterScopeMode(state, action: PayloadAction<FooterState["scopeMode"]>) {
      state.scopeMode = action.payload;
      state.updatedAt = Date.now();
    },
    setFooterScopePaths(state, action: PayloadAction<string[]>) {
      state.scopePaths = action.payload.map((x) => String(x)).filter(Boolean);
      state.updatedAt = Date.now();
    },
    setFooterLayout(state, action: PayloadAction<FooterLayout>) {
      state.layout = action.payload;
      state.updatedAt = Date.now();
    },
    resetFooterLayout(state) {
      state.layout = null;
      state.updatedAt = Date.now();
    },
  },
});

export const {
  hydrateFooter,
  setFooterBuilderEnabled,
  setFooterScopeMode,
  setFooterScopePaths,
  setFooterLayout,
  resetFooterLayout,
} = footerSlice.actions;

export default footerSlice.reducer;
