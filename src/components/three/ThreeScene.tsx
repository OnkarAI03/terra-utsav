"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { MountOptions, SceneHandle } from "./stage";
import { canRender3D, whenIdle } from "./support";

export type SceneLoader = () => Promise<{ mount: (canvas: HTMLCanvasElement, options: MountOptions) => SceneHandle }>;

/**
 * A live three.js scene with a drawn poster underneath.
 *
 * - The poster is the complete artwork. Visitors who get no 3D (reduced motion, data saver, very
 *   low memory, no WebGL 2, or a screen narrower than `minWidth`) only ever see the poster.
 * - three.js is fetched only when the scene comes near the viewport (`defer` also waits for the
 *   page to finish loading and go idle, for scenes on the first screen).
 * - The scene renders only while it is on screen and the tab is visible; the canvas fades in over
 *   the poster after its first frame.
 * - `load` must be a stable function defined at module level.
 */
export function ThreeScene({
  load,
  poster,
  className,
  canvasClassName,
  interactive = false,
  minWidth = 0,
  defer = false,
  label,
  children,
}: {
  load: SceneLoader;
  poster?: React.ReactNode;
  className?: string;
  canvasClassName?: string;
  interactive?: boolean;
  minWidth?: number;
  defer?: boolean;
  /** One stable description of the picture, whether the drawing or the live scene is showing. */
  label?: string;
  /** Overlays, e.g. a hint. Style with `group-data-[three=live]/three:` to show them only over the live scene. */
  children?: React.ReactNode;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = wrap.current;
    const cv = canvas.current;
    if (!el || !cv || !canRender3D(minWidth)) return;

    let handle: SceneHandle | null = null;
    let cancelled = false;
    let onScreen = false;
    const sync = () => handle?.setActive(onScreen && !document.hidden);

    const start = async () => {
      try {
        if (defer) await whenIdle();
        const mod = await load();
        if (cancelled) return;
        handle = mod.mount(cv, { onFirstFrame: () => !cancelled && setReady(true) });
        const box = el.getBoundingClientRect();
        handle.resize(box.width, box.height);
        sync();
      } catch {
        // No 3D for this visitor: the poster is already the full artwork.
        handle = null;
      }
    };

    const near = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          near.disconnect();
          void start();
        }
      },
      { rootMargin: "320px 0px" },
    );
    const seen = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? false;
      sync();
    });
    const sizer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box) handle?.resize(box.width, box.height);
    });
    const lost = (e: Event) => {
      e.preventDefault();
      setReady(false);
      handle?.dispose();
      handle = null;
    };

    near.observe(el);
    seen.observe(el);
    sizer.observe(el);
    cv.addEventListener("webglcontextlost", lost);
    document.addEventListener("visibilitychange", sync);
    return () => {
      cancelled = true;
      near.disconnect();
      seen.disconnect();
      sizer.disconnect();
      cv.removeEventListener("webglcontextlost", lost);
      document.removeEventListener("visibilitychange", sync);
      handle?.dispose();
    };
  }, [load, minWidth, defer]);

  return (
    // cn() only joins classes, so add `relative` only when the caller has not positioned the wrapper.
    <div
      ref={wrap}
      className={cn("group/three", !/(^|\s)(absolute|fixed|sticky|relative)(\s|$)/.test(className ?? "") && "relative", className)}
      data-three={ready ? "live" : "poster"}
    >
      {label && (
        <span role="img" aria-label={label} className="sr-only" />
      )}
      {poster && (
        <div aria-hidden={ready || label ? true : undefined} className={cn("h-full w-full transition-opacity duration-700 ease-out", ready && "opacity-0")}>
          {poster}
        </div>
      )}
      <canvas
        ref={canvas}
        aria-hidden
        className={cn(
          "absolute inset-0 h-full w-full transition-opacity duration-700 ease-out",
          ready ? "opacity-100" : "opacity-0",
          (!interactive || !ready) && "pointer-events-none",
          canvasClassName,
        )}
      />
      {children}
    </div>
  );
}
