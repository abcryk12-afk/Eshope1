"use client";

import { footerTemplates } from "@/lib/footerTemplates";
import { generateFooterFromStoreConfig, type StoreFooterConfigInput } from "@/lib/footerAI";
import { useFooterBuilder } from "@/components/footer-builder/useFooterBuilder";

export default function FooterAdminPanel() {
  const { layout, setLayout, reset } = useFooterBuilder();

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="text-sm font-semibold text-foreground">Footer Admin Panel</div>
      <div className="mt-1 text-xs text-muted-foreground">
        This is a lightweight wrapper. Use the full builder UI at /admin/footer-builder.
      </div>

      <div className="mt-4 grid gap-2">
        <div className="text-xs font-medium text-muted-foreground">Templates</div>
        <div className="grid grid-cols-2 gap-2">
          {footerTemplates.slice(0, 6).map((t) => (
            <button
              key={t.id}
              type="button"
              className="h-11 rounded-2xl border border-border bg-background px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              onClick={() => setLayout(t)}
            >
              {t.name}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="mt-2 h-11 rounded-2xl bg-foreground px-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          onClick={() =>
            setLayout(
              generateFooterFromStoreConfig({
                storeName: "Shop",
                hasBlog: true,
                hasSupport: true,
                hasMobileApp: false,
                countries: ["US"],
              } satisfies StoreFooterConfigInput)
            )
          }
        >
          AI Generate
        </button>

        <button
          type="button"
          className="h-11 rounded-2xl border border-border bg-background px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          onClick={reset}
        >
          Reset
        </button>

        <div className="rounded-2xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <div className="font-semibold text-foreground">Current layout id</div>
          <div className="mt-1">{layout?.id ?? "(none)"}</div>
        </div>
      </div>
    </div>
  );
}
