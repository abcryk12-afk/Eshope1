import AdminUserDetailClient from "@/app/admin/users/[id]/AdminUserDetailClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <AdminUserDetailClient userId={id} />;
}
