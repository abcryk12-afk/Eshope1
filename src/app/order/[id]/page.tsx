import OrderReceiptClient from "@/app/order/[id]/OrderReceiptClient";

type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: SearchParams | Promise<SearchParams>;
};

function readString(v: string | string[] | undefined) {
  if (!v) return "";
  return Array.isArray(v) ? v[0] ?? "" : v;
}

export default async function OrderReceiptPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await Promise.resolve(searchParams);
  const email = readString(sp.email);

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 dark:bg-black">
      <div className="mx-auto w-full max-w-4xl">
        <OrderReceiptClient orderId={id} email={email} />
      </div>
    </div>
  );
}
