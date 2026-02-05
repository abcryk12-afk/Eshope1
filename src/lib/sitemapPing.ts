import { absoluteUrl } from "@/lib/seo";

function isEnabled(v: string | undefined) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function timeoutSignal(ms: number) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  return {
    signal: ac.signal,
    cleanup: () => clearTimeout(t),
  };
}

function parseTargets(raw: string | undefined) {
  const v = String(raw ?? "").trim();
  if (!v) return null;

  const items = v
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  return items.length ? items : null;
}

export async function pingSitemapIfEnabled() {
  const enabled = isEnabled(process.env.SITEMAP_PING_ENABLED);
  if (!enabled) return;

  const allowDev = isEnabled(process.env.SITEMAP_PING_ALLOW_DEV);
  if (process.env.NODE_ENV !== "production" && !allowDev) return;

  const sitemapUrl = absoluteUrl("/sitemap.xml");

  const customTargets = parseTargets(process.env.SITEMAP_PING_TARGETS);
  const targets = customTargets ?? ["google", "bing"];

  const pingUrls = targets
    .map((t) => t.toLowerCase())
    .map((t) => {
      if (t === "google") return `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
      if (t === "bing") return `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
      if (t.startsWith("http://") || t.startsWith("https://")) return t;
      return "";
    })
    .filter(Boolean);

  if (!pingUrls.length) return;

  await Promise.all(
    pingUrls.map(async (url) => {
      const { signal, cleanup } = timeoutSignal(2500);

      try {
        await fetch(url, { method: "GET", signal });
      } catch {
        return;
      } finally {
        cleanup();
      }
    })
  );
}
