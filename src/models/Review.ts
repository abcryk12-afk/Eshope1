import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ReviewSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },

    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 2000 },

    isHidden: { type: Boolean, default: false, index: true },
    hiddenAt: { type: Date },
    hiddenBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ReviewSchema.index({ productId: 1, createdAt: -1 });
ReviewSchema.index({ userId: 1, createdAt: -1 });
ReviewSchema.index({ productId: 1, orderId: 1 });
ReviewSchema.index({ productId: 1, orderId: 1, userId: 1 }, { unique: true });

export type ReviewDocument = InferSchemaType<typeof ReviewSchema> & {
  _id: mongoose.Types.ObjectId;
};

const Review = mongoose.models.Review || mongoose.model("Review", ReviewSchema);

export default Review;
