"use client";

import { LayoutGrid, List, Search, SlidersHorizontal, ArrowUpDown } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export type ListingLayoutMode = "grid" | "list";

type ListingTopBarProps = {
  title: string;

  spacing?: "compact" | "normal";

  showSearch?: boolean;
  qInput: string;
  onQInputChange: (next: string) => void;

  showFilters?: boolean;
  activeFilterCount?: number;
  onOpenFilters: () => void;

  showSort?: boolean;
  sortLabel?: string;
  onOpenSort: () => void;

  showLayoutSwitcher?: boolean;
  layoutMode?: ListingLayoutMode;
  onLayoutModeChange?: (next: ListingLayoutMode) => void;
};

function CountBadge({ count }: { count: number }) {
  if (!count) return null;

  return (
    <span className="rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-semibold leading-none text-primary-foreground">
      {count}
    </span>
  );
}

export default function ListingTopBar({
  title,
  spacing = "compact",
  showSearch = true,
  qInput,
  onQInputChange,
  showFilters = true,
  activeFilterCount = 0,
  onOpenFilters,
  showSort = true,
  sortLabel,
  onOpenSort,
  showLayoutSwitcher = false,
  layoutMode = "grid",
  onLayoutModeChange,
}: ListingTopBarProps) {
  const sidebarFiltersOnDesktop = showFilters;

  return (
    <div className={cn(spacing === "compact" ? "space-y-2" : "space-y-3")}>
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 truncate text-base font-semibold tracking-tight text-foreground">{title}</h1>
      </div>

      {showSearch ? (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={qInput}
            onChange={(e) => onQInputChange(e.target.value)}
            placeholder="Search"
            className={cn(
              "h-auto rounded-2xl pl-9 pr-3",
              spacing === "compact" ? "py-2" : "py-2.5"
            )}
          />
        </div>
      ) : null}

      <div className={cn("flex items-center gap-2", spacing === "compact" ? "pt-0.5" : "pt-1")}>
        {showFilters ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onOpenFilters}
            className={cn(
              "h-auto flex-1 justify-center gap-2 rounded-2xl py-2",
              sidebarFiltersOnDesktop && "md:hidden",
              !showSearch && "py-2.5"
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filters</span>
            <CountBadge count={activeFilterCount} />
          </Button>
        ) : null}

        {showSort ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onOpenSort}
            className={cn(
              "h-auto gap-2 rounded-2xl py-2",
              showFilters ? "flex-none" : "flex-1",
              sidebarFiltersOnDesktop && "md:hidden"
            )}
          >
            <ArrowUpDown className="h-4 w-4" />
            <span className="truncate">{sortLabel ? `Sort: ${sortLabel}` : "Sort"}</span>
          </Button>
        ) : null}

        {showLayoutSwitcher && onLayoutModeChange ? (
          <div className="flex items-center overflow-hidden rounded-2xl border border-border bg-surface">
            <button
              type="button"
              onClick={() => onLayoutModeChange("grid")}
              className={cn(
                "inline-flex items-center justify-center px-3 py-2 text-foreground",
                layoutMode === "grid" ? "bg-muted" : "hover:bg-muted"
              )}
              aria-label="Grid layout"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onLayoutModeChange("list")}
              className={cn(
                "inline-flex items-center justify-center px-3 py-2 text-foreground",
                layoutMode === "list" ? "bg-muted" : "hover:bg-muted"
              )}
              aria-label="List layout"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
