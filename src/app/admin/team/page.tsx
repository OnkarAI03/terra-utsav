import { deleteGroup, deleteMember, saveGroup, saveMember } from "@/app/admin/actions";
import { AdminForm, Check, Field, Panel, Select, TextArea } from "@/components/admin/AdminForm";
import { VARIANT_LABEL } from "@/components/team/OutfitOverlay";
import { requirePageRole } from "@/lib/auth";
import { MASCOT_VARIANTS } from "@/lib/types";

interface GroupRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  mascot_variant: string;
  sort_order: number;
  visible: boolean;
}

interface MemberRow {
  id: string;
  slug: string;
  name: string;
  title: string;
  group_id: string | null;
  kind: "student" | "mentor";
  photo_url: string | null;
  photo_consent: boolean;
  mascot_url: string | null;
  mascot_variant: string | null;
  bio: string | null;
  links: { label: string; url: string }[];
  sort_order: number;
  visible: boolean;
}

const variantOptions = MASCOT_VARIANTS.map((v) => ({ value: v, label: VARIANT_LABEL[v] }));

function GroupFields({ g }: { g?: GroupRow }) {
  return (
    <>
      {g && <input type="hidden" name="id" value={g.id} />}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Group name" name="name" defaultValue={g?.name} required maxLength={60} />
        <Field label="Slug" name="slug" defaultValue={g?.slug} required maxLength={60} hint="lowercase-with-dashes" />
        <Select label="Default Koochu Puchu outfit" name="mascot_variant" defaultValue={g?.mascot_variant ?? "generic"} options={variantOptions} />
        <Field label="Order" name="sort_order" type="number" defaultValue={g?.sort_order ?? 0} />
      </div>
      <TextArea label="What this group does" name="description" defaultValue={g?.description} />
      <Check name="visible" label="Show on the team page" defaultChecked={g?.visible ?? true} />
    </>
  );
}

function MemberFields({ m, groups }: { m?: MemberRow; groups: GroupRow[] }) {
  return (
    <>
      {m && <input type="hidden" name="id" value={m.id} />}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Real name" name="name" defaultValue={m?.name} required maxLength={80} />
        <Field label="Slug" name="slug" defaultValue={m?.slug} required maxLength={60} hint="lowercase-with-dashes, e.g. priya-s" />
        <Field label="Actual title or role" name="title" defaultValue={m?.title} required maxLength={80} />
        <Select
          label="Mentor or student"
          name="kind"
          defaultValue={m?.kind ?? "student"}
          options={[
            { value: "student", label: "Student team member" },
            { value: "mentor", label: "Mentor" },
          ]}
        />
        <Select label="Group" name="group_id" defaultValue={m?.group_id ?? ""} options={[{ value: "", label: "No group" }, ...groups.map((g) => ({ value: g.id, label: g.name }))]} />
        <Select
          label="Koochu Puchu outfit"
          name="mascot_variant"
          defaultValue={m?.mascot_variant ?? ""}
          options={[{ value: "", label: "Use the group's outfit" }, ...variantOptions]}
        />
        <Field label="Order" name="sort_order" type="number" defaultValue={m?.sort_order ?? 0} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Upload real photo" name="photo" type="file" accept="image/webp,image/jpeg,image/png,image/avif" hint="Square or 4:5 portrait works best." />
        <Field label="…or photo URL" name="photo_url" defaultValue={m?.photo_url} />
        <Field label="Upload personal mascot art (optional)" name="mascot" type="file" accept="image/webp,image/jpeg,image/png,image/avif" />
        <Field label="…or mascot art URL" name="mascot_url" defaultValue={m?.mascot_url} />
      </div>
      <TextArea label="Short bio (optional)" name="bio" defaultValue={m?.bio} />
      <TextArea
        label="Links (optional, one per line: Label | https://...)"
        name="links"
        rows={2}
        defaultValue={(m?.links ?? []).map((l) => `${l.label} | ${l.url}`).join("\n")}
      />
      <div className="flex flex-wrap gap-6">
        <Check name="photo_consent" label="This person agreed to their photo being published" defaultChecked={m?.photo_consent} hint="Without this, the photo is never shown." />
        <Check name="visible" label="Show on the team page" defaultChecked={m?.visible ?? true} />
      </div>
    </>
  );
}

export default async function AdminTeamPage() {
  const session = await requirePageRole("admin", "/admin/team");
  const [groupsRes, membersRes] = await Promise.all([
    session.supabase.from("team_groups").select("*").order("sort_order"),
    session.supabase.from("team_members").select("*").order("kind").order("sort_order"),
  ]);
  const groups = (groupsRes.data ?? []) as GroupRow[];
  const members = (membersRes.data ?? []) as MemberRow[];

  return (
    <div className="flex flex-col gap-8">
      <Panel title="Groups">
        <p className="mb-5 text-[0.98rem]">Create the real teams first (for example the kitchen crew or marketing), then add people to them.</p>
        <div className="flex flex-col gap-6">
          {groups.map((g) => (
            <details key={g.id} className="rounded-2xl bg-cream-200 p-4">
              <summary className="cursor-pointer font-extrabold">{g.name}</summary>
              <AdminForm action={saveGroup} submitLabel="Save group" className="mt-4">
                <GroupFields g={g} />
              </AdminForm>
              <AdminForm action={deleteGroup} submitLabel="Delete group" variant="outline" className="mt-3" confirmText={`Delete ${g.name}?`}>
                <input type="hidden" name="id" value={g.id} />
              </AdminForm>
            </details>
          ))}
          <details className="rounded-2xl bg-cream-200 p-4" open={groups.length === 0}>
            <summary className="cursor-pointer font-extrabold">Add a group</summary>
            <AdminForm action={saveGroup} submitLabel="Add group" className="mt-4">
              <GroupFields />
            </AdminForm>
          </details>
        </div>
      </Panel>

      <Panel title={`People (${members.length})`}>
        <div className="flex flex-col gap-4">
          {members.map((m) => (
            <details key={m.id} className="rounded-2xl bg-cream-200 p-4">
              <summary className="cursor-pointer font-extrabold">
                {m.name} · {m.title} {m.kind === "mentor" ? "· Mentor" : ""} {!m.visible ? "· hidden" : ""} {m.photo_url && !m.photo_consent ? "· photo awaiting consent" : ""}
              </summary>
              <AdminForm action={saveMember} submitLabel="Save person" className="mt-4">
                <MemberFields m={m} groups={groups} />
              </AdminForm>
              <AdminForm action={deleteMember} submitLabel="Remove" variant="outline" className="mt-3" confirmText={`Remove ${m.name} from the team page?`}>
                <input type="hidden" name="id" value={m.id} />
              </AdminForm>
            </details>
          ))}
          <details className="rounded-2xl bg-cream-200 p-4" open={members.length === 0}>
            <summary className="cursor-pointer font-extrabold">Add a person</summary>
            <AdminForm action={saveMember} submitLabel="Add person" className="mt-4">
              <MemberFields groups={groups} />
            </AdminForm>
          </details>
        </div>
      </Panel>
    </div>
  );
}
