import { grantBonusAttempts, setRole, voidCoupon } from "@/app/admin/actions";
import { AdminForm, Field, Panel, Select } from "@/components/admin/AdminForm";
import { requirePageRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export default async function AdminPeoplePage() {
  const session = await requirePageRole("admin", "/admin/people");
  const { data } = await session.supabase.rpc("admin_list_roles");
  const roles = (Array.isArray(data) ? data : []) as { email: string; role: string; grantedAt: string }[];

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Panel title="Staff and admins">
        <ul className="mb-6 flex flex-col gap-2">
          {roles.length === 0 && <li className="text-[0.98rem]">No roles yet.</li>}
          {roles.map((r) => (
            <li key={`${r.email}-${r.role}`} className="flex flex-wrap justify-between gap-2 rounded-xl bg-cream-200 px-4 py-2.5 text-[0.98rem]">
              <span className="font-extrabold">{r.email}</span>
              <span>
                {r.role} · since {formatDateTime(r.grantedAt)}
              </span>
            </li>
          ))}
        </ul>
        <AdminForm action={setRole} submitLabel="Apply">
          <p className="text-[0.95rem]">The person must sign in once before you can give them a role.</p>
          <Field label="Email" name="email" type="email" required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Role"
              name="role"
              options={[
                { value: "staff", label: "Staff (redeem coupons)" },
                { value: "admin", label: "Admin (everything)" },
              ]}
            />
            <Select
              label="Action"
              name="intent"
              options={[
                { value: "grant", label: "Give this role" },
                { value: "revoke", label: "Remove this role" },
              ]}
            />
          </div>
        </AdminForm>
      </Panel>

      <div className="flex flex-col gap-8">
        <Panel title="Extra reward attempts">
          <AdminForm action={grantBonusAttempts} submitLabel="Set extra attempts">
            <p className="text-[0.95rem]">For genuine problems on our side (a crash, a power cut). Sets the number of extra attempts, it does not add.</p>
            <Field label="Student email" name="email" type="email" required />
            <Field label="Extra attempts" name="count" type="number" min={0} max={10} defaultValue={1} required />
          </AdminForm>
        </Panel>
        <Panel title="Cancel a coupon">
          <AdminForm action={voidCoupon} submitLabel="Cancel coupon" variant="dark" confirmText="Cancel this coupon? It will stop working immediately.">
            <p className="text-[0.95rem]">Only unused coupons can be cancelled. Every cancellation is in the audit log.</p>
            <Field label="Coupon code" name="code" required placeholder="TU-XXXXX-XXXXX" />
          </AdminForm>
        </Panel>
      </div>
    </div>
  );
}
