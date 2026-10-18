import { saveRewards } from "@/app/admin/actions";
import { AdminForm, Check, Field, Panel, TextArea } from "@/components/admin/AdminForm";
import { requirePageRole } from "@/lib/auth";
import { getRewardSettings } from "@/lib/data/public";
import { toIstInput } from "@/lib/settings";

export default async function AdminRewardsPage() {
  await requirePageRole("admin", "/admin/rewards");
  const r = await getRewardSettings();
  return (
    <Panel title="Reward coupons">
      <AdminForm action={saveRewards} submitLabel="Save reward rules">
        <Check name="rewardsEnabled" label="Issue coupons to players who clear the final level" defaultChecked={r.rewardsEnabled} />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Coupon name" name="couponLabel" defaultValue={r.couponLabel} required maxLength={80} />
          <Field label="What it is worth" name="couponValueText" defaultValue={r.couponValueText} maxLength={120} hint="For example: ₹20 off any item. Leave empty until confirmed." />
          <Field label="Uses per coupon" name="maxRedemptions" type="number" min={1} max={10} defaultValue={r.maxRedemptions} />
          <Field
            label="Fixed expiry (India time)"
            name="expiresAt"
            type="datetime-local"
            defaultValue={toIstInput(r.expiresAt)}
            hint="Best for the Mandi: the end of the event day, for example 27 Oct, 3:00 pm. Leave empty for no fixed expiry."
          />
          <Field
            label="Or: expires after (hours)"
            name="expiresAfterHours"
            type="number"
            min={1}
            defaultValue={r.expiresAfterHours}
            hint="Counts from the moment each coupon is won, so early winners' coupons run out first. Use one or the other."
          />
          <Field label="Total coupons available" name="maxCouponsTotal" type="number" min={0} defaultValue={r.maxCouponsTotal} hint="Empty means no limit." />
        </div>
        <TextArea label="How to redeem (shown in wallets)" name="redemptionInstructions" defaultValue={r.redemptionInstructions} />
        <Check name="confirmed" label="These coupon terms are confirmed by the organisers" defaultChecked={r.confirmed} />
      </AdminForm>
    </Panel>
  );
}
