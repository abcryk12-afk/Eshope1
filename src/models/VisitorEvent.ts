import mongoose, { Schema, type InferSchemaType } from "mongoose";

const VisitorEventSchema = new Schema(
  {
    sessionId: { type: String, required: true, trim: true, index: true, maxlength: 80 },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    ip: { type: String, trim: true, maxlength: 80, index: true },
    userAgent: { type: String, trim: true, maxlength: 500 },
    url: { type: String, trim: true, maxlength: 1000 },
    path: { type: String, trim: true, maxlength: 500, index: true },
  },
  { timestamps: true }
);

VisitorEventSchema.index({ createdAt: -1 });
VisitorEventSchema.index({ sessionId: 1, createdAt: -1 });

export type VisitorEventDocument = InferSchemaType<typeof VisitorEventSchema> & {
  _id: mongoose.Types.ObjectId;
};

const VisitorEvent = mongoose.models.VisitorEvent || mongoose.model("VisitorEvent", VisitorEventSchema);

export default VisitorEvent;
