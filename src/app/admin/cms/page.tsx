import Link from "next/link";

import Button from "@/components/ui/Button";

export default function AdminCmsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          CMS
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Manage site content and SEO.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Pages</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            About, Privacy, Terms, etc.
          </p>
          <div className="mt-4">
            <Link href="/admin/cms/pages">
              <Button>Manage pages</Button>
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Site settings</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Homepage banners, footer, global SEO.
          </p>
          <div className="mt-4">
            <Link href="/admin/cms/settings">
              <Button>Manage settings</Button>
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Deals</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Limited-time deals (Super Deals).
          </p>
          <div className="mt-4">
            <Link href="/admin/cms/deals">
              <Button>Manage deals</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
