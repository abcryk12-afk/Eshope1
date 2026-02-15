"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import * as LucideIcons from "lucide-react";

import { cn } from "@/lib/utils";

export type MobileMenuVisibility = "all" | "mobile" | "desktop";

export type MobileMenuItem = {
  id: string;
  type: "category" | "link";
  title: string;
  href: string;
  categoryId?: string;
  includeChildren?: boolean;
  enabled: boolean;
  visibility: MobileMenuVisibility;
  icon?: string;
  badgeLabel?: string;
  featured?: boolean;
  children?: MobileMenuItem[];
};

type Props = {
  open: boolean;
  title?: string;
  items: MobileMenuItem[];
  onClose: () => void;
  topAccountSection?: React.ReactNode;
  topFeaturedBanner?: React.ReactNode;
  topPromoBanner?: React.ReactNode;
  rightHeader?: React.ReactNode;
};

function Icon({ name }: { name?: string }) {
  const n = (name ?? "").trim();
  if (!n) return null;
  const Cmp = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[n];
  if (!Cmp) return null;
  return <Cmp className="h-4 w-4" />;
}

function normalizeItems(items: MobileMenuItem[]): MobileMenuItem[] {
  const walk = (list: MobileMenuItem[], depth: number): MobileMenuItem[] => {
    if (!Array.isArray(list) || depth > 20) return [];
    return list
      .filter((x) => Boolean(x) && x.enabled)
      .filter((x) => x.visibility !== "desktop")
      .map((x) => ({
        ...x,
        children: Array.isArray(x.children) ? x.children : [],
      }));
  };

  return walk(items, 0);
}

function MenuNode({
  item,
  depth,
  onNavigate,
}: {
  item: MobileMenuItem;
  depth: number;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const hasChildren = (item.children?.length ?? 0) > 0;
  const [open, setOpen] = useState(false);

  const normalizedChildren = useMemo(() => {
    if (!open) return [];
    return normalizeItems(item.children ?? []);
  }, [open, item.children]);

  const active = useMemo(() => {
    const href = item.href || "";
    if (!href.startsWith("/")) return false;
    return pathname === href || pathname.startsWith(href + "/");
  }, [pathname, item.href]);

  return (
    <div className={cn("w-full", depth > 0 ? "pl-3" : "")}
      data-depth={depth}
    >
      <div className="flex items-center gap-2">
        <div className={cn(
          "flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2 text-sm",
          active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
        )}>
          {item.icon ? (
            <span className="shrink-0 text-muted-foreground">
              <Icon name={item.icon} />
            </span>
          ) : null}

          {hasChildren ? (
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
            >
              <span className="truncate font-semibold text-foreground">{item.title}</span>
              {item.badgeLabel?.trim() ? (
                <span className="ml-auto shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
                  {item.badgeLabel}
                </span>
              ) : null}
              <span
                className={cn(
                  "ml-2 shrink-0 text-muted-foreground transition-transform duration-200",
                  open ? "rotate-90" : "rotate-0"
                )}
                aria-hidden="true"
              >
                ›
              </span>
            </button>
          ) : (
            <Link href={item.href} className="flex min-w-0 flex-1 items-center gap-2" onClick={onNavigate}>
              <span className="truncate font-semibold text-foreground">{item.title}</span>
              {item.badgeLabel?.trim() ? (
                <span className="ml-auto shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
                  {item.badgeLabel}
                </span>
              ) : null}
            </Link>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {hasChildren && open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-1 grid gap-1">
              {normalizedChildren.map((ch) => (
                <MenuNode key={ch.id} item={ch} depth={depth + 1} onNavigate={onNavigate} />
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default function MobileMenuDrawer({
  open,
  title,
  items,
  onClose,
  topAccountSection,
  topFeaturedBanner,
  topPromoBanner,
  rightHeader,
}: Props) {
  const normalized = useMemo(() => normalizeItems(items), [items]);

  useEffect(() => {
    if (!open) return;

    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevTouchAction = body.style.touchAction;

    body.style.overflow = "hidden";
    body.style.touchAction = "none";

    return () => {
      body.style.overflow = prevOverflow;
      body.style.touchAction = prevTouchAction;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed left-0 right-0 bottom-0 z-50 md:hidden"
          style={{
            top: "var(--announcement-offset, 0px)",
            height: "calc(100dvh - var(--announcement-offset, 0px))",
          }}
        >
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            aria-label="Close menu"
          />

          <motion.div
            initial={{ x: -24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -24, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.08}
            onDragEnd={(_, info) => {
              if (info.offset.x < -80 || info.velocity.x < -500) onClose();
            }}
            className="absolute inset-y-0 left-0 w-[86%] max-w-sm overflow-hidden rounded-r-3xl border border-border bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ touchAction: "pan-y" }}
            role="dialog"
            aria-modal="true"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-surface/95 px-4 py-4 backdrop-blur">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{title || "Menu"}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {rightHeader}
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>
            </div>

            <div className="max-h-full overflow-y-auto px-4 py-4" style={{ WebkitOverflowScrolling: "touch" }}>
              {topAccountSection ? <div className="mb-3">{topAccountSection}</div> : null}
              {topFeaturedBanner ? <div className="mb-3">{topFeaturedBanner}</div> : null}
              {topPromoBanner ? <div className="mb-3">{topPromoBanner}</div> : null}

              <div className="grid gap-1">
                {normalized.map((it) => (
                  <MenuNode key={it.id} item={it} depth={0} onNavigate={onClose} />
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
