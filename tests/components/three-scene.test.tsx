// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThreeScene } from "@/components/three/ThreeScene";
import type { MountOptions } from "@/components/three/stage";
import { installDomMocks, MockIntersectionObserver } from "../helpers/dom";

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

/** matchMedia where wide-screen queries match and reduced motion is as asked. */
function wideScreen({ reducedMotion = false } = {}) {
  const mm = vi.fn((query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? reducedMotion : query.includes("min-width"),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  vi.stubGlobal("matchMedia", mm);
  Object.defineProperty(window, "matchMedia", { value: mm, configurable: true, writable: true });
}

const state = (container: HTMLElement) => container.querySelector("[data-three]")?.getAttribute("data-three");

describe("ThreeScene", () => {
  beforeEach(() => {
    installDomMocks();
    vi.stubGlobal("ResizeObserver", NoopResizeObserver);
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows the drawn poster and never downloads three.js without WebGL 2", () => {
    wideScreen();
    const load = vi.fn();
    const { container } = render(<ThreeScene load={load} poster={<p>Drawn diyas</p>} />);
    act(() => MockIntersectionObserver.triggerAll(true));
    expect(screen.getByText("Drawn diyas")).toBeInTheDocument();
    expect(state(container)).toBe("poster");
    expect(load).not.toHaveBeenCalled();
  });

  it("keeps the poster under reduced motion, even with WebGL 2", () => {
    vi.stubGlobal("WebGL2RenderingContext", class {});
    wideScreen({ reducedMotion: true });
    const load = vi.fn();
    render(<ThreeScene load={load} poster={<p>Poster</p>} />);
    act(() => MockIntersectionObserver.triggerAll(true));
    expect(load).not.toHaveBeenCalled();
  });

  it("loads the scene near the screen, fades it in after the first frame, and cleans up", async () => {
    vi.stubGlobal("WebGL2RenderingContext", class {});
    wideScreen();
    const handle = { setActive: vi.fn(), resize: vi.fn(), dispose: vi.fn() };
    let firstFrame = () => {};
    const load = vi.fn(async () => ({
      mount: (_canvas: HTMLCanvasElement, options: MountOptions) => {
        firstFrame = options.onFirstFrame;
        return handle;
      },
    }));
    const { container, unmount } = render(<ThreeScene load={load} poster={<p>Poster</p>} />);
    expect(load).not.toHaveBeenCalled();

    await act(async () => {
      MockIntersectionObserver.triggerAll(true);
    });
    expect(load).toHaveBeenCalledTimes(1);
    expect(handle.setActive).toHaveBeenCalledWith(true);
    expect(state(container)).toBe("poster");

    act(() => firstFrame());
    expect(state(container)).toBe("live");

    unmount();
    expect(handle.dispose).toHaveBeenCalled();
  });
});
