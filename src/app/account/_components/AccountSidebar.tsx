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
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">My Account</p>
        <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">{user.name || "Customer"}</p>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{user.email}</p>
        <p className={cn("mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold", user.isBlocked ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-200" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200")}>
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
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
              )}
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50">
                {it.icon}
              </span>
              <span className="min-w-0 truncate">{it.label}</span>
            </Link>
          );
        })}
      </nav>

      <Link
        href="/"
        className="block rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
      >
        Back to shop
      </Link>
    </div>
  );
}
