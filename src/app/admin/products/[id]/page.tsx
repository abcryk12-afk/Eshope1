import ProductFormClient from "@/app/admin/products/_components/ProductFormClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminEditProductPage({ params }: PageProps) {
  const { id } = await params;
  return <ProductFormClient mode="edit" productId={id} />;
}
