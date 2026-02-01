import AccountOrderDetailClient from "@/app/account/orders/[id]/AccountOrderDetailClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AccountOrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  return <AccountOrderDetailClient orderId={id} />;
}
