import mongoose, { Schema, type InferSchemaType } from "mongoose";

const AddressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["shipping", "billing"], required: true, index: true },

    label: { type: String, trim: true, maxlength: 60 },

    fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    phone: { type: String, required: true, trim: true, minlength: 5, maxlength: 40 },

    addressLine1: { type: String, required: true, trim: true, minlength: 3, maxlength: 140 },
    addressLine2: { type: String, trim: true, maxlength: 140 },

    city: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    province: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    country: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    postalCode: { type: String, required: true, trim: true, minlength: 2, maxlength: 20 },

    isDefault: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

AddressSchema.index({ userId: 1, type: 1, createdAt: -1 });
AddressSchema.index({ userId: 1, type: 1, isDefault: 1 });

export type AddressDocument = InferSchemaType<typeof AddressSchema> & {
  _id: mongoose.Types.ObjectId;
};

const Address = mongoose.models.Address || mongoose.model("Address", AddressSchema);

export default Address;
