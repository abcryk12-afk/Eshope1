import CouponFormClient from "@/app/admin/coupons/_components/CouponFormClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminEditCouponPage({ params }: PageProps) {
  const { id } = await params;
  return <CouponFormClient mode="edit" couponId={id} />;
}
