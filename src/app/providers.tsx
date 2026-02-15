"use client";

import { Provider as ReduxProvider } from "react-redux";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

import { store } from "@/store/store";
import QuickCheckoutBar from "@/components/layout/QuickCheckoutBar";
import FloatingWhatsAppButton from "@/components/layout/FloatingWhatsAppButton";
import { WhatsAppContextProvider } from "@/components/layout/WhatsAppContext";
import AdvancedSettingsProvider from "@/components/providers/AdvancedSettingsProvider";
import TrackingProvider from "@/components/providers/TrackingProvider";
import ThemeProvider from "@/components/providers/ThemeProvider";
import { useAuthSync } from "@/hooks/useAuthSync";
import { useCurrencySync } from "@/hooks/useCurrencySync";
import { useAdvancedSettingsSync } from "@/hooks/useAdvancedSettingsSync";
import { useLanguageSync } from "@/hooks/useLanguageSync";
import { useThemeSync } from "@/hooks/useThemeSync";
import { useThemeBuilderSync } from "@/hooks/useThemeBuilderSync";
import { useProductCardEngineSync } from "@/hooks/useProductCardEngineSync";
import { useLocalStorageSync } from "@/hooks/useLocalStorageSync";
import { useDbSync } from "@/hooks/useDbSync";
import { useFooterSync } from "@/hooks/useFooterSync";
import { useHeaderSync } from "@/hooks/useHeaderSync";

type ProvidersProps = {
  children: React.ReactNode;
};

function StoreEffects() {
  useAuthSync();
  useCurrencySync();
  useLanguageSync();
  useThemeSync();
  useThemeBuilderSync();
  useAdvancedSettingsSync();
  useProductCardEngineSync();
  useFooterSync();
  useHeaderSync();
  useLocalStorageSync();
  useDbSync();

  return null;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ReduxProvider store={store}>
        <StoreEffects />
        <AdvancedSettingsProvider>
          <TrackingProvider>
            <ThemeProvider>
              <WhatsAppContextProvider>
                {children}
                <FloatingWhatsAppButton />
                <QuickCheckoutBar />
                <Toaster richColors position="top-right" closeButton />
              </WhatsAppContextProvider>
            </ThemeProvider>
          </TrackingProvider>
        </AdvancedSettingsProvider>
      </ReduxProvider>
    </SessionProvider>
  );
}
