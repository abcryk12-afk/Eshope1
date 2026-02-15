"use client";

import { cn } from "@/lib/utils";

export default function FooterSectionWrapper({
  children,
  isAdmin,
  isSelected,
  onClick,
}: {
  children: React.ReactNode;
  isAdmin?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "min-w-0",
        isAdmin ? "rounded-2xl transition-colors hover:bg-muted/30" : "",
        isSelected ? "ring-2 ring-foreground/20" : ""
      )}
    >
      {children}
    </div>
  );
}
