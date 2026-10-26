// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installDomMocks } from "../helpers/dom";
import { SelfieBooth } from "@/components/feedback/SelfieBooth";

/** A 2D context that accepts every drawing call and remembers nothing. */
function stubContext() {
  const noop = () => {};
  return new Proxy(
    { measureText: () => ({ width: 100 }), createLinearGradient: () => ({ addColorStop: noop }) },
    { get: (target, key) => (key in target ? target[key as keyof typeof target] : noop), set: () => true },
  ) as unknown as CanvasRenderingContext2D;
}

/** Images "load" on the next tick, as the mascot sticker and chosen photos would in a browser. */
class InstantImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 762;
  height = 1000;
  naturalWidth = 762;
  naturalHeight = 1000;
  set src(_value: string) {
    setTimeout(() => this.onload?.(), 0);
  }
}

function fakeCamera() {
  const track = { stop: vi.fn() };
  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  const getUserMedia = vi.fn(async () => stream);
  Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
  return { track, getUserMedia };
}

describe("Diwali selfie booth", () => {
  beforeEach(() => {
    installDomMocks({ reducedMotion: true }); // no 3-2-1 countdown
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((() => stubContext()) as never);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (this: HTMLCanvasElement, cb: BlobCallback) {
      cb(new Blob(["jpeg"], { type: "image/jpeg" }));
    });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
    vi.stubGlobal("Image", InstantImage);
    Object.defineProperty(URL, "createObjectURL", { value: vi.fn(() => "blob:selfie"), configurable: true, writable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: vi.fn(), configurable: true, writable: true });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, "mediaDevices");
    Reflect.deleteProperty(navigator, "canShare");
  });

  it("offers the camera or a photo, and says the photo is never uploaded", () => {
    render(<SelfieBooth />);
    expect(screen.getByRole("heading", { name: "Diwali selfie with Mini" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open camera" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose a photo" })).toBeInTheDocument();
    expect(screen.getByText(/never uploaded/)).toBeInTheDocument();
  });

  it("frames a camera selfie, switches the camera off and offers to save it", async () => {
    const { track, getUserMedia } = fakeCamera();
    render(<SelfieBooth />);
    fireEvent.click(screen.getByRole("button", { name: "Open camera" }));
    fireEvent.click(await screen.findByRole("button", { name: "Snap" }));
    expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: false, video: expect.objectContaining({ facingMode: "user" }) }));

    expect(await screen.findByRole("img", { name: "Your Diwali selfie in the TERRA UTSAV frame" })).toHaveAttribute("src", "blob:selfie");
    expect(screen.getByRole("button", { name: "Save photo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retake" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Share" })).not.toBeInTheDocument(); // no Web Share here
    expect(track.stop).toHaveBeenCalled();
  });

  it("offers Share where the device can share photos", async () => {
    fakeCamera();
    Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });
    render(<SelfieBooth />);
    fireEvent.click(screen.getByRole("button", { name: "Open camera" }));
    fireEvent.click(await screen.findByRole("button", { name: "Snap" }));
    expect(await screen.findByRole("button", { name: "Share" })).toBeInTheDocument();
  });

  it("falls back to choosing a photo when the camera is blocked", async () => {
    const getUserMedia = vi.fn(async () => Promise.reject(Object.assign(new Error("denied"), { name: "NotAllowedError" })));
    Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
    render(<SelfieBooth />);
    fireEvent.click(screen.getByRole("button", { name: "Open camera" }));
    // Shown on screen, and also announced through the live region.
    expect(await screen.findByText("The camera is blocked for this site. You can still choose a photo instead.", { selector: "p:not(.sr-only)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose a photo" })).toBeInTheDocument();
  });

  it("frames a chosen photo", async () => {
    const { container } = render(<SelfieBooth />);
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(input, { target: { files: [new File(["photo"], "me.jpg", { type: "image/jpeg" })] } });
    expect(await screen.findByRole("button", { name: "Save photo" })).toBeInTheDocument();
  });

  it("uses the team's Diwali arch by default and re-frames the photo when the frame changes", async () => {
    fakeCamera();
    const { container } = render(<SelfieBooth />);
    expect(screen.getByRole("radio", { name: "Diwali arch" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("button", { name: "Open camera" }));
    await screen.findByRole("button", { name: "Snap" });
    // The arch art sits over the live camera.
    expect(container.querySelector('img[src="/images/selfie/frame-arch.webp"]')).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Snap" }));
    expect(await screen.findByRole("img", { name: "Your Diwali selfie in the TERRA UTSAV frame" })).toHaveAttribute("width", "1080");
    expect(screen.getByRole("img", { name: "Your Diwali selfie in the TERRA UTSAV frame" })).toHaveAttribute("height", "1920");

    const made = vi.mocked(URL.createObjectURL).mock.calls.length;
    fireEvent.click(screen.getByRole("radio", { name: "Classic" }));
    expect(await screen.findByRole("radio", { name: "Classic" })).toHaveAttribute("aria-checked", "true");
    expect(await screen.findByRole("img", { name: "Your Diwali selfie in the TERRA UTSAV frame" })).toHaveAttribute("height", "1350");
    expect(vi.mocked(URL.createObjectURL).mock.calls.length).toBeGreaterThan(made);
  });

  it("switches the camera off when the booth closes", async () => {
    const { track } = fakeCamera();
    const { unmount } = render(<SelfieBooth />);
    fireEvent.click(screen.getByRole("button", { name: "Open camera" }));
    await screen.findByRole("button", { name: "Snap" });
    unmount();
    expect(track.stop).toHaveBeenCalled();
  });
});
