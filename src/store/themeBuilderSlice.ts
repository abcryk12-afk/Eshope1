import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { DEFAULT_DESIGN_TOKENS, normalizeDesignTokens, type DesignTokens } from "@/lib/design-system/tokens";
import { THEME_PRESET_MAP, type BuilderThemeId } from "@/lib/themes/presets";

export type ThemeBuilderMode = "default" | "preview" | "published";

export type ThemeVersion = {
  id: string;
  name: string;
  createdAt: number;
  activeThemeId: string;
  tokens: DesignTokens;
};

type HistorySnapshot = {
  activeThemeId: string;
  customTokens: DesignTokens;
};

export type ThemeBuilderState = {
  mode: ThemeBuilderMode;
  activeThemeId: string;
  customTokens: DesignTokens;
  history: HistorySnapshot[];
  future: HistorySnapshot[];
  isDirty: boolean;
  versions: ThemeVersion[];
  publishedVersionId: string | null;
};

const DEFAULT_STATE: ThemeBuilderState = {
  mode: "default",
  activeThemeId: "modern-minimal",
  customTokens: DEFAULT_DESIGN_TOKENS,
  history: [],
  future: [],
  isDirty: false,
  versions: [],
  publishedVersionId: null,
};

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function pickString(v: unknown, fallback: string) {
  return typeof v === "string" ? v : fallback;
}

function pickNumber(v: unknown, fallback: number) {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function normalizeVersion(v: unknown, fallbackActiveThemeId: string, fallbackTokens: DesignTokens): ThemeVersion {
  const r = isRecord(v) ? v : {};
  return {
    id: pickString(r.id, createId("ver")),
    name: pickString(r.name, "Version"),
    createdAt: pickNumber(r.createdAt, Date.now()),
    activeThemeId: pickString(r.activeThemeId, fallbackActiveThemeId),
    tokens: normalizeDesignTokens(r.tokens ?? fallbackTokens),
  };
}

function snapshotOf(state: ThemeBuilderState): HistorySnapshot {
  return {
    activeThemeId: state.activeThemeId,
    customTokens: state.customTokens,
  };
}

function applySnapshot(state: ThemeBuilderState, snap: HistorySnapshot) {
  state.activeThemeId = snap.activeThemeId;
  state.customTokens = snap.customTokens;
}

type UpdateTokenPayload = {
  path:
    | ["colors", keyof DesignTokens["colors"]]
    | ["typography", keyof DesignTokens["typography"]]
    | ["radius", keyof DesignTokens["radius"]]
    | ["spacing", keyof DesignTokens["spacing"]]
    | ["shadows", keyof DesignTokens["shadows"]]
    | ["motion", keyof DesignTokens["motion"]]
    | ["layout", keyof DesignTokens["layout"]]
    | ["components", keyof DesignTokens["components"]]
    | ["animations", keyof DesignTokens["animations"]]
    | ["depth", keyof DesignTokens["depth"]]
    | ["marketplace", keyof DesignTokens["marketplace"]];
  value: string | number;
};

type ImportPayload = {
  activeThemeId?: string;
  tokens?: DesignTokens;
};

type CreateVersionPayload = {
  name?: string;
};

type RestoreVersionPayload = {
  id: string;
};

type RenameVersionPayload = {
  id: string;
  name: string;
};

type DuplicateThemePayload = {
  name?: string;
};

function setTokenValue(state: ThemeBuilderState, payload: UpdateTokenPayload) {
  const [group, key] = payload.path;

  if (group === "colors") {
    const k = key as keyof DesignTokens["colors"];
    state.customTokens.colors[k] = String(payload.value);
    return;
  }
  if (group === "typography") {
    const k = key as keyof DesignTokens["typography"];
    if (k === "fontSizeBasePx") state.customTokens.typography.fontSizeBasePx = Number(payload.value);
    else if (k === "fontScale") state.customTokens.typography.fontScale = Number(payload.value);
    else state.customTokens.typography.fontFamilyBase = String(payload.value);
    return;
  }
  if (group === "radius") {
    const k = key as keyof DesignTokens["radius"];
    state.customTokens.radius[k] = Number(payload.value);
    return;
  }
  if (group === "spacing") {
    const k = key as keyof DesignTokens["spacing"];
    state.customTokens.spacing[k] = Number(payload.value);
    return;
  }
  if (group === "shadows") {
    const k = key as keyof DesignTokens["shadows"];
    state.customTokens.shadows[k] = String(payload.value);
    return;
  }
  if (group === "motion") {
    const k = key as keyof DesignTokens["motion"];
    if (k === "easeStandard") state.customTokens.motion.easeStandard = String(payload.value);
    else state.customTokens.motion[k] = Number(payload.value) as DesignTokens["motion"][typeof k];
    return;
  }
  if (group === "layout") {
    const k = key as keyof DesignTokens["layout"];
    if (k === "footerStyle") state.customTokens.layout.footerStyle = String(payload.value) as DesignTokens["layout"]["footerStyle"];
    else state.customTokens.layout[k] = Number(payload.value) as DesignTokens["layout"][typeof k];
    return;
  }
  if (group === "components") {
    const k = key as keyof DesignTokens["components"];
    if (k === "cardStyle") state.customTokens.components.cardStyle = String(payload.value) as DesignTokens["components"]["cardStyle"];
    else if (k === "buttonStyle") state.customTokens.components.buttonStyle = String(payload.value) as DesignTokens["components"]["buttonStyle"];
    else if (k === "headerStyle") state.customTokens.components.headerStyle = String(payload.value) as DesignTokens["components"]["headerStyle"];
    else state.customTokens.components.footerStyle = String(payload.value) as DesignTokens["components"]["footerStyle"];
    return;
  }
  if (group === "animations") {
    const k = key as keyof DesignTokens["animations"];
    if (k === "intensity") state.customTokens.animations.intensity = Number(payload.value);
    else state.customTokens.animations[k] = Boolean(payload.value) as DesignTokens["animations"][typeof k];
    return;
  }
  if (group === "depth") {
    const k = key as keyof DesignTokens["depth"];
    if (k === "blurIntensityPx") state.customTokens.depth.blurIntensityPx = Number(payload.value);
    else if (k === "perspectivePx") state.customTokens.depth.perspectivePx = Number(payload.value);
    else if (k === "glassMode") state.customTokens.depth.glassMode = Boolean(payload.value);
    else state.customTokens.depth.softShadows = Boolean(payload.value);
    return;
  }

  const k = key as keyof DesignTokens["marketplace"];
  state.customTokens.marketplace[k] = Boolean(payload.value) as DesignTokens["marketplace"][typeof k];
}

const themeBuilderSlice = createSlice({
  name: "themeBuilder",
  initialState: DEFAULT_STATE,
  reducers: {
    hydrateThemeBuilder(state, action: PayloadAction<Partial<ThemeBuilderState>>) {
      const next = action.payload;
      if (next.mode) state.mode = next.mode;
      if (typeof next.activeThemeId === "string") state.activeThemeId = next.activeThemeId;
      if (next.customTokens) state.customTokens = normalizeDesignTokens(next.customTokens);
      if (Array.isArray(next.history)) state.history = next.history;
      if (Array.isArray(next.future)) state.future = next.future;
      if (typeof next.isDirty === "boolean") state.isDirty = next.isDirty;
      if (Array.isArray(next.versions)) state.versions = next.versions.map((v) => normalizeVersion(v, state.activeThemeId, state.customTokens));
      if (typeof next.publishedVersionId === "string" || next.publishedVersionId === null) state.publishedVersionId = next.publishedVersionId;
    },

    setMode(state, action: PayloadAction<ThemeBuilderMode>) {
      state.mode = action.payload;
    },

    applyPreset(state, action: PayloadAction<BuilderThemeId>) {
      const preset = THEME_PRESET_MAP[action.payload];
      if (!preset) return;

      state.history.push(snapshotOf(state));
      state.future = [];

      state.activeThemeId = preset.id;
      state.customTokens = normalizeDesignTokens(preset.tokens);
      state.isDirty = false;

      if (state.mode === "default") state.mode = "preview";
    },

    renameVersion(state, action: PayloadAction<RenameVersionPayload>) {
      const v = state.versions.find((x) => x.id === action.payload.id);
      if (!v) return;
      v.name = action.payload.name;
    },

    duplicateTheme(state, action: PayloadAction<DuplicateThemePayload | undefined>) {
      // Creates a new version snapshot and switches to it (enterprise-safe cloning).
      const id = createId("clone");
      const name = action.payload?.name?.trim() ? action.payload!.name!.trim() : `Clone ${new Date().toLocaleString()}`;

      state.versions.unshift({
        id,
        name,
        createdAt: Date.now(),
        activeThemeId: state.activeThemeId,
        tokens: state.customTokens,
      });

      state.isDirty = true;
      if (state.mode === "default") state.mode = "preview";
    },

    updateToken(state, action: PayloadAction<UpdateTokenPayload>) {
      state.history.push(snapshotOf(state));
      state.future = [];

      setTokenValue(state, action.payload);
      state.isDirty = true;

      if (state.mode === "default") state.mode = "preview";
    },

    undo(state) {
      const prev = state.history.pop();
      if (!prev) return;
      state.future.unshift(snapshotOf(state));
      applySnapshot(state, prev);
      state.isDirty = true;
      if (state.mode === "default") state.mode = "preview";
    },

    redo(state) {
      const next = state.future.shift();
      if (!next) return;
      state.history.push(snapshotOf(state));
      applySnapshot(state, next);
      state.isDirty = true;
      if (state.mode === "default") state.mode = "preview";
    },

    importTheme(state, action: PayloadAction<ImportPayload>) {
      state.history.push(snapshotOf(state));
      state.future = [];

      if (typeof action.payload.activeThemeId === "string") state.activeThemeId = action.payload.activeThemeId;
      if (action.payload.tokens) state.customTokens = normalizeDesignTokens(action.payload.tokens);

      state.isDirty = true;
      if (state.mode === "default") state.mode = "preview";
    },

    resetToDefault(state) {
      state.mode = "default";
      state.activeThemeId = DEFAULT_STATE.activeThemeId;
      state.customTokens = DEFAULT_STATE.customTokens;
      state.history = [];
      state.future = [];
      state.isDirty = false;
      state.versions = [];
      state.publishedVersionId = null;
    },

    publishTheme(state) {
      const id = createId("ver");
      state.versions.unshift({
        id,
        name: `Published ${new Date().toLocaleString()}`,
        createdAt: Date.now(),
        activeThemeId: state.activeThemeId,
        tokens: state.customTokens,
      });
      state.publishedVersionId = id;
      state.mode = "published";
      state.isDirty = false;
    },

    setMarketplaceMode(state, action: PayloadAction<boolean>) {
      state.history.push(snapshotOf(state));
      state.future = [];

      const enabled = action.payload;
      state.customTokens.marketplace.enabled = enabled;

      // When enabling marketplace mode, apply safe defaults that match marketplace expectations.
      // This is token-only; it won't affect production unless theme builder override is active.
      if (enabled) {
        state.customTokens.marketplace.compactGrid = true;
        state.customTokens.marketplace.discountBadges = true;
        state.customTokens.marketplace.flashSaleRibbons = true;
        state.customTokens.marketplace.stickyHeader = true;
        state.customTokens.marketplace.aggressiveCtas = true;

        state.customTokens.layout.gridColumns = Math.max(4, state.customTokens.layout.gridColumns);
        state.customTokens.layout.cardGapPx = Math.min(state.customTokens.layout.cardGapPx, 14);
        state.customTokens.components.headerStyle = "marketplace";
      } else {
        state.customTokens.marketplace.compactGrid = false;
        state.customTokens.marketplace.discountBadges = false;
        state.customTokens.marketplace.flashSaleRibbons = false;
        state.customTokens.marketplace.stickyHeader = false;
        state.customTokens.marketplace.aggressiveCtas = false;
      }

      state.isDirty = true;
      if (state.mode === "default") state.mode = "preview";
    },

    createVersion(state, action: PayloadAction<CreateVersionPayload | undefined>) {
      const id = createId("ver");
      const name = action.payload?.name?.trim() ? action.payload!.name!.trim() : `Draft ${new Date().toLocaleString()}`;
      state.versions.unshift({
        id,
        name,
        createdAt: Date.now(),
        activeThemeId: state.activeThemeId,
        tokens: state.customTokens,
      });
    },

    restoreVersion(state, action: PayloadAction<RestoreVersionPayload>) {
      const v = state.versions.find((x) => x.id === action.payload.id);
      if (!v) return;

      state.history.push(snapshotOf(state));
      state.future = [];

      state.activeThemeId = v.activeThemeId;
      state.customTokens = normalizeDesignTokens(v.tokens);
      state.isDirty = true;
      if (state.mode === "default") state.mode = "preview";
    },

    rollbackToPublished(state) {
      if (!state.publishedVersionId) return;
      const v = state.versions.find((x) => x.id === state.publishedVersionId);
      if (!v) return;

      state.history.push(snapshotOf(state));
      state.future = [];

      state.activeThemeId = v.activeThemeId;
      state.customTokens = normalizeDesignTokens(v.tokens);
      state.isDirty = false;
      state.mode = "published";
    },
  },
});

export const {
  hydrateThemeBuilder,
  setMode,
  applyPreset,
  updateToken,
  undo,
  redo,
  importTheme,
  resetToDefault,
  publishTheme,
  setMarketplaceMode,
  createVersion,
  restoreVersion,
  rollbackToPublished,
  renameVersion,
  duplicateTheme,
} = themeBuilderSlice.actions;

export default themeBuilderSlice.reducer;
