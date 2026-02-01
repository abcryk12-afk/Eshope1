"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (nextHtml: string) => void;
};

function normalizeHtml(v: string) {
  return (v ?? "").trim();
}

const COLOR_PALETTE = [
  { name: "Default", value: "" },
  { name: "Black", value: "#0f172a" },
  { name: "Gray", value: "#52525b" },
  { name: "Red", value: "#dc2626" },
  { name: "Green", value: "#16a34a" },
  { name: "Blue", value: "#2563eb" },
];

const DEFAULT_IMAGE_STYLE = "display:block;max-width:100%;height:auto;margin:0.5rem auto;";

type RichTextChain = {
  unsetColor: () => { run: () => boolean };
  setColor: (color: string) => { run: () => boolean };
  setTextAlign: (alignment: "left" | "center" | "right") => { run: () => boolean };
};

const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: DEFAULT_IMAGE_STYLE,
        parseHTML: (element) => element.getAttribute("style") || DEFAULT_IMAGE_STYLE,
        renderHTML: (attrs) => {
          const style = typeof attrs.style === "string" ? attrs.style : DEFAULT_IMAGE_STYLE;
          return { style };
        },
      },
    };
  },
});

async function uploadImages(files: File[]) {
  const form = new FormData();
  for (const f of files) form.append("files", f);

  const res = await fetch("/api/upload", { method: "POST", body: form });
  const json = (await res.json().catch(() => null)) as unknown;

  if (!res.ok || !json || typeof json !== "object") {
    throw new Error("Upload failed");
  }

  const urls = (json as { urls?: unknown }).urls;
  if (!Array.isArray(urls) || urls.some((u) => typeof u !== "string")) {
    throw new Error("Invalid upload response");
  }

  return urls as string[];
}

export default function RichTextEditor({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const extensions = useMemo(
    () => [
      StarterKit,
      TextStyle,
      Color.configure({ types: ["textStyle"] }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: true }),
      CustomImage.configure({ inline: false, allowBase64: false }),
    ],
    []
  );

  const editor = useEditor({
    extensions,
    content: normalizeHtml(value) || "<p></p>",
    onUpdate({ editor: e }: { editor: { getHTML: () => string } }) {
      onChange(e.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[200px] rounded-2xl border border-zinc-200 bg-white p-3 text-sm text-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50",
        style: "line-height:1.6;word-break:break-word;overflow-wrap:anywhere;",
      },
      handlePaste: (_view: unknown, event: ClipboardEvent) => {
        const items = Array.from(event.clipboardData?.items ?? []) as DataTransferItem[];
        const img = items.find((i) => i.type.startsWith("image/"));
        const file = img?.getAsFile() ?? null;
        if (!file) return false;

        void (async () => {
          try {
            setUploading(true);
            const [url] = await uploadImages([file]);
            editor?.chain().focus().setImage({ src: url }).run();
          } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Upload failed");
          } finally {
            setUploading(false);
          }
        })();

        return true;
      },
      handleDrop: (_view: unknown, event: DragEvent) => {
        const files = Array.from(event.dataTransfer?.files ?? []) as File[];
        const images = files.filter((f) => f.type.startsWith("image/"));
        if (images.length === 0) return false;

        void (async () => {
          try {
            setUploading(true);
            const urls = await uploadImages(images);
            for (const url of urls) {
              editor?.chain().focus().setImage({ src: url }).run();
            }
          } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Upload failed");
          } finally {
            setUploading(false);
          }
        })();

        return true;
      },
    },
  });

  const normalizedValue = useMemo(() => normalizeHtml(value), [value]);

  useEffect(() => {
    if (!editor) return;

    const current = normalizeHtml(editor.getHTML());
    if (current === normalizedValue) return;

    editor.commands.setContent(normalizedValue || "<p></p>", false);
  }, [editor, normalizedValue]);

  async function onPickFile(files: FileList | null) {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    if (!editor || list.length === 0) return;

    try {
      setUploading(true);
      const urls = await uploadImages(list);
      for (const url of urls) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function keepSelection(e: MouseEvent<HTMLElement>) {
    e.preventDefault();
  }

  function setTextColor(color: string) {
    if (!editor) return;
    const chain = editor.chain().focus() as unknown as RichTextChain;
    if (!color) {
      chain.unsetColor().run();
      return;
    }
    chain.setColor(color).run();
  }

  function alignText(align: "left" | "center" | "right") {
    if (!editor) return;
    const chain = editor.chain().focus() as unknown as RichTextChain;
    chain.setTextAlign(align).run();
  }

  function alignSelectedImage(align: "left" | "center" | "right") {
    if (!editor) return;
    const style =
      align === "left"
        ? "display:block;max-width:100%;height:auto;margin:0.5rem 0 0.5rem 0;"
        : align === "center"
          ? "display:block;max-width:100%;height:auto;margin:0.5rem auto;"
          : "display:block;max-width:100%;height:auto;margin:0.5rem 0 0.5rem auto;";
    editor.chain().focus().updateAttributes("image", { style }).run();
  }

  if (!editor) {
    return <div className="min-h-[200px] rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950" />;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onMouseDown={keepSelection}
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(editor.isActive("bold") && "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900")}
        >
          Bold
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onMouseDown={keepSelection}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(editor.isActive("italic") && "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900")}
        >
          Italic
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onMouseDown={keepSelection}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={cn(editor.isActive("heading", { level: 2 }) && "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900")}
        >
          H2
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onMouseDown={keepSelection}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(editor.isActive("bulletList") && "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900")}
        >
          Bullets
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onMouseDown={keepSelection}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(editor.isActive("orderedList") && "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900")}
        >
          Numbered
        </Button>

        <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800" />

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onMouseDown={keepSelection}
          onClick={() => alignText("left")}
          className={cn(editor.isActive({ textAlign: "left" }) && "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900")}
        >
          Left
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onMouseDown={keepSelection}
          onClick={() => alignText("center")}
          className={cn(editor.isActive({ textAlign: "center" }) && "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900")}
        >
          Center
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onMouseDown={keepSelection}
          onClick={() => alignText("right")}
          className={cn(editor.isActive({ textAlign: "right" }) && "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900")}
        >
          Right
        </Button>

        <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800" />

        <div className="flex items-center gap-1">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c.name}
              type="button"
              onMouseDown={keepSelection}
              onClick={() => setTextColor(c.value)}
              className={cn(
                "h-9 w-9 rounded-xl border border-zinc-200 bg-white transition dark:border-zinc-800 dark:bg-zinc-950",
                (editor.getAttributes("textStyle").color ?? "") === c.value &&
                  "ring-2 ring-zinc-900/20 dark:ring-zinc-50/20"
              )}
              title={c.name}
              aria-label={`Text color: ${c.name}`}
            >
              <span
                className="block h-4 w-4 rounded-full"
                style={{ backgroundColor: c.value || "transparent", border: c.value ? "none" : "1px solid #cbd5e1" }}
              />
            </button>
          ))}
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onMouseDown={keepSelection}
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Insert image"}
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onMouseDown={keepSelection}
          onClick={() => alignSelectedImage("left")}
          disabled={!editor.isActive("image")}
        >
          Img Left
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onMouseDown={keepSelection}
          onClick={() => alignSelectedImage("center")}
          disabled={!editor.isActive("image")}
        >
          Img Center
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onMouseDown={keepSelection}
          onClick={() => alignSelectedImage("right")}
          disabled={!editor.isActive("image")}
        >
          Img Right
        </Button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void onPickFile(e.target.files);
            e.currentTarget.value = "";
          }}
        />
      </div>

      <div
        className={cn(
          "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:leading-tight",
          "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6",
          "[&_p]:my-2 [&_li]:my-1",
          "[&_a]:text-blue-600 [&_a]:underline dark:[&_a]:text-blue-400",
          "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-xl"
        )}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
