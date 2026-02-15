"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import type {
  FooterSection as FooterSectionT,
  FooterLink,
  FooterLinksData,
  FooterNewsletterData,
  FooterSocialData,
  FooterPaymentIconsData,
  FooterCompanyInfoData,
  FooterContactInfoData,
  FooterAppDownloadData,
  FooterLegalData,
  FooterCustomHtmlData,
} from "@/store/footerSlice";

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

function LinkItem({ link, className }: { link: FooterLink; className?: string }) {
  const href = String(link.href ?? "").trim();
  const label = String(link.label ?? "").trim() || href;
  const external = isExternalHref(href);

  if (!href) return null;

  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
        className
      )}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer noopener" : undefined}
    >
      <span className="relative">
        {label}
        <span
          className={cn(
            "pointer-events-none absolute -bottom-0.5 left-0 h-px w-0 bg-current transition-all duration-200",
            "group-hover:w-full"
          )}
        />
      </span>
    </Link>
  );
}

function SectionTitle({ title, align }: { title?: string; align: "left" | "center" | "right" }) {
  if (!title) return null;
  return (
    <h3
      className={cn(
        "text-sm font-semibold text-foreground",
        align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"
      )}
    >
      {title}
    </h3>
  );
}

function renderLinks(data: FooterLinksData, align: "left" | "center" | "right") {
  const links = Array.isArray(data.links) ? data.links : [];
  const cols = Math.min(3, Math.max(1, Number(data.columns ?? 1)));

  return (
    <div
      className={cn(
        "mt-3 grid gap-2",
        cols === 1 ? "grid-cols-1" : cols === 2 ? "grid-cols-2" : "grid-cols-3",
        align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"
      )}
    >
      {links.map((l) => (
        <LinkItem
          key={l.id}
          link={l}
          className={align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start"}
        />
      ))}
    </div>
  );
}

function renderNewsletter(data: FooterNewsletterData, align: "left" | "center" | "right") {
  const description = String(data.description ?? "").trim();
  const placeholder = String(data.placeholder ?? "Enter your email");
  const buttonText = String(data.buttonText ?? "Subscribe");

  return (
    <div className="mt-3">
      {description ? (
        <p
          className={cn(
            "text-sm text-muted-foreground",
            align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"
          )}
        >
          {description}
        </p>
      ) : null}

      <form
        className={cn(
          "mt-3 flex w-full gap-2",
          align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start"
        )}
        onSubmit={(e) => e.preventDefault()}
      >
        <input
          className="h-11 w-full max-w-xs rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition-colors focus:border-foreground"
          placeholder={placeholder}
          type="email"
          autoComplete="email"
        />
        <button
          type="submit"
          className="h-11 shrink-0 rounded-2xl bg-foreground px-4 text-sm font-semibold text-background transition-opacity hover:opacity-90"
        >
          {buttonText}
        </button>
      </form>
    </div>
  );
}

function renderSocial(data: FooterSocialData, align: "left" | "center" | "right") {
  const links = Array.isArray(data.links) ? data.links : [];
  return (
    <div
      className={cn(
        "mt-3 flex flex-wrap gap-2",
        align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start"
      )}
    >
      {links
        .filter((l) => typeof l?.href === "string" && String(l.href).trim())
        .slice(0, 12)
        .map((l) => {
          const href = String(l.href ?? "").trim();
          const label = String(l.label ?? "Social").trim() || "Social";
          const external = isExternalHref(href);

          return (
            <Link
              key={l.id}
              href={href}
              className={cn(
                "inline-flex h-11 items-center rounded-2xl border border-border bg-background px-4 text-sm font-medium",
                "transition-colors hover:bg-muted"
              )}
              target={external ? "_blank" : undefined}
              rel={external ? "noreferrer noopener" : undefined}
            >
              {label}
            </Link>
          );
        })}
    </div>
  );
}

function renderPaymentIcons(data: FooterPaymentIconsData, align: "left" | "center" | "right") {
  const kinds = Array.isArray(data.kinds) ? data.kinds : [];

  return (
    <div
      className={cn(
        "mt-3 flex flex-wrap gap-2",
        align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start"
      )}
    >
      {kinds.slice(0, 12).map((k, idx) => (
        <span
          key={`${k}:${idx}`}
          className="inline-flex h-10 items-center rounded-2xl border border-border bg-background px-3 text-xs font-semibold uppercase text-muted-foreground"
        >
          {String(k)}
        </span>
      ))}
    </div>
  );
}

function renderCompanyInfo(data: FooterCompanyInfoData, align: "left" | "center" | "right") {
  const storeName = String(data.storeName ?? "").trim();
  const description = String(data.description ?? "").trim();

  return (
    <div className="mt-3">
      {storeName ? (
        <div
          className={cn(
            "text-base font-semibold text-foreground",
            align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"
          )}
        >
          {storeName}
        </div>
      ) : null}
      {description ? (
        <p
          className={cn(
            "mt-2 text-sm text-muted-foreground",
            align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

function renderContactInfo(data: FooterContactInfoData, align: "left" | "center" | "right") {
  const email = String(data.email ?? "").trim();
  const phone = String(data.phone ?? "").trim();
  const lines = Array.isArray(data.addressLines) ? data.addressLines : [];

  return (
    <div
      className={cn(
        "mt-3 space-y-2 text-sm text-muted-foreground",
        align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"
      )}
    >
      {email ? (
        <div>
          <span className="font-medium text-foreground">Email:</span> {email}
        </div>
      ) : null}
      {phone ? (
        <div>
          <span className="font-medium text-foreground">Phone:</span> {phone}
        </div>
      ) : null}
      {lines.length ? <div>{lines.join(", ")}</div> : null}
    </div>
  );
}

function renderAppDownload(data: FooterAppDownloadData, align: "left" | "center" | "right") {
  const iosUrl = String(data.iosUrl ?? "").trim();
  const androidUrl = String(data.androidUrl ?? "").trim();

  return (
    <div
      className={cn(
        "mt-3 flex flex-wrap gap-2",
        align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start"
      )}
    >
      {iosUrl ? (
        <Link
          href={iosUrl}
          className="inline-flex h-11 items-center rounded-2xl border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
          target="_blank"
          rel="noreferrer noopener"
        >
          iOS
        </Link>
      ) : null}
      {androidUrl ? (
        <Link
          href={androidUrl}
          className="inline-flex h-11 items-center rounded-2xl border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
          target="_blank"
          rel="noreferrer noopener"
        >
          Android
        </Link>
      ) : null}
    </div>
  );
}

function renderLegal(data: FooterLegalData, align: "left" | "center" | "right") {
  const year = String(new Date().getFullYear());
  const text = String(data.copyrightText ?? "").replaceAll("{year}", year).trim();
  const links = Array.isArray(data.links) ? data.links : [];

  return (
    <div className="mt-8 border-t border-border pt-6">
      <div
        className={cn(
          "flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between",
          align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"
        )}
      >
        {text ? <div className="min-w-0">{text}</div> : <div />}
        {links.length ? (
          <div
            className={cn(
              "flex flex-wrap gap-x-4 gap-y-2",
              align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start"
            )}
          >
            {links.map((l) => (
              <LinkItem key={l.id} link={l} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function renderCustomHtml(data: FooterCustomHtmlData, align: "left" | "center" | "right") {
  const html = String(data.html ?? "");
  if (!html.trim()) return null;

  return (
    <div
      className={cn(
        "mt-3 text-sm text-muted-foreground",
        align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function FooterSection({ section, align }: { section: FooterSectionT; align: "left" | "center" | "right" }) {
  if (!section.enabled) return null;

  if (section.type === "legal") {
    return renderLegal(section.data as FooterLegalData, align);
  }

  return (
    <div className="min-w-0">
      <SectionTitle title={section.title} align={align} />

      {section.type === "links" ? renderLinks(section.data as FooterLinksData, align) : null}
      {section.type === "newsletter" ? renderNewsletter(section.data as FooterNewsletterData, align) : null}
      {section.type === "social" ? renderSocial(section.data as FooterSocialData, align) : null}
      {section.type === "paymentIcons" ? renderPaymentIcons(section.data as FooterPaymentIconsData, align) : null}
      {section.type === "companyInfo" ? renderCompanyInfo(section.data as FooterCompanyInfoData, align) : null}
      {section.type === "contactInfo" ? renderContactInfo(section.data as FooterContactInfoData, align) : null}
      {section.type === "appDownload" ? renderAppDownload(section.data as FooterAppDownloadData, align) : null}
      {section.type === "customHTML" ? renderCustomHtml(section.data as FooterCustomHtmlData, align) : null}
    </div>
  );
}
