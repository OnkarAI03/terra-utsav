import type { Availability } from "./types";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 0 });

/** "₹99" from 9900 paise, or a clear note when the price is not confirmed yet. */
export function formatPrice(pricePaise: number | null, note?: string | null): string {
  if (pricePaise === null) return note || "Price to be announced";
  return inr.format(pricePaise / 100);
}

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  available: "Available now",
  sold_out: "Sold out",
  coming_soon: "Served on event day",
  hidden: "Hidden",
};

const dateTime = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dateTime.format(d);
}
