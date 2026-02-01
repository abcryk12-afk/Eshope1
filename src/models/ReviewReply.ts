import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ReviewReplySchema = new Schema(
  {
    reviewId: { type: Schema.Types.ObjectId, ref: "Review", required: true, index: true },

    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    authorName: { type: String, trim: true, maxlength: 120 },
    authorRole: { type: String, trim: true, maxlength: 40 },

    message: { type: String, required: true, trim: true, maxlength: 2000 },

    isHidden: { type: Boolean, default: false, index: true },
    hiddenAt: { type: Date },
    hiddenBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ReviewReplySchema.index({ reviewId: 1, createdAt: 1 });

export type ReviewReplyDocument = InferSchemaType<typeof ReviewReplySchema> & {
  _id: mongoose.Types.ObjectId;
};

const ReviewReply = mongoose.models.ReviewReply || mongoose.model("ReviewReply", ReviewReplySchema);

export default ReviewReply;
