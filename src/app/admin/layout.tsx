"use client";

import { useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

import AdminShell from "@/components/admin/AdminShell";

type AdminLayoutProps = {
  children: React.ReactNode;
};

type AppRole = "user" | "staff" | "admin" | "super_admin";

const ADMIN_ROLES: AppRole[] = ["staff", "admin", "super_admin"];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  const isLoginRoute = pathname === "/admin/login";

  const isAdmin = useMemo(() => {
    const role = session?.user?.role as AppRole | undefined;
    return !!role && ADMIN_ROLES.includes(role);
  }, [session?.user?.role]);

  useEffect(() => {
    if (isLoginRoute) return;
    if (status === "loading") return;

    if (!session?.user?.id) {
      router.replace(`/admin/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }

    if (!isAdmin) {
      router.replace("/");
    }
  }, [isAdmin, isLoginRoute, pathname, router, session?.user?.id, status]);

  if (isLoginRoute) return children;

  if (status === "loading") {
    return <div className="min-h-screen bg-zinc-50 dark:bg-black" />;
  }

  if (!session?.user?.id || !isAdmin) {
    return null;
  }

  return <AdminShell>{children}</AdminShell>;
}
