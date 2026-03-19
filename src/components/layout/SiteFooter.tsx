import SiteFooterGate from "@/components/layout/SiteFooterGate";
import { dbConnect } from "@/lib/db";
import SiteSetting from "@/models/SiteSetting";

export const runtime = "nodejs";

export default async function SiteFooter() {
  try {
    await dbConnect();

    const doc = (await SiteSetting.findOne({ key: "global" }).select("footer footerText footerEcom").lean()) as unknown;
    const root = (doc && typeof doc === "object" ? (doc as Record<string, unknown>) : null) as
      | Record<string, unknown>
      | null;

    const footer = (root?.footer && typeof root.footer === "object" ? (root.footer as Record<string, unknown>) : null) as
      | Record<string, unknown>
      | null;

    const footerText = typeof root?.footerText === "string" ? root.footerText : "";

    const footerEcom =
      (root?.footerEcom && typeof root.footerEcom === "object" ? (root.footerEcom as Record<string, unknown>) : null) as
        | Record<string, unknown>
        | null;

    return <SiteFooterGate footer={footer} footerEcom={footerEcom} legacyFooterText={footerText} />;
  } catch {
    return <SiteFooterGate footer={null} footerEcom={null} legacyFooterText="" />;
  }
}
