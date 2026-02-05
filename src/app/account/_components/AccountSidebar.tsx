"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Settings,
  ShoppingBag,
  Undo2,
} from "lucide-react";

import { cn } from "@/lib/utils";

type SidebarUser = {
  name: string;
  email: string;
  isBlocked: boolean;
};

type Props = {
  user: SidebarUser;
};

type Item = {
  href: string;
  label: string;
  icon: ReactNode;
  isActive: (pathname: string) => boolean;
};

export default function AccountSidebar({ user }: Props) {
  const pathname = usePathname();

  const items: Item[] = [
    {
      href: "/account/overview",
      label: "Overview",
      icon: <LayoutDashboard className="h-4 w-4" />,
      isActive: (p) => p === "/account" || p.startsWith("/account/overview"),
    },
    {
      href: "/account/orders",
      label: "Orders",
      icon: <ShoppingBag className="h-4 w-4" />,
      isActive: (p) => p.startsWith("/account/orders"),
    },
    {
      href: "/account/payment",
      label: "Payment",
      icon: <CreditCard className="h-4 w-4" />,
      isActive: (p) => p.startsWith("/account/payment"),
    },
    {
      href: "/account/returns",
      label: "Returns / Refunds",
      icon: <Undo2 className="h-4 w-4" />,
      isActive: (p) => p.startsWith("/account/returns"),
    },
    {
      href: "/account/feedback",
      label: "Feedback",
      icon: <BarChart3 className="h-4 w-4" />,
      isActive: (p) => p.startsWith("/account/feedback"),
    },
    {
      href: "/account/settings",
      label: "Settings",
      icon: <Settings className="h-4 w-4" />,
      isActive: (p) => p.startsWith("/account/settings"),
    },
    {
      href: "/account/shipping-address",
      label: "Shipping Address",
      icon: <MapPin className="h-4 w-4" />,
      isActive: (p) => p.startsWith("/account/shipping-address"),
    },
    {
      href: "/account/billing-address",
      label: "Billing Address",
      icon: <MapPin className="h-4 w-4" />,
      isActive: (p) => p.startsWith("/account/billing-address"),
    },
    {
      href: "/account/messages",
      label: "Message Center",
      icon: <MessageSquare className="h-4 w-4" />,
      isActive: (p) => p.startsWith("/account/messages"),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-background p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">My Account</p>
        <p className="mt-2 text-sm font-semibold text-foreground">{user.name || "Customer"}</p>
        <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
        <p
          className={cn(
            "mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold",
            user.isBlocked ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
          )}
        >
          {user.isBlocked ? "Blocked" : "Active"}
        </p>
      </div>

      <nav className="space-y-1">
        {items.map((it) => {
          const active = it.isActive(pathname);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground-secondary hover:bg-muted"
              )}
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-background text-foreground">
                {it.icon}
              </span>
              <span className="min-w-0 truncate">{it.label}</span>
            </Link>
          );
        })}
      </nav>

      <Link
        href="/"
        className="block rounded-2xl border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
      >
        Back to shop
      </Link>
    </div>
  );
}
