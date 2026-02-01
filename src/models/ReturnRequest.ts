import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ReturnRequestSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    variantId: { type: Schema.Types.ObjectId, required: true, index: true },

    reason: {
      type: String,
      required: true,
      enum: [
        "Damaged product",
        "Wrong item received",
        "Not as described",
        "Missing items",
        "Other",
      ],
      index: true,
    },
    comment: { type: String, trim: true, maxlength: 2000 },
    images: [{ type: String, trim: true, maxlength: 800, default: [] }],

    status: {
      type: String,
      required: true,
      enum: ["requested", "approved", "rejected", "completed"],
      default: "requested",
      index: true,
    },

    refundProcessedAt: { type: Date },
  },
  { timestamps: true }
);

ReturnRequestSchema.index({ userId: 1, createdAt: -1 });
ReturnRequestSchema.index({ orderId: 1, createdAt: -1 });
ReturnRequestSchema.index({ orderId: 1, productId: 1, variantId: 1 }, { unique: true });

export type ReturnRequestDocument = InferSchemaType<typeof ReturnRequestSchema> & {
  _id: mongoose.Types.ObjectId;
};

const ReturnRequest = mongoose.models.ReturnRequest || mongoose.model("ReturnRequest", ReturnRequestSchema);

export default ReturnRequest;
