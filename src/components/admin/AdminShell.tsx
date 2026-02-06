"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { BarChart3, Boxes, CreditCard, Folder, LayoutDashboard, LogOut, Palette, Settings, Star, Store, Tag, Undo2, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { signOutFirebaseIfConfigured } from "@/lib/firebaseClient";
import CurrencySwitcher from "@/components/layout/CurrencySwitcher";

type AdminShellProps = {
  children: React.ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const nav: NavItem[] = [
  { href: "/admin", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/admin/products", label: "Products", icon: <Boxes className="h-4 w-4" /> },
  { href: "/admin/categories", label: "Categories", icon: <Folder className="h-4 w-4" /> },
  { href: "/admin/orders", label: "Orders", icon: <BarChart3 className="h-4 w-4" /> },
  { href: "/admin/returns", label: "Returns", icon: <Undo2 className="h-4 w-4" /> },
  { href: "/admin/reviews", label: "Reviews", icon: <Star className="h-4 w-4" /> },
  { href: "/admin/users", label: "Users", icon: <Users className="h-4 w-4" /> },
  { href: "/admin/promotions", label: "Promotions", icon: <Tag className="h-4 w-4" /> },
  { href: "/admin/coupons", label: "Coupons", icon: <Tag className="h-4 w-4" /> },
  { href: "/admin/cms/deals", label: "Deals", icon: <Tag className="h-4 w-4" /> },
  { href: "/admin/inventory", label: "Inventory", icon: <Boxes className="h-4 w-4" /> },
  { href: "/admin/reports", label: "Reports", icon: <BarChart3 className="h-4 w-4" /> },
  { href: "/admin/cms", label: "CMS", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/admin/logs", label: "Logs", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/admin/settings/appearance", label: "Appearance", icon: <Palette className="h-4 w-4" /> },
  { href: "/admin/settings/branding", label: "Branding", icon: <Store className="h-4 w-4" /> },
  { href: "/admin/settings/storefront", label: "Storefront", icon: <Settings className="h-4 w-4" /> },
  { href: "/admin/settings/payments", label: "Payments", icon: <CreditCard className="h-4 w-4" /> },
  { href: "/admin/cms/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
];

export default function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isPrintRoute = pathname.endsWith("/print");

  if (isPrintRoute) {
    return (
      <div className="min-h-screen bg-white">
        {children}
      </div>
    );
  }

  async function onSignOut() {
    await signOutFirebaseIfConfigured();
    await signOut({ callbackUrl: "/" });
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                Admin
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {session?.user?.email ?? ""}
              </p>
            </div>
          </div>

          <div className="mt-3">
            <CurrencySwitcher variant="compact" />
          </div>

          <nav className="mt-4 space-y-1">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-zinc-700 hover:bg-muted hover:text-foreground dark:text-zinc-300"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={onSignOut}
            className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </aside>

        <main className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
