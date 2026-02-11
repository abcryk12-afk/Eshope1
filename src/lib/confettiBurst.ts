type ConfettiOptions = {
  durationMs?: number;
  particleCount?: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  rot: number;
  vr: number;
  color: string;
  lifeMs: number;
  ageMs: number;
};

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

export function confettiBurstAt(
  x: number,
  y: number,
  opts: ConfettiOptions = {}
): () => void {
  if (typeof window === "undefined") return () => {};

  const durationMs = clampInt(opts.durationMs ?? 800, 200, 4000);
  const particleCount = clampInt(opts.particleCount ?? 18, 6, 60);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return () => {};
  }

  const context: CanvasRenderingContext2D = ctx;

  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  canvas.style.position = "fixed";
  canvas.style.left = "0";
  canvas.style.top = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "9999";

  document.body.appendChild(canvas);

  function resize() {
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
  }

  resize();

  const colors = [
    "#ff6a00",
    "#16a34a",
    "#2563eb",
    "#f59e0b",
    "#ef4444",
    "#a855f7",
  ];

  const particles: Particle[] = Array.from({ length: particleCount }).map(() => {
    const a = Math.random() * Math.PI * 2;
    const s = 240 + Math.random() * 260;

    return {
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - (240 + Math.random() * 160),
      r: 3 + Math.random() * 4,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 10,
      color: colors[Math.floor(Math.random() * colors.length)]!,
      lifeMs: durationMs,
      ageMs: 0,
    };
  });

  let raf: number | null = null;
  let last = performance.now();
  let done = false;

  function frame(now: number) {
    if (done) return;

    const dt = Math.min(48, now - last);
    last = now;

    context.clearRect(0, 0, canvas.width, canvas.height);

    const g = 980;

    for (const p of particles) {
      p.ageMs += dt;
      const t = Math.max(0, Math.min(1, p.ageMs / p.lifeMs));

      p.vy += (g * dt) / 1000;
      p.x += (p.vx * dt) / 1000;
      p.y += (p.vy * dt) / 1000;
      p.rot += (p.vr * dt) / 1000;

      const alpha = 1 - t;

      context.save();
      context.globalAlpha = alpha;
      context.translate(p.x * dpr, p.y * dpr);
      context.rotate(p.rot);
      context.fillStyle = p.color;
      context.fillRect(-p.r * dpr, -p.r * dpr, p.r * 2 * dpr, p.r * 2 * dpr);
      context.restore();
    }

    const alive = particles.some((p) => p.ageMs < p.lifeMs);
    if (!alive) {
      cleanup();
      return;
    }

    raf = requestAnimationFrame(frame);
  }

  function cleanup() {
    done = true;
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    canvas.remove();
  }

  window.addEventListener("resize", resize);
  raf = requestAnimationFrame(frame);

  return cleanup;
}

export function confettiBurstFromElement(
  el: HTMLElement,
  opts: ConfettiOptions = {}
): () => void {
  const r = el.getBoundingClientRect();
  return confettiBurstAt(r.left + r.width / 2, r.top + r.height / 2, opts);
}
