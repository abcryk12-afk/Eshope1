import DealFormClient from "@/app/admin/cms/deals/_components/DealFormClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminEditDealPage({ params }: PageProps) {
  const { id } = await params;
  return <DealFormClient mode="edit" dealId={id} />;
}
