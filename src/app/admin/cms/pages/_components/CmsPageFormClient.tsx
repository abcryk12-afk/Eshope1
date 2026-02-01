"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";

type PageFormState = {
  title: string;
  slug: string;
  content: string;
  isPublished: boolean;
  seoTitle: string;
  seoDescription: string;
};

type Props =
  | { mode: "create"; pageId?: never }
  | { mode: "edit"; pageId: string };

function emptyState(): PageFormState {
  return {
    title: "",
    slug: "",
    content: "",
    isPublished: false,
    seoTitle: "",
    seoDescription: "",
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readMessage(json: unknown): string | undefined {
  if (!isRecord(json)) return undefined;
  const m = json.message;
  return typeof m === "string" ? m : undefined;
}

function readId(json: unknown): string | undefined {
  if (!isRecord(json)) return undefined;
  const id = json.id;
  return typeof id === "string" ? id : undefined;
}

export default function CmsPageFormClient(props: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(props.mode === "edit");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PageFormState>(() => emptyState());

  const pageId = props.mode === "edit" ? props.pageId : null;

  const finalSlug = useMemo(() => slugify(form.slug || form.title), [form.slug, form.title]);

  useEffect(() => {
    if (!pageId) return;

    const id = pageId;

    let cancelled = false;

    async function load() {
      setLoading(true);

      const res = await fetch(`/api/admin/cms/pages/${encodeURIComponent(id)}`, { cache: "no-store" });

      if (cancelled) return;

      if (!res.ok) {
        toast.error("Failed to load page");
        setLoading(false);
        return;
      }

      const json = (await res.json().catch(() => null)) as unknown;

      if (!isRecord(json) || !isRecord(json.page)) {
        toast.error("Invalid response");
        setLoading(false);
        return;
      }

      const p = json.page as Record<string, unknown>;

      setForm({
        title: typeof p.title === "string" ? p.title : "",
        slug: typeof p.slug === "string" ? p.slug : "",
        content: typeof p.content === "string" ? p.content : "",
        isPublished: Boolean(p.isPublished),
        seoTitle: typeof p.seoTitle === "string" ? p.seoTitle : "",
        seoDescription: typeof p.seoDescription === "string" ? p.seoDescription : "",
      });

      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [pageId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const slug = finalSlug;

    if (!slug) {
      toast.error("Invalid slug");
      return;
    }

    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (!form.content.trim()) {
      toast.error("Content is required");
      return;
    }

    setSaving(true);

    const payload = {
      title: form.title.trim(),
      slug,
      content: form.content.trim(),
      isPublished: form.isPublished,
      seoTitle: form.seoTitle.trim() || undefined,
      seoDescription: form.seoDescription.trim() || undefined,
    };

    try {
      if (props.mode === "create") {
        const res = await fetch("/api/admin/cms/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json = (await res.json().catch(() => null)) as unknown;

        if (!res.ok) {
          toast.error(readMessage(json) ?? "Failed to create");
          return;
        }

        const id = readId(json);

        if (!id) {
          toast.error("Invalid response");
          return;
        }

        toast.success("Page created");
        router.push(`/admin/cms/pages/${id}`);
        router.refresh();
        return;
      }

      const res = await fetch(`/api/admin/cms/pages/${encodeURIComponent(props.pageId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json().catch(() => null)) as unknown;

      if (!res.ok) {
        toast.error(readMessage(json) ?? "Failed to update");
        return;
      }

      toast.success("Saved");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function deletePage() {
    if (props.mode !== "edit") return;

    const ok = window.confirm("Delete this page?");
    if (!ok) return;

    const res = await fetch(`/api/admin/cms/pages/${encodeURIComponent(props.pageId)}`, { method: "DELETE" });

    if (!res.ok) {
      toast.error("Failed to delete");
      return;
    }

    toast.success("Deleted");
    router.push("/admin/cms/pages");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">CMS</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {props.mode === "create" ? "New page" : "Edit page"}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Static content + SEO.</p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/cms/pages">
            <Button variant="secondary">Back</Button>
          </Link>
          {props.mode === "edit" ? (
            <Button variant="ghost" className="border border-zinc-200 dark:border-zinc-800" onClick={() => void deletePage()}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Content</h2>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Title</label>
                <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Slug</label>
                <Input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} placeholder={finalSlug} />
                <p className="text-xs text-zinc-500">Final: /{finalSlug || "-"}</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Body</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                rows={14}
                className={cn(
                  "w-full rounded-2xl border border-zinc-200 bg-white p-3 text-sm text-zinc-900",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10",
                  "dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus-visible:ring-zinc-50/10"
                )}
              />
            </div>

            <label className="mt-4 flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
              <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((p) => ({ ...p, isPublished: e.target.checked }))} className="h-4 w-4 rounded border-zinc-300" />
              Published
            </label>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">SEO</h2>
            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">SEO Title</label>
                <Input value={form.seoTitle} onChange={(e) => setForm((p) => ({ ...p, seoTitle: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">SEO Description</label>
                <textarea
                  value={form.seoDescription}
                  onChange={(e) => setForm((p) => ({ ...p, seoDescription: e.target.value }))}
                  rows={4}
                  className={cn(
                    "w-full rounded-2xl border border-zinc-200 bg-white p-3 text-sm text-zinc-900",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10",
                    "dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus-visible:ring-zinc-50/10"
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Save</h2>
            <p className="mt-1 text-xs text-zinc-500">Changes apply immediately.</p>
            <Button type="submit" className="mt-4 w-full" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      </form>
    </div>
  );
}
