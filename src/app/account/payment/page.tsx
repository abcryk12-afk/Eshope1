import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";

export default async function AccountPaymentPage() {
  const session = await getServerSession(authOptions);

  await dbConnect();

  const orders = session?.user?.id
    ? await Order.find({ userId: session.user.id })
        .sort({ createdAt: -1 })
        .limit(20)
        .select("createdAt totalAmount paymentMethod paymentStatus isPaid paymentReceiptUrl")
        .lean()
    : [];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-surface p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Payment</h1>
        <p className="mt-2 text-sm text-muted-foreground">Payment status and history per order.</p>
      </div>

      <div className="rounded-3xl border border-border bg-surface p-6">
        <h2 className="text-sm font-semibold text-foreground">Recent payment activity</h2>

        {orders.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No payment history yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-2">Order</th>
                  <th className="py-2">Method</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const id = String((o as unknown as { _id: unknown })._id);
                  const method = String((o as unknown as { paymentMethod?: string }).paymentMethod ?? "");
                  const status = String((o as unknown as { paymentStatus?: string }).paymentStatus ?? ((o as unknown as { isPaid?: boolean }).isPaid ? "Paid" : "Unpaid"));
                  const receipt = String((o as unknown as { paymentReceiptUrl?: string }).paymentReceiptUrl ?? "");

                  return (
                    <tr key={id} className="border-t border-border">
                      <td className="py-3 font-semibold text-foreground">{id.slice(-6)}</td>
                      <td className="py-3 text-muted-foreground">{method}</td>
                      <td className="py-3 text-muted-foreground">{status}</td>
                      <td className="py-3">
                        {receipt ? (
                          <a href={receipt} target="_blank" rel="noreferrer noopener" className="font-semibold text-foreground hover:underline">
                            View
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
