import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ProductCardEngineMode = "default" | "preview" | "published";

export type ProductCardScopeMode = "allowlist" | "denylist";

export type ProductCardPresetId =
  | "daraz"
  | "aliexpress"
  | "temu"
  | "amazon"
  | "premium-minimal"
  | "glass-modern";

export type ProductCardBlockType =
  | "image"
  | "badges"
  | "wishlist"
  | "title"
  | "rating"
  | "price"
  | "actions"
  | "meta";

export type ProductCardBlock = {
  id: string;
  type: ProductCardBlockType;
  enabled: boolean;
};

export type ProductCardImageAspect = "square" | "portrait" | "auto";
export type ProductCardDensity = "compact" | "balanced" | "spacious";

export type ProductCardSettings = {
  density: ProductCardDensity;
  imageAspect: ProductCardImageAspect;

  showRating: boolean;
  showSoldCount: boolean;
  showWishlistIcon: boolean;
  showDiscountBadge: boolean;

  enableHoverAnimation: boolean;
  enableCardLift: boolean;
  enableImageZoom: boolean;

  radiusPx: number;
  shadowDepth: "none" | "sm" | "md" | "lg";
};

export type ProductCardEngineState = {
  enabled: boolean;
  mode: ProductCardEngineMode;
  scopeMode: ProductCardScopeMode;
  scopePaths: string[];

  activePresetId: ProductCardPresetId;
  blocks: ProductCardBlock[];
  settings: ProductCardSettings;

  updatedAt: number;
};

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

const DEFAULT_BLOCKS: ProductCardBlock[] = [
  { id: uid("blk"), type: "image", enabled: true },
  { id: uid("blk"), type: "badges", enabled: true },
  { id: uid("blk"), type: "wishlist", enabled: true },
  { id: uid("blk"), type: "title", enabled: true },
  { id: uid("blk"), type: "rating", enabled: true },
  { id: uid("blk"), type: "price", enabled: true },
  { id: uid("blk"), type: "actions", enabled: true },
];

const DEFAULT_SETTINGS: ProductCardSettings = {
  density: "balanced",
  imageAspect: "square",

  showRating: true,
  showSoldCount: true,
  showWishlistIcon: true,
  showDiscountBadge: true,

  enableHoverAnimation: true,
  enableCardLift: true,
  enableImageZoom: true,

  radiusPx: 18,
  shadowDepth: "sm",
};

const DEFAULT_STATE: ProductCardEngineState = {
  enabled: false,
  mode: "default",
  scopeMode: "allowlist",
  scopePaths: [],
  activePresetId: "premium-minimal",
  blocks: DEFAULT_BLOCKS,
  settings: DEFAULT_SETTINGS,
  updatedAt: 0,
};

function applyPresetToState(state: ProductCardEngineState, preset: ProductCardPresetId) {
  state.activePresetId = preset;

  if (preset === "daraz") {
    state.settings = {
      ...state.settings,
      density: "compact",
      imageAspect: "square",
      radiusPx: 14,
      shadowDepth: "sm",
      enableCardLift: true,
      enableImageZoom: true,
      showDiscountBadge: true,
      showSoldCount: true,
    };
    return;
  }

  if (preset === "aliexpress") {
    state.settings = {
      ...state.settings,
      density: "compact",
      imageAspect: "square",
      radiusPx: 18,
      shadowDepth: "md",
      enableCardLift: true,
      enableImageZoom: true,
      showDiscountBadge: true,
    };
    return;
  }

  if (preset === "temu") {
    state.settings = {
      ...state.settings,
      density: "compact",
      imageAspect: "square",
      radiusPx: 18,
      shadowDepth: "md",
      enableCardLift: true,
      enableImageZoom: true,
      showDiscountBadge: true,
      showSoldCount: true,
    };
    return;
  }

  if (preset === "amazon") {
    state.settings = {
      ...state.settings,
      density: "balanced",
      imageAspect: "square",
      radiusPx: 12,
      shadowDepth: "none",
      enableCardLift: false,
      enableImageZoom: false,
      showDiscountBadge: true,
    };
    return;
  }

  if (preset === "glass-modern") {
    state.settings = {
      ...state.settings,
      density: "balanced",
      imageAspect: "square",
      radiusPx: 22,
      shadowDepth: "lg",
      enableCardLift: true,
      enableImageZoom: true,
    };
    return;
  }

  state.settings = {
    ...state.settings,
    density: "spacious",
    imageAspect: "square",
    radiusPx: 18,
    shadowDepth: "sm",
    enableCardLift: true,
    enableImageZoom: true,
  };
}

const productCardEngineSlice = createSlice({
  name: "productCardEngine",
  initialState: DEFAULT_STATE,
  reducers: {
    hydrateProductCardEngine(state, action: PayloadAction<Partial<ProductCardEngineState>>) {
      const next = action.payload;
      if (typeof next.enabled === "boolean") state.enabled = next.enabled;
      if (next.mode) state.mode = next.mode;
      if (next.scopeMode === "allowlist" || next.scopeMode === "denylist") state.scopeMode = next.scopeMode;
      if (Array.isArray(next.scopePaths)) state.scopePaths = next.scopePaths.map((x) => String(x));
      if (next.activePresetId) state.activePresetId = next.activePresetId;
      if (Array.isArray(next.blocks)) state.blocks = next.blocks;
      if (next.settings) state.settings = { ...state.settings, ...next.settings };
      if (typeof next.updatedAt === "number") state.updatedAt = next.updatedAt;
    },

    setProductCardEngineEnabled(state, action: PayloadAction<boolean>) {
      state.enabled = action.payload;
      state.updatedAt = Date.now();
      if (!action.payload) state.mode = "default";
    },

    setProductCardEngineMode(state, action: PayloadAction<ProductCardEngineMode>) {
      state.mode = action.payload;
      state.updatedAt = Date.now();
    },

    setProductCardScopeMode(state, action: PayloadAction<ProductCardScopeMode>) {
      state.scopeMode = action.payload;
      state.updatedAt = Date.now();
    },

    setProductCardScopePaths(state, action: PayloadAction<string[]>) {
      state.scopePaths = action.payload.map((x) => String(x)).filter(Boolean);
      state.updatedAt = Date.now();
    },

    applyProductCardPreset(state, action: PayloadAction<ProductCardPresetId>) {
      applyPresetToState(state, action.payload);
      state.updatedAt = Date.now();
      if (state.mode === "default") state.mode = "preview";
    },

    setProductCardBlocks(state, action: PayloadAction<ProductCardBlock[]>) {
      state.blocks = action.payload;
      state.updatedAt = Date.now();
      if (state.mode === "default") state.mode = "preview";
    },

    updateProductCardSettings(state, action: PayloadAction<Partial<ProductCardSettings>>) {
      state.settings = { ...state.settings, ...action.payload };
      state.updatedAt = Date.now();
      if (state.mode === "default") state.mode = "preview";
    },

    resetProductCardEngine() {
      return DEFAULT_STATE;
    },

    publishProductCardEngine(state) {
      state.mode = "published";
      state.updatedAt = Date.now();
    },
  },
});

export const {
  hydrateProductCardEngine,
  setProductCardEngineEnabled,
  setProductCardEngineMode,
  setProductCardScopeMode,
  setProductCardScopePaths,
  applyProductCardPreset,
  setProductCardBlocks,
  updateProductCardSettings,
  resetProductCardEngine,
  publishProductCardEngine,
} = productCardEngineSlice.actions;

export default productCardEngineSlice.reducer;
