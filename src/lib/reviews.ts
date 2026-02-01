import mongoose from "mongoose";

import { dbConnect } from "@/lib/db";
import Product from "@/models/Product";
import Review from "@/models/Review";

export async function recomputeProductReviewStats(productId: string | mongoose.Types.ObjectId) {
  const pid = typeof productId === "string" ? new mongoose.Types.ObjectId(productId) : productId;

  await dbConnect();

  const agg = await Review.aggregate([
    { $match: { productId: pid, isHidden: false } },
    {
      $group: {
        _id: "$productId",
        avg: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const avg = typeof agg?.[0]?.avg === "number" ? agg[0].avg : 0;
  const count = typeof agg?.[0]?.count === "number" ? agg[0].count : 0;

  await Product.updateOne(
    { _id: pid },
    {
      $set: {
        ratingAvg: avg,
        ratingCount: count,
        averageRating: avg,
        reviewsCount: count,
      },
    }
  );
}
