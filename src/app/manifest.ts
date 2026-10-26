import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TERRA UTSAV",
    short_name: "TERRA UTSAV",
    description: "Our Diwali stall: Chocolate Bombs, Aloo Ponga, homemade diyas, the brick challenge and Catch Mini.",
    start_url: "/",
    display: "standalone",
    background_color: "#3a0f17",
    theme_color: "#2a0b10",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
