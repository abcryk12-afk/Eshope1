import mongoose, { Schema, type InferSchemaType } from "mongoose";

const UserMessageSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    title: { type: String, required: true, trim: true, maxlength: 160 },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    type: { type: String, required: true, trim: true, maxlength: 60, index: true },

    relatedOrderId: { type: Schema.Types.ObjectId, ref: "Order", index: true },

    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

UserMessageSchema.index({ userId: 1, createdAt: -1 });
UserMessageSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export type UserMessageDocument = InferSchemaType<typeof UserMessageSchema> & {
  _id: mongoose.Types.ObjectId;
};

const UserMessage = mongoose.models.UserMessage || mongoose.model("UserMessage", UserMessageSchema);

export default UserMessage;
