"use client";

import Link from "next/link";
import { Menu, Heart, Search, User2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { HeaderBlock, HeaderSettings } from "@/store/headerSlice";

import CurrencySwitcher from "@/components/layout/CurrencySwitcher";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import CartIconButton from "@/components/layout/CartIconButton";

type Props = {
  block: HeaderBlock;
  settings: HeaderSettings;
  onOpenMobileMenu?: () => void;
  onToggleSearch?: () => void;
  onOpenCart?: () => void;
  searchOpen?: boolean;
  children?: React.ReactNode;
};

export default function HeaderBlockRenderer({
  block,
  settings,
  onOpenMobileMenu,
  onToggleSearch,
  onOpenCart,
  searchOpen,
  children,
}: Props) {
  if (!block.enabled) return null;

  const iconSizeStyle: React.CSSProperties = {
    width: settings.iconSizePx,
    height: settings.iconSizePx,
  };

  switch (block.type) {
    case "mobileMenu":
      return (
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
            "hover:bg-muted"
          )}
          aria-label="Open menu"
        >
          <Menu style={iconSizeStyle} />
        </button>
      );

    case "search":
      return (
        <button
          type="button"
          onClick={onToggleSearch}
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
            "hover:bg-muted"
          )}
          aria-label={searchOpen ? "Close search" : "Open search"}
        >
          {searchOpen ? <X style={iconSizeStyle} /> : <Search style={iconSizeStyle} />}
        </button>
      );

    case "cartIcon":
      return <CartIconButton onClick={() => onOpenCart?.()} />;

    case "accountIcon":
      return (
        <Link
          href="/account"
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
            "hover:bg-muted"
          )}
          aria-label="Account"
        >
          <User2 style={iconSizeStyle} />
        </Link>
      );

    case "wishlistIcon":
      return (
        <Link
          href="/wishlist"
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
            "hover:bg-muted"
          )}
          aria-label="Wishlist"
        >
          <Heart style={iconSizeStyle} />
        </Link>
      );

    case "currencySelector":
      return <CurrencySwitcher variant="compact" />;

    case "languageSelector":
      return <LanguageSwitcher variant="compact" />;

    case "spacer":
      return <span className="block" style={{ width: Math.max(4, settings.iconSpacingPx) }} />;

    case "divider":
      return <span className="h-6 w-px bg-border" aria-hidden="true" />;

    case "customHTML":
      return (
        <div
          className="text-sm"
          dangerouslySetInnerHTML={{ __html: String(block.data?.html ?? "") }}
        />
      );

    default:
      return <>{children ?? null}</>;
  }
}
