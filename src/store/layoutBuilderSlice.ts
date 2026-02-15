import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type LayoutBuilderMode = "default" | "preview" | "published";

export type GridDensity = "compact" | "normal" | "spacious";
export type BannerStylePreset = "minimal" | "marketplace" | "flash-deals" | "hero";
export type SectionDividerStyle = "none" | "subtle" | "bold" | "dashed";

export type HomeLayoutPresetId = "default" | "marketplace" | "premium";
export type ProductPageLayoutPresetId = "default" | "marketplace" | "minimal";

export type LayoutBuilderState = {
  enabled: boolean;
  mode: LayoutBuilderMode;

  homePreset: HomeLayoutPresetId;
  productPreset: ProductPageLayoutPresetId;

  gridDensity: GridDensity;
  bannerStyle: BannerStylePreset;
  sectionDivider: SectionDividerStyle;

  updatedAt: number;
};

const DEFAULT_STATE: LayoutBuilderState = {
  enabled: false,
  mode: "default",
  homePreset: "default",
  productPreset: "default",
  gridDensity: "normal",
  bannerStyle: "minimal",
  sectionDivider: "none",
  updatedAt: 0,
};

const layoutBuilderSlice = createSlice({
  name: "layoutBuilder",
  initialState: DEFAULT_STATE,
  reducers: {
    hydrateLayoutBuilder(state, action: PayloadAction<Partial<LayoutBuilderState>>) {
      const next = action.payload;
      if (typeof next.enabled === "boolean") state.enabled = next.enabled;
      if (next.mode) state.mode = next.mode;
      if (next.homePreset) state.homePreset = next.homePreset;
      if (next.productPreset) state.productPreset = next.productPreset;
      if (next.gridDensity) state.gridDensity = next.gridDensity;
      if (next.bannerStyle) state.bannerStyle = next.bannerStyle;
      if (next.sectionDivider) state.sectionDivider = next.sectionDivider;
      if (typeof next.updatedAt === "number") state.updatedAt = next.updatedAt;
    },

    setLayoutBuilderEnabled(state, action: PayloadAction<boolean>) {
      state.enabled = action.payload;
      state.updatedAt = Date.now();
      if (!action.payload) state.mode = "default";
    },

    setLayoutMode(state, action: PayloadAction<LayoutBuilderMode>) {
      state.mode = action.payload;
      state.updatedAt = Date.now();
    },

    setHomePreset(state, action: PayloadAction<HomeLayoutPresetId>) {
      state.homePreset = action.payload;
      state.updatedAt = Date.now();
      if (state.mode === "default") state.mode = "preview";
    },

    setProductPreset(state, action: PayloadAction<ProductPageLayoutPresetId>) {
      state.productPreset = action.payload;
      state.updatedAt = Date.now();
      if (state.mode === "default") state.mode = "preview";
    },

    setGridDensity(state, action: PayloadAction<GridDensity>) {
      state.gridDensity = action.payload;
      state.updatedAt = Date.now();
      if (state.mode === "default") state.mode = "preview";
    },

    setBannerStyle(state, action: PayloadAction<BannerStylePreset>) {
      state.bannerStyle = action.payload;
      state.updatedAt = Date.now();
      if (state.mode === "default") state.mode = "preview";
    },

    setSectionDivider(state, action: PayloadAction<SectionDividerStyle>) {
      state.sectionDivider = action.payload;
      state.updatedAt = Date.now();
      if (state.mode === "default") state.mode = "preview";
    },

    resetLayoutToDefault() {
      return DEFAULT_STATE;
    },

    publishLayout(state) {
      state.mode = "published";
      state.updatedAt = Date.now();
    },
  },
});

export const {
  hydrateLayoutBuilder,
  setLayoutBuilderEnabled,
  setLayoutMode,
  setHomePreset,
  setProductPreset,
  setGridDensity,
  setBannerStyle,
  setSectionDivider,
  resetLayoutToDefault,
  publishLayout,
} = layoutBuilderSlice.actions;

export default layoutBuilderSlice.reducer;
