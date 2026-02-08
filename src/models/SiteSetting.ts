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

 const StorefrontGridSchema = new Schema(
  {
    mobileCols: { type: Number, default: 2, min: 2, max: 5 },
    tabletCols: { type: Number, default: 3, min: 3, max: 5 },
    desktopCols: { type: Number, default: 4, min: 4, max: 6 },
    gap: { type: String, trim: true, enum: ["compact", "normal", "spacious"], default: "normal" },
  },
  { _id: false }
 );

 const StorefrontProductCardSchema = new Schema(
  {
    style: {
      type: String,
      trim: true,
      enum: ["rounded", "squared", "image_first", "poster"],
      default: "rounded",
    },
    density: {
      type: String,
      trim: true,
      enum: ["compact", "balanced", "image_focused"],
      default: "balanced",
    },
    imageAspect: {
      type: String,
      trim: true,
      enum: ["square", "portrait", "auto"],
      default: "square",
    },
    showRating: { type: Boolean, default: true },
    showSoldCount: { type: Boolean, default: true },
    showWishlistIcon: { type: Boolean, default: true },
    showDiscountBadge: { type: Boolean, default: true },
  },
  { _id: false }
 );

 const StorefrontLayoutSchema = new Schema(
  {
    grid: { type: StorefrontGridSchema, default: () => ({}) },
    productCard: { type: StorefrontProductCardSchema, default: () => ({}) },
    listingHeader: {
      showSearch: { type: Boolean, default: true },
      showFilters: { type: Boolean, default: true },
      spacing: { type: String, trim: true, enum: ["compact", "normal"], default: "compact" },
      showSort: { type: Boolean, default: true },
      enableLayoutSwitcher: { type: Boolean, default: false },
    },
  },
  { _id: false }
 );

 const CartUxSettingsSchema = new Schema(
  {
    quickCheckoutEnabled: { type: Boolean, default: true },
    quickCheckoutAutoHideSeconds: { type: Number, default: 4, min: 1, max: 30 },
  },
  { _id: false }
 );

 const BrandingSchema = new Schema(
  {
    storeName: { type: String, trim: true, maxlength: 80 },
    headerBrandText: { type: String, trim: true, maxlength: 80 },
    logoMode: { type: String, trim: true, enum: ["text", "image", "both"], default: "text" },
    logoAlignment: { type: String, trim: true, enum: ["left", "center"], default: "left" },
    hideTextWhenLogoActive: { type: Boolean, default: false },
    logoMaxHeight: { type: Number, default: 28, min: 16, max: 96 },
    logo: {
      url: { type: String, trim: true },
      width: { type: Number, min: 1 },
      height: { type: Number, min: 1 },
      alt: { type: String, trim: true, maxlength: 160 },
      updatedAt: { type: Number, default: 0 },
    },
    brandTextStyle: {
      weight: { type: Number, default: 600, min: 300, max: 900 },
      italic: { type: Boolean, default: false },
      letterSpacing: { type: String, trim: true, enum: ["tight", "normal", "wide"], default: "tight" },
      color: {
        type: String,
        trim: true,
        enum: ["foreground", "muted", "primary"],
        default: "foreground",
      },
      customColorEnabled: { type: Boolean, default: false },
      customColor: { type: String, trim: true, default: "#171717" },
      gradientEnabled: { type: Boolean, default: false },
      embossedEnabled: { type: Boolean, default: false },
      embossedIntensity: { type: Number, default: 18, min: 0, max: 60 },

      glowEnabled: { type: Boolean, default: false },
      glowColor: { type: String, trim: true, default: "#ffffff" },
      glowIntensity: { type: Number, default: 14, min: 0, max: 60 },

      blinkEnabled: { type: Boolean, default: false },
      blinkSpeedMs: { type: Number, default: 1400, min: 200, max: 6000 },
    },
    seo: {
      title: { type: String, trim: true, maxlength: 160 },
      description: { type: String, trim: true, maxlength: 320 },
      ogImageUrl: { type: String, trim: true },
    },
    favicon: {
      sourceUrl: { type: String, trim: true },
      assetsVersion: { type: String, trim: true },
      updatedAt: { type: Number, default: 0 },
    },
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
    branding: { type: BrandingSchema, default: () => ({}) },
    brandingUpdatedAt: { type: Number, default: 0 },
    whatsAppSalesPhone: { type: String, trim: true, maxlength: 40 },
    whatsAppProductTemplate: { type: String, trim: true, maxlength: 5000 },
    whatsAppOrderTemplate: { type: String, trim: true, maxlength: 5000 },
    returns: { type: ReturnsSettingsSchema, default: () => ({}) },
    inventory: { type: InventorySettingsSchema, default: () => ({}) },
    shipping: { type: ShippingSettingsSchema, default: () => ({}) },
    storefrontLayout: { type: StorefrontLayoutSchema, default: () => ({}) },
    cartUx: { type: CartUxSettingsSchema, default: () => ({}) },
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
        accent: { type: String, trim: true },
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
