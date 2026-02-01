import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import AdminShell from "@/components/admin/AdminShell";

type AdminPageShellProps = {
  children: React.ReactNode;
};

export default async function AdminPageShell({ children }: AdminPageShellProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/admin/login");
  }

  const ok = ["staff", "admin", "super_admin"].includes(session.user.role);

  if (!ok) {
    redirect("/");
  }

  return <AdminShell>{children}</AdminShell>;
}
