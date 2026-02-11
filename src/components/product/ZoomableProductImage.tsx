"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt: string;
  className?: string;
};

type Pointer = { x: number; y: number };

function dist(a: Pointer, b: Pointer) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export default function ZoomableProductImage({ src, alt, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hovering, setHovering] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const touchRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const [open, setOpen] = useState(false);

  const pointersRef = useRef(new Map<number, Pointer>());
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  const pinchStartRef = useRef<{ d: number; scale: number } | null>(null);
  const panStartRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const zoomScale = 2.2;

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  }, []);

  const canInteract = useMemo(() => Boolean(src && src.trim()), [src]);

  useEffect(() => {
    if (!open) {
      setScale(1);
      setTx(0);
      setTy(0);
      pointersRef.current.clear();
      pinchStartRef.current = null;
      panStartRef.current = null;
    }
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const pts = Array.from(pointersRef.current.values());

    if (pts.length === 2) {
      pinchStartRef.current = { d: dist(pts[0]!, pts[1]!), scale };
      panStartRef.current = null;
    } else if (pts.length === 1) {
      panStartRef.current = { x: e.clientX, y: e.clientY, tx, ty };
    }
  }, [scale, tx, ty]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return;

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = Array.from(pointersRef.current.values());

    if (pts.length === 2 && pinchStartRef.current) {
      const d = dist(pts[0]!, pts[1]!);
      const base = pinchStartRef.current.d || 1;
      const raw = (d / base) * pinchStartRef.current.scale;
      const next = Math.max(1, Math.min(4, raw));
      setScale(next);
      return;
    }

    if (pts.length === 1 && panStartRef.current && scale > 1) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setTx(panStartRef.current.tx + dx);
      setTy(panStartRef.current.ty + dy);
    }
  }, [scale]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);

    const pts = Array.from(pointersRef.current.values());
    if (pts.length < 2) pinchStartRef.current = null;
    if (pts.length === 0) panStartRef.current = null;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (!open) return;
    if (!e.ctrlKey && Math.abs(e.deltaY) < 4) return;

    e.preventDefault();

    const next = Math.max(1, Math.min(4, scale - e.deltaY / 500));
    setScale(next);
  }, [open, scale]);

  return (
    <>
      <div
        ref={containerRef}
        className={cn("relative h-full w-full", className)}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onMouseMove={onMouseMove}
        onPointerDown={(e) => {
          if (e.pointerType !== "touch") return;
          touchRef.current = { x: e.clientX, y: e.clientY, moved: false };
        }}
        onPointerMove={(e) => {
          const t = touchRef.current;
          if (!t) return;
          const dx = e.clientX - t.x;
          const dy = e.clientY - t.y;
          if (Math.hypot(dx, dy) > 10) t.moved = true;
        }}
        onPointerUp={(e) => {
          const t = touchRef.current;
          touchRef.current = null;
          if (e.pointerType !== "touch") return;
          if (!canInteract) return;
          if (t?.moved) return;
          setOpen(true);
        }}
        onClick={() => {
          if (!canInteract) return;
          if (touchRef.current?.moved) return;
          setOpen(true);
        }}
        role={canInteract ? "button" : undefined}
        tabIndex={canInteract ? 0 : undefined}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            if (!canInteract) return;
            setOpen(true);
          }
        }}
        aria-label={canInteract ? "Open image zoom" : undefined}
      >
        <Image
          data-product-main-image="true"
          src={src}
          alt={alt}
          fill
          priority
          className="select-none object-cover transition-transform duration-150"
          style={{
            transformOrigin: `${origin.x}% ${origin.y}%`,
            transform: hovering ? `scale(${zoomScale})` : "scale(1)",
          }}
          unoptimized
        />
      </div>

      {open ? (
        <div className="fixed inset-0 z-100">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/70 dark:bg-background/80"
            onClick={close}
            aria-label="Close zoom"
          />

          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div
              className="relative h-full w-full max-w-4xl overflow-hidden rounded-3xl border border-border bg-surface"
              style={{ touchAction: "none" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onWheel={onWheel}
            >
              <div
                className="absolute inset-0"
                style={{
                  transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`,
                  transformOrigin: "50% 50%",
                }}
              >
                <Image src={src} alt={alt} fill className="object-contain" unoptimized sizes="100vw" />
              </div>

              <button
                type="button"
                className="absolute right-3 top-3 inline-flex h-10 items-center justify-center rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-foreground"
                onClick={close}
              >
                Close
              </button>

              <div className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-muted-foreground">
                <span>Pinch to zoom</span>
                <span className="text-foreground">{Math.round(scale * 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
