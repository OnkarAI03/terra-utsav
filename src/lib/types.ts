export type Availability = "available" | "sold_out" | "coming_soon" | "hidden";
export type ProductCategory = "food" | "diyas";

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  tagline: string | null;
  description: string;
  /** Price in paise (1/100 rupee). null means not yet confirmed. */
  pricePaise: number | null;
  priceNote: string | null;
  availability: Availability;
  featured: boolean;
  featuredLabel: string | null;
  imageUrl: string | null;
  imageAlt: string;
  /** True while the picture is concept art rather than a photo of the real dish. */
  imageIsIllustrative: boolean;
  sortOrder: number;
}

export const MASCOT_VARIANTS = [
  "leader",
  "food",
  "operations",
  "marketing",
  "finance",
  "games",
  "logistics",
  "design",
  "sales",
  "mentor",
  "generic",
] as const;
export type MascotVariant = (typeof MASCOT_VARIANTS)[number];

export interface TeamGroup {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  mascotVariant: MascotVariant;
  sortOrder: number;
}

export interface TeamLink {
  label: string;
  url: string;
}

export interface TeamMember {
  id: string;
  slug: string;
  name: string;
  title: string;
  groupId: string | null;
  kind: "student" | "mentor";
  /** Only present when the person has consented to their photo being published. */
  photoUrl: string | null;
  /** A personalised mascot render. When absent, the outfit variant is drawn over the base mascot. */
  mascotUrl: string | null;
  mascotVariant: MascotVariant;
  bio: string | null;
  links: TeamLink[];
  sortOrder: number;
  /** True for the labelled preview slots shown before the real roster is entered. */
  isPlaceholder?: boolean;
}

export interface TeamData {
  groups: TeamGroup[];
  mentors: TeamMember[];
  students: TeamMember[];
  mentorsArePreview: boolean;
  studentsArePreview: boolean;
}
