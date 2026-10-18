import type { Product } from "@/lib/types";

/**
 * Default menu and the homemade Diwali diyas, mirrored by supabase/migrations/20261018000500_seed_defaults.sql.
 * Once Supabase is connected, the menu is edited from /admin/menu and this file is only the
 * fallback used when the database cannot be reached.
 *
 * Prices are null on purpose: they have not been confirmed by the organisers.
 * Taglines come from the approved homepage design. Descriptions make no ingredient or allergen
 * claims.
 */
export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "default-chocolate-bomb",
    slug: "chocolate-bomb",
    name: "Chocolate Bomb",
    category: "food",
    tagline: "Crack it. Pour it. Devour it.",
    description: "Our signature chocolate dessert, served at the TERRA UTSAV stall.",
    pricePaise: null,
    priceNote: null,
    availability: "coming_soon",
    featured: true,
    featuredLabel: "Signature",
    imageUrl: "/images/food/chocolate-bomb.webp",
    imageAlt: "A glossy chocolate dome dessert dripping with melted chocolate",
    imageIsIllustrative: true,
    sortOrder: 1,
  },
  {
    id: "default-chat-papdi",
    slug: "chat-papdi",
    name: "Chat Papdi",
    category: "food",
    tagline: "Crunchy. Tangy. Addictive.",
    description: "The street-food classic, served at the TERRA UTSAV stall.",
    pricePaise: null,
    priceNote: null,
    availability: "coming_soon",
    featured: false,
    featuredLabel: null,
    imageUrl: "/images/food/chat-papdi.webp",
    imageAlt: "A plate of chat papdi topped with yogurt, chutneys, sev and pomegranate",
    imageIsIllustrative: true,
    sortOrder: 2,
  },
  {
    id: "default-diwali-diyas",
    slug: "diwali-diyas",
    name: "Homemade Diwali Diyas",
    category: "diyas",
    tagline: "Light one. Gift one. Glow on.",
    description: "Homemade diyas to light up your Diwali, on sale at the TERRA UTSAV stall.",
    pricePaise: null,
    priceNote: null,
    availability: "coming_soon",
    featured: true,
    featuredLabel: "Homemade",
    imageUrl: null,
    imageAlt: "Homemade Diwali diyas",
    imageIsIllustrative: false,
    sortOrder: 3,
  },
];
