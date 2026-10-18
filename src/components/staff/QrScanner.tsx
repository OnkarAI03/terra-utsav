"use client";

import { Camera, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Detector {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
type DetectorCtor = new (opts: { formats: string[] }) => Detector;

/** Camera QR scanning where the browser supports BarcodeDetector. Typing the code always works. */
export function QrScanner({ onDetect }: { onDetect: (value: string) => void }) {
  const [supported, setSupported] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setSupported("BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia);
  }, []);

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let stopped = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (stopped || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const Ctor = (window as unknown as { BarcodeDetector: DetectorCtor }).BarcodeDetector;
        const detector = new Ctor({ formats: ["qr_code"] });
        timer = setInterval(async () => {
          if (!video.current) return;
          try {
            const codes = await detector.detect(video.current);
            if (codes[0]?.rawValue) {
              onDetect(codes[0].rawValue);
              setOpen(false);
            }
          } catch {
            /* keep trying */
          }
        }, 250);
      } catch {
        setError("Camera not available. Type the code instead.");
        setOpen(false);
      }
    })();
    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open, onDetect]);

  if (!supported) return null;

  return (
    <div>
      {open ? (
        <div className="relative overflow-hidden rounded-2xl bg-night">
          <video ref={video} className="aspect-square w-full object-cover" muted playsInline />
          <span aria-hidden className="absolute inset-[18%] rounded-2xl border-4 border-gold-400/90" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-cream-100 text-ink"
            aria-label="Stop scanning"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-full border-2 border-choc-900/30 px-4 py-2.5 font-extrabold text-ink hover:bg-cream-50"
        >
          <Camera aria-hidden className="h-5 w-5" />
          Scan QR code
        </button>
      )}
      {error && <p className="mt-2 text-[0.95rem] font-bold text-danger-ink">{error}</p>}
    </div>
  );
}
