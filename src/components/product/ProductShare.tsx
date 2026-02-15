"use client";

import { useMemo } from "react";
import { toast } from "sonner";

import Button from "@/components/ui/Button";

type Props = {
  name: string;
  image?: string;
  priceText?: string;
};

function safeStr(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function encodeUrl(u: string) {
  return encodeURIComponent(u);
}

function buildText(args: { name: string; priceText?: string; url: string }) {
  const parts = [args.name, args.priceText ? `Price: ${args.priceText}` : "", args.url].filter(Boolean);
  return parts.join("\n");
}

export default function ProductShare({ name, image, priceText }: Props) {
  const url = typeof window !== "undefined" ? window.location.href : "";

  const payload = useMemo(() => {
    const title = safeStr(name) || "Product";
    const u = safeStr(url);
    const text = u ? buildText({ name: title, priceText: safeStr(priceText), url: u }) : title;

    return {
      title,
      url: u,
      text,
      image: safeStr(image),
    };
  }, [name, url, priceText, image]);

  async function copyLink() {
    if (!payload.url) return;

    try {
      await navigator.clipboard.writeText(payload.url);
      toast.success("Link copied");
    } catch {
      try {
        const el = document.createElement("textarea");
        el.value = payload.url;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        el.remove();
        toast.success("Link copied");
      } catch {
        toast.error("Could not copy link");
      }
    }
  }

  async function nativeShare() {
    if (!payload.url) return;

    const nav = navigator as unknown as { share?: (data: { title?: string; text?: string; url?: string }) => Promise<void> };
    if (typeof nav.share !== "function") {
      toast.error("Share is not supported on this device");
      return;
    }

    try {
      await nav.share({ title: payload.title, text: payload.text, url: payload.url });
    } catch {
      return;
    }
  }

  const encodedUrl = payload.url ? encodeUrl(payload.url) : "";
  const encodedText = payload.text ? encodeUrl(payload.text) : "";

  const links = {
    whatsapp: payload.url ? `https://wa.me/?text=${encodedText || encodedUrl}` : "",
    facebook: payload.url ? `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` : "",
    twitter: payload.url ? `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}` : "",
    telegram: payload.url ? `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}` : "",
  };

  return (
    <div className="rounded-3xl border border-border bg-surface p-4">
      <div className="text-sm font-semibold text-foreground">Share</div>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
        <a href={links.whatsapp} target="_blank" rel="noreferrer noopener">
          <Button type="button" variant="secondary" className="w-full">WhatsApp</Button>
        </a>
        <a href={links.facebook} target="_blank" rel="noreferrer noopener">
          <Button type="button" variant="secondary" className="w-full">Facebook</Button>
        </a>
        <a href={links.twitter} target="_blank" rel="noreferrer noopener">
          <Button type="button" variant="secondary" className="w-full">Twitter</Button>
        </a>
        <a href={links.telegram} target="_blank" rel="noreferrer noopener">
          <Button type="button" variant="secondary" className="w-full">Telegram</Button>
        </a>
        <Button type="button" variant="secondary" className="w-full" onClick={copyLink}>Copy Link</Button>
        <Button type="button" variant="secondary" className="w-full" onClick={nativeShare}>Share…</Button>
      </div>
    </div>
  );
}
