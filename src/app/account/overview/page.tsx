import Link from "next/link";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import Button from "@/components/ui/Button";

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

export default async function AccountOverviewPage() {
  const session = await getServerSession(authOptions);

  await dbConnect();

  const orders = session?.user?.id
    ? await Order.find({ userId: session.user.id })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("createdAt totalAmount currency pkrPerUsd orderStatus paymentStatus paymentMethod isPaid")
        .lean()
    : [];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Overview</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Welcome back, {session?.user?.email}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link href="/account/orders" className="rounded-3xl border border-zinc-200 bg-white p-5 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Orders</p>
          <p className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">View orders</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Track, pay, and manage deliveries.</p>
        </Link>
        <Link href="/account/shipping-address" className="rounded-3xl border border-zinc-200 bg-white p-5 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Addresses</p>
          <p className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Shipping & Billing</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Manage where we deliver and invoice.</p>
        </Link>
        <Link href="/account/settings" className="rounded-3xl border border-zinc-200 bg-white p-5 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Settings</p>
          <p className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Account settings</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Profile, security, preferences.</p>
        </Link>
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Recent orders</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Your latest 5 orders.</p>
          </div>
          <Link href="/account/orders">
            <Button variant="secondary" size="sm">View all</Button>
          </Link>
        </div>

        {orders.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">No orders yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="py-2">Order</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Payment</th>
                  <th className="py-2">Created</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={String((o as unknown as { _id: unknown })._id)} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="py-3 font-semibold text-zinc-900 dark:text-zinc-50">{String((o as unknown as { _id: unknown })._id).slice(-6)}</td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-400">{String((o as unknown as { orderStatus?: string }).orderStatus ?? "")}</td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-400">
                      {String((o as unknown as { paymentStatus?: string }).paymentStatus ?? (o as unknown as { isPaid?: boolean }).isPaid ? "Paid" : "Unpaid")}
                    </td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-400">{fmtDate(String((o as unknown as { createdAt?: string }).createdAt ?? new Date().toISOString()))}</td>
                    <td className="py-3 text-right">
                      <Link href={`/account/orders/${encodeURIComponent(String((o as unknown as { _id: unknown })._id))}`}>
                        <Button variant="secondary" size="sm">View</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
