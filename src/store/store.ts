import { configureStore } from "@reduxjs/toolkit";

import authReducer from "@/store/slices/authSlice";
import cartReducer from "@/store/slices/cartSlice";
import currencyReducer from "@/store/slices/currencySlice";
import languageReducer from "@/store/slices/languageSlice";
import themeReducer from "@/store/slices/themeSlice";
import themeBuilderReducer from "@/store/themeBuilderSlice";
import layoutBuilderReducer from "@/store/layoutBuilderSlice";
import productCardEngineReducer from "@/store/productCardEngineSlice";
import advancedSettingsReducer from "@/store/advancedSettingsSlice";
import wishlistReducer from "@/store/slices/wishlistSlice";
import footerReducer from "@/store/footerSlice";
import headerReducer from "@/store/headerSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    currency: currencyReducer,
    language: languageReducer,
    theme: themeReducer,
    themeBuilder: themeBuilderReducer,
    layoutBuilder: layoutBuilderReducer,
    productCardEngine: productCardEngineReducer,
    advancedSettings: advancedSettingsReducer,
    wishlist: wishlistReducer,
    footer: footerReducer,
    header: headerReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
