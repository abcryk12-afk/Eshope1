import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type AdvancedSettingsState = {
  reduceMotion: boolean;
  highPerformance: boolean;
  disableGlass: boolean;
  disable3d: boolean;
  updatedAt: number;
};

const DEFAULT_STATE: AdvancedSettingsState = {
  reduceMotion: false,
  highPerformance: false,
  disableGlass: false,
  disable3d: false,
  updatedAt: 0,
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function pickBoolean(v: unknown, fallback: boolean) {
  return typeof v === "boolean" ? v : fallback;
}

function pickNumber(v: unknown, fallback: number) {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function normalize(input: unknown, fallback: AdvancedSettingsState): AdvancedSettingsState {
  const r = isRecord(input) ? input : {};
  return {
    reduceMotion: pickBoolean(r.reduceMotion, fallback.reduceMotion),
    highPerformance: pickBoolean(r.highPerformance, fallback.highPerformance),
    disableGlass: pickBoolean(r.disableGlass, fallback.disableGlass),
    disable3d: pickBoolean(r.disable3d, fallback.disable3d),
    updatedAt: pickNumber(r.updatedAt, fallback.updatedAt),
  };
}

const slice = createSlice({
  name: "advancedSettings",
  initialState: DEFAULT_STATE,
  reducers: {
    setReduceMotion(state, action: PayloadAction<boolean>) {
      state.reduceMotion = action.payload;
      state.updatedAt = Date.now();
    },
    setHighPerformance(state, action: PayloadAction<boolean>) {
      state.highPerformance = action.payload;
      state.updatedAt = Date.now();
    },
    setDisableGlass(state, action: PayloadAction<boolean>) {
      state.disableGlass = action.payload;
      state.updatedAt = Date.now();
    },
    setDisable3d(state, action: PayloadAction<boolean>) {
      state.disable3d = action.payload;
      state.updatedAt = Date.now();
    },
    resetAdvancedSettings(state) {
      state.reduceMotion = DEFAULT_STATE.reduceMotion;
      state.highPerformance = DEFAULT_STATE.highPerformance;
      state.disableGlass = DEFAULT_STATE.disableGlass;
      state.disable3d = DEFAULT_STATE.disable3d;
      state.updatedAt = Date.now();
    },
    hydrateAdvancedSettings(state, action: PayloadAction<Partial<AdvancedSettingsState>>) {
      const merged = normalize({ ...state, ...action.payload }, state);
      state.reduceMotion = merged.reduceMotion;
      state.highPerformance = merged.highPerformance;
      state.disableGlass = merged.disableGlass;
      state.disable3d = merged.disable3d;
      state.updatedAt = merged.updatedAt;
    },
  },
});

export const {
  hydrateAdvancedSettings,
  resetAdvancedSettings,
  setDisable3d,
  setDisableGlass,
  setHighPerformance,
  setReduceMotion,
} = slice.actions;

export default slice.reducer;
