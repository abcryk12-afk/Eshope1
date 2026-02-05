"use client";

import { Provider as ReduxProvider } from "react-redux";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

import { store } from "@/store/store";
import QuickCheckoutBar from "@/components/layout/QuickCheckoutBar";
import FloatingWhatsAppButton from "@/components/layout/FloatingWhatsAppButton";
import { WhatsAppContextProvider } from "@/components/layout/WhatsAppContext";
import { useAuthSync } from "@/hooks/useAuthSync";
import { useCurrencySync } from "@/hooks/useCurrencySync";
import { useLanguageSync } from "@/hooks/useLanguageSync";
import { useThemeSync } from "@/hooks/useThemeSync";
import { useLocalStorageSync } from "@/hooks/useLocalStorageSync";
import { useDbSync } from "@/hooks/useDbSync";

type ProvidersProps = {
  children: React.ReactNode;
};

function StoreEffects() {
  useAuthSync();
  useCurrencySync();
  useLanguageSync();
  useThemeSync();
  useLocalStorageSync();
  useDbSync();

  return null;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ReduxProvider store={store}>
        <StoreEffects />
        <WhatsAppContextProvider>
          {children}
          <FloatingWhatsAppButton />
          <QuickCheckoutBar />
          <Toaster richColors position="top-right" closeButton />
        </WhatsAppContextProvider>
      </ReduxProvider>
    </SessionProvider>
  );
}
