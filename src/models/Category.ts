import mongoose, { Schema, type InferSchemaType } from "mongoose";

const CategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    slug: { type: String, required: true, unique: true, trim: true, index: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    parentId: { type: Schema.Types.ObjectId, ref: "Category", default: null, index: true },
    icon: { type: String, trim: true, maxlength: 80 },
    menuLabel: { type: String, trim: true, maxlength: 80 },
  },
  { timestamps: true }
);

export type CategoryDocument = InferSchemaType<typeof CategorySchema> & {
  _id: mongoose.Types.ObjectId;
};

const Category = mongoose.models.Category || mongoose.model("Category", CategorySchema);

export default Category;
