import type { Metadata, Viewport } from "next";
import { Kalam, Lilita_One, Nunito } from "next/font/google";
import { KoochuChat } from "@/components/chat/KoochuChat";
import { EggLayer } from "@/components/eggs/EggLayer";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { MotionProvider } from "@/components/ui/MotionProvider";
import { PauseOffscreen } from "@/components/ui/PauseOffscreen";
import { SmoothScroll } from "@/components/ui/SmoothScroll";
import { allowIndexing, siteUrl, SITE_NAME } from "@/lib/env";
import "./globals.css";

const lilita = Lilita_One({ weight: "400", subsets: ["latin"], variable: "--font-lilita", display: "swap" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });
const kalam = Kalam({ weight: "700", subsets: ["latin"], variable: "--font-kalam", display: "swap" });

const description =
  "TERRA UTSAV is our college Diwali stall: Chocolate Bombs, Chat Papdi, homemade Diwali diyas, a 60-second wet-brick challenge and Catch the Koochu Puchu, a three-level game with a coupon for winners.";

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

// Marks the document as script-enabled before first paint, so scroll reveals can hide content
// only when they will also be able to show it again.
const jsFlag = `document.documentElement.classList.add('js')`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={`${lilita.variable} ${nunito.variable} ${kalam.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: jsFlag }} />
      </head>
      <body className="min-h-dvh-safe flex flex-col">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <MotionProvider>
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
          <EggLayer />
          <KoochuChat />
          <SmoothScroll />
          <PauseOffscreen />
        </MotionProvider>
      </body>
    </html>
  );
}
