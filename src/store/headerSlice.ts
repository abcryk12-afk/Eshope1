import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type HeaderBlockType =
  | "logo"
  | "navigation"
  | "megaMenu"
  | "search"
  | "cartIcon"
  | "accountIcon"
  | "wishlistIcon"
  | "languageSelector"
  | "currencySelector"
  | "announcementBar"
  | "customHTML"
  | "divider"
  | "spacer"
  | "socialIcons"
  | "mobileMenu";

export type HeaderBlock = {
  id: string;
  type: HeaderBlockType;
  enabled: boolean;
  label?: string;
  data?: Record<string, unknown>;
};

export type HeaderLayout = {
  left: HeaderBlock[];
  center: HeaderBlock[];
  right: HeaderBlock[];
};

export type HeaderSearchStyle = "icon" | "bar";
export type HeaderLogoAlignment = "left" | "center";
export type HeaderCartBadgeStyle = "dot" | "count";
export type HeaderMobileLayoutStyle = "drawer" | "dropdown";

export type HeaderSettings = {
  sticky: boolean;
  transparent: boolean;
  heightPx: number;
  paddingX: number;
  paddingY: number;
  background: string;
  text: string;
  hover: string;
  borderBottom: boolean;
  shadow: boolean;
  dropdownSpeedMs: number;
  searchStyle: HeaderSearchStyle;
  logoAlignment: HeaderLogoAlignment;
  logoMaxHeightPx: number;
  iconSizePx: number;
  iconSpacingPx: number;
  cartBadgeStyle: HeaderCartBadgeStyle;
  mobileLayoutStyle: HeaderMobileLayoutStyle;
  collapseBreakpointPx: number;
  megaMenuWidthPx: number;
};

export type HeaderState = {
  enabled: boolean;
  scopeMode: "allowlist" | "denylist";
  scopePaths: string[];
  isDefault: boolean;
  activeTemplateId: string;
  customLayout: HeaderLayout;
  settings: HeaderSettings;
  updatedAt: number;
};

type HydratePayload = Partial<HeaderState>;

const DEFAULT_SETTINGS: HeaderSettings = {
  sticky: true,
  transparent: false,
  heightPx: 64,
  paddingX: 16,
  paddingY: 12,
  background: "",
  text: "",
  hover: "",
  borderBottom: true,
  shadow: false,
  dropdownSpeedMs: 220,
  searchStyle: "icon",
  logoAlignment: "left",
  logoMaxHeightPx: 28,
  iconSizePx: 20,
  iconSpacingPx: 10,
  cartBadgeStyle: "count",
  mobileLayoutStyle: "drawer",
  collapseBreakpointPx: 768,
  megaMenuWidthPx: 980,
};

const DEFAULT_STATE: HeaderState = {
  enabled: false,
  scopeMode: "allowlist",
  scopePaths: [],
  isDefault: true,
  activeTemplateId: "classic-store",
  customLayout: {
    left: [],
    center: [],
    right: [],
  },
  settings: DEFAULT_SETTINGS,
  updatedAt: 0,
};

const headerSlice = createSlice({
  name: "header",
  initialState: DEFAULT_STATE,
  reducers: {
    hydrateHeader(state, action: PayloadAction<HydratePayload>) {
      const next = action.payload;
      if (typeof next.updatedAt === "number") state.updatedAt = next.updatedAt;
      if (typeof next.enabled === "boolean") state.enabled = next.enabled;
      if (next.scopeMode === "allowlist" || next.scopeMode === "denylist") state.scopeMode = next.scopeMode;
      if (Array.isArray(next.scopePaths)) state.scopePaths = next.scopePaths.map((x) => String(x));
      if (typeof next.isDefault === "boolean") state.isDefault = next.isDefault;
      if (typeof next.activeTemplateId === "string") state.activeTemplateId = next.activeTemplateId;
      if (next.customLayout) state.customLayout = next.customLayout;
      if (next.settings) state.settings = next.settings;
    },

    setHeaderBuilderEnabled(state, action: PayloadAction<boolean>) {
      state.enabled = action.payload;
      state.updatedAt = Date.now();
    },

    setHeaderScopeMode(state, action: PayloadAction<HeaderState["scopeMode"]>) {
      state.scopeMode = action.payload;
      state.updatedAt = Date.now();
    },

    setHeaderScopePaths(state, action: PayloadAction<string[]>) {
      state.scopePaths = action.payload.map((x) => String(x)).filter(Boolean);
      state.updatedAt = Date.now();
    },
    setHeaderTemplate(state, action: PayloadAction<{ templateId: string; layout: HeaderLayout; settings?: Partial<HeaderSettings> }>) {
      state.isDefault = false;
      state.activeTemplateId = action.payload.templateId;
      state.customLayout = action.payload.layout;
      state.settings = { ...state.settings, ...(action.payload.settings ?? {}) };
      state.updatedAt = Date.now();
    },
    setHeaderLayout(state, action: PayloadAction<HeaderLayout>) {
      state.isDefault = false;
      state.customLayout = action.payload;
      state.updatedAt = Date.now();
    },
    setHeaderSettings(state, action: PayloadAction<Partial<HeaderSettings>>) {
      state.isDefault = false;
      state.settings = { ...state.settings, ...action.payload };
      state.updatedAt = Date.now();
    },
    setHeaderDefaultMode(state, action: PayloadAction<boolean>) {
      state.isDefault = action.payload;
      state.updatedAt = Date.now();
    },
    restoreDefaultHeader(state) {
      state.isDefault = true;
      state.updatedAt = Date.now();
    },
  },
});

export const {
  hydrateHeader,
  setHeaderBuilderEnabled,
  setHeaderScopeMode,
  setHeaderScopePaths,
  setHeaderTemplate,
  setHeaderLayout,
  setHeaderSettings,
  setHeaderDefaultMode,
  restoreDefaultHeader,
} = headerSlice.actions;

export const headerDefaultSettings = DEFAULT_SETTINGS;

export default headerSlice.reducer;
