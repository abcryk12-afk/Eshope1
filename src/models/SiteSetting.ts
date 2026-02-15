import mongoose, { Schema, type InferSchemaType } from "mongoose";

const BannerSchema = new Schema(
  {
    title: { type: String, trim: true, maxlength: 120 },
    subtitle: { type: String, trim: true, maxlength: 200 },
    image: { type: String, trim: true },
    desktopImage: { type: String, trim: true },
    mobileImage: { type: String, trim: true },
    href: { type: String, trim: true },
    buttonText: { type: String, trim: true, maxlength: 60 },
    buttonHref: { type: String, trim: true },
    textAlign: {
      type: String,
      trim: true,
      enum: ["left", "center", "right"],
      default: "left",
    },
    verticalAlign: {
      type: String,
      trim: true,
      enum: ["top", "center", "bottom"],
      default: "center",
    },
    overlayColor: { type: String, trim: true, default: "#000000" },
    overlayOpacity: { type: Number, default: 0.25, min: 0, max: 1 },
    textColor: { type: String, trim: true, default: "#ffffff" },
    buttonColor: { type: String, trim: true, default: "#ffffff" },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

const HeroBannerSettingsSchema = new Schema(
  {
    desktopHeightPx: { type: Number, default: 520, min: 200, max: 900 },
    mobileHeightPx: { type: Number, default: 360, min: 180, max: 900 },
    aspectMode: { type: String, trim: true, enum: ["height", "ratio"], default: "height" },
    aspectRatio: { type: String, trim: true, default: "16/9" },
    customAspectW: { type: Number, default: 16, min: 1, max: 64 },
    customAspectH: { type: Number, default: 9, min: 1, max: 64 },
    fitMode: { type: String, trim: true, enum: ["cover", "contain"], default: "cover" },
    autoplayEnabled: { type: Boolean, default: true },
    autoplayDelayMs: { type: Number, default: 5000, min: 1000, max: 20000 },
    loop: { type: Boolean, default: true },
    showDots: { type: Boolean, default: true },
    showArrows: { type: Boolean, default: true },
    transitionSpeedMs: { type: Number, default: 550, min: 100, max: 5000 },
    animation: { type: String, trim: true, enum: ["slide", "fade"], default: "slide" },
    keyboard: { type: Boolean, default: true },
  },
  { _id: false }
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

const TrackingProviderGa4Schema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    measurementId: { type: String, trim: true, maxlength: 40 },
    debug: { type: Boolean, default: false },
  },
  { _id: false }
);

const TrackingProviderGoogleAdsSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    conversionId: { type: String, trim: true, maxlength: 40 },
    conversionLabel: { type: String, trim: true, maxlength: 80 },
  },
  { _id: false }
);

const MetaPixelEntrySchema = new Schema(
  {
    pixelId: { type: String, trim: true, maxlength: 40 },
    enabled: { type: Boolean, default: true },
  },
  { _id: true }
);

const TrackingSettingsSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    autoEventsEnabled: { type: Boolean, default: true },
    manualOverrideMode: { type: Boolean, default: false },
    testEventMode: { type: Boolean, default: false },
    ga4: { type: TrackingProviderGa4Schema, default: () => ({}) },
    googleAds: { type: TrackingProviderGoogleAdsSchema, default: () => ({}) },
    metaPixels: { type: [MetaPixelEntrySchema], default: [] },
    updatedAt: { type: Number, default: 0 },
  },
  { _id: false }
);

const ShareSettingsSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    updatedAt: { type: Number, default: 0 },
  },
  { _id: false }
);

const MobileMenuItemSchema = new Schema(
  {
    id: { type: String, trim: true, maxlength: 80 },
    type: { type: String, trim: true, enum: ["category", "link"], default: "link" },
    title: { type: String, trim: true, maxlength: 120 },
    href: { type: String, trim: true, maxlength: 500 },
    enabled: { type: Boolean, default: true },
    visibility: { type: String, trim: true, enum: ["all", "mobile", "desktop"], default: "all" },
    icon: { type: String, trim: true, maxlength: 80 },
    badgeLabel: { type: String, trim: true, maxlength: 20 },
    featured: { type: Boolean, default: false },
    children: { type: [Schema.Types.Mixed], default: [] },
  },
  { _id: false }
);

const MobileMenuSettingsSchema = new Schema(
  {
    useDefaultMenu: { type: Boolean, default: true },
    featuredBannerHtml: { type: String, trim: true, maxlength: 8000 },
    promoBannerHtml: { type: String, trim: true, maxlength: 8000 },
    items: { type: [MobileMenuItemSchema], default: [] },
    updatedAt: { type: Number, default: 0 },
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

const AnnouncementBarSettingsSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    position: { type: String, trim: true, enum: ["fixed", "sticky"], default: "fixed" },
    showOn: { type: String, trim: true, enum: ["all", "home_only"], default: "all" },
    heightPx: { type: Number, default: 36, min: 24, max: 120 },
    paddingX: { type: Number, default: 16, min: 0, max: 48 },
    paddingY: { type: Number, default: 6, min: 0, max: 24 },
    textAlign: { type: String, trim: true, enum: ["left", "center", "right"], default: "center" },
    textColor: { type: String, trim: true, default: "#ffffff" },
    background: {
      solid: { type: String, trim: true, default: "#0f172a" },
      gradientEnabled: { type: Boolean, default: false },
      gradientCss: { type: String, trim: true, default: "linear-gradient(90deg,#0f172a,#111827)" },
    },
    border: {
      enabled: { type: Boolean, default: false },
      color: { type: String, trim: true, default: "rgba(255,255,255,0.12)" },
      thicknessPx: { type: Number, default: 1, min: 0, max: 6 },
    },
    shadowEnabled: { type: Boolean, default: false },
    closeButtonEnabled: { type: Boolean, default: true },
    closeButtonVariant: { type: String, trim: true, enum: ["minimal", "pill"], default: "minimal" },
    dismissTtlHours: { type: Number, default: 24, min: 0, max: 720 },
    mode: {
      type: String,
      trim: true,
      enum: ["static", "slide", "fade", "marquee_ltr", "marquee_rtl"],
      default: "static",
    },
    marqueeSpeedPxPerSec: { type: Number, default: 60, min: 10, max: 600 },
    slideIntervalMs: { type: Number, default: 3500, min: 800, max: 30000 },
    transitionMs: { type: Number, default: 350, min: 100, max: 4000 },
    easing: { type: String, trim: true, default: "cubic-bezier(0.22, 1, 0.36, 1)" },
  },
  { _id: false }
);

const AnnouncementVisibilitySchema = new Schema(
  {
    device: { type: String, trim: true, enum: ["all", "desktop", "mobile"], default: "all" },
    pageMode: { type: String, trim: true, enum: ["all", "include", "exclude"], default: "all" },
    paths: { type: [String], default: [] },
  },
  { _id: false }
);

const AnnouncementScheduleSchema = new Schema(
  {
    startAt: { type: Number },
    endAt: { type: Number },
  },
  { _id: false }
);

const AnnouncementCtaSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    label: { type: String, trim: true, maxlength: 60 },
    href: { type: String, trim: true },
    newTab: { type: Boolean, default: false },
    style: {
      bg: { type: String, trim: true, default: "#ffffff" },
      text: { type: String, trim: true, default: "#0f172a" },
      hoverBg: { type: String, trim: true, default: "#e5e7eb" },
    },
  },
  { _id: false }
);

const AnnouncementItemSchema = new Schema(
  {
    id: { type: String, trim: true, index: true },
    enabled: { type: Boolean, default: true },
    html: { type: String, trim: true },
    href: { type: String, trim: true },
    newTab: { type: Boolean, default: false },
    schedule: { type: AnnouncementScheduleSchema, default: () => ({}) },
    visibility: { type: AnnouncementVisibilitySchema, default: () => ({}) },
    cta: { type: AnnouncementCtaSchema, default: () => ({}) },
  },
  { _id: true }
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
    heroBanners: { type: [BannerSchema], default: [] },
    heroBannerSettings: { type: HeroBannerSettingsSchema, default: () => ({}) },
    footerText: { type: String, trim: true, maxlength: 500 },
    footer: { type: FooterSchema, default: () => ({}) },
    globalSeoTitle: { type: String, trim: true, maxlength: 160 },
    globalSeoDescription: { type: String, trim: true, maxlength: 320 },
    branding: { type: BrandingSchema, default: () => ({}) },
    brandingUpdatedAt: { type: Number, default: 0 },
    tracking: { type: TrackingSettingsSchema, default: () => ({}) },
    share: { type: ShareSettingsSchema, default: () => ({}) },
    mobileMenu: { type: MobileMenuSettingsSchema, default: () => ({}) },
    whatsAppSalesPhone: { type: String, trim: true, maxlength: 40 },
    whatsAppProductTemplate: { type: String, trim: true, maxlength: 5000 },
    whatsAppOrderTemplate: { type: String, trim: true, maxlength: 5000 },
    returns: { type: ReturnsSettingsSchema, default: () => ({}) },
    inventory: { type: InventorySettingsSchema, default: () => ({}) },
    shipping: { type: ShippingSettingsSchema, default: () => ({}) },
    storefrontLayout: { type: StorefrontLayoutSchema, default: () => ({}) },
    cartUx: { type: CartUxSettingsSchema, default: () => ({}) },
    announcementBar: { type: AnnouncementBarSettingsSchema, default: () => ({}) },
    announcements: { type: [AnnouncementItemSchema], default: [] },
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
