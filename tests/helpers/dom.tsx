import { vi } from "vitest";

/** A controllable IntersectionObserver for jsdom. */
export class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  elements = new Set<Element>();
  constructor(private callback: IntersectionObserverCallback) {
    MockIntersectionObserver.instances.push(this);
  }
  observe(el: Element) {
    this.elements.add(el);
  }
  unobserve(el: Element) {
    this.elements.delete(el);
  }
  disconnect() {
    this.elements.clear();
  }
  takeRecords() {
    return [];
  }
  trigger(isIntersecting = true) {
    const entries = [...this.elements].map((target) => ({ isIntersecting, target, intersectionRatio: isIntersecting ? 1 : 0 }) as unknown as IntersectionObserverEntry);
    this.callback(entries, this as unknown as IntersectionObserver);
  }
  static triggerAll(isIntersecting = true) {
    for (const io of MockIntersectionObserver.instances) io.trigger(isIntersecting);
  }
}

export function installDomMocks({ reducedMotion = false }: { reducedMotion?: boolean } = {}) {
  MockIntersectionObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: reducedMotion && query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
  Object.defineProperty(window, "matchMedia", { value: globalThis.matchMedia, configurable: true, writable: true });
}

/** next/image and next/link replaced with plain elements for jsdom. */
export const nextMocks = {
  image: () => ({
    default: ({ src, alt, onError, className }: { src: string; alt: string; onError?: () => void; className?: string }) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={typeof src === "string" ? src : ""} alt={alt} onError={onError} className={className} />
    ),
  }),
  link: () => ({
    default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
      <a href={typeof href === "string" ? href : "#"} {...rest}>
        {children}
      </a>
    ),
  }),
};
