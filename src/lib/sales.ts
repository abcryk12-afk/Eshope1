import mongoose from "mongoose";

import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import Product from "@/models/Product";
import ReturnRequest from "@/models/ReturnRequest";

function isObjectId(v: string) {
  return /^[a-fA-F0-9]{24}$/.test(v);
}

export async function recomputeProductSoldCount(productId: string) {
  const id = String(productId ?? "").trim();
  if (!isObjectId(id)) return 0;

  await dbConnect();

  const pid = new mongoose.Types.ObjectId(id);

  const soldAgg = await Order.aggregate([
    { $match: { orderStatus: "Delivered" } },
    { $unwind: "$items" },
    { $match: { "items.productId": pid } },
    { $group: { _id: null, qty: { $sum: "$items.quantity" } } },
  ]);

  const sold = Number(soldAgg?.[0]?.qty ?? 0) || 0;

  const returnedAgg = await ReturnRequest.aggregate([
    { $match: { productId: pid, status: "completed" } },
    {
      $lookup: {
        from: "orders",
        localField: "orderId",
        foreignField: "_id",
        as: "order",
      },
    },
    { $unwind: "$order" },
    { $unwind: "$order.items" },
    {
      $match: {
        $expr: {
          $and: [
            { $eq: ["$order.items.productId", "$productId"] },
            { $eq: ["$order.items.variantId", "$variantId"] },
          ],
        },
      },
    },
    { $group: { _id: null, qty: { $sum: "$order.items.quantity" } } },
  ]);

  const returned = Number(returnedAgg?.[0]?.qty ?? 0) || 0;

  const next = Math.max(0, sold - returned);

  await Product.updateOne({ _id: pid }, { $set: { soldCount: next } });

  return next;
}
