import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Product from "@/models/Product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

type Severity = "error" | "warn";

type SeoIssue = {
  code:
    | "missing_seo_title"
    | "missing_seo_description"
    | "seo_title_too_long"
    | "seo_description_too_long"
    | "missing_og_title"
    | "missing_og_description"
    | "noindex_with_canonical"
    | "missing_canonical"
    | "missing_images";
  severity: Severity;
  message: string;
};

type AuditItem = {
  id: string;
  title: string;
  slug: string;
  category: string;
  isActive: boolean;
  issues: SeoIssue[];
};

async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { ok: false as const, res: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }

  if (!ADMIN_ROLE_SET.has(session.user.role)) {
    return { ok: false as const, res: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true as const };
}

function buildIssues(p: {
  title?: string;
  images?: string[];
  seo?: {
    title?: string;
    description?: string;
    ogTitle?: string;
    ogDescription?: string;
    canonicalUrl?: string;
    noIndex?: boolean;
  };
}) {
  const issues: SeoIssue[] = [];

  const seoTitle = String(p.seo?.title ?? "").trim();
  const seoDesc = String(p.seo?.description ?? "").trim();
  const ogTitle = String(p.seo?.ogTitle ?? "").trim();
  const ogDesc = String(p.seo?.ogDescription ?? "").trim();
  const canonical = String(p.seo?.canonicalUrl ?? "").trim();
  const noIndex = Boolean(p.seo?.noIndex);

  if (!seoTitle) {
    issues.push({
      code: "missing_seo_title",
      severity: "warn",
      message: "SEO title is empty (will fall back to generated title).",
    });
  } else if (seoTitle.length > 60) {
    issues.push({
      code: "seo_title_too_long",
      severity: "warn",
      message: `SEO title is ${seoTitle.length} chars (recommended ~50–60).`,
    });
  }

  if (!seoDesc) {
    issues.push({
      code: "missing_seo_description",
      severity: "warn",
      message: "SEO description is empty (will fall back to generated description).",
    });
  } else if (seoDesc.length > 160) {
    issues.push({
      code: "seo_description_too_long",
      severity: "warn",
      message: `SEO description is ${seoDesc.length} chars (recommended ~120–160).`,
    });
  }

  if (!ogTitle) {
    issues.push({
      code: "missing_og_title",
      severity: "warn",
      message: "OG title is empty (will fall back).",
    });
  }

  if (!ogDesc) {
    issues.push({
      code: "missing_og_description",
      severity: "warn",
      message: "OG description is empty (will fall back).",
    });
  }

  if (noIndex && canonical) {
    issues.push({
      code: "noindex_with_canonical",
      severity: "warn",
      message: "noindex is enabled but canonicalUrl is set (ensure this is intentional).",
    });
  }

  if (!noIndex && !canonical) {
    issues.push({
      code: "missing_canonical",
      severity: "warn",
      message: "canonicalUrl is empty (will fall back to generated canonical).",
    });
  }

  const images = Array.isArray(p.images) ? p.images : [];
  if (images.length === 0) {
    issues.push({
      code: "missing_images",
      severity: "error",
      message: "Product has no images.",
    });
  }

  return issues;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  await dbConnect();

  const products = await Product.find({})
    .select("title slug category isActive images seo")
    .sort({ createdAt: -1 })
    .lean();

  const items: AuditItem[] = products.map((p) => {
    const issues = buildIssues(p as unknown as Parameters<typeof buildIssues>[0]);

    return {
      id: String((p as { _id?: unknown })._id ?? ""),
      title: String((p as { title?: string }).title ?? ""),
      slug: String((p as { slug?: string }).slug ?? ""),
      category: String((p as { category?: string }).category ?? ""),
      isActive: Boolean((p as { isActive?: boolean }).isActive),
      issues,
    };
  });

  const totals = items.reduce(
    (acc, item) => {
      acc.products += 1;
      if (item.issues.length > 0) acc.flagged += 1;
      for (const issue of item.issues) {
        if (issue.severity === "error") acc.errors += 1;
        else acc.warnings += 1;
      }
      return acc;
    },
    { products: 0, flagged: 0, errors: 0, warnings: 0 }
  );

  return NextResponse.json({ generatedAt: Date.now(), totals, items }, { headers: { "Cache-Control": "no-store" } });
}
