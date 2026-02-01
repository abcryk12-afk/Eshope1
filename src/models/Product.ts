import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ProductVariantSchema = new Schema(
  {
    sku: { type: String, required: true, trim: true },
    size: { type: String, required: true, trim: true },
    color: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0 },
    images: [{ type: String, default: [] }],
  },
  { _id: true }
);

const ProductSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 140 },
    slug: { type: String, required: true, unique: true, trim: true, index: true },
    description: { type: String, required: true, trim: true, minlength: 1 },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    category: { type: String, trim: true, index: true },
    categorySlug: { type: String, trim: true, index: true },
    storeName: { type: String, trim: true, maxlength: 80, index: true },
    brand: { type: String, trim: true },
    images: [{ type: String, default: [] }],
    basePrice: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    stock: { type: Number, min: 0 },
    variants: { type: [ProductVariantSchema], default: [] },
    isDigital: { type: Boolean, default: false, index: true },
    isNonReturnable: { type: Boolean, default: false, index: true },
    soldCount: { type: Number, default: 0, min: 0, index: true },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0, min: 0 },
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ProductSchema.index({ title: "text", description: "text", category: "text" });

export type ProductDocument = InferSchemaType<typeof ProductSchema> & {
  _id: mongoose.Types.ObjectId;
};

const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema);

export default Product;
