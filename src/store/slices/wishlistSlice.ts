import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type WishlistState = {
  productIds: string[];
};

const initialState: WishlistState = {
  productIds: [],
};

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState,
  reducers: {
    hydrateWishlist(state, action: PayloadAction<string[]>) {
      state.productIds = action.payload;
    },
    toggleWishlist(state, action: PayloadAction<string>) {
      const productId = action.payload;

      if (state.productIds.includes(productId)) {
        state.productIds = state.productIds.filter((id) => id !== productId);
        return;
      }

      state.productIds = [...state.productIds, productId];
    },
    clearWishlist(state) {
      state.productIds = [];
    },
  },
});

export const { hydrateWishlist, toggleWishlist, clearWishlist } = wishlistSlice.actions;

export default wishlistSlice.reducer;
