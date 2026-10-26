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
    // Name, photo and description supplied by the team on 2026-10-25 (replaces Chat Papdi); spelt Aloo Ponga since 2026-10-26.
    id: "default-aloo-ponga",
    slug: "aloo-ponga",
    name: "Aloo Ponga",
    category: "food",
    tagline: "Crispy. Spicy. Loaded.",
    description:
      "Crispy, spicy & absolutely loaded with flavour — this Aloo Ponga is the kind of street food you'll keep craving! 🤤🥔 Perfectly crispy outside, soft & flavourful inside.",
    pricePaise: null,
    priceNote: null,
    availability: "coming_soon",
    featured: false,
    featuredLabel: null,
    imageUrl: "/images/food/aloo-ponga.webp",
    imageAlt: "Aloo Ponga rolls topped with crunchy sev and fresh coriander",
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
