import { saveGame } from "@/app/admin/actions";
import { AdminForm, Panel } from "@/components/admin/AdminForm";
import { requirePageRole } from "@/lib/auth";
import { getGameSettings } from "@/lib/data/public";
import { estimateWinRates } from "@/lib/game/simulate";

const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;

export default async function AdminGamePage() {
  await requirePageRole("admin", "/admin/game");
  const settings = await getGameSettings();
  const model = estimateWinRates(settings, undefined, 800);

  return (
    <div className="flex flex-col gap-8">
      <Panel title="Difficulty at a glance">
        <ul className="grid gap-2 text-[0.98rem] sm:grid-cols-5">
          {settings.levels.map((l, i) => (
            <li key={l.level} className="rounded-2xl bg-cream-200 p-3">
              <p className="font-extrabold">
                {l.level}. {l.name}
              </p>
              <p>
                Catch {l.targetCatches} · {l.lives} hearts · {Math.round(l.durationMs / 1000)}s
              </p>
              <p className="text-ink-soft">Model pass rate {pct(model.levelPassRates[i])}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[1rem]">
          Modelled win rate: <strong>{pct(model.attemptWinRate)}</strong> per attempt, <strong>{pct(model.twoAttemptWinRate)}</strong> across{" "}
          {settings.maxRewardAttempts} attempts. Target: 20–30% across two attempts. Confirm with playtests before the event.
        </p>
      </Panel>

      <Panel title="Edit game settings">
        <p className="mb-4 text-[0.98rem]">
          Edit the JSON and save. It is checked before saving: one to five levels numbered in order (three by default), sensible ranges, and every field present. Attempts already in
          progress keep the settings they started with. Field guide: <code>targetCatches</code> kittens to catch, <code>lives</code> hearts,{" "}
          <code>visibleMs</code> how long a pop-up stays, <code>dashMs</code> how long a dash takes, <code>decoyChance</code> share of snacks,{" "}
          <code>catRadius</code> how forgiving a tap is.
        </p>
        <AdminForm action={saveGame} submitLabel="Validate and save">
          <label className="flex flex-col gap-1.5 text-[0.95rem] font-extrabold text-ink">
            Settings (JSON)
            <textarea
              name="settings"
              rows={24}
              spellCheck={false}
              defaultValue={JSON.stringify(settings, null, 2)}
              className="w-full rounded-xl border-2 border-choc-900/15 bg-cream-50 p-3.5 font-[ui-monospace,monospace] text-[0.9rem] text-ink outline-none focus:border-maroon-600"
            />
          </label>
        </AdminForm>
      </Panel>
    </div>
  );
}
