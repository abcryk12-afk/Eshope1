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

type Props = {
  footer: FooterPayload | null;
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

export default function SiteFooterClient({ footer, legacyFooterText }: Props) {
  const language = useAppSelector((s) => s.language);
  const lang = language.selected;
  const fallbackLang = "en";

  const footerText = pickLocalizedText(footer?.text, lang, fallbackLang) || legacyFooterText || "";

  const sections = Array.isArray(footer?.sections) ? footer?.sections ?? [] : [];
  const policyLinks = Array.isArray(footer?.policyLinks) ? footer?.policyLinks ?? [] : [];
  const socialLinks = Array.isArray(footer?.socialLinks) ? footer?.socialLinks ?? [] : [];

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
