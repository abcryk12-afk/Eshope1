"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type WhatsAppProductContext = {
  productName: string;
  productUrl: string;
} | null;

type WhatsAppContextValue = {
  product: WhatsAppProductContext;
  setProduct: (next: WhatsAppProductContext) => void;
  clearProduct: () => void;
};

const WhatsAppContext = createContext<WhatsAppContextValue | null>(null);

export function WhatsAppContextProvider({ children }: { children: React.ReactNode }) {
  const [product, setProductState] = useState<WhatsAppProductContext>(null);

  const setProduct = useCallback((next: WhatsAppProductContext) => {
    setProductState(next);
  }, []);

  const clearProduct = useCallback(() => {
    setProductState(null);
  }, []);

  const value = useMemo(() => ({ product, setProduct, clearProduct }), [product, setProduct, clearProduct]);

  return <WhatsAppContext.Provider value={value}>{children}</WhatsAppContext.Provider>;
}

export function useWhatsAppContext() {
  const ctx = useContext(WhatsAppContext);
  if (!ctx) {
    throw new Error("useWhatsAppContext must be used within WhatsAppContextProvider");
  }
  return ctx;
}
