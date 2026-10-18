import type { TeamData, TeamMember } from "@/lib/types";

/**
 * The real team roster lives in the database (/admin/team). Until it has been entered, the team
 * page shows clearly labelled preview slots so the layout and the photo-to-mascot switching can be
 * reviewed. These are not people: no names, roles or groups are invented.
 */
export const PREVIEW_MENTOR_COUNT = 3;
export const PREVIEW_STUDENT_COUNT = 20;

function slot(kind: "student" | "mentor", n: number): TeamMember {
  const label = kind === "mentor" ? `Mentor ${n}` : `Team member ${String(n).padStart(2, "0")}`;
  return {
    id: `preview-${kind}-${n}`,
    slug: `preview-${kind}-${n}`,
    name: label,
    title: kind === "mentor" ? "Name and designation to be added" : "Name and role to be added",
    groupId: null,
    kind,
    photoUrl: null,
    mascotUrl: null,
    mascotVariant: kind === "mentor" ? "mentor" : "generic",
    bio: null,
    links: [],
    sortOrder: n,
    isPlaceholder: true,
  };
}

export function previewTeam(): TeamData {
  return {
    groups: [],
    mentors: Array.from({ length: PREVIEW_MENTOR_COUNT }, (_, i) => slot("mentor", i + 1)),
    students: Array.from({ length: PREVIEW_STUDENT_COUNT }, (_, i) => slot("student", i + 1)),
    isPreview: true,
  };
}
