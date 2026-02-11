type FlyToCartOptions = {
  durationMs?: number;
};

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export async function animateFlyToCart(
  imageEl: HTMLElement,
  cartIconEl: HTMLElement,
  opts: FlyToCartOptions = {}
): Promise<void> {
  if (typeof window === "undefined") return;

  const durationMs = Math.max(100, Math.min(2000, Math.trunc(opts.durationMs ?? 600)));

  const from = imageEl.getBoundingClientRect();
  const to = cartIconEl.getBoundingClientRect();

  const clone = imageEl.cloneNode(true) as HTMLElement;

  clone.style.position = "fixed";
  clone.style.left = `${from.left}px`;
  clone.style.top = `${from.top}px`;
  clone.style.width = `${from.width}px`;
  clone.style.height = `${from.height}px`;
  clone.style.margin = "0";
  clone.style.zIndex = "9999";
  clone.style.pointerEvents = "none";
  clone.style.borderRadius = window.getComputedStyle(imageEl).borderRadius || "16px";
  clone.style.overflow = "hidden";
  clone.style.transformOrigin = "center center";
  clone.style.willChange = "transform, opacity";
  clone.style.opacity = "0.98";
  clone.style.transform = "translate3d(0,0,0) scale(1) rotate(0deg)";

  document.body.appendChild(clone);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);

  await nextFrame();
  await nextFrame();

  clone.style.transition = `transform ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`;
  clone.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(0.3) rotate(10deg)`;
  clone.style.opacity = "0.35";

  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clone.removeEventListener("transitionend", onEnd);
      resolve();
    };

    const onEnd = (e: TransitionEvent) => {
      if (e.target !== clone) return;
      if (e.propertyName !== "transform") return;
      finish();
    };

    clone.addEventListener("transitionend", onEnd);
    window.setTimeout(finish, durationMs + 80);
  });

  clone.remove();
}
