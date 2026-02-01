import mongoose, { Schema, type InferSchemaType } from "mongoose";

const DealSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, enum: ["percent", "fixed"], required: true },
    value: { type: Number, required: true, min: 0 },
    priority: { type: Number, default: 0, index: true },
    startsAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    productIds: [{ type: Schema.Types.ObjectId, ref: "Product", index: true }],
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

DealSchema.index({ isActive: 1, startsAt: 1, expiresAt: 1, priority: -1 });

export type DealDocument = InferSchemaType<typeof DealSchema> & {
  _id: mongoose.Types.ObjectId;
};

const Deal = mongoose.models.Deal || mongoose.model("Deal", DealSchema);

export default Deal;
