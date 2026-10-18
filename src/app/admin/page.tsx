import { CircleCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { CHALLENGE } from "@/content/challenge";
import { requirePageRole } from "@/lib/auth";
import { getEventSettings, getGameSettings, getProducts, getRewardSettings, getTeam } from "@/lib/data/public";
import { estimateWinRates } from "@/lib/game/simulate";

interface Stats {
  players: number;
  attempts: number;
  attemptsInProgress: number;
  wins: number;
  losses: number;
  couponsIssued: number;
  couponsRedeemed: number;
  couponsVoid: number;
  redemptions: number;
  invalidLevels: number;
  reachedLevel: Record<string, number>;
  passedLevel: Record<string, number>;
  challengeResults: number;
  challengeCompleted: number;
}

const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;

export default async function AdminOverview() {
  const session = await requirePageRole("admin", "/admin");
  const [{ data: stats }, event, rewards, game, products, team] = await Promise.all([
    session.supabase.rpc("admin_stats"),
    getEventSettings(),
    getRewardSettings(),
    getGameSettings(),
    getProducts(),
    getTeam(),
  ]);
  const s = (stats ?? null) as Stats | null;
  const model = estimateWinRates(game, undefined, 800);
  const finished = s ? s.wins + s.losses : 0;

  const checklist = [
    { done: event.confirmed && !!event.startsAt, label: "Event name, date and venue confirmed", href: "/admin/event" },
    { done: !!event.timeText, label: "Stall timings added", href: "/admin/event" },
    { done: !!event.stallLocation, label: "Exact stall spot on campus added", href: "/admin/event" },
    { done: products.every((p) => p.pricePaise !== null), label: "Prices for every item", href: "/admin/menu" },
    { done: products.every((p) => !p.imageIsIllustrative && !!p.imageUrl), label: "Real photos of the food and diyas", href: "/admin/menu" },
    { done: rewards.confirmed && !!rewards.couponValueText, label: "Coupon value and terms confirmed", href: "/admin/rewards" },
    { done: !!rewards.expiresAt || !!rewards.expiresAfterHours, label: "Coupon expiry set", href: "/admin/rewards" },
    { done: !team.isPreview, label: "Team names, roles and photos entered", href: "/admin/team" },
    { done: CHALLENGE.rulesApproved, label: "Brick challenge safety rules approved (edit src/content/challenge.ts)", href: "/challenge" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="stats-title" className="rounded-[var(--radius-card)] bg-cream-100 p-6 text-ink md:p-7">
        <h2 id="stats-title" className="title text-choc-900">
          Live numbers
        </h2>
        {!s ? (
          <p className="mt-3">Statistics are unavailable right now.</p>
        ) : (
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Players", s.players],
              ["Reward attempts", s.attempts],
              ["Wins", s.wins],
              ["In progress", s.attemptsInProgress],
              ["Coupons issued", s.couponsIssued],
              ["Coupons redeemed", s.couponsRedeemed],
              ["Rejected results", s.invalidLevels],
              ["Brick challenges", `${s.challengeCompleted}/${s.challengeResults}`],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl bg-cream-200 p-4">
                <dt className="text-[0.9rem] font-bold text-ink-soft">{label}</dt>
                <dd className="font-display text-[2rem] leading-none text-choc-900">{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {s && (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="font-sans text-[1rem] font-extrabold">Level funnel (attempts that reached / passed each level)</h3>
              <ul className="mt-3 flex flex-col gap-1.5 text-[0.98rem]">
                {game.levels.map((l) => (
                  <li key={l.level} className="flex justify-between gap-4 border-b border-choc-900/10 pb-1.5">
                    <span>
                      {l.level}. {l.name}
                    </span>
                    <span className="font-extrabold tabular-nums">
                      {s.reachedLevel[l.level] ?? 0} / {s.passedLevel[l.level] ?? 0}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-sans text-[1rem] font-extrabold">Win rate</h3>
              <p className="mt-3 text-[0.98rem]">
                Actual: <strong>{finished ? pct(s.wins / finished) : "no finished attempts yet"}</strong> per attempt.
              </p>
              <p className="mt-1 text-[0.98rem]">
                Model for the current settings: <strong>{pct(model.attemptWinRate)}</strong> per attempt,{" "}
                <strong>{pct(model.twoAttemptWinRate)}</strong> across {game.maxRewardAttempts} attempts (target 20–30%).
              </p>
              <p className="mt-2 text-[0.9rem] text-ink-soft">The model is a simulated typical player. Real results from playtests matter more.</p>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="todo-title" className="rounded-[var(--radius-card)] bg-cream-100 p-6 text-ink md:p-7">
        <h2 id="todo-title" className="title text-choc-900">
          Before the event
        </h2>
        <ul className="mt-4 flex flex-col gap-2.5">
          {checklist.map((item) => (
            <li key={item.label} className="flex items-start gap-3 text-[1rem]">
              {item.done ? (
                <CircleCheck aria-label="Done" className="mt-0.5 h-5 w-5 shrink-0 text-success-ink" />
              ) : (
                <TriangleAlert aria-label="To do" className="mt-0.5 h-5 w-5 shrink-0 text-maroon-600" />
              )}
              <Link href={item.href} className={item.done ? "text-ink-soft" : "font-extrabold underline underline-offset-4"}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
