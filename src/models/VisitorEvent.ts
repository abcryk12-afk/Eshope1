import mongoose, { Schema, type InferSchemaType } from "mongoose";

const VisitorEventSchema = new Schema(
  {
    sessionId: { type: String, required: true, trim: true, index: true, maxlength: 80 },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    ip: { type: String, trim: true, maxlength: 80, index: true },
    userAgent: { type: String, trim: true, maxlength: 500 },
    url: { type: String, trim: true, maxlength: 1000 },
    path: { type: String, trim: true, maxlength: 500, index: true },
    eventType: { type: String, trim: true, maxlength: 40, index: true, default: "page_view" },
    referrer: { type: String, trim: true, maxlength: 1000 },
    utm: {
      source: { type: String, trim: true, maxlength: 80 },
      medium: { type: String, trim: true, maxlength: 80 },
      campaign: { type: String, trim: true, maxlength: 120 },
      term: { type: String, trim: true, maxlength: 120 },
      content: { type: String, trim: true, maxlength: 120 },
    },
    deviceType: { type: String, trim: true, maxlength: 20, index: true },
    sourceType: { type: String, trim: true, maxlength: 30, index: true },
    productId: { type: String, trim: true, maxlength: 80, index: true },
    orderId: { type: String, trim: true, maxlength: 80, index: true },
    value: { type: Number },
    currency: { type: String, trim: true, maxlength: 10 },
    geo: {
      country: { type: String, trim: true, maxlength: 80, index: true },
      city: { type: String, trim: true, maxlength: 120 },
      region: { type: String, trim: true, maxlength: 120 },
    },
  },
  { timestamps: true }
);

VisitorEventSchema.index({ createdAt: -1 });
VisitorEventSchema.index({ sessionId: 1, createdAt: -1 });
VisitorEventSchema.index({ eventType: 1, createdAt: -1 });
VisitorEventSchema.index({ sourceType: 1, createdAt: -1 });
VisitorEventSchema.index({ deviceType: 1, createdAt: -1 });
VisitorEventSchema.index({ productId: 1, createdAt: -1 });
VisitorEventSchema.index({ "geo.country": 1, createdAt: -1 });

export type VisitorEventDocument = InferSchemaType<typeof VisitorEventSchema> & {
  _id: mongoose.Types.ObjectId;
};

const VisitorEvent = mongoose.models.VisitorEvent || mongoose.model("VisitorEvent", VisitorEventSchema);

export default VisitorEvent;
