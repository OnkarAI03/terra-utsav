import { CalendarDays, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/cn";
import type { EventSettings } from "@/lib/settings";

/** Date, time and place from the admin settings. Missing values say so plainly. */
export function EventFacts({ event, className, tone = "dark" }: { event: EventSettings; className?: string; tone?: "dark" | "light" }) {
  const place = [event.stallLocation, event.venue].filter(Boolean).join(", ");
  const rows = [
    { icon: CalendarDays, label: "Date", value: event.dateText, missing: "Date to be announced" },
    { icon: Clock, label: "Time", value: event.timeText, missing: "Timings to be announced" },
    { icon: MapPin, label: "Where", value: place || null, missing: "Stall location to be announced" },
    ...(event.venue && !event.stallLocation
      ? [{ icon: MapPin, label: "Stall spot", value: null, missing: "Exact stall spot on campus to be announced" }]
      : []),
  ];
  return (
    <dl className={cn("flex flex-col gap-2.5", className)}>
      {event.festivalName && (
        <div className={cn("font-extrabold", tone === "dark" ? "text-cream-100" : "text-ink")}>
          <dt className="sr-only">Festival</dt>
          <dd>{event.festivalName}</dd>
        </div>
      )}
      {rows.map(({ icon: Icon, label, value, missing }) => (
        <div key={label} className="flex items-start gap-2.5">
          <dt className="sr-only">{label}</dt>
          <Icon aria-hidden className={cn("mt-0.5 h-5 w-5 shrink-0", tone === "dark" ? "text-gold-400" : "text-maroon-600")} />
          <dd
            className={cn(
              "text-[1rem] leading-snug",
              value ? "font-extrabold" : "font-semibold italic",
              tone === "dark" ? (value ? "text-cream-100" : "text-cream-100/85") : value ? "text-ink" : "text-ink-soft",
            )}
          >
            {value ?? missing}
          </dd>
        </div>
      ))}
    </dl>
  );
}
