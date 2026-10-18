"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * One shared manager for every scroll reveal on the page. It uses an IntersectionObserver when
 * the browser delivers its callbacks, and also checks positions on scroll, on resize and right
 * away when an element mounts, so content is shown even where observers are throttled (some
 * embedded or background browsers). Nothing is ever left hidden without script: the hidden state
 * only applies under `html.js`, and reduced motion shows everything in place.
 */
const pending = new Set<HTMLElement>();
let observer: IntersectionObserver | null = null;
let listening = false;
let timer: ReturnType<typeof setTimeout> | null = null;

function show(el: HTMLElement) {
  el.dataset.in = "true";
  pending.delete(el);
  observer?.unobserve(el);
}

function inView(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  return r.top < vh * 0.94 && r.bottom > 0;
}

function sweep() {
  timer = null;
  for (const el of pending) if (inView(el)) show(el);
  if (pending.size === 0) stopListening();
}

function schedule() {
  if (timer === null) timer = setTimeout(sweep, 80);
}

function startListening() {
  if (listening) return;
  listening = true;
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
}

function stopListening() {
  if (!listening) return;
  listening = false;
  window.removeEventListener("scroll", schedule);
  window.removeEventListener("resize", schedule);
}

function register(el: HTMLElement) {
  if (typeof IntersectionObserver !== "undefined" && !observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) show(entry.target as HTMLElement);
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.01 },
    );
  }
  pending.add(el);
  observer?.observe(el);
  startListening();
  if (inView(el)) show(el);
}

function unregister(el: HTMLElement) {
  pending.delete(el);
  observer?.unobserve(el);
  if (pending.size === 0) stopListening();
}

export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className,
}: {
  children: ReactNode;
  delay?: number;
  as?: ElementType;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    register(el);
    return () => unregister(el);
  }, []);

  return (
    <Tag ref={ref} data-reveal="" className={cn(className)} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </Tag>
  );
}
