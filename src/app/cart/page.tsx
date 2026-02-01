import Link from "next/link";

import CartClient from "./CartClient";

export default function CartPage() {
  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 dark:bg-black">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Cart
          </h1>
          <Link href="/" className="text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-50">
            Continue shopping
          </Link>
        </div>

        <CartClient />
      </div>
    </div>
  );
}
