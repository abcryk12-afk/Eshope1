import AdminOrderPrintClient from "@/app/admin/orders/[id]/print/AdminOrderPrintClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrderPrintPage({ params }: PageProps) {
  const { id } = await params;
  return <AdminOrderPrintClient orderId={id} />;
}
