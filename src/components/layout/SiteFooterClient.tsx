"use client";

import Link from "next/link";
import { ChevronDown, Facebook, Instagram, Linkedin, Link2, Twitter, Youtube } from "lucide-react";

import { cn } from "@/lib/utils";
import { pickLocalizedText } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

import LanguageSwitcher from "./LanguageSwitcher";

type LocalizedText = Record<string, string | undefined>;

type FooterLink = {
  href?: string;
  label?: LocalizedText;
};

type FooterSection = {
  title?: LocalizedText;
  links?: FooterLink[];
};

type FooterSocialLink = {
  kind?: string;
  href?: string;
  label?: LocalizedText;
};

type FooterPayload = {
  text?: LocalizedText;
  sections?: FooterSection[];
  policyLinks?: FooterLink[];
  socialLinks?: FooterSocialLink[];
};

type FooterEcomLink = {
  id?: string;
  label?: string;
  href?: string;
  newTab?: boolean;
};

type FooterEcomColumn = {
  id?: string;
  title?: string;
  links?: FooterEcomLink[];
};

type FooterEcomTrustBadge = {
  id?: string;
  label?: string;
  imageUrl?: string;
  href?: string;
};

type FooterEcomSocialLink = {
  id?: string;
  kind?: string;
  href?: string;
};

type FooterEcomPayload = {
  enabled?: boolean;
  columns?: FooterEcomColumn[];
  showAppLinks?: boolean;
  appLinks?: {
    androidUrl?: string;
    iosUrl?: string;
    androidBadgeUrl?: string;
    iosBadgeUrl?: string;
  };
  showPaymentMethods?: boolean;
  paymentKinds?: string[];
  showTrustBadges?: boolean;
  trustBadges?: FooterEcomTrustBadge[];
  contact?: {
    email?: string;
    phone?: string;
    addressLines?: string[];
  };
  showSocialLinks?: boolean;
  socialLinks?: FooterEcomSocialLink[];
  newsletter?: {
    enabled?: boolean;
    title?: string;
    description?: string;
    placeholder?: string;
    buttonText?: string;
  };
  copyrightText?: string;
};

type Props = {
  footer: FooterPayload | null;
  footerEcom: FooterEcomPayload | null;
  legacyFooterText: string;
};

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

function SocialIcon({ kind }: { kind: string }) {
  const k = kind.toLowerCase();

  if (k.includes("instagram")) return <Instagram className="h-5 w-5" />;
  if (k.includes("facebook")) return <Facebook className="h-5 w-5" />;
  if (k.includes("twitter") || k === "x") return <Twitter className="h-5 w-5" />;
  if (k.includes("linkedin")) return <Linkedin className="h-5 w-5" />;
  if (k.includes("youtube")) return <Youtube className="h-5 w-5" />;

  return <Link2 className="h-5 w-5" />;
}

export default function SiteFooterClient({ footer, footerEcom, legacyFooterText }: Props) {
  const language = useAppSelector((s) => s.language);
  const lang = language.selected;
  const fallbackLang = "en";

  const footerText = pickLocalizedText(footer?.text, lang, fallbackLang) || legacyFooterText || "";

  const sections = Array.isArray(footer?.sections) ? footer?.sections ?? [] : [];
  const policyLinks = Array.isArray(footer?.policyLinks) ? footer?.policyLinks ?? [] : [];
  const socialLinks = Array.isArray(footer?.socialLinks) ? footer?.socialLinks ?? [] : [];

  const ecomEnabled = Boolean(footerEcom && footerEcom.enabled);

  if (!ecomEnabled) {
    if (!footerText && sections.length === 0 && policyLinks.length === 0 && socialLinks.length === 0) {
      return null;
    }

    return (
      <footer className="mt-12 border-t border-border bg-surface">
        <div className="mx-auto w-full max-w-6xl px-4 py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              {footerText ? <p className="text-sm text-muted-foreground">{footerText}</p> : null}

              {socialLinks.length ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {socialLinks
                    .filter((l) => typeof l?.href === "string" && String(l.href).trim())
                    .slice(0, 10)
                    .map((l, idx) => {
                      const href = String(l.href ?? "").trim();
                      const label =
                        pickLocalizedText(l.label, lang, fallbackLang) ||
                        String(l.kind ?? "Social").trim() ||
                        "Social";

                      const external = isExternalHref(href);

                      return (
                        <Link
                          key={`${href}:${idx}`}
                          href={href}
                          className={cn(
                            "inline-flex h-11 items-center gap-2 rounded-2xl border border-border bg-background px-4 text-sm font-medium text-foreground",
                            "hover:bg-muted"
                          )}
                          aria-label={label}
                          target={external ? "_blank" : undefined}
                          rel={external ? "noreferrer noopener" : undefined}
                        >
                          <SocialIcon kind={String(l.kind ?? "")} />
                          <span className="truncate">{label}</span>
                        </Link>
                      );
                    })}
                </div>
              ) : null}
            </div>

            <div className="shrink-0">
              <LanguageSwitcher variant="compact" />
            </div>
          </div>

          {sections.length ? (
            <div className="mt-8">
              <div className="hidden gap-6 md:grid md:grid-cols-2 lg:grid-cols-4">
                {sections
                  .filter((s) => Array.isArray(s.links) && (s.links ?? []).length > 0)
                  .slice(0, 8)
                  .map((s, idx) => {
                    const title = pickLocalizedText(s.title, lang, fallbackLang) || "";
                    const links = Array.isArray(s.links) ? (s.links ?? []) : [];

                    return (
                      <div key={idx} className="min-w-0">
                        {title ? <h3 className="text-sm font-semibold text-foreground">{title}</h3> : null}
                        <div className="mt-3 space-y-2">
                          {links
                            .filter((l) => typeof l?.href === "string" && String(l.href).trim())
                            .slice(0, 12)
                            .map((l, linkIdx) => {
                              const href = String(l.href ?? "").trim();
                              const label = pickLocalizedText(l.label, lang, fallbackLang) || href;
                              const external = isExternalHref(href);

                              return (
                                <Link
                                  key={`${href}:${linkIdx}`}
                                  href={href}
                                  className="block text-sm text-muted-foreground hover:text-foreground"
                                  target={external ? "_blank" : undefined}
                                  rel={external ? "noreferrer noopener" : undefined}
                                >
                                  {label}
                                </Link>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="space-y-2 md:hidden">
                {sections
                  .filter((s) => Array.isArray(s.links) && (s.links ?? []).length > 0)
                  .slice(0, 8)
                  .map((s, idx) => {
                    const title = pickLocalizedText(s.title, lang, fallbackLang) || "";
                    const links = Array.isArray(s.links) ? (s.links ?? []) : [];

                    return (
                      <details
                        key={idx}
                        className="group overflow-hidden rounded-2xl border border-border bg-background"
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4">
                          <span className="text-sm font-semibold text-foreground">{title || "Links"}</span>
                          <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180" />
                        </summary>

                        <div className="max-h-0 overflow-hidden px-4 pb-0 transition-all duration-300 group-open:max-h-96">
                          <div className="pb-4 pt-1">
                            {links
                              .filter((l) => typeof l?.href === "string" && String(l.href).trim())
                              .slice(0, 20)
                              .map((l, linkIdx) => {
                                const href = String(l.href ?? "").trim();
                                const label = pickLocalizedText(l.label, lang, fallbackLang) || href;
                                const external = isExternalHref(href);

                                return (
                                  <Link
                                    key={`${href}:${linkIdx}`}
                                    href={href}
                                    className="block rounded-xl px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                                    target={external ? "_blank" : undefined}
                                    rel={external ? "noreferrer noopener" : undefined}
                                  >
                                    {label}
                                  </Link>
                                );
                              })}
                          </div>
                        </div>
                      </details>
                    );
                  })}
              </div>
            </div>
          ) : null}

          {policyLinks.length ? (
            <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-6">
              {policyLinks
                .filter((l) => typeof l?.href === "string" && String(l.href).trim())
                .slice(0, 12)
                .map((l, idx) => {
                  const href = String(l.href ?? "").trim();
                  const label = pickLocalizedText(l.label, lang, fallbackLang) || href;
                  const external = isExternalHref(href);

                  return (
                    <Link
                      key={`${href}:${idx}`}
                      href={href}
                      className="text-sm text-muted-foreground hover:text-foreground"
                      target={external ? "_blank" : undefined}
                      rel={external ? "noreferrer noopener" : undefined}
                    >
                      {label}
                    </Link>
                  );
                })}
            </div>
          ) : null}
        </div>
      </footer>
    );
  }

  const columns = Array.isArray(footerEcom?.columns) ? footerEcom!.columns! : [];
  const showAppLinks = typeof footerEcom?.showAppLinks === "boolean" ? footerEcom!.showAppLinks! : true;
  const appLinks = footerEcom?.appLinks ?? {};
  const showPayments = typeof footerEcom?.showPaymentMethods === "boolean" ? footerEcom!.showPaymentMethods! : true;
  const paymentKinds = Array.isArray(footerEcom?.paymentKinds) ? footerEcom!.paymentKinds! : [];
  const showTrust = typeof footerEcom?.showTrustBadges === "boolean" ? footerEcom!.showTrustBadges! : true;
  const trustBadges = Array.isArray(footerEcom?.trustBadges) ? footerEcom!.trustBadges! : [];
  const contact = footerEcom?.contact ?? {};
  const showSocial = typeof footerEcom?.showSocialLinks === "boolean" ? footerEcom!.showSocialLinks! : true;
  const social = Array.isArray(footerEcom?.socialLinks) ? footerEcom!.socialLinks! : [];
  const newsletter = footerEcom?.newsletter ?? {};
  const copyright = String(footerEcom?.copyrightText ?? "").trim();

  return (
    <footer className="mt-12 border-t border-border bg-surface">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">
          <div>
            <div className="hidden gap-6 md:grid md:grid-cols-2 lg:grid-cols-4">
              {columns.slice(0, 8).map((c) => (
                <div key={c.id ?? c.title ?? "col"} className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{String(c.title ?? "").trim() || "Links"}</h3>
                  <div className="mt-3 space-y-2">
                    {(c.links ?? [])
                      .filter((l) => String(l.href ?? "").trim())
                      .slice(0, 12)
                      .map((l) => {
                        const href = String(l.href ?? "").trim();
                        const label = String(l.label ?? "").trim() || href;
                        const external = isExternalHref(href);
                        const newTab = Boolean(l.newTab) || external;

                        return (
                          <Link
                            key={l.id ?? href}
                            href={href}
                            className="block text-sm text-muted-foreground hover:text-foreground"
                            target={newTab ? "_blank" : undefined}
                            rel={newTab ? "noreferrer noopener" : undefined}
                          >
                            {label}
                          </Link>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 md:hidden">
              {columns.slice(0, 8).map((c) => (
                <details key={c.id ?? c.title ?? "col"} className="group overflow-hidden rounded-2xl border border-border bg-background">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4">
                    <span className="text-sm font-semibold text-foreground">{String(c.title ?? "").trim() || "Links"}</span>
                    <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="max-h-0 overflow-hidden px-4 pb-0 transition-all duration-300 group-open:max-h-96">
                    <div className="pb-4 pt-1">
                      {(c.links ?? [])
                        .filter((l) => String(l.href ?? "").trim())
                        .slice(0, 20)
                        .map((l) => {
                          const href = String(l.href ?? "").trim();
                          const label = String(l.label ?? "").trim() || href;
                          const external = isExternalHref(href);
                          const newTab = Boolean(l.newTab) || external;

                          return (
                            <Link
                              key={l.id ?? href}
                              href={href}
                              className="block rounded-xl px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                              target={newTab ? "_blank" : undefined}
                              rel={newTab ? "noreferrer noopener" : undefined}
                            >
                              {label}
                            </Link>
                          );
                        })}
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {newsletter.enabled ? (
              <div className="rounded-3xl border border-border bg-background p-4">
                <p className="text-sm font-semibold text-foreground">{String(newsletter.title ?? "Newsletter")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{String(newsletter.description ?? "")}</p>
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                  }}
                >
                  <input
                    className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm"
                    placeholder={String(newsletter.placeholder ?? "Enter your email")}
                    type="email"
                  />
                  <button
                    type="submit"
                    className="h-11 shrink-0 rounded-2xl bg-foreground px-4 text-sm font-semibold text-background"
                  >
                    {String(newsletter.buttonText ?? "Subscribe")}
                  </button>
                </form>
              </div>
            ) : null}

            {(String(contact.email ?? "").trim() || String(contact.phone ?? "").trim() || (contact.addressLines ?? []).length) ? (
              <div className="rounded-3xl border border-border bg-background p-4">
                <p className="text-sm font-semibold text-foreground">Contact</p>
                {String(contact.phone ?? "").trim() ? (
                  <p className="mt-2 text-sm text-muted-foreground">{String(contact.phone)}</p>
                ) : null}
                {String(contact.email ?? "").trim() ? (
                  <p className="mt-1 text-sm text-muted-foreground">{String(contact.email)}</p>
                ) : null}
                {(contact.addressLines ?? []).length ? (
                  <div className="mt-2 space-y-1">
                    {(contact.addressLines ?? []).slice(0, 4).map((x, i) => (
                      <p key={i} className="text-sm text-muted-foreground">{String(x)}</p>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {showAppLinks && (String(appLinks.androidUrl ?? "").trim() || String(appLinks.iosUrl ?? "").trim()) ? (
              <div className="rounded-3xl border border-border bg-background p-4">
                <p className="text-sm font-semibold text-foreground">Download our app</p>
                <div className="mt-3 grid gap-2">
                  {String(appLinks.androidUrl ?? "").trim() ? (
                    <Link
                      href={String(appLinks.androidUrl)}
                      className="inline-flex items-center justify-center rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold"
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      Google Play
                    </Link>
                  ) : null}
                  {String(appLinks.iosUrl ?? "").trim() ? (
                    <Link
                      href={String(appLinks.iosUrl)}
                      className="inline-flex items-center justify-center rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold"
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      App Store
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}

            {showPayments && paymentKinds.length ? (
              <div className="rounded-3xl border border-border bg-background p-4">
                <p className="text-sm font-semibold text-foreground">Payments</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {paymentKinds.slice(0, 12).map((k) => (
                    <span key={k} className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-foreground">
                      {String(k).toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {showTrust && trustBadges.length ? (
              <div className="rounded-3xl border border-border bg-background p-4">
                <p className="text-sm font-semibold text-foreground">Trust</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {trustBadges.slice(0, 6).map((b) => {
                    const href = String(b.href ?? "").trim();
                    const label = String(b.label ?? "").trim() || "Trusted";
                    return href ? (
                      <Link
                        key={b.id ?? label}
                        href={href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="rounded-2xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground"
                      >
                        {label}
                      </Link>
                    ) : (
                      <div
                        key={b.id ?? label}
                        className="rounded-2xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground"
                      >
                        {label}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {showSocial && social.length ? (
              <div className="rounded-3xl border border-border bg-background p-4">
                <p className="text-sm font-semibold text-foreground">Follow us</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {social
                    .filter((s) => String(s.href ?? "").trim())
                    .slice(0, 8)
                    .map((s) => {
                      const href = String(s.href ?? "").trim();
                      const kind = String(s.kind ?? "Social").trim() || "Social";
                      return (
                        <Link
                          key={s.id ?? href}
                          href={href}
                          className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border bg-surface px-4 text-sm font-semibold text-foreground"
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          <SocialIcon kind={kind} />
                          {kind}
                        </Link>
                      );
                    })}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-muted-foreground">{copyright || `© ${new Date().getFullYear()}`}</div>
          <div className="shrink-0">
            <LanguageSwitcher variant="compact" />
          </div>
        </div>
      </div>
    </footer>
  );
}
