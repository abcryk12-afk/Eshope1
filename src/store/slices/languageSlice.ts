import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export const SUPPORTED_LANGUAGES = ["en", "ur"] as const;
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

export type LanguageState = {
  selected: LanguageCode;
};

const initialState: LanguageState = {
  selected: "en",
};

function isLanguageCode(v: unknown): v is LanguageCode {
  return typeof v === "string" && (SUPPORTED_LANGUAGES as readonly string[]).includes(v);
}

const languageSlice = createSlice({
  name: "language",
  initialState,
  reducers: {
    hydrateLanguage(state, action: PayloadAction<Partial<LanguageState>>) {
      const next = action.payload;
      if (isLanguageCode(next.selected)) {
        state.selected = next.selected;
      }
    },
    setLanguage(state, action: PayloadAction<LanguageCode>) {
      state.selected = action.payload;
    },
  },
});

export const { hydrateLanguage, setLanguage } = languageSlice.actions;

export default languageSlice.reducer;
