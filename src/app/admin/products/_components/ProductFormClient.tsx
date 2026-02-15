"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import RichTextEditor from "@/components/admin/RichTextEditor";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";

type VariantForm = {
  sku: string;
  size: string;
  color: string;
  price: string;
  stock: string;
  images: string[];
};

type ProductFormState = {
  title: string;
  slug: string;
  description: string;
  categoryId: string;
  storeName: string;
  brand: string;
  images: string[];
  basePrice: string;
  compareAtPrice: string;
  stock: string;
  isDigital: boolean;
  isNonReturnable: boolean;
  isActive: boolean;
  variants: VariantForm[];
  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
  seoKeywords: string;
  ogTitle: string;
  ogDescription: string;
  canonicalUrl: string;
  noIndex: boolean;
};

type CategoryOption = {
  _id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
};

type ProductFormClientProps =
  | { mode: "create"; productId?: never }
  | { mode: "edit"; productId: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function readObjectId(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null && "toString" in v && typeof (v as { toString: unknown }).toString === "function") {
    return String((v as { toString: () => string }).toString());
  }
  return "";
}

function readNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function readStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
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

function emptyVariant(): VariantForm {
  return { sku: "", size: "", color: "", price: "", stock: "", images: [""] };
}

function emptyState(): ProductFormState {
  return {
    title: "",
    slug: "",
    description: "",
    categoryId: "",
    storeName: "",
    brand: "",
    images: [],
    basePrice: "",
    compareAtPrice: "",
    stock: "",
    isDigital: false,
    isNonReturnable: false,
    isActive: true,
    variants: [],
    seoTitle: "",
    seoDescription: "",
    focusKeyword: "",
    seoKeywords: "",
    ogTitle: "",
    ogDescription: "",
    canonicalUrl: "",
    noIndex: false,
  };
}

function toNumber(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function toInt(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
}

function stripHtmlText(html: string) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function uploadImages(files: File[]) {
  const form = new FormData();
  for (const f of files) form.append("files", f);

  const res = await fetch("/api/upload", { method: "POST", body: form });
  const json = (await res.json().catch(() => null)) as unknown;

  if (!res.ok || !isRecord(json)) {
    throw new Error(readMessage(json) ?? "Upload failed");
  }

  const urls = json.urls;
  if (!Array.isArray(urls) || urls.some((u) => typeof u !== "string")) {
    throw new Error("Invalid upload response");
  }

  return urls as string[];
}

export default function ProductFormClient(props: ProductFormClientProps) {
  const router = useRouter();
  const productId = props.mode === "edit" ? props.productId : null;

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const variantImageInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const [loading, setLoading] = useState(props.mode === "edit");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProductFormState>(() => emptyState());
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [variantUploading, setVariantUploading] = useState<Record<number, boolean>>({});

  const computedSlug = useMemo(() => slugify(form.slug || form.title), [form.slug, form.title]);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      const res = await fetch("/api/admin/categories", { cache: "no-store" }).catch(() => null);
      if (!res || !res.ok) {
        if (!cancelled) setCategories([]);
        return;
      }

      const json = (await res.json().catch(() => null)) as unknown;
      if (!isRecord(json) || !Array.isArray(json.items)) {
        if (!cancelled) setCategories([]);
        return;
      }

      const safe = (json.items as unknown[])
        .filter((v): v is CategoryOption => isRecord(v) && typeof v._id === "string" && typeof v.name === "string")
        .map((v) => v);

      if (!cancelled) setCategories(safe);
    }

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!productId) return;

    const id = productId;

    let cancelled = false;

    async function load() {
      setLoading(true);

      const res = await fetch(`/api/admin/products/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });

      if (cancelled) return;

      if (!res.ok) {
        toast.error("Failed to load product");
        setLoading(false);
        return;
      }

      const json = (await res.json().catch(() => null)) as unknown;

      if (!isRecord(json) || !isRecord(json.product)) {
        toast.error("Invalid response");
        setLoading(false);
        return;
      }

      const p = json.product;

      const images = readStringArray(p.images);
      const variantsRaw = Array.isArray(p.variants) ? p.variants : [];

      const seo = isRecord(p.seo) ? p.seo : null;

      setForm({
        title: readString(p.title),
        slug: readString(p.slug),
        description: readString(p.description),
        categoryId: readObjectId(p.categoryId),
        storeName: readString(p.storeName),
        brand: readString(p.brand),
        images,
        basePrice: readNumber(p.basePrice) != null ? String(p.basePrice) : "",
        compareAtPrice: readNumber(p.compareAtPrice) != null ? String(p.compareAtPrice) : "",
        stock: readNumber(p.stock) != null ? String(p.stock) : "",
        isDigital: Boolean(p.isDigital ?? false),
        isNonReturnable: Boolean(p.isNonReturnable ?? false),
        isActive: Boolean(p.isActive ?? true),
        seoTitle: readString(seo?.title),
        seoDescription: readString(seo?.description),
        focusKeyword: readString(seo?.focusKeyword),
        seoKeywords: readString(seo?.keywords),
        ogTitle: readString(seo?.ogTitle),
        ogDescription: readString(seo?.ogDescription),
        canonicalUrl: readString(seo?.canonicalUrl),
        noIndex: Boolean(seo?.noIndex ?? false),
        variants:
          variantsRaw.length
            ? variantsRaw.map((vv): VariantForm => {
                if (!isRecord(vv)) return emptyVariant();

                const vImages = readStringArray(vv.images);

                return {
                  sku: readString(vv.sku),
                  size: readString(vv.size),
                  color: readString(vv.color),
                  price: readNumber(vv.price) != null ? String(vv.price) : "",
                  stock: readNumber(vv.stock) != null ? String(vv.stock) : "",
                  images: vImages.length ? vImages : [""],
                };
              })
            : [],
      });

      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  useEffect(() => {
    return () => {
      for (const url of newImagePreviews) URL.revokeObjectURL(url);
    };
  }, [newImagePreviews]);

  function addNewImages(files: FileList | null) {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;

    const previews = list.map((f) => URL.createObjectURL(f));

    setNewImageFiles((prev) => [...prev, ...list]);
    setNewImagePreviews((prev) => [...prev, ...previews]);
  }

  function removeNewImageAt(idx: number) {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setNewImagePreviews((prev) => {
      const removed = prev[idx];
      if (removed) URL.revokeObjectURL(removed);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function addVariantImages(variantIndex: number, files: FileList | null) {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;

    setVariantUploading((prev) => ({ ...prev, [variantIndex]: true }));
    try {
      const urls = await uploadImages(list);

      setForm((prev) => {
        const next = [...prev.variants];
        const current = next[variantIndex];
        if (!current) return prev;

        const existing = current.images.map((s) => s.trim()).filter(Boolean);
        const merged = [...existing, ...urls];

        next[variantIndex] = {
          ...current,
          images: merged.length ? merged : [""],
        };

        return { ...prev, variants: next };
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setVariantUploading((prev) => ({ ...prev, [variantIndex]: false }));
      const input = variantImageInputRefs.current[variantIndex];
      if (input) input.value = "";
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const slug = computedSlug;

    if (!slug) {
      toast.error("Invalid slug");
      return;
    }

    const basePrice = toNumber(form.basePrice);
    const compareAtPrice = form.compareAtPrice.trim() ? toNumber(form.compareAtPrice) : undefined;

    const hasVariants = form.variants.length > 0;
    const stock = form.stock.trim() ? toInt(form.stock) : undefined;

    if (!Number.isFinite(basePrice)) {
      toast.error("Base price is required");
      return;
    }

    if (compareAtPrice != null && !Number.isFinite(compareAtPrice)) {
      toast.error("Compare at price must be a number");
      return;
    }

    if (stock != null && !Number.isFinite(stock)) {
      toast.error("Stock must be an integer");
      return;
    }

    const cleanedImages = form.images.map((s) => s.trim()).filter(Boolean);

    const variants = form.variants
      .map((v) => ({
        sku: v.sku.trim(),
        size: v.size.trim(),
        color: v.color.trim(),
        price: toNumber(v.price),
        stock: toInt(v.stock),
        images: v.images.map((x) => x.trim()).filter(Boolean),
      }))
      .filter((v) => v.sku || v.size || v.color || Number.isFinite(v.price) || Number.isFinite(v.stock));

    for (const v of variants) {
      if (!v.sku || !v.size || !v.color || !Number.isFinite(v.price) || !Number.isFinite(v.stock)) {
        toast.error("Each variant must have SKU, size, color, price, and stock");
        return;
      }
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      categoryId: form.categoryId,
      storeName: form.storeName.trim() || undefined,
      brand: form.brand.trim() || undefined,
      images: cleanedImages,
      basePrice,
      compareAtPrice,
      stock: hasVariants ? undefined : stock,
      variants,
      isDigital: form.isDigital,
      isNonReturnable: form.isNonReturnable,
      isActive: form.isActive,
      slug,
      seo: {
        title: form.seoTitle.trim() || undefined,
        description: form.seoDescription.trim() || undefined,
        focusKeyword: form.focusKeyword.trim() || undefined,
        keywords: form.seoKeywords.trim() || undefined,
        ogTitle: form.ogTitle.trim() || undefined,
        ogDescription: form.ogDescription.trim() || undefined,
        canonicalUrl: form.canonicalUrl.trim() || undefined,
        noIndex: form.noIndex,
      },
    };

    if (!payload.title || payload.title.length < 2) {
      toast.error("Title is required");
      return;
    }

    if (!payload.description || stripHtmlText(payload.description).length < 20) {
      toast.error("Description must be at least 20 characters");
      return;
    }

    if (!payload.categoryId) {
      toast.error("Category is required");
      return;
    }

    setSaving(true);

    try {
      const uploadedUrls = newImageFiles.length ? await uploadImages(newImageFiles) : [];
      const finalImages = [...payload.images, ...uploadedUrls];
      const finalPayload = { ...payload, images: finalImages };

      if (props.mode === "create") {
        const res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(finalPayload),
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

        toast.success("Product created");
        setNewImageFiles([]);
        setNewImagePreviews((prev) => {
          for (const u of prev) URL.revokeObjectURL(u);
          return [];
        });
        router.push(`/admin/products/${id}`);
        router.refresh();
        return;
      }

      const res = await fetch(`/api/admin/products/${encodeURIComponent(props.productId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload),
      });

      const json = (await res.json().catch(() => null)) as unknown;

      if (!res.ok) {
        toast.error(readMessage(json) ?? "Failed to update");
        return;
      }

      toast.success("Saved");
      setField("images", finalImages);
      setNewImageFiles([]);
      setNewImagePreviews((prev) => {
        for (const u of prev) URL.revokeObjectURL(u);
        return [];
      });
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct() {
    if (props.mode !== "edit") return;

    const ok = window.confirm("Delete this product? This cannot be undone.");
    if (!ok) return;

    const res = await fetch(`/api/admin/products/${encodeURIComponent(props.productId)}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      toast.error("Failed to delete");
      return;
    }

    toast.success("Deleted");
    router.push("/admin/products");
    router.refresh();
  }

  function setField<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Products
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {props.mode === "create" ? "New product" : "Edit product"}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Manage title, pricing, variants, inventory, and visibility.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/products">
            <Button variant="secondary">Back</Button>
          </Link>
          {props.mode === "edit" ? (
            <Button
              variant="ghost"
              onClick={deleteProduct}
              className="border border-zinc-200 dark:border-zinc-800"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-40" />
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Core</h2>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Title</label>
                    <Input value={form.title} onChange={(e) => setField("title", e.target.value)} required />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Slug</label>
                    <Input
                      value={form.slug}
                      onChange={(e) => setField("slug", e.target.value)}
                      placeholder={computedSlug || "auto-generated"}
                    />
                    <p className="text-xs text-zinc-500">Final: /{computedSlug || "-"}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Category</label>
                    <select
                      value={form.categoryId}
                      onChange={(e) => setField("categoryId", e.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                      required
                    >
                      <option value="">Select category</option>
                      {categories
                        .filter((c) => c.isActive || c._id === form.categoryId)
                        .map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Store name (optional)</label>
                    <Input value={form.storeName} onChange={(e) => setField("storeName", e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Brand (optional)</label>
                    <Input value={form.brand} onChange={(e) => setField("brand", e.target.value)} />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Description</label>
                  <div
                    className={cn(
                      "rounded-2xl focus-within:ring-2 focus-within:ring-zinc-900/10",
                      "dark:focus-within:ring-zinc-50/10"
                    )}
                  >
                    <RichTextEditor value={form.description} onChange={(next) => setField("description", next)} />
                  </div>
                  <p className="text-xs text-zinc-500">Minimum 20 characters.</p>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Images</h2>
                  <div className="flex items-center gap-2">
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        addNewImages(e.target.files);
                        e.currentTarget.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={saving}
                      onClick={() => imageInputRef.current?.click()}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Upload
                    </Button>
                  </div>
                </div>

                {form.images.length === 0 && newImagePreviews.length === 0 ? (
                  <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">No images yet.</p>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {form.images.map((url, idx) => (
                      <div
                        key={`existing-${idx}`}
                        className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/20"
                      >
                        <img src={url} alt="" className="h-32 w-full object-cover" />
                        <button
                          type="button"
                          className="absolute right-2 top-2 rounded-full border border-zinc-200 bg-white/90 p-1 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950/90 dark:text-zinc-50"
                          onClick={() => setField("images", form.images.filter((_, i) => i !== idx))}
                          aria-label="Remove image"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    {newImagePreviews.map((src, idx) => (
                      <div
                        key={`new-${idx}`}
                        className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/20"
                      >
                        <img src={src} alt="" className="h-32 w-full object-cover" />
                        <button
                          type="button"
                          className="absolute right-2 top-2 rounded-full border border-zinc-200 bg-white/90 p-1 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950/90 dark:text-zinc-50"
                          onClick={() => removeNewImageAt(idx)}
                          aria-label="Remove image"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Variants</h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      If you add variants, product-level stock is ignored.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setField("variants", [...form.variants, emptyVariant()])}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add variant
                  </Button>
                </div>

                {form.variants.length === 0 ? (
                  <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                    No variants.
                  </p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {form.variants.map((v, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            Variant {idx + 1}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="border border-zinc-200 dark:border-zinc-800"
                            onClick={() => setField("variants", form.variants.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">SKU</label>
                            <Input
                              value={v.sku}
                              onChange={(e) => {
                                const next = [...form.variants];
                                next[idx] = { ...next[idx], sku: e.target.value };
                                setField("variants", next);
                              }}
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Price</label>
                            <Input
                              value={v.price}
                              onChange={(e) => {
                                const next = [...form.variants];
                                next[idx] = { ...next[idx], price: e.target.value };
                                setField("variants", next);
                              }}
                              placeholder="0"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Size</label>
                            <Input
                              value={v.size}
                              onChange={(e) => {
                                const next = [...form.variants];
                                next[idx] = { ...next[idx], size: e.target.value };
                                setField("variants", next);
                              }}
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Color</label>
                            <Input
                              value={v.color}
                              onChange={(e) => {
                                const next = [...form.variants];
                                next[idx] = { ...next[idx], color: e.target.value };
                                setField("variants", next);
                              }}
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Stock</label>
                            <Input
                              value={v.stock}
                              onChange={(e) => {
                                const next = [...form.variants];
                                next[idx] = { ...next[idx], stock: e.target.value };
                                setField("variants", next);
                              }}
                              placeholder="0"
                              required
                            />
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Images</p>
                            <div className="flex items-center gap-2">
                              <input
                                ref={(el) => {
                                  variantImageInputRefs.current[idx] = el;
                                }}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                  void addVariantImages(idx, e.target.files);
                                }}
                              />
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                disabled={saving || Boolean(variantUploading[idx])}
                                onClick={() => variantImageInputRefs.current[idx]?.click()}
                              >
                                {variantUploading[idx] ? "Uploading..." : "Upload"}
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  const next = [...form.variants];
                                  next[idx] = { ...next[idx], images: [...next[idx].images, ""] };
                                  setField("variants", next);
                                }}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Add link
                              </Button>
                            </div>
                          </div>

                          <div className="mt-2 space-y-2">
                            {v.images.map((img, imgIdx) => (
                              <div key={imgIdx} className="flex items-center gap-2">
                                <Input
                                  value={img}
                                  onChange={(e) => {
                                    const next = [...form.variants];
                                    const nextImages = [...next[idx].images];
                                    nextImages[imgIdx] = e.target.value;
                                    next[idx] = { ...next[idx], images: nextImages };
                                    setField("variants", next);
                                  }}
                                  placeholder="https://..."
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="border border-zinc-200 dark:border-zinc-800"
                                  onClick={() => {
                                    const next = [...form.variants];
                                    const nextImages = next[idx].images.filter((_, i) => i !== imgIdx);
                                    next[idx] = { ...next[idx], images: nextImages.length ? nextImages : [""] };
                                    setField("variants", next);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>

                          {v.images.some((x) => x.trim()) ? (
                            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                              {v.images
                                .map((x) => x.trim())
                                .filter(Boolean)
                                .slice(0, 6)
                                .map((url, imgIdx) => (
                                  <div
                                    key={`${url}:${imgIdx}`}
                                    className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/20"
                                  >
                                    <img src={url} alt="" className="h-24 w-full object-cover" />
                                    <button
                                      type="button"
                                      className="absolute right-2 top-2 rounded-full border border-zinc-200 bg-white/90 p-1 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950/90 dark:text-zinc-50"
                                      onClick={() => {
                                        const next = [...form.variants];
                                        const nextImages = next[idx].images
                                          .map((x) => x.trim())
                                          .filter(Boolean)
                                          .filter((x) => x !== url);
                                        next[idx] = { ...next[idx], images: nextImages.length ? nextImages : [""] };
                                        setField("variants", next);
                                      }}
                                      aria-label="Remove image"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Pricing</h2>

                <div className="mt-4 space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Base price</label>
                    <Input value={form.basePrice} onChange={(e) => setField("basePrice", e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Compare at price</label>
                    <Input value={form.compareAtPrice} onChange={(e) => setField("compareAtPrice", e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Inventory</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Stock here only applies if there are no variants.
                </p>
                <div className="mt-4 space-y-2">
                  <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Stock</label>
                  <Input value={form.stock} onChange={(e) => setField("stock", e.target.value)} placeholder="0" />
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Returns</h2>

                <label className="mt-4 flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={form.isDigital}
                    onChange={(e) => setField("isDigital", e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300"
                  />
                  Digital product (non-returnable)
                </label>

                <label className="mt-3 flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={form.isNonReturnable}
                    onChange={(e) => setField("isNonReturnable", e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300"
                  />
                  Non-returnable
                </label>
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Visibility</h2>

                <label className="mt-4 flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setField("isActive", e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300"
                  />
                  Published
                </label>
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">SEO</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Optional overrides. If empty, metadata is generated automatically from product data.
                </p>

                <div className="mt-4 space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">SEO Title</label>
                    <Input value={form.seoTitle} onChange={(e) => setField("seoTitle", e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">SEO Description</label>
                    <Input value={form.seoDescription} onChange={(e) => setField("seoDescription", e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Focus Keyword</label>
                    <Input value={form.focusKeyword} onChange={(e) => setField("focusKeyword", e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">SEO Keywords</label>
                    <Input value={form.seoKeywords} onChange={(e) => setField("seoKeywords", e.target.value)} placeholder="keyword1, keyword2" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">OG Title</label>
                    <Input value={form.ogTitle} onChange={(e) => setField("ogTitle", e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">OG Description</label>
                    <Input value={form.ogDescription} onChange={(e) => setField("ogDescription", e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Custom Canonical</label>
                    <Input value={form.canonicalUrl} onChange={(e) => setField("canonicalUrl", e.target.value)} placeholder="https://example.com/product/your-slug" />
                  </div>

                  <label className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={form.noIndex}
                      onChange={(e) => setField("noIndex", e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300"
                    />
                    NoIndex (do not index this product)
                  </label>
                </div>
              </div>

              <Button type="submit" disabled={saving} className="w-full">
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
