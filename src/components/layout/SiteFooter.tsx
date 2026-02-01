import SiteFooterGate from "@/components/layout/SiteFooterGate";
import { dbConnect } from "@/lib/db";
import SiteSetting from "@/models/SiteSetting";

export const runtime = "nodejs";

export default async function SiteFooter() {
  try {
    await dbConnect();

    const doc = (await SiteSetting.findOne({ key: "global" }).select("footer footerText").lean()) as unknown;
    const root = (doc && typeof doc === "object" ? (doc as Record<string, unknown>) : null) as
      | Record<string, unknown>
      | null;

    const footer = (root?.footer && typeof root.footer === "object" ? (root.footer as Record<string, unknown>) : null) as
      | Record<string, unknown>
      | null;

    const footerText = typeof root?.footerText === "string" ? root.footerText : "";

    return <SiteFooterGate footer={footer} legacyFooterText={footerText} />;
  } catch {
    return <SiteFooterGate footer={null} legacyFooterText="" />;
  }
}
