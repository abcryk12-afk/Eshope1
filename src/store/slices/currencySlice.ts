import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type CurrencyCode = "PKR" | "USD";

export type CurrencyState = {
  selected: CurrencyCode;
  pkrPerUsd: number | null;
  updatedAt: string | null;
  status: "idle" | "loading" | "error";
  error: string | null;
};

type ExchangeRateResponse = {
  pkrPerUsd: number;
  fetchedAt: string;
};

export const refreshExchangeRate = createAsyncThunk<
  ExchangeRateResponse,
  void,
  { rejectValue: string }
>("currency/refreshExchangeRate", async (_arg, api) => {
  const res = await fetch("/api/exchange-rate", { cache: "no-store" });
  const json = (await res.json().catch(() => null)) as unknown;

  if (!res.ok || !json || typeof json !== "object") {
    return api.rejectWithValue("Failed to load exchange rate");
  }

  const pkrPerUsd = (json as { pkrPerUsd?: unknown }).pkrPerUsd;
  const fetchedAt = (json as { fetchedAt?: unknown }).fetchedAt;

  if (typeof pkrPerUsd !== "number" || !Number.isFinite(pkrPerUsd) || pkrPerUsd <= 0) {
    return api.rejectWithValue("Invalid exchange rate");
  }

  if (typeof fetchedAt !== "string" || !fetchedAt.trim()) {
    return api.rejectWithValue("Invalid exchange rate");
  }

  return { pkrPerUsd, fetchedAt };
});

const initialState: CurrencyState = {
  selected: "PKR",
  pkrPerUsd: null,
  updatedAt: null,
  status: "idle",
  error: null,
};

const currencySlice = createSlice({
  name: "currency",
  initialState,
  reducers: {
    hydrateCurrency(state, action: PayloadAction<Partial<CurrencyState>>) {
      const next = action.payload;

      if (next.selected === "PKR" || next.selected === "USD") {
        state.selected = next.selected;
      }

      if (
        typeof next.pkrPerUsd === "number" &&
        Number.isFinite(next.pkrPerUsd) &&
        next.pkrPerUsd > 0
      ) {
        state.pkrPerUsd = next.pkrPerUsd;
      }

      if (typeof next.updatedAt === "string" && next.updatedAt.trim()) {
        state.updatedAt = next.updatedAt;
      }
    },
    setCurrency(state, action: PayloadAction<CurrencyCode>) {
      state.selected = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(refreshExchangeRate.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(refreshExchangeRate.fulfilled, (state, action) => {
        state.status = "idle";
        state.pkrPerUsd = action.payload.pkrPerUsd;
        state.updatedAt = action.payload.fetchedAt;
        state.error = null;
      })
      .addCase(refreshExchangeRate.rejected, (state, action) => {
        state.status = "error";
        state.error = action.payload ?? "Failed to load exchange rate";
      });
  },
});

export const { hydrateCurrency, setCurrency } = currencySlice.actions;

export default currencySlice.reducer;
