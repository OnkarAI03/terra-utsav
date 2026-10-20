import type { MascotVariant, TeamData, TeamGroup, TeamMember } from "@/lib/types";

/**
 * The TERRA UTSAV team, as supplied by the team on 2026-10-18 (names, roles and groups from the
 * roster; photos from the team's PDF, page N = person N in roster order). Mirrored by
 * supabase/migrations/20261018000600_seed_team.sql, plus 20261020000100_giriraj_and_mini.sql for
 * the fourth mentor. Once Supabase is connected the team is edited from /admin/team and this file
 * is only the fallback.
 */

interface GroupSeed {
  slug: string;
  name: string;
  title: string;
  outfit: MascotVariant;
  members: string[];
}

const GROUPS: GroupSeed[] = [
  { slug: "group-leader", name: "Group Leader", title: "Group Leader", outfit: "leader", members: ["Saniya Bhor"] },
  { slug: "financial-managers", name: "Financial Managers", title: "Financial Manager", outfit: "finance", members: ["Vivek Avhad", "Remanshu Chobi"] },
  { slug: "purchase-inventory", name: "Purchase and Inventory", title: "Purchase and Inventory", outfit: "logistics", members: ["Bhakti Gagare", "Ojaswi Bhoi"] },
  { slug: "product-managers", name: "Product Managers", title: "Product Manager", outfit: "food", members: ["Sushant Bodke", "Sushrut Gajbhiye", "Arati Gandale"] },
  { slug: "decor-team", name: "Decor Team", title: "Decor Team", outfit: "design", members: ["Kushal Bhalerao", "Shreya Desai", "Adkine Tejaswini"] },
  {
    slug: "digital-marketing",
    name: "Digital Marketing, Social Media and Graphics",
    title: "Digital Marketing, Social Media and Graphics",
    outfit: "marketing",
    members: ["Rohan Andhalkar", "Satish Diwate", "Shraddha Autade", "Supriya Danole"],
  },
  { slug: "sales-marketing", name: "Sales and Marketing", title: "Sales and Marketing", outfit: "sales", members: ["Rushikesh Bhalerao", "Sanket Wakale"] },
];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const TEAM_GROUPS: TeamGroup[] = GROUPS.map((g, i) => ({
  id: `group-${g.slug}`,
  slug: g.slug,
  name: g.name,
  description: null,
  mascotVariant: g.outfit,
  sortOrder: i + 1,
}));

export const TEAM_MEMBERS: TeamMember[] = (() => {
  let n = 0;
  return GROUPS.flatMap((g) =>
    g.members.map((name) => {
      n += 1;
      return {
        id: `member-${String(n).padStart(2, "0")}`,
        slug: slugify(name),
        name,
        title: g.title,
        groupId: `group-${g.slug}`,
        kind: "student" as const,
        photoUrl: `/images/team/member-${String(n).padStart(2, "0")}-real.webp`,
        mascotUrl: null,
        mascotVariant: g.outfit,
        bio: null,
        links: [],
        sortOrder: n,
      };
    }),
  );
})();

// Mentors supplied on 2026-10-18 (first names as given), with photos from the team's PDF in the
// same order (page N = mentor N); Giriraj and a photo were supplied on 2026-10-20. Shown as a
// compact row at the bottom of the team.
const MENTORS = ["Ankush", "Jidnyesh", "Sairaj", "Giriraj"];

export const TEAM_MENTORS: TeamMember[] = MENTORS.map((name, i) => ({
  id: `mentor-${String(i + 1).padStart(2, "0")}`,
  slug: slugify(name),
  name,
  title: "Mentor",
  groupId: null,
  kind: "mentor",
  photoUrl: `/images/team/mentor-${String(i + 1).padStart(2, "0")}.webp`,
  mascotUrl: null,
  mascotVariant: "mentor",
  bio: null,
  links: [],
  sortOrder: i + 1,
}));

/** The built-in team: the real roster and mentors. */
export function defaultTeam(): TeamData {
  return {
    groups: TEAM_GROUPS,
    mentors: TEAM_MENTORS,
    students: TEAM_MEMBERS,
    mentorsArePreview: false,
    studentsArePreview: false,
  };
}
