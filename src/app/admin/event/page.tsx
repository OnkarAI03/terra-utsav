import { saveEvent } from "@/app/admin/actions";
import { AdminForm, Check, Field, Panel } from "@/components/admin/AdminForm";
import { requirePageRole } from "@/lib/auth";
import { getEventSettings } from "@/lib/data/public";

export default async function AdminEventPage() {
  await requirePageRole("admin", "/admin/event");
  const e = await getEventSettings();
  return (
    <Panel title="Event details">
      <AdminForm action={saveEvent} submitLabel="Save event details">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Event name" name="festivalName" defaultValue={e.festivalName} maxLength={80} />
          <Field label="Date as shown on the site" name="dateText" defaultValue={e.dateText} maxLength={80} hint="For example: Tuesday, 27 October 2026" />
          <Field label="Timings as shown on the site" name="timeText" defaultValue={e.timeText} maxLength={80} hint="For example: 11 am to 7 pm" />
          <Field label="Start (for search engines)" name="startsAt" defaultValue={e.startsAt} hint="2026-10-27 or 2026-10-27T11:00:00+05:30" />
          <Field label="End (optional)" name="endsAt" defaultValue={e.endsAt} />
          <Field label="Venue" name="venue" defaultValue={e.venue} maxLength={120} />
          <Field label="Stall spot on campus" name="stallLocation" defaultValue={e.stallLocation} maxLength={160} hint="For example: Stall 12, near the main gate" />
          <Field label="Map link" name="mapUrl" type="url" defaultValue={e.mapUrl} hint="Must start with https://" />
          <Field label="Instagram link (optional)" name="instagramUrl" type="url" defaultValue={e.instagramUrl} />
          <Field label="Contact email (optional)" name="contactEmail" type="email" defaultValue={e.contactEmail} />
        </div>
        <Check
          name="confirmed"
          label="These details are confirmed by the organisers"
          defaultChecked={e.confirmed}
          hint="When ticked and a start date and venue are set, search engines get event details."
        />
      </AdminForm>
    </Panel>
  );
}
