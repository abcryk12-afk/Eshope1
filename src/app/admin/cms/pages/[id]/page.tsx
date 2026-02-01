import CmsPageFormClient from "@/app/admin/cms/pages/_components/CmsPageFormClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminEditCmsPage({ params }: PageProps) {
  const { id } = await params;
  return <CmsPageFormClient mode="edit" pageId={id} />;
}
