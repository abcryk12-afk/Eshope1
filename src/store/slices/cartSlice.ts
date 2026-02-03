import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type CartItem = {
  productId: string;
  variantId: string;
  quantity: number;
  title?: string;
  image?: string;
  unitPrice?: number;
};

type CartState = {
  items: CartItem[];
  lastAdded: CartItem | null;
  lastAddedAt: number;
};

const initialState: CartState = {
  items: [],
  lastAdded: null,
  lastAddedAt: 0,
};

function upsertItem(items: CartItem[], next: CartItem) {
  const idx = items.findIndex(
    (i) => i.productId === next.productId && i.variantId === next.variantId
  );

  if (idx === -1) return [...items, next];

  const mergedQty = items[idx]!.quantity + next.quantity;

  const merged: CartItem = {
    ...items[idx],
    ...next,
    quantity: mergedQty,
  };

  return items.map((i, iIdx) => (iIdx === idx ? merged : i));
}

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    hydrateCart(state, action: PayloadAction<CartItem[]>) {
      state.items = action.payload;
    },
    addToCart(state, action: PayloadAction<CartItem>) {
      state.items = upsertItem(state.items, action.payload);
      state.lastAdded = action.payload;
      state.lastAddedAt = Date.now();
    },
    setCartItemQuantity(
      state,
      action: PayloadAction<{ productId: string; variantId: string; quantity: number }>
    ) {
      const { productId, variantId, quantity } = action.payload;

      state.items = state.items
        .map((i) =>
          i.productId === productId && i.variantId === variantId
            ? { ...i, quantity }
            : i
        )
        .filter((i) => i.quantity > 0);
    },
    removeFromCart(state, action: PayloadAction<{ productId: string; variantId: string }>) {
      const { productId, variantId } = action.payload;

      state.items = state.items.filter(
        (i) => !(i.productId === productId && i.variantId === variantId)
      );
    },
    clearCart(state) {
      state.items = [];
    },
  },
});

export const {
  hydrateCart,
  addToCart,
  setCartItemQuantity,
  removeFromCart,
  clearCart,
} = cartSlice.actions;

export default cartSlice.reducer;
