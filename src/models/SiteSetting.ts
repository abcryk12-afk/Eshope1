import mongoose, { Schema, type InferSchemaType } from "mongoose";

const BannerSchema = new Schema(
  {
    title: { type: String, trim: true, maxlength: 120 },
    subtitle: { type: String, trim: true, maxlength: 200 },
    image: { type: String, trim: true },
    href: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

const LocalizedTextSchema = {
  type: Schema.Types.Mixed,
  default: () => ({}),
};

const FooterLinkSchema = new Schema(
  {
    href: { type: String, trim: true },
    label: LocalizedTextSchema,
  },
  { _id: false }
);

const FooterSectionSchema = new Schema(
  {
    title: LocalizedTextSchema,
    links: { type: [FooterLinkSchema], default: [] },
  },
  { _id: false }
);

const FooterSocialLinkSchema = new Schema(
  {
    kind: { type: String, trim: true },
    href: { type: String, trim: true },
    label: LocalizedTextSchema,
  },
  { _id: false }
);

const FooterSchema = new Schema(
  {
    text: LocalizedTextSchema,
    sections: { type: [FooterSectionSchema], default: [] },
    policyLinks: { type: [FooterLinkSchema], default: [] },
    socialLinks: { type: [FooterSocialLinkSchema], default: [] },
  },
  { _id: false }
);

const PaymentAccountSchema = new Schema(
  {
    label: { type: String, trim: true, maxlength: 80 },
    bankName: { type: String, trim: true, maxlength: 80 },
    accountTitle: { type: String, trim: true, maxlength: 120 },
    accountNumber: { type: String, trim: true, maxlength: 80 },
    iban: { type: String, trim: true, maxlength: 80 },
  },
  { _id: true }
);

const ReturnsSettingsSchema = new Schema(
  {
    windowDays: { type: Number, default: 14, min: 1, max: 60 },
  },
  { _id: false }
);

 const InventorySettingsSchema = new Schema(
  {
    lowStockThreshold: { type: Number, default: 5, min: 0, max: 1000 },
  },
  { _id: false }
 );

 const ShippingEtaSchema = new Schema(
  {
    minDays: { type: Number, default: 3, min: 0, max: 60 },
    maxDays: { type: Number, default: 5, min: 0, max: 60 },
  },
  { _id: false }
 );

 const ShippingCityRuleSchema = new Schema(
  {
    city: { type: String, trim: true, maxlength: 80 },
    fee: { type: Number, default: 0, min: 0 },
    freeAboveSubtotal: { type: Number, min: 0 },
    etaMinDays: { type: Number, min: 0, max: 60 },
    etaMaxDays: { type: Number, min: 0, max: 60 },
  },
  { _id: true }
 );

 const ShippingSettingsSchema = new Schema(
  {
    defaultFee: { type: Number, default: 0, min: 0 },
    freeAboveSubtotal: { type: Number, min: 0 },
    etaDefault: { type: ShippingEtaSchema, default: () => ({}) },
    cityRules: { type: [ShippingCityRuleSchema], default: [] },
  },
  { _id: false }
 );

const SiteSettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, index: true },
    homeBanners: { type: [BannerSchema], default: [] },
    footerText: { type: String, trim: true, maxlength: 500 },
    footer: { type: FooterSchema, default: () => ({}) },
    globalSeoTitle: { type: String, trim: true, maxlength: 160 },
    globalSeoDescription: { type: String, trim: true, maxlength: 320 },
    whatsAppOrderTemplate: { type: String, trim: true, maxlength: 5000 },
    returns: { type: ReturnsSettingsSchema, default: () => ({}) },
    inventory: { type: InventorySettingsSchema, default: () => ({}) },
    shipping: { type: ShippingSettingsSchema, default: () => ({}) },
    payments: {
      codEnabled: { type: Boolean, default: true },
      manual: {
        enabled: { type: Boolean, default: true },
        instructions: { type: String, trim: true, maxlength: 2000 },
        accounts: { type: [PaymentAccountSchema], default: [] },
      },
      online: {
        enabled: { type: Boolean, default: false },
        provider: { type: String, trim: true, maxlength: 60 },
        instructions: { type: String, trim: true, maxlength: 2000 },
      },
    },
    theme: {
      preset: { type: String, trim: true },
      colors: {
        primary: { type: String, trim: true },
        secondary: { type: String, trim: true },
        background: { type: String, trim: true },
        surface: { type: String, trim: true },
        header: { type: String, trim: true },
        text: { type: String, trim: true },
      },
    },
    themeUpdatedAt: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export type SiteSettingDocument = InferSchemaType<typeof SiteSettingSchema> & {
  _id: mongoose.Types.ObjectId;
};

const SiteSetting = mongoose.models.SiteSetting || mongoose.model("SiteSetting", SiteSettingSchema);

export default SiteSetting;
