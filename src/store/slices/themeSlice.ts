import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { DEFAULT_THEME, type ThemeColors, type ThemePresetId } from "@/lib/theme";

export type ThemeState = {
  preset: ThemePresetId;
  colors: ThemeColors;
  updatedAt: number;
};

const DEFAULT_STATE: ThemeState = {
  preset: "default",
  colors: DEFAULT_THEME,
  updatedAt: 0,
};

type HydratePayload = {
  preset?: ThemePresetId;
  colors?: ThemeColors;
  updatedAt?: number;
};

const themeSlice = createSlice({
  name: "theme",
  initialState: DEFAULT_STATE,
  reducers: {
    hydrateTheme(state, action: PayloadAction<HydratePayload>) {
      const { preset, colors, updatedAt } = action.payload;
      if (preset) state.preset = preset;
      if (colors) state.colors = colors;
      if (typeof updatedAt === "number") state.updatedAt = updatedAt;
    },
  },
});

export const { hydrateTheme } = themeSlice.actions;

export default themeSlice.reducer;
