import type { Metadata } from "next";
import { siteUrl, SITE_NAME } from "./env";
import type { EventSettings } from "./settings";

export const OG_IMAGE = { url: "/og/terra-utsav.jpg", width: 1200, height: 630, alt: "TERRA UTSAV: came for the food, stayed for the chaos" };

/** Per-page metadata with a canonical URL on the configured production domain. */
export function pageMetadata({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_IN",
      title: `${title} · ${SITE_NAME}`,
      description,
      url: path,
      images: [OG_IMAGE],
    },
    twitter: { card: "summary_large_image", title: `${title} · ${SITE_NAME}`, description, images: [OG_IMAGE.url] },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: siteUrl(),
    description: "TERRA UTSAV, a student Diwali stall with Chocolate Bombs, Chat Papdi, homemade diyas, a wet-brick challenge and the Catch the Koochu Puchu game.",
  };
}

/**
 * Event structured data, only when organisers have confirmed the date and place. Nothing is
 * guessed: without a confirmed start time and location this returns null and no markup is sent.
 */
export function eventJsonLd(event: EventSettings) {
  const place = event.venue || event.stallLocation;
  if (!event.confirmed || !event.startsAt || !place) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.festivalName ? `${SITE_NAME} at ${event.festivalName}` : SITE_NAME,
    description: "Diwali stall with Chocolate Bombs, Chat Papdi, homemade diyas, a 60-second wet-brick challenge and the Catch the Koochu Puchu game.",
    startDate: event.startsAt,
    ...(event.endsAt ? { endDate: event.endsAt } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: event.stallLocation ? `${SITE_NAME} stall, ${event.stallLocation}` : place,
      address: event.venue ?? place,
    },
    organizer: {
      "@type": "Organization",
      name: SITE_NAME,
      url: siteUrl(),
      ...(event.instagramUrl ? { sameAs: [event.instagramUrl] } : {}),
    },
    image: [`${siteUrl()}${OG_IMAGE.url}`],
  };
}
