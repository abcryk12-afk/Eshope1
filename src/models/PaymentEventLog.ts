import mongoose, { Schema, type InferSchemaType } from "mongoose";

const PaymentEventLogSchema = new Schema(
  {
    kind: { type: String, trim: true, maxlength: 40, index: true },
    event: { type: String, trim: true, maxlength: 120, index: true },
    signatureOk: { type: Boolean, default: false, index: true },
    providerRef: { type: String, trim: true, maxlength: 120, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", index: true },
    headers: { type: Schema.Types.Mixed, default: null },
    bodyRaw: { type: String, default: "" },
    body: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

export type PaymentEventLogDocument = InferSchemaType<typeof PaymentEventLogSchema> & {
  _id: mongoose.Types.ObjectId;
};

const PaymentEventLog =
  mongoose.models.PaymentEventLog || mongoose.model("PaymentEventLog", PaymentEventLogSchema);

export default PaymentEventLog;
