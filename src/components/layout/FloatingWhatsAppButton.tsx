"use client";

import { MessageCircle } from "lucide-react";
import { useMemo } from "react";
import { usePathname } from "next/navigation";

import { buildWhatsAppProductUrl, buildWhatsAppStoreUrl, DEFAULT_WHATSAPP_PRODUCT_TEMPLATE } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { useStorefrontSettings } from "@/hooks/useStorefrontSettings";
import { useWhatsAppContext } from "@/components/layout/WhatsAppContext";

export default function FloatingWhatsAppButton() {
  const pathname = usePathname();
  const { settings } = useStorefrontSettings();
  const { product } = useWhatsAppContext();

  const hidden =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/cart") ||
    pathname.startsWith("/account");

  const salesPhone = settings?.whatsApp?.salesPhone?.trim() || "";
  const storeName = settings?.branding?.storeName?.trim() || "Shop";

  const productTemplateRaw = settings?.whatsApp?.productTemplate?.trim() || "";
  const productTemplate = productTemplateRaw ? productTemplateRaw : DEFAULT_WHATSAPP_PRODUCT_TEMPLATE;

  const url = useMemo(() => {
    if (!salesPhone) return null;

    if (product?.productName?.trim()) {
      return buildWhatsAppProductUrl({
        salesPhone,
        storeName,
        productName: product.productName,
        productUrl: product.productUrl,
        template: productTemplate,
        defaultCountryCallingCode: "92",
      });
    }

    return buildWhatsAppStoreUrl({
      salesPhone,
      storeName,
      defaultCountryCallingCode: "92",
    });
  }, [product, productTemplate, salesPhone, storeName]);

  if (hidden || !url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        "fixed right-4 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full",
        "bg-primary text-primary-foreground shadow-lg",
        "hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "bottom-24 md:bottom-6"
      )}
      aria-label="WhatsApp"
      title="WhatsApp"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
