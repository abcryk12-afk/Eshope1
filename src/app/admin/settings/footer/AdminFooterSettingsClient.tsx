"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";

type FooterEcomLink = {
  id: string;
  label: string;
  href: string;
  newTab?: boolean;
};

type FooterEcomColumn = {
  id: string;
  title: string;
  links: FooterEcomLink[];
};

type FooterEcomTrustBadge = {
  id: string;
  label: string;
  imageUrl: string;
  href?: string;
};

type FooterEcomSocialLink = {
  id: string;
  kind: string;
  href: string;
};

type FooterEcomSettings = {
  enabled: boolean;
  columns: FooterEcomColumn[];

  showAppLinks: boolean;
  appLinks: {
    androidUrl?: string;
    iosUrl?: string;
    androidBadgeUrl?: string;
    iosBadgeUrl?: string;
  };

  showPaymentMethods: boolean;
  paymentKinds: string[];

  showTrustBadges: boolean;
  trustBadges: FooterEcomTrustBadge[];

  contact: {
    email?: string;
    phone?: string;
    addressLines?: string[];
  };

  showSocialLinks: boolean;
  socialLinks: FooterEcomSocialLink[];

  newsletter: {
    enabled: boolean;
    title?: string;
    description?: string;
    placeholder?: string;
    buttonText?: string;
  };

  copyrightText: string;
  updatedAt?: number;
};

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function emptySettings(): FooterEcomSettings {
  return {
    enabled: false,
    columns: [],
    showAppLinks: true,
    appLinks: {},
    showPaymentMethods: true,
    paymentKinds: [],
    showTrustBadges: true,
    trustBadges: [],
    contact: { email: "", phone: "", addressLines: [] },
    showSocialLinks: true,
    socialLinks: [],
    newsletter: {
      enabled: true,
      title: "Newsletter",
      description: "Subscribe for updates and deals.",
      placeholder: "Enter your email",
      buttonText: "Subscribe",
    },
    copyrightText: "",
    updatedAt: 0,
  };
}

function normalizeResponse(json: unknown): FooterEcomSettings {
  if (!json || typeof json !== "object") return emptySettings();
  const root = json as Record<string, unknown>;
  const raw = root.footerEcom && typeof root.footerEcom === "object" ? (root.footerEcom as Record<string, unknown>) : {};

  const columnsRaw = Array.isArray(raw.columns) ? (raw.columns as unknown[]) : [];
  const columns: FooterEcomColumn[] = columnsRaw
    .filter((x) => x && typeof x === "object")
    .map((x) => x as Record<string, unknown>)
    .map((c) => {
      const linksRaw = Array.isArray(c.links) ? (c.links as unknown[]) : [];
      const links: FooterEcomLink[] = linksRaw
        .filter((l) => l && typeof l === "object")
        .map((l) => l as Record<string, unknown>)
        .map((l) => ({
          id: typeof l.id === "string" && l.id.trim() ? l.id : uid("fl"),
          label: typeof l.label === "string" ? l.label : "",
          href: typeof l.href === "string" ? l.href : "",
          newTab: typeof l.newTab === "boolean" ? l.newTab : false,
        }));

      return {
        id: typeof c.id === "string" && c.id.trim() ? c.id : uid("fc"),
        title: typeof c.title === "string" ? c.title : "",
        links,
      };
    });

  const trustBadgesRaw = Array.isArray(raw.trustBadges) ? (raw.trustBadges as unknown[]) : [];
  const trustBadges: FooterEcomTrustBadge[] = trustBadgesRaw
    .filter((x) => x && typeof x === "object")
    .map((x) => x as Record<string, unknown>)
    .map((b) => ({
      id: typeof b.id === "string" && b.id.trim() ? b.id : uid("tb"),
      label: typeof b.label === "string" ? b.label : "",
      imageUrl: typeof b.imageUrl === "string" ? b.imageUrl : "",
      href: typeof b.href === "string" ? b.href : "",
    }));

  const socialRaw = Array.isArray(raw.socialLinks) ? (raw.socialLinks as unknown[]) : [];
  const socialLinks: FooterEcomSocialLink[] = socialRaw
    .filter((x) => x && typeof x === "object")
    .map((x) => x as Record<string, unknown>)
    .map((s) => ({
      id: typeof s.id === "string" && s.id.trim() ? s.id : uid("sl"),
      kind: typeof s.kind === "string" ? s.kind : "",
      href: typeof s.href === "string" ? s.href : "",
    }));

  const paymentKinds = Array.isArray(raw.paymentKinds) ? (raw.paymentKinds as unknown[]).map((x) => String(x)).filter(Boolean) : [];

  const appLinks = raw.appLinks && typeof raw.appLinks === "object" ? (raw.appLinks as Record<string, unknown>) : {};
  const contact = raw.contact && typeof raw.contact === "object" ? (raw.contact as Record<string, unknown>) : {};
  const newsletter = raw.newsletter && typeof raw.newsletter === "object" ? (raw.newsletter as Record<string, unknown>) : {};

  return {
    ...emptySettings(),
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : false,
    columns,
    showAppLinks: typeof raw.showAppLinks === "boolean" ? raw.showAppLinks : true,
    appLinks: {
      androidUrl: typeof appLinks.androidUrl === "string" ? appLinks.androidUrl : "",
      iosUrl: typeof appLinks.iosUrl === "string" ? appLinks.iosUrl : "",
      androidBadgeUrl: typeof appLinks.androidBadgeUrl === "string" ? appLinks.androidBadgeUrl : "",
      iosBadgeUrl: typeof appLinks.iosBadgeUrl === "string" ? appLinks.iosBadgeUrl : "",
    },
    showPaymentMethods: typeof raw.showPaymentMethods === "boolean" ? raw.showPaymentMethods : true,
    paymentKinds,
    showTrustBadges: typeof raw.showTrustBadges === "boolean" ? raw.showTrustBadges : true,
    trustBadges,
    contact: {
      email: typeof contact.email === "string" ? contact.email : "",
      phone: typeof contact.phone === "string" ? contact.phone : "",
      addressLines: Array.isArray(contact.addressLines)
        ? (contact.addressLines as unknown[]).map((x) => String(x)).filter(Boolean)
        : [],
    },
    showSocialLinks: typeof raw.showSocialLinks === "boolean" ? raw.showSocialLinks : true,
    socialLinks,
    newsletter: {
      enabled: typeof newsletter.enabled === "boolean" ? newsletter.enabled : true,
      title: typeof newsletter.title === "string" ? newsletter.title : "Newsletter",
      description: typeof newsletter.description === "string" ? newsletter.description : "Subscribe for updates and deals.",
      placeholder: typeof newsletter.placeholder === "string" ? newsletter.placeholder : "Enter your email",
      buttonText: typeof newsletter.buttonText === "string" ? newsletter.buttonText : "Subscribe",
    },
    copyrightText: typeof raw.copyrightText === "string" ? raw.copyrightText : "",
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : 0,
  };
}

export default function AdminFooterSettingsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<FooterEcomSettings | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/footer-settings", { cache: "no-store" });
    if (!res.ok) {
      toast.error("Failed to load footer settings");
      setSettings(null);
      setLoading(false);
      return;
    }

    const json = (await res.json().catch(() => null)) as unknown;
    setSettings(normalizeResponse(json));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const canEdit = useMemo(() => Boolean(settings && !saving), [settings, saving]);

  async function save() {
    if (!settings) return;
    setSaving(true);

    const res = await fetch("/api/admin/footer-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });

    const json = (await res.json().catch(() => null)) as unknown;

    if (!res.ok) {
      const msg = json && typeof json === "object" && typeof (json as Record<string, unknown>).message === "string"
        ? String((json as Record<string, unknown>).message)
        : "Failed to save";
      toast.error(msg);
      setSaving(false);
      return;
    }

    setSettings(normalizeResponse(json));
    toast.success("Saved");
    setSaving(false);
  }

  function addColumn() {
    setSettings((s) => {
      if (!s) return s;
      const next: FooterEcomColumn = { id: uid("fc"), title: "New column", links: [] };
      return { ...s, columns: [...s.columns, next] };
    });
  }

  function removeColumn(id: string) {
    setSettings((s) => (s ? { ...s, columns: s.columns.filter((c) => c.id !== id) } : s));
  }

  function patchColumn(id: string, patch: Partial<FooterEcomColumn>) {
    setSettings((s) => (s ? { ...s, columns: s.columns.map((c) => (c.id === id ? { ...c, ...patch } : c)) } : s));
  }

  function addLink(colId: string) {
    setSettings((s) => {
      if (!s) return s;
      return {
        ...s,
        columns: s.columns.map((c) =>
          c.id === colId
            ? { ...c, links: [...c.links, { id: uid("fl"), label: "New link", href: "/", newTab: false }] }
            : c
        ),
      };
    });
  }

  function removeLink(colId: string, linkId: string) {
    setSettings((s) => {
      if (!s) return s;
      return {
        ...s,
        columns: s.columns.map((c) => (c.id === colId ? { ...c, links: c.links.filter((l) => l.id !== linkId) } : c)),
      };
    });
  }

  function patchLink(colId: string, linkId: string, patch: Partial<FooterEcomLink>) {
    setSettings((s) => {
      if (!s) return s;
      return {
        ...s,
        columns: s.columns.map((c) =>
          c.id === colId
            ? { ...c, links: c.links.map((l) => (l.id === linkId ? { ...l, ...patch } : l)) }
            : c
        ),
      };
    });
  }

  function addTrustBadge() {
    setSettings((s) => {
      if (!s) return s;
      return { ...s, trustBadges: [...s.trustBadges, { id: uid("tb"), label: "Secure Checkout", imageUrl: "", href: "" }] };
    });
  }

  function patchTrustBadge(id: string, patch: Partial<FooterEcomTrustBadge>) {
    setSettings((s) => (s ? { ...s, trustBadges: s.trustBadges.map((b) => (b.id === id ? { ...b, ...patch } : b)) } : s));
  }

  function removeTrustBadge(id: string) {
    setSettings((s) => (s ? { ...s, trustBadges: s.trustBadges.filter((b) => b.id !== id) } : s));
  }

  function addSocial() {
    setSettings((s) => {
      if (!s) return s;
      return { ...s, socialLinks: [...s.socialLinks, { id: uid("sl"), kind: "Instagram", href: "" }] };
    });
  }

  function patchSocial(id: string, patch: Partial<FooterEcomSocialLink>) {
    setSettings((s) => (s ? { ...s, socialLinks: s.socialLinks.map((x) => (x.id === id ? { ...x, ...patch } : x)) } : s));
  }

  function removeSocial(id: string) {
    setSettings((s) => (s ? { ...s, socialLinks: s.socialLinks.filter((x) => x.id !== id) } : s));
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Footer settings not available.</p>
        <Button type="button" variant="secondary" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Footer Settings</h1>
          <p className="text-sm text-muted-foreground">Build a dynamic ecommerce footer (Daraz/Shopify style).</p>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => void load()} disabled={saving}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-surface p-4">
        <label className="flex items-center justify-between gap-3 text-sm font-semibold">
          <div>
            <div>Enable new footer</div>
            <div className="text-xs text-muted-foreground">If disabled, the current footer stays unchanged.</div>
          </div>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setSettings((s) => (s ? { ...s, enabled: e.target.checked } : s))}
            disabled={!canEdit}
          />
        </label>
      </div>

      <div className="rounded-3xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Link columns</p>
          <Button type="button" variant="secondary" size="sm" onClick={addColumn} disabled={!canEdit}>
            Add Column
          </Button>
        </div>

        {settings.columns.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No columns yet.</p>
        ) : (
          <div className="mt-3 grid gap-3">
            {settings.columns.map((col) => (
              <div key={col.id} className="rounded-3xl border border-border bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Input
                    value={col.title}
                    onChange={(e) => patchColumn(col.id, { title: e.target.value })}
                    className="h-10"
                    placeholder="Column title"
                    disabled={!canEdit}
                  />
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => addLink(col.id)} disabled={!canEdit}>
                      Add Link
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="border border-border" onClick={() => removeColumn(col.id)} disabled={!canEdit}>
                      Delete
                    </Button>
                  </div>
                </div>

                {col.links.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No links.</p>
                ) : (
                  <div className="mt-3 grid gap-2">
                    {col.links.map((l) => (
                      <div key={l.id} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
                        <Input
                          value={l.label}
                          onChange={(e) => patchLink(col.id, l.id, { label: e.target.value })}
                          className="h-10"
                          placeholder="Label"
                          disabled={!canEdit}
                        />
                        <Input
                          value={l.href}
                          onChange={(e) => patchLink(col.id, l.id, { href: e.target.value })}
                          className="h-10"
                          placeholder="/path or https://..."
                          disabled={!canEdit}
                        />
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={Boolean(l.newTab)}
                              onChange={(e) => patchLink(col.id, l.id, { newTab: e.target.checked })}
                              disabled={!canEdit}
                            />
                            New tab
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="border border-border"
                            onClick={() => removeLink(col.id, l.id)}
                            disabled={!canEdit}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-surface p-4">
          <label className="flex items-center justify-between gap-3 text-sm font-semibold">
            Show App Download
            <input
              type="checkbox"
              checked={settings.showAppLinks}
              onChange={(e) => setSettings((s) => (s ? { ...s, showAppLinks: e.target.checked } : s))}
              disabled={!canEdit}
            />
          </label>
          <div className={"mt-3 grid gap-2 " + (settings.showAppLinks ? "" : "opacity-60")}
          >
            <Input
              value={settings.appLinks.androidUrl ?? ""}
              onChange={(e) => setSettings((s) => (s ? { ...s, appLinks: { ...s.appLinks, androidUrl: e.target.value } } : s))}
              className="h-10"
              placeholder="Android app URL"
              disabled={!canEdit || !settings.showAppLinks}
            />
            <Input
              value={settings.appLinks.iosUrl ?? ""}
              onChange={(e) => setSettings((s) => (s ? { ...s, appLinks: { ...s.appLinks, iosUrl: e.target.value } } : s))}
              className="h-10"
              placeholder="iOS app URL"
              disabled={!canEdit || !settings.showAppLinks}
            />
            <Input
              value={settings.appLinks.androidBadgeUrl ?? ""}
              onChange={(e) => setSettings((s) => (s ? { ...s, appLinks: { ...s.appLinks, androidBadgeUrl: e.target.value } } : s))}
              className="h-10"
              placeholder="Google Play badge image URL (optional)"
              disabled={!canEdit || !settings.showAppLinks}
            />
            <Input
              value={settings.appLinks.iosBadgeUrl ?? ""}
              onChange={(e) => setSettings((s) => (s ? { ...s, appLinks: { ...s.appLinks, iosBadgeUrl: e.target.value } } : s))}
              className="h-10"
              placeholder="App Store badge image URL (optional)"
              disabled={!canEdit || !settings.showAppLinks}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-4">
          <label className="flex items-center justify-between gap-3 text-sm font-semibold">
            Show Payment Methods
            <input
              type="checkbox"
              checked={settings.showPaymentMethods}
              onChange={(e) => setSettings((s) => (s ? { ...s, showPaymentMethods: e.target.checked } : s))}
              disabled={!canEdit}
            />
          </label>
          <p className="mt-2 text-xs text-muted-foreground">Enter comma-separated kinds (e.g. visa, mastercard, cod, easypaisa).</p>
          <Input
            value={settings.paymentKinds.join(", ")}
            onChange={(e) =>
              setSettings((s) =>
                s
                  ? {
                      ...s,
                      paymentKinds: e.target.value
                        .split(",")
                        .map((x) => x.trim())
                        .filter(Boolean),
                    }
                  : s
              )
            }
            className="mt-2 h-10"
            placeholder="visa, mastercard, cod"
            disabled={!canEdit || !settings.showPaymentMethods}
          />
        </div>

        <div className="rounded-3xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={settings.showTrustBadges}
                onChange={(e) => setSettings((s) => (s ? { ...s, showTrustBadges: e.target.checked } : s))}
                disabled={!canEdit}
              />
              Show Trust Badges
            </label>
            <Button type="button" variant="secondary" size="sm" onClick={addTrustBadge} disabled={!canEdit || !settings.showTrustBadges}>
              Add
            </Button>
          </div>

          {settings.trustBadges.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No trust badges.</p>
          ) : (
            <div className="mt-3 grid gap-2">
              {settings.trustBadges.map((b) => (
                <div key={b.id} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
                  <Input
                    value={b.label}
                    onChange={(e) => patchTrustBadge(b.id, { label: e.target.value })}
                    className="h-10"
                    placeholder="Label"
                    disabled={!canEdit || !settings.showTrustBadges}
                  />
                  <Input
                    value={b.imageUrl}
                    onChange={(e) => patchTrustBadge(b.id, { imageUrl: e.target.value })}
                    className="h-10"
                    placeholder="Image URL"
                    disabled={!canEdit || !settings.showTrustBadges}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="border border-border"
                    onClick={() => removeTrustBadge(b.id)}
                    disabled={!canEdit || !settings.showTrustBadges}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={settings.showSocialLinks}
                onChange={(e) => setSettings((s) => (s ? { ...s, showSocialLinks: e.target.checked } : s))}
                disabled={!canEdit}
              />
              Show Social Links
            </label>
            <Button type="button" variant="secondary" size="sm" onClick={addSocial} disabled={!canEdit || !settings.showSocialLinks}>
              Add
            </Button>
          </div>

          {settings.socialLinks.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No social links.</p>
          ) : (
            <div className="mt-3 grid gap-2">
              {settings.socialLinks.map((s) => (
                <div key={s.id} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
                  <Input
                    value={s.kind}
                    onChange={(e) => patchSocial(s.id, { kind: e.target.value })}
                    className="h-10"
                    placeholder="Kind (Instagram, Facebook)"
                    disabled={!canEdit || !settings.showSocialLinks}
                  />
                  <Input
                    value={s.href}
                    onChange={(e) => patchSocial(s.id, { href: e.target.value })}
                    className="h-10"
                    placeholder="https://..."
                    disabled={!canEdit || !settings.showSocialLinks}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="border border-border"
                    onClick={() => removeSocial(s.id)}
                    disabled={!canEdit || !settings.showSocialLinks}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-border bg-surface p-4 lg:col-span-2">
          <p className="text-sm font-semibold">Contact information</p>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <Input
              value={settings.contact.email ?? ""}
              onChange={(e) => setSettings((s) => (s ? { ...s, contact: { ...s.contact, email: e.target.value } } : s))}
              className="h-10"
              placeholder="Email"
              disabled={!canEdit}
            />
            <Input
              value={settings.contact.phone ?? ""}
              onChange={(e) => setSettings((s) => (s ? { ...s, contact: { ...s.contact, phone: e.target.value } } : s))}
              className="h-10"
              placeholder="Phone"
              disabled={!canEdit}
            />
            <Input
              value={(settings.contact.addressLines ?? []).join(" | ")}
              onChange={(e) =>
                setSettings((s) =>
                  s
                    ? { ...s, contact: { ...s.contact, addressLines: e.target.value.split("|").map((x) => x.trim()).filter(Boolean) } }
                    : s
                )
              }
              className="h-10 md:col-span-2"
              placeholder="Address lines separated by |"
              disabled={!canEdit}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-4 lg:col-span-2">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={settings.newsletter.enabled}
              onChange={(e) => setSettings((s) => (s ? { ...s, newsletter: { ...s.newsletter, enabled: e.target.checked } } : s))}
              disabled={!canEdit}
            />
            Enable Newsletter
          </label>
          <div className={"mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 " + (settings.newsletter.enabled ? "" : "opacity-60")}
          >
            <Input
              value={settings.newsletter.title ?? ""}
              onChange={(e) => setSettings((s) => (s ? { ...s, newsletter: { ...s.newsletter, title: e.target.value } } : s))}
              className="h-10"
              placeholder="Title"
              disabled={!canEdit || !settings.newsletter.enabled}
            />
            <Input
              value={settings.newsletter.buttonText ?? ""}
              onChange={(e) => setSettings((s) => (s ? { ...s, newsletter: { ...s.newsletter, buttonText: e.target.value } } : s))}
              className="h-10"
              placeholder="Button text"
              disabled={!canEdit || !settings.newsletter.enabled}
            />
            <Input
              value={settings.newsletter.description ?? ""}
              onChange={(e) => setSettings((s) => (s ? { ...s, newsletter: { ...s.newsletter, description: e.target.value } } : s))}
              className="h-10 md:col-span-2"
              placeholder="Description"
              disabled={!canEdit || !settings.newsletter.enabled}
            />
            <Input
              value={settings.newsletter.placeholder ?? ""}
              onChange={(e) => setSettings((s) => (s ? { ...s, newsletter: { ...s.newsletter, placeholder: e.target.value } } : s))}
              className="h-10 md:col-span-2"
              placeholder="Email placeholder"
              disabled={!canEdit || !settings.newsletter.enabled}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-4 lg:col-span-2">
          <p className="text-sm font-semibold">Copyright</p>
          <Input
            value={settings.copyrightText}
            onChange={(e) => setSettings((s) => (s ? { ...s, copyrightText: e.target.value } : s))}
            className="mt-3 h-10"
            placeholder="© 2026 Your Store. All rights reserved."
            disabled={!canEdit}
          />
        </div>
      </div>
    </div>
  );
}
