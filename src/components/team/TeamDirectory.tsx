"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import type { TeamGroup, TeamMember } from "@/lib/types";
import { TeamCard } from "./TeamCard";

/**
 * Student members, grouped by their real responsibilities. Group filters appear only when there
 * is more than one group. Members without a group are listed last.
 */
export function TeamDirectory({ groups, students }: { groups: TeamGroup[]; students: TeamMember[] }) {
  const [filter, setFilter] = useState<string>("all");
  const groupName = useMemo(() => new Map(groups.map((g) => [g.id, g.name])), [groups]);

  const sections = useMemo(() => {
    const byGroup = groups
      .map((g) => ({ group: g as TeamGroup | null, members: students.filter((s) => s.groupId === g.id) }))
      .filter((s) => s.members.length > 0);
    const ungrouped = students.filter((s) => !s.groupId || !groupName.has(s.groupId));
    if (ungrouped.length) byGroup.push({ group: null, members: ungrouped });
    return byGroup;
  }, [groups, students, groupName]);

  const visible = filter === "all" ? sections : sections.filter((s) => (s.group?.id ?? "none") === filter);
  const showFilters = sections.length > 1;

  return (
    <div>
      {showFilters && (
        <div role="group" aria-label="Filter by team" className="no-scrollbar -mx-[var(--gutter)] mb-10 flex gap-2 overflow-x-auto px-[var(--gutter)] pb-1">
          {[{ id: "all", name: "Everyone" }, ...sections.map((s) => ({ id: s.group?.id ?? "none", name: s.group?.name ?? "More of the team" }))].map(
            (f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-2 text-[0.95rem] font-extrabold transition-colors duration-150",
                  filter === f.id ? "bg-maroon-600 text-cream-100" : "bg-cream-100 text-ink hover:bg-cream-50",
                )}
              >
                {f.name}
              </button>
            ),
          )}
        </div>
      )}

      <div className="flex flex-col gap-16">
        {visible.map(({ group, members }) => (
          <section key={group?.id ?? "none"} aria-labelledby={`group-${group?.slug ?? "none"}`}>
            {(group || sections.length > 1) && (
              <div className="mb-6 max-w-2xl">
                <h3 id={`group-${group?.slug ?? "none"}`} className="display-m text-choc-900">
                  {group?.name ?? "More of the team"}
                </h3>
                {group?.description && <p className="mt-2 text-[1.05rem] leading-relaxed text-ink">{group.description}</p>}
              </div>
            )}
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {members.map((m, i) => (
                <li key={m.id}>
                  <TeamCard member={m} groupName={group ? null : m.groupId ? groupName.get(m.groupId) : null} index={i} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
