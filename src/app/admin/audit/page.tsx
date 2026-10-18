import { Panel } from "@/components/admin/AdminForm";
import { requirePageRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

interface AuditRow {
  id: number;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export default async function AdminAuditPage() {
  const session = await requirePageRole("admin", "/admin/audit");
  const [{ data }, { data: profiles }] = await Promise.all([
    session.supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(150),
    session.supabase.from("profiles").select("id, email"),
  ]);
  const who = new Map((profiles ?? []).map((p) => [p.id as string, p.email as string]));
  const rows = (data ?? []) as AuditRow[];

  return (
    <Panel title="Audit log (latest 150)">
      {rows.length === 0 ? (
        <p>Nothing recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[0.92rem]">
            <thead>
              <tr className="border-b-2 border-choc-900/15">
                <th className="py-2 pr-4">When</th>
                <th className="py-2 pr-4">Who</th>
                <th className="py-2 pr-4">What</th>
                <th className="py-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-choc-900/10 align-top">
                  <td className="whitespace-nowrap py-2 pr-4">{formatDateTime(r.created_at)}</td>
                  <td className="py-2 pr-4">{r.actor_id ? (who.get(r.actor_id) ?? "student") : "system"}</td>
                  <td className="py-2 pr-4 font-bold">
                    {r.action} · {r.entity}
                  </td>
                  <td className="max-w-[420px] break-words py-2 text-ink-soft">{JSON.stringify(r.details).slice(0, 220)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
