/**
 * Who gets the live 3D scenes. Everyone else keeps the drawn artwork, which is complete on its
 * own: reduced motion, data saver, low-memory or low-core phones, browsers without WebGL 2, and
 * (optionally) screens narrower than a scene needs.
 */
export function canRender3D(minWidth = 0): boolean {
  if (typeof window === "undefined") return false;
  if (!("WebGL2RenderingContext" in window)) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (minWidth > 0 && !window.matchMedia(`(min-width: ${minWidth}px)`).matches) return false;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  if (nav.connection?.saveData) return false;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory < 2) return false;
  // Phones: only the stronger ones, so a budget phone stays cool and the battery lasts the day.
  if (!window.matchMedia("(min-width: 768px)").matches) {
    if (typeof nav.deviceMemory === "number" && nav.deviceMemory < 4) return false;
    if ((nav.hardwareConcurrency ?? 8) < 4) return false;
  }
  return true;
}

/** Resolves once the page has loaded and the main thread is idle, so 3D never competes with the first paint. */
export function whenIdle(timeout = 2500): Promise<void> {
  return new Promise((resolve) => {
    const idle = () => {
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      if (ric) ric(() => resolve(), { timeout });
      else setTimeout(resolve, 200);
    };
    if (document.readyState === "complete") idle();
    else window.addEventListener("load", idle, { once: true });
  });
}
