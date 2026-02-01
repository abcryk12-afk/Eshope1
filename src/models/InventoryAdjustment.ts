import mongoose, { Schema, type InferSchemaType } from "mongoose";

const InventoryAdjustmentSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    variantId: { type: Schema.Types.ObjectId },
    delta: { type: Number, required: true },
    previousStock: { type: Number, required: true, min: 0 },
    newStock: { type: Number, required: true, min: 0 },
    reason: { type: String, trim: true, maxlength: 500 },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actorEmail: { type: String, trim: true },
    actorRole: { type: String, trim: true },
  },
  { timestamps: true }
);

export type InventoryAdjustmentDocument = InferSchemaType<typeof InventoryAdjustmentSchema> & {
  _id: mongoose.Types.ObjectId;
};

const InventoryAdjustment =
  mongoose.models.InventoryAdjustment ||
  mongoose.model("InventoryAdjustment", InventoryAdjustmentSchema);

export default InventoryAdjustment;
