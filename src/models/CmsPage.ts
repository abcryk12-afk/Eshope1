import mongoose, { Schema, type InferSchemaType } from "mongoose";

const CmsPageSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 140 },
    slug: { type: String, required: true, unique: true, trim: true, index: true },
    content: { type: String, required: true, trim: true, minlength: 2 },
    isPublished: { type: Boolean, default: false, index: true },
    seoTitle: { type: String, trim: true, maxlength: 160 },
    seoDescription: { type: String, trim: true, maxlength: 320 },
  },
  { timestamps: true }
);

export type CmsPageDocument = InferSchemaType<typeof CmsPageSchema> & {
  _id: mongoose.Types.ObjectId;
};

const CmsPage = mongoose.models.CmsPage || mongoose.model("CmsPage", CmsPageSchema);

export default CmsPage;
