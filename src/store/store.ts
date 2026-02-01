import { configureStore } from "@reduxjs/toolkit";

import authReducer from "@/store/slices/authSlice";
import cartReducer from "@/store/slices/cartSlice";
import currencyReducer from "@/store/slices/currencySlice";
import languageReducer from "@/store/slices/languageSlice";
import themeReducer from "@/store/slices/themeSlice";
import wishlistReducer from "@/store/slices/wishlistSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    currency: currencyReducer,
    language: languageReducer,
    theme: themeReducer,
    wishlist: wishlistReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
