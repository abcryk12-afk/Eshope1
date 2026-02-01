import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ProductAnswerSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, ref: "ProductQuestion", required: true, index: true },

    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    authorName: { type: String, trim: true, maxlength: 120 },
    authorRole: { type: String, trim: true, maxlength: 40 },

    answer: { type: String, required: true, trim: true, minlength: 1, maxlength: 1200 },

    isHidden: { type: Boolean, default: false, index: true },
    hiddenAt: { type: Date },
    hiddenBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ProductAnswerSchema.index({ questionId: 1, createdAt: 1 });

export type ProductAnswerDocument = InferSchemaType<typeof ProductAnswerSchema> & {
  _id: mongoose.Types.ObjectId;
};

const ProductAnswer = mongoose.models.ProductAnswer || mongoose.model("ProductAnswer", ProductAnswerSchema);

export default ProductAnswer;
