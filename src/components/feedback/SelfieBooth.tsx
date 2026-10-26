"use client";

import { Camera, Download, ImagePlus, RotateCcw, Share2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

/**
 * A Diwali selfie in a TERRA UTSAV frame. The photo is taken with the device camera (or picked
 * from the gallery), framed on a canvas and offered to save or share. Nothing is uploaded: the
 * picture never leaves the visitor's device.
 *
 * Two frames: the team's Diwali arch (story size, the photo shows through the arch with Mini waving
 * in front of it) and the classic drawn frame. People can switch frames after taking the photo.
 */

type FrameId = "arch" | "classic";
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
}
const FRAMES: Record<FrameId, { label: string; w: number; h: number; photo: Box }> = {
  // The arch window measured from the art (941x1672, opening x 176-771, y 334-1273), with a margin.
  arch: { label: "Diwali arch", w: 1080, h: 1920, photo: { x: 196, y: 376, w: 692, h: 1094, r: 0 } },
  classic: { label: "Classic", w: 1080, h: 1350, photo: { x: 60, y: 168, w: 960, h: 960, r: 28 } },
};
const FRAME_IDS = Object.keys(FRAMES) as FrameId[];
// The team's art with the arch window cut out (transparent), drawn over the photo.
const ARCH_ART = "/images/selfie/frame-arch.webp";
const W = FRAMES.classic.w;
const H = FRAMES.classic.h;
const PHOTO = FRAMES.classic.photo;
const MINI = { src: "/images/mascot/koochu-idle.webp", w: 290, h: Math.round((290 * 1000) / 762) };
const MINI_AT = { x: W - MINI.w - 36, y: H - MINI.h - 26 };
const FILE_NAME = "terra-utsav-diwali-selfie.jpg";
const STRIP = { hello: "Shubh Deepavali", event: "Eco-friendly Diwali Mandi 2026 · 27 Oct" };
const SPARKLES = [
  { x: 150, y: 92, r: 18 },
  { x: 205, y: 58, r: 10 },
  { x: 930, y: 92, r: 18 },
  { x: 875, y: 58, r: 10 },
];
const COLOURS = { maroon: "#931f33", cream: "#fbefdb", gold: "#edb95c", goldLight: "#f7d58c", shadow: "rgba(26, 12, 8, 0.45)" };

type Stage =
  | { name: "intro"; note?: string }
  | { name: "camera"; count: number | null }
  | { name: "working" }
  | { name: "result"; url: string; file: File; canShare: boolean; frame: FrameId };

function cameraProblem(error: unknown): string {
  const name = error && typeof error === "object" && "name" in error ? String((error as { name: unknown }).name) : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "The camera is blocked for this site. You can still choose a photo instead.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No camera found on this device. Choose a photo instead.";
  if (name === "NotReadableError") return "Another app is using the camera. Close it and try again, or choose a photo.";
  return "The camera didn't start. Choose a photo instead.";
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("The image could not be loaded."));
    img.src = src;
  });
}

/** A font family from one of the site's next/font variables, loaded before the canvas uses it. */
async function siteFont(variable: string, fallback: string, sample: string): Promise<string> {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  const family = value ? `${value}, ${fallback}` : fallback;
  try {
    await document.fonts?.load(`${sample} ${family}`);
  } catch {
    /* draw with whatever font is ready */
  }
  return family;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.closePath();
  ctx.fill();
}

/** Draws `source` to cover the box, cropping the overflow; mirrored like a selfie preview if asked. */
function drawCover(ctx: CanvasRenderingContext2D, source: CanvasImageSource, sw: number, sh: number, mirror: boolean, box: Box) {
  const { x, y, w, h } = box;
  const scale = Math.max(w / sw, h / sh);
  const cw = w / scale;
  const ch = h / scale;
  const cx = (sw - cw) / 2;
  const cy = (sh - ch) / 2;
  ctx.save();
  roundRect(ctx, x, y, w, h, box.r);
  ctx.clip();
  if (mirror) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(source, cx, cy, cw, ch, 0, 0, w, h);
  } else {
    ctx.drawImage(source, cx, cy, cw, ch, x, y, w, h);
  }
  ctx.restore();
}

function toJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("The photo could not be saved."))), "image/jpeg", 0.9),
  );
}

/** The framed picture as a JPEG. Falls back to the classic frame if the arch art can't load. */
async function framePhoto(frame: FrameId, source: CanvasImageSource, sw: number, sh: number, mirror: boolean): Promise<Blob> {
  if (frame === "arch") {
    const art = await loadImage(ARCH_ART).catch(() => null);
    if (art) {
      const { w, h, photo } = FRAMES.arch;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is not available.");
      ctx.fillStyle = "#1e0709";
      ctx.fillRect(0, 0, w, h);
      drawCover(ctx, source, sw, sh, mirror, photo);
      ctx.drawImage(art, 0, 0, w, h);
      return toJpeg(canvas);
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");

  const [display, sans, hand] = await Promise.all([
    siteFont("--font-lilita", '"Arial Rounded MT Bold", Arial, sans-serif', "96px"),
    siteFont("--font-nunito", "Arial, sans-serif", "800 30px"),
    siteFont("--font-kalam", '"Segoe Print", cursive', "700 54px"),
  ]);

  ctx.fillStyle = COLOURS.maroon;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = COLOURS.gold;
  ctx.lineWidth = 4;
  roundRect(ctx, 20, 20, W - 40, H - 40, 34);
  ctx.stroke();

  drawCover(ctx, source, sw, sh, mirror, PHOTO);
  ctx.strokeStyle = COLOURS.gold;
  ctx.lineWidth = 8;
  roundRect(ctx, PHOTO.x, PHOTO.y, PHOTO.w, PHOTO.h, PHOTO.r);
  ctx.stroke();

  ctx.fillStyle = COLOURS.cream;
  ctx.textAlign = "center";
  ctx.font = `96px ${display}`;
  ctx.fillText("TERRA UTSAV", W / 2, 128);
  ctx.fillStyle = COLOURS.goldLight;
  for (const s of SPARKLES) sparkle(ctx, s.x, s.y, s.r);

  ctx.textAlign = "left";
  ctx.fillStyle = COLOURS.goldLight;
  ctx.font = `700 54px ${hand}`;
  ctx.fillText(STRIP.hello, 70, 1212);
  ctx.fillStyle = COLOURS.cream;
  ctx.font = `800 30px ${sans}`;
  ctx.fillText(STRIP.event, 72, 1266);

  try {
    const mini = await loadImage(MINI.src);
    ctx.save();
    ctx.shadowColor = COLOURS.shadow;
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    ctx.drawImage(mini, MINI_AT.x, MINI_AT.y, MINI.w, MINI.h);
    ctx.restore();
  } catch {
    /* the frame works without the sticker */
  }

  return toJpeg(canvas);
}

/** The classic frame drawn over the live camera, matching the saved picture. */
function FrameOverlay() {
  const { x, y, w, h, r } = PHOTO;
  const hole = `M${x + r},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${y + r} V${y + h - r} A${r},${r} 0 0 1 ${x + w - r},${y + h} H${x + r} A${r},${r} 0 0 1 ${x},${y + h - r} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} Z`;
  return (
    <svg aria-hidden viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 h-full w-full">
      <path fill={COLOURS.maroon} fillRule="evenodd" d={`M0 0H${W}V${H}H0Z ${hole}`} />
      <rect x={20} y={20} width={W - 40} height={H - 40} rx={34} fill="none" stroke={COLOURS.gold} strokeWidth={4} />
      <rect x={x} y={y} width={w} height={h} rx={r} fill="none" stroke={COLOURS.gold} strokeWidth={8} />
      <text x={W / 2} y={128} textAnchor="middle" fill={COLOURS.cream} fontSize={96} style={{ fontFamily: "var(--font-display)" }}>
        TERRA UTSAV
      </text>
      {SPARKLES.map((s) => (
        <path
          key={`${s.x}-${s.y}`}
          fill={COLOURS.goldLight}
          d={`M${s.x} ${s.y - s.r} Q${s.x} ${s.y} ${s.x + s.r} ${s.y} Q${s.x} ${s.y} ${s.x} ${s.y + s.r} Q${s.x} ${s.y} ${s.x - s.r} ${s.y} Q${s.x} ${s.y} ${s.x} ${s.y - s.r}Z`}
        />
      ))}
      <text x={70} y={1212} fill={COLOURS.goldLight} fontSize={54} fontWeight={700} style={{ fontFamily: "var(--font-hand)" }}>
        {STRIP.hello}
      </text>
      <text x={72} y={1266} fill={COLOURS.cream} fontSize={30} fontWeight={800} style={{ fontFamily: "var(--font-sans)" }}>
        {STRIP.event}
      </text>
      <image href={MINI.src} x={MINI_AT.x} y={MINI_AT.y} width={MINI.w} height={MINI.h} />
    </svg>
  );
}

/** Choose the frame; after a photo is taken, switching re-frames it. */
function FramePicker({ value, onChange, disabled }: { value: FrameId; onChange: (frame: FrameId) => void; disabled?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Frame" className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-[0.95rem] font-extrabold">Frame:</span>
      {FRAME_IDS.map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          disabled={disabled}
          onClick={() => onChange(id)}
          className={cn(
            "inline-flex min-h-11 items-center rounded-full border-2 px-4 py-2 text-[0.98rem] font-extrabold transition-colors duration-150 disabled:opacity-55",
            value === id ? "border-maroon-600 bg-maroon-600 text-cream-100" : "border-choc-900/20 bg-cream-50 text-ink hover:border-maroon-600",
          )}
        >
          {FRAMES[id].label}
        </button>
      ))}
    </div>
  );
}

export function SelfieBooth({ className }: { className?: string }) {
  const reduce = usePrefersReducedMotion();
  const [stage, setStage] = useState<Stage>({ name: "intro" });
  const [frame, setFrame] = useState<FrameId>("arch");
  const [status, setStatus] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const urlRef = useRef<string | null>(null);
  const wantCamera = useRef(false);
  const lastSource = useRef<"camera" | "file">("camera");
  // The last photo, unframed, so switching frames re-frames it without asking again.
  const lastShot = useRef<{ canvas: HTMLCanvasElement; mirror: boolean } | null>(null);

  const stopCamera = useCallback(() => {
    wantCamera.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    stopStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // Stop the camera and free the photo when the booth goes away.
  useEffect(
    () => () => {
      stopCamera();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [stopCamera],
  );

  // Hand the stream to the preview once it is on screen.
  useEffect(() => {
    if (stage.name !== "camera") return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream || video.srcObject === stream) return;
    video.srcObject = stream;
    try {
      const playing = video.play();
      if (playing && typeof playing.catch === "function") playing.catch(() => undefined);
    } catch {
      /* autoplay attribute will start it */
    }
  }, [stage]);

  const showResult = (blob: Blob, framedWith: FrameId) => {
    const file = new File([blob], FILE_NAME, { type: "image/jpeg" });
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(blob);
    urlRef.current = url;
    const canShare = typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
    setStage({ name: "result", url, file, canShare, frame: framedWith });
    setStatus("Your framed selfie is ready. Save it or share it.");
  };

  const failed = (note: string) => {
    setStage({ name: "intro", note });
    setStatus(note);
  };

  /** Frames the kept photo with the given frame. */
  const frameShot = async (framedWith: FrameId) => {
    const shot = lastShot.current;
    if (!shot) return;
    setStage({ name: "working" });
    setStatus("Framing your photo.");
    try {
      showResult(await framePhoto(framedWith, shot.canvas, shot.canvas.width, shot.canvas.height, shot.mirror), framedWith);
    } catch {
      failed("Something went wrong framing the photo. Please try again.");
    }
  };

  const chooseFrame = (next: FrameId) => {
    setFrame(next);
    if (stage.name === "result" && stage.frame !== next) void frameShot(next);
  };

  const openCamera = async () => {
    lastSource.current = "camera";
    const media = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    if (!media?.getUserMedia) {
      failed("This browser can't open the camera here. Choose a photo instead.");
      return;
    }
    wantCamera.current = true;
    setStatus("Asking for the camera.");
    try {
      const stream = await media.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
      if (!wantCamera.current) {
        stopStream(stream);
        return;
      }
      streamRef.current = stream;
      setStage({ name: "camera", count: null });
      setStatus("Camera on. Press Snap when you're ready.");
    } catch (error) {
      wantCamera.current = false;
      failed(cameraProblem(error));
    }
  };

  const capture = async () => {
    const video = videoRef.current;
    const sw = video?.videoWidth || 1280;
    const sh = video?.videoHeight || 1280;
    // Copy the frame first, so the camera can switch off straight away.
    const shot = document.createElement("canvas");
    shot.width = sw;
    shot.height = sh;
    if (video) shot.getContext("2d")?.drawImage(video, 0, 0, sw, sh);
    stopCamera();
    lastShot.current = { canvas: shot, mirror: true };
    await frameShot(frame);
  };

  const snap = () => {
    if (stage.name !== "camera" || stage.count !== null) return;
    if (reduce) {
      void capture();
      return;
    }
    let count = 3;
    setStage({ name: "camera", count });
    setStatus("Smile! Taking the photo in 3 seconds.");
    timerRef.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setStage({ name: "camera", count });
        return;
      }
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      void capture();
    }, 800);
  };

  const cancel = () => {
    stopCamera();
    setStage({ name: "intro" });
    setStatus("Camera off.");
  };

  const choosePhoto = () => {
    lastSource.current = "file";
    fileRef.current?.click();
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    stopCamera();
    setStage({ name: "working" });
    setStatus("Framing your photo.");
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      // Keep a copy, so the photo can be re-framed after its object URL is gone.
      const copy = document.createElement("canvas");
      copy.width = img.naturalWidth || img.width;
      copy.height = img.naturalHeight || img.height;
      copy.getContext("2d")?.drawImage(img, 0, 0, copy.width, copy.height);
      lastShot.current = { canvas: copy, mirror: false };
    } catch {
      failed("That photo couldn't be opened. Try another one.");
      return;
    } finally {
      URL.revokeObjectURL(url);
    }
    await frameShot(frame);
  };

  const save = () => {
    if (stage.name !== "result") return;
    const a = document.createElement("a");
    a.href = stage.url;
    a.download = FILE_NAME;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setStatus("Saved. Look for it in your downloads or photos.");
  };

  const share = async () => {
    if (stage.name !== "result") return;
    try {
      await navigator.share({ files: [stage.file], title: "My Diwali at TERRA UTSAV", text: "Shubh Deepavali from the TERRA UTSAV stall! Came for the food, stayed for the chaos." });
    } catch {
      /* closed the share sheet */
    }
  };

  const retake = () => (lastSource.current === "file" ? choosePhoto() : void openCamera());

  return (
    <section aria-labelledby="selfie-title" className={cn("rounded-[var(--radius-panel)] bg-cream-100 p-6 text-ink md:p-8", className)}>
      <h2 id="selfie-title" className="font-display text-[1.9rem] leading-tight text-choc-900 md:text-[2.2rem]">
        Diwali selfie with Mini
      </h2>
      <p className="mt-2 max-w-prose text-[1rem] leading-relaxed">
        Snap a selfie in our festive frame, then save it or share it. Your photo stays on your device: it is never uploaded.
      </p>
      <p aria-live="polite" className="sr-only">
        {status}
      </p>

      {stage.name === "intro" && (
        <div className="mt-5">
          {stage.note && <p className="mb-4 rounded-2xl bg-maroon-600/10 px-4 py-3 text-[0.95rem] font-bold text-maroon-600">{stage.note}</p>}
          <FramePicker value={frame} onChange={chooseFrame} />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button icon={<Camera />} onClick={() => void openCamera()}>
              Open camera
            </Button>
            <Button variant="dark" icon={<ImagePlus />} onClick={choosePhoto}>
              Choose a photo
            </Button>
          </div>
        </div>
      )}

      {stage.name === "camera" && (
        <div className="mt-5">
          <FramePicker value={frame} onChange={chooseFrame} disabled={stage.count !== null} />
          <div
            className={cn(
              "relative mx-auto mt-4 w-full overflow-hidden rounded-[22px] bg-burgundy-950 shadow-[var(--shadow-card)]",
              frame === "arch" ? "aspect-[9/16] max-w-[340px]" : "aspect-[4/5] max-w-[420px]",
            )}
          >
            <video
              ref={videoRef}
              aria-hidden
              autoPlay
              playsInline
              muted
              className="absolute -scale-x-100 object-cover"
              style={{
                left: `${(FRAMES[frame].photo.x / FRAMES[frame].w) * 100}%`,
                top: `${(FRAMES[frame].photo.y / FRAMES[frame].h) * 100}%`,
                width: `${(FRAMES[frame].photo.w / FRAMES[frame].w) * 100}%`,
                height: `${(FRAMES[frame].photo.h / FRAMES[frame].h) * 100}%`,
              }}
            />
            {frame === "arch" ? (
              // eslint-disable-next-line @next/next/no-img-element -- laid over a live video, sized by its box
              <img src={ARCH_ART} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />
            ) : (
              <FrameOverlay />
            )}
            {stage.count !== null && (
              <span aria-hidden className="absolute inset-0 grid place-items-center font-display text-[7rem] leading-none text-cream-100 [text-shadow:0_4px_18px_rgb(26_12_8/0.6)]">
                {stage.count}
              </span>
            )}
          </div>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <Button icon={<Camera />} onClick={snap} disabled={stage.count !== null}>
              Snap
            </Button>
            <Button variant="dark" icon={<X />} onClick={cancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {stage.name === "working" && <p className="mt-5 font-extrabold text-maroon-600">Framing your photo…</p>}

      {stage.name === "result" && (
        <div className="mt-5">
          <FramePicker value={stage.frame} onChange={chooseFrame} />
          {/* A local blob URL: there is nothing for next/image to optimise. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={stage.url}
            alt="Your Diwali selfie in the TERRA UTSAV frame"
            width={FRAMES[stage.frame].w}
            height={FRAMES[stage.frame].h}
            className={cn(
              "mx-auto mt-4 h-auto w-full rounded-[22px] shadow-[var(--shadow-card)]",
              stage.frame === "arch" ? "max-w-[340px]" : "max-w-[420px]",
            )}
          />
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Button icon={<Download />} onClick={save}>
              Save photo
            </Button>
            {stage.canShare && (
              <Button variant="secondary" icon={<Share2 />} onClick={() => void share()}>
                Share
              </Button>
            )}
            <Button variant="dark" icon={<RotateCcw />} onClick={retake}>
              Retake
            </Button>
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" tabIndex={-1} aria-hidden onChange={(e) => void onFile(e)} />
    </section>
  );
}
