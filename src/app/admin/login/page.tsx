import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import AdminLoginClient from "@/app/admin/login/AdminLoginClient";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readString(v: string | string[] | undefined) {
  if (!v) return "";
  return Array.isArray(v) ? v[0] ?? "" : v;
}

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  if (session?.user?.role && ["staff", "admin", "super_admin"].includes(session.user.role)) {
    redirect("/admin");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const callbackUrl = readString(resolvedSearchParams.callbackUrl) || "/admin";

  return <AdminLoginClient callbackUrl={callbackUrl} />;
}
