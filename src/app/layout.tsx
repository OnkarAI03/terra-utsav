import type { Metadata, Viewport } from "next";
import { Kalam, Lilita_One, Nunito } from "next/font/google";
import { KoochuChat } from "@/components/chat/KoochuChat";
import { EggLayer } from "@/components/eggs/EggLayer";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Splash } from "@/components/site/Splash";
import { MotionProvider } from "@/components/ui/MotionProvider";
import { PauseOffscreen } from "@/components/ui/PauseOffscreen";
import { allowIndexing, siteUrl, SITE_NAME } from "@/lib/env";
import { HEAD_SCRIPT } from "@/lib/head-script";
import "./globals.css";

const lilita = Lilita_One({ weight: "400", subsets: ["latin"], variable: "--font-lilita", display: "swap" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });
const kalam = Kalam({ weight: "700", subsets: ["latin"], variable: "--font-kalam", display: "swap" });

const description =
  "TERRA UTSAV is our college Diwali stall: Chocolate Bombs, Aloo Ponga, homemade Diwali diyas, a 60-second wet-brick challenge and Catch Mini, a three-level game with a prize for winners.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE_NAME}: food, diyas, games and chaos at our Diwali stall`,
    template: `%s · ${SITE_NAME}`,
  },
  description,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_IN",
    title: `${SITE_NAME}: came for the food, stayed for the chaos`,
    description,
  },
  twitter: { card: "summary_large_image" },
  robots: allowIndexing() ? { index: true, follow: true } : { index: false, follow: false, nocache: true },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#2a0b10",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};


export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" data-scroll-behavior="smooth" className={`${lilita.variable} ${nunito.variable} ${kalam.variable}`} suppressHydrationWarning>
      <head>
        {/* Runs while the page is parsed, before React starts: see src/lib/head-script.ts. */}
        <script dangerouslySetInnerHTML={{ __html: HEAD_SCRIPT }} />
        {/* The splash art (components/site/Splash.tsx): only the picture this screen shows. */}
        <link rel="preload" as="image" href="/images/splash/splash-tall.webp" media="not all and (min-aspect-ratio: 3/4)" fetchPriority="high" />
        <link rel="preload" as="image" href="/images/splash/splash-wide.webp" media="(min-aspect-ratio: 3/4)" fetchPriority="high" />
      </head>
      <body className="min-h-dvh-safe flex flex-col">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Splash />
        <MotionProvider>
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
          <EggLayer />
          <KoochuChat />
          <PauseOffscreen />
        </MotionProvider>
      </body>
    </html>
  );
}
