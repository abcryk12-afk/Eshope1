import { getServerSession } from "next-auth/next";
import Link from "next/link";

import { authOptions } from "@/lib/auth";
import AccountOrdersClient from "@/app/account/orders/AccountOrdersClient";
import Button from "@/components/ui/Button";

export default async function MyOrdersPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 dark:bg-black">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                My orders
              </h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Signed in as {session?.user?.email}
              </p>
            </div>
            <Link href="/">
              <Button variant="secondary">Shop</Button>
            </Link>
          </div>
        </div>

        <AccountOrdersClient />
      </div>
    </div>
  );
}
