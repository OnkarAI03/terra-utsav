"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import Image from "next/image";
import { LOGO } from "@/components/brand/LogoSign";
import { PawIcon } from "@/components/brand/PawIcon";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";

export type TicketState = "valid" | "redeemed" | "expired" | "void";

/**
 * The coupon as a festival ticket: code in large type for staff to read, and a QR code of the
 * same code for staff to scan. The QR holds only the code; it is not a secret beyond the code.
 */
export function CouponTicket({
  code,
  label,
  valueText,
  expiresAt,
  issuedAt,
  state = "valid",
  redemptionsLeft,
  className,
}: {
  code: string;
  label: string;
  valueText: string | null;
  expiresAt: string | null;
  issuedAt?: string | null;
  state?: TicketState;
  redemptionsLeft?: number;
  className?: string;
}) {
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    QRCode.toString(code, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#2b140d", light: "#fbefdb" } })
      .then((svg) => alive && setQr(svg))
      .catch(() => alive && setQr(null));
    return () => {
      alive = false;
    };
  }, [code]);

  const usable = state === "valid";
  const stateLabel = { valid: "Ready to use", redeemed: "Redeemed", expired: "Expired", void: "Cancelled" }[state];

  return (
    <article
      className={cn(
        "relative grid overflow-hidden rounded-[22px] text-ink shadow-[var(--shadow-card)] [grid-template-columns:72px_1fr] sm:[grid-template-columns:88px_1fr_auto]",
        usable ? "bg-cream-100" : "bg-cream-300",
        className,
      )}
      aria-label={`${label}, code ${code.split("").join(" ")}, ${stateLabel}`}
    >
      {/* Ticket notches */}
      <span aria-hidden className="absolute left-[64px] top-[-10px] h-5 w-5 rounded-full bg-[var(--notch,#24120c)] sm:left-[78px]" />
      <span aria-hidden className="absolute bottom-[-10px] left-[64px] h-5 w-5 rounded-full bg-[var(--notch,#24120c)] sm:left-[78px]" />

      <div className="flex flex-col items-center justify-center gap-2 bg-maroon-600 py-4 text-cream-100">
        <PawIcon className="h-7 w-7 text-gold-300" />
        <span className="font-display text-[0.95rem] leading-none [writing-mode:vertical-rl] rotate-180">TERRA UTSAV</span>
      </div>

      <div className="flex min-w-0 flex-col gap-1.5 border-l-2 border-dashed border-choc-900/25 p-4 sm:p-5">
        <p className="text-[0.875rem] font-extrabold text-maroon-600">{label}</p>
        <p className="font-display text-[1.45rem] leading-tight text-choc-900">{valueText ?? "Reward announced at the stall"}</p>
        <p className="mt-1 break-all font-display text-[1.6rem] tracking-[0.06em] text-ink sm:text-[1.8rem]">{code}</p>
        <dl className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-[0.875rem]">
          <div className="flex gap-1">
            <dt className="font-bold text-ink-soft">Status:</dt>
            <dd className={cn("font-extrabold", usable ? "text-success-ink" : "text-danger-ink")}>{stateLabel}</dd>
          </div>
          {expiresAt && (
            <div className="flex gap-1">
              <dt className="font-bold text-ink-soft">Expires:</dt>
              <dd className="font-extrabold">{formatDateTime(expiresAt)}</dd>
            </div>
          )}
          {issuedAt && (
            <div className="flex gap-1">
              <dt className="font-bold text-ink-soft">Won:</dt>
              <dd className="font-extrabold">{formatDateTime(issuedAt)}</dd>
            </div>
          )}
          {typeof redemptionsLeft === "number" && redemptionsLeft > 1 && (
            <div className="flex gap-1">
              <dt className="font-bold text-ink-soft">Uses left:</dt>
              <dd className="font-extrabold">{redemptionsLeft}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="col-span-2 flex items-center justify-center gap-4 border-t-2 border-dashed border-choc-900/25 p-4 sm:col-span-1 sm:flex-col sm:gap-2 sm:border-l-2 sm:border-t-0">
        {/* The stall's logo, as on a printed ticket. Multiply drops its cream ground into the ticket. */}
        <Image src={LOGO.src} alt="" width={LOGO.width} height={LOGO.height} sizes="132px" className="h-auto w-[112px] mix-blend-multiply sm:w-[132px]" />
        {qr && usable ? (
          <div
            className="h-[132px] w-[132px] [&>svg]:h-full [&>svg]:w-full"
            role="img"
            aria-label={`QR code for coupon ${code}`}
            dangerouslySetInnerHTML={{ __html: qr }}
          />
        ) : (
          <div className="grid h-[132px] w-[132px] place-items-center rounded-xl bg-cream-200 text-center text-[0.875rem] font-bold text-ink-soft">
            {usable ? "Loading code…" : stateLabel}
          </div>
        )}
      </div>
    </article>
  );
}
