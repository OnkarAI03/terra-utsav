import { saveRewards } from "@/app/admin/actions";
import { AdminForm, Check, Field, Panel, TextArea } from "@/components/admin/AdminForm";
import { requirePageRole } from "@/lib/auth";
import { getRewardSettings } from "@/lib/data/public";

export default async function AdminRewardsPage() {
  await requirePageRole("admin", "/admin/rewards");
  const r = await getRewardSettings();
  return (
    <Panel title="Reward coupons">
      <AdminForm action={saveRewards} submitLabel="Save reward rules">
        <Check name="rewardsEnabled" label="Issue coupons to Level 5 winners" defaultChecked={r.rewardsEnabled} />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Coupon name" name="couponLabel" defaultValue={r.couponLabel} required maxLength={80} />
          <Field label="What it is worth" name="couponValueText" defaultValue={r.couponValueText} maxLength={120} hint="For example: ₹20 off any item. Leave empty until confirmed." />
          <Field label="Uses per coupon" name="maxRedemptions" type="number" min={1} max={10} defaultValue={r.maxRedemptions} />
          <Field label="Expires after (hours)" name="expiresAfterHours" type="number" min={1} defaultValue={r.expiresAfterHours} hint="Or set a fixed expiry below." />
          <Field label="Fixed expiry (date and time)" name="expiresAt" defaultValue={r.expiresAt} hint="For example: 2026-10-27T21:00:00+05:30" />
          <Field label="Total coupons available" name="maxCouponsTotal" type="number" min={0} defaultValue={r.maxCouponsTotal} hint="Empty means no limit." />
        </div>
        <TextArea label="How to redeem (shown in wallets)" name="redemptionInstructions" defaultValue={r.redemptionInstructions} />
        <Check name="confirmed" label="These coupon terms are confirmed by the organisers" defaultChecked={r.confirmed} />
      </AdminForm>
    </Panel>
  );
}
