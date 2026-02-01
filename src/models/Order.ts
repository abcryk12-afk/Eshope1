import mongoose, { Schema, type InferSchemaType } from "mongoose";

const OrderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: Schema.Types.ObjectId, required: true },
    variantSku: { type: String, trim: true },
    variantSize: { type: String, trim: true },
    variantColor: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    image: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const ShippingAddressSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    guestEmail: { type: String, trim: true, lowercase: true, index: true },
    items: { type: [OrderItemSchema], required: true },
    shippingAddress: { type: ShippingAddressSchema, required: true },
    paymentMethod: { type: String, required: true, trim: true },

    currency: {
      type: String,
      enum: ["PKR", "USD"],
      default: "PKR",
      index: true,
    },
    pkrPerUsd: { type: Number, min: 0 },

    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Pending", "ProofSubmitted", "Rejected", "Paid"],
      default: "Unpaid",
      index: true,
    },

    paymentReceiptUrl: { type: String, trim: true, maxlength: 800 },
    paymentReceiptUploadedAt: { type: Date },
    paymentReceiptRejectedReason: { type: String, trim: true, maxlength: 400 },
    paymentReceiptReviewedAt: { type: Date },
    paymentReceiptReviewedBy: { type: Schema.Types.ObjectId, ref: "User" },

    couponCode: { type: String, trim: true },
    couponDiscountAmount: { type: Number, default: 0, min: 0 },

    promotionId: { type: Schema.Types.ObjectId, ref: "Promotion", index: true },
    promotionName: { type: String, trim: true, maxlength: 120 },
    promotionDiscountAmount: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },

    itemsSubtotal: { type: Number, required: true, min: 0 },
    shippingAmount: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },

    orderStatus: {
      type: String,
      enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
      index: true,
    },

    shippingStatus: {
      type: String,
      enum: ["Pending", "Shipped", "Delivered"],
      default: "Pending",
      index: true,
    },
    trackingUrl: { type: String, trim: true, maxlength: 800 },
    trackingAddedAt: { type: Date },

    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    isDelivered: { type: Boolean, default: false },
    deliveredAt: { type: Date },
  },
  { timestamps: true }
);

export type OrderDocument = InferSchemaType<typeof OrderSchema> & {
  _id: mongoose.Types.ObjectId;
};

const Order = mongoose.models.Order || mongoose.model("Order", OrderSchema);

export default Order;
