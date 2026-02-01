import PromotionFormClient from "@/app/admin/promotions/_components/PromotionFormClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminEditPromotionPage({ params }: PageProps) {
  const { id } = await params;
  return <PromotionFormClient mode="edit" promotionId={id} />;
}
