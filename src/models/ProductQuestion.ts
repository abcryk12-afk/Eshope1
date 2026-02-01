import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ProductQuestionSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    question: { type: String, required: true, trim: true, minlength: 3, maxlength: 400 },

    isHidden: { type: Boolean, default: false, index: true },
    hiddenAt: { type: Date },
    hiddenBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ProductQuestionSchema.index({ productId: 1, createdAt: -1 });

export type ProductQuestionDocument = InferSchemaType<typeof ProductQuestionSchema> & {
  _id: mongoose.Types.ObjectId;
};

const ProductQuestion =
  mongoose.models.ProductQuestion || mongoose.model("ProductQuestion", ProductQuestionSchema);

export default ProductQuestion;
