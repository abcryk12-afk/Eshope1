import mongoose, { Schema, type InferSchemaType } from "mongoose";

const PromotionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, enum: ["percent", "fixed"], required: true },
    value: { type: Number, required: true, min: 0 },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    maxDiscountAmount: { type: Number, min: 0 },
    priority: { type: Number, default: 0, index: true },
    startsAt: { type: Date },
    expiresAt: { type: Date },
    appliesTo: {
      type: String,
      enum: ["all", "categories", "products"],
      default: "all",
      index: true,
    },
    categoryIds: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    productIds: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export type PromotionDocument = InferSchemaType<typeof PromotionSchema> & {
  _id: mongoose.Types.ObjectId;
};

const Promotion = mongoose.models.Promotion || mongoose.model("Promotion", PromotionSchema);

export default Promotion;
