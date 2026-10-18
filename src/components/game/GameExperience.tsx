"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { ArrowRight, Gamepad2, Heart, Lock, Play, RotateCcw, Timer, Trophy, Volume2, VolumeX } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DiyaRow } from "@/components/art/DiyaArt";
import { CouponTicket } from "@/components/rewards/CouponTicket";
import { Button, ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { GameSettings, LevelConfig } from "@/lib/game/config";
import { randomSeed } from "@/lib/game/rng";
import { sfx } from "@/lib/game/sound";
import { GameBoard, type BoardResult } from "./GameBoard";
import { loadSprites } from "./sprites";

type Mode = "practice" | "reward";

interface Status {
  configured: boolean;
  signedIn: boolean;
  attemptsUsed?: number;
  attemptsAllowed?: number;
  activeAttempt?: { id: string; currentLevel: number } | null;
  coupons?: number;
}

interface Run {
  mode: Mode;
  settings: GameSettings;
  level: number;
  attemptId?: string;
  attemptNumber?: number;
  attemptsUsed?: number;
  attemptsAllowed?: number;
}

interface Coupon {
  code: string;
  label: string;
  valueText: string | null;
  expiresAt: string | null;
  issuedAt: string | null;
}

type Screen =
  | { name: "home" }
  | { name: "confirm" }
  | { name: "level-intro" }
  | { name: "countdown"; seed: number; n: number }
  | { name: "playing"; seed: number }
  | { name: "submitting" }
  | { name: "level-passed"; catches: number }
  | { name: "won"; coupon: Coupon | null; reward: string | null }
  | { name: "lost"; reason: string; catches: number }
  | { name: "error"; message: string; retry?: () => void };

const ERRORS: Record<string, string> = {
  not_configured: "Reward play is not switched on yet. You can still practise.",
  unauthenticated: "Please sign in to play for a reward.",
  no_attempts_left: "You have used all your reward attempts.",
  level_in_progress: "One of your levels is still running. Give it a moment and try again.",
  attempt_finished: "That attempt has already finished.",
  wrong_level: "Your attempt has moved on. Reloading your progress.",
  level_already_started: "This level was already started. By the rules, a started level must be finished in one go.",
  level_already_submitted: "That level was already recorded.",
  rate_limited: "Too many requests. Wait a few seconds and try again.",
  bad_request: "Something about that request was not right. Please try again.",
  server_error: "Our server had a problem. Please try again.",
};

const LOST_REASON: Record<string, string> = {
  failed_time: "Time ran out before you caught enough kittens.",
  failed_lives: "You ran out of hearts. Watch out for the snacks!",
  invalid: "We could not verify that result, so it does not count.",
  abandoned: "The level was left unfinished.",
};

async function post<T>(url: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; code: string; data?: Record<string, unknown> }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, code: (data?.error as string) ?? "server_error", data };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, code: "network" };
  }
}

export function GameExperience({
  settings,
  rewardsEnabled,
  couponValueText,
}: {
  settings: GameSettings;
  rewardsEnabled: boolean;
  couponValueText: string | null;
}) {
  const reduce = usePrefersReducedMotion();
  const [status, setStatus] = useState<Status | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [sound, setSound] = useState(false);
  const [practiceLevel, setPracticeLevel] = useState(1);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/game/status", { cache: "no-store" });
      setStatus(res.ok ? await res.json() : { configured: false, signedIn: false });
    } catch {
      setStatus({ configured: false, signedIn: false });
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
    void loadSprites();
    try {
      setSound(localStorage.getItem("tu-sound") === "on");
    } catch {
      /* storage unavailable */
    }
  }, [refreshStatus]);

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    if (next) sfx.unlock();
    try {
      localStorage.setItem("tu-sound", next ? "on" : "off");
    } catch {
      /* ignore */
    }
  };

  const cfg: LevelConfig | null = run ? run.settings.levels[run.level - 1] : null;

  // ---------------------------------------------------------------- starting things
  const startPractice = (level: number) => {
    setRun({ mode: "practice", settings, level });
    setScreen({ name: "level-intro" });
  };

  const startReward = async () => {
    setScreen({ name: "submitting" });
    const r = await post<{
      attemptId: string;
      attemptNumber: number;
      currentLevel: number;
      attemptsUsed: number;
      attemptsAllowed: number;
      settings: GameSettings;
    }>("/api/game/attempt", {});
    if (!r.ok) {
      await refreshStatus();
      setScreen({ name: "error", message: ERRORS[r.code] ?? "Could not start a reward attempt. Check your connection and try again." });
      return;
    }
    setRun({
      mode: "reward",
      settings: r.data.settings,
      level: r.data.currentLevel,
      attemptId: r.data.attemptId,
      attemptNumber: r.data.attemptNumber,
      attemptsUsed: r.data.attemptsUsed,
      attemptsAllowed: r.data.attemptsAllowed,
    });
    setScreen({ name: "level-intro" });
  };

  const beginLevel = async () => {
    if (!run) return;
    let seed: number;
    if (run.mode === "reward") {
      setScreen({ name: "submitting" });
      const r = await post<{ seed: number }>("/api/game/level/start", { attemptId: run.attemptId, level: run.level });
      if (!r.ok) {
        await refreshStatus();
        setScreen({ name: "error", message: ERRORS[r.code] ?? "Could not start the level. Check your connection and try again." });
        return;
      }
      seed = r.data.seed;
    } else {
      seed = randomSeed();
    }
    await loadSprites();
    const steps = Math.max(0, Math.round(run.settings.countdownMs / 1000));
    if (steps === 0) {
      setScreen({ name: "playing", seed });
      return;
    }
    setScreen({ name: "countdown", seed, n: steps });
  };

  // Countdown ticks.
  useEffect(() => {
    if (screen.name !== "countdown") return;
    if (sound) (screen.n > 0 ? sfx.tick : sfx.go)();
    const id = setTimeout(() => {
      if (screen.n <= 1) setScreen({ name: "playing", seed: screen.seed });
      else setScreen({ name: "countdown", seed: screen.seed, n: screen.n - 1 });
    }, 1000);
    return () => clearTimeout(id);
  }, [screen, sound]);

  // ---------------------------------------------------------------- finishing a level
  const onBoardFinish = useCallback(
    async (result: BoardResult) => {
      if (!run) return;
      if (run.mode === "practice") {
        if (result.outcome === "passed" && !result.aborted) {
          if (sound) sfx.levelUp();
          if (run.level >= 5) setScreen({ name: "won", coupon: null, reward: "practice" });
          else setScreen({ name: "level-passed", catches: result.catches });
        } else {
          if (sound) sfx.lose();
          setScreen({ name: "lost", reason: result.aborted ? "abandoned" : result.outcome, catches: result.catches });
        }
        return;
      }

      setScreen({ name: "submitting" });
      const submit = async () => {
        const r = await post<{
          outcome: string;
          attemptStatus: string;
          nextLevel: number | null;
          reward: string | null;
          coupon: Coupon | null;
          catches: number;
        }>("/api/game/level/submit", { attemptId: run.attemptId, level: run.level, taps: result.taps });
        if (!r.ok) {
          if (r.code === "network" || r.code === "server_error" || r.code === "rate_limited") {
            setScreen({
              name: "error",
              message: "We could not send your result. Your taps are safe on this page; try sending again.",
              retry: () => void submit(),
            });
            return;
          }
          await refreshStatus();
          setScreen({ name: "error", message: ERRORS[r.code] ?? "Something went wrong recording that level." });
          return;
        }
        const d = r.data;
        if (d.outcome === "passed" && d.attemptStatus === "won") {
          if (sound) sfx.levelUp();
          setScreen({ name: "won", coupon: d.coupon, reward: d.reward });
          void refreshStatus();
        } else if (d.outcome === "passed" && d.nextLevel) {
          if (sound) sfx.levelUp();
          setRun((cur) => (cur ? { ...cur, level: d.nextLevel as number } : cur));
          setScreen({ name: "level-passed", catches: d.catches });
        } else {
          if (sound) sfx.lose();
          setScreen({ name: "lost", reason: d.outcome, catches: d.catches });
          void refreshStatus();
        }
      };
      await submit();
    },
    [run, sound, refreshStatus],
  );

  const nextPracticeLevel = () => {
    setRun((cur) => (cur ? { ...cur, level: Math.min(5, cur.level + 1) } : cur));
    setScreen({ name: "level-intro" });
  };

  const goHome = () => {
    setRun(null);
    setScreen({ name: "home" });
    void refreshStatus();
  };

  // ---------------------------------------------------------------- rendering
  const attemptsLeft =
    status?.attemptsAllowed !== undefined && status?.attemptsUsed !== undefined ? Math.max(0, status.attemptsAllowed - status.attemptsUsed) : null;
  const fade = { initial: reduce ? false : { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: reduce ? undefined : { opacity: 0, y: -10 }, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const } };

  return (
    <div className="relative">
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={sound}
          className="inline-flex items-center gap-2 rounded-full border-2 border-cream-100/60 px-4 py-2 text-[0.95rem] font-extrabold text-cream-100 hover:bg-cream-100 hover:text-ink"
        >
          {sound ? <Volume2 aria-hidden className="h-4 w-4" /> : <VolumeX aria-hidden className="h-4 w-4" />}
          Sound {sound ? "on" : "off"}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {screen.name === "home" && (
          <motion.section key="home" {...fade} aria-labelledby="game-home-title" className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
            <div>
              <h2 id="game-home-title" className="display-m text-sticker">
                How to play
              </h2>
              <ul className="mt-6 flex flex-col gap-3 text-[1.08rem] leading-relaxed text-cream-100">
                <li className="flex gap-3">
                  <Gamepad2 aria-hidden className="mt-1 h-5 w-5 shrink-0 text-gold-400" />
                  Koochu Puchu pops out of the Diwali gift boxes and dashes across the stall. Tap it to catch it.
                </li>
                <li className="flex gap-3">
                  <Heart aria-hidden className="mt-1 h-5 w-5 shrink-0 text-gold-400" />
                  Snacks pop up too. Tap one and you lose a heart.
                </li>
                <li className="flex gap-3">
                  <Timer aria-hidden className="mt-1 h-5 w-5 shrink-0 text-gold-400" />
                  Catch enough kittens before the timer runs out to clear the level. Five levels, each harder than the last.
                </li>
                <li className="flex gap-3">
                  <Trophy aria-hidden className="mt-1 h-5 w-5 shrink-0 text-gold-400" />
                  Clear Level 5 in a reward attempt to win a coupon{couponValueText ? `: ${couponValueText}` : ""}.
                </li>
              </ul>
              <p className="mt-4 text-[0.98rem] text-cream-100/90">Keyboard players: number keys 1 to 9 tap the boxes, laid out like a phone keypad.</p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
                {settings.practiceEnabled && (
                  <Button variant="secondary" size="lg" icon={<Play />} onClick={() => startPractice(practiceLevel)}>
                    Practise
                  </Button>
                )}
                <RewardButton status={status} attemptsLeft={attemptsLeft} onStart={() => setScreen({ name: "confirm" })} />
              </div>

              {status?.signedIn && attemptsLeft !== null && (
                <p className="mt-4 text-[1rem] font-bold text-cream-100">
                  Reward attempts used: {status.attemptsUsed} of {status.attemptsAllowed}
                  {status.coupons ? (
                    <>
                      {" "}
                      ·{" "}
                      <Link href="/rewards" className="text-gold-300 underline underline-offset-4">
                        {status.coupons} coupon{status.coupons === 1 ? "" : "s"} in your wallet
                      </Link>
                    </>
                  ) : null}
                </p>
              )}
              {!rewardsEnabled && <p className="mt-3 text-[0.98rem] font-bold text-gold-300">Coupons are paused right now. You can still play.</p>}

              {settings.practiceEnabled && (
                <div className="mt-8">
                  <p className="text-[0.95rem] font-extrabold text-gold-300">Practise a level</p>
                  <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Choose a practice level">
                    {settings.levels.map((l) => (
                      <button
                        key={l.level}
                        type="button"
                        aria-pressed={practiceLevel === l.level}
                        onClick={() => setPracticeLevel(l.level)}
                        className={cn(
                          "grid h-12 w-12 place-items-center rounded-full font-display text-[1.3rem] transition-colors",
                          practiceLevel === l.level ? "bg-gold-400 text-ink" : "bg-burgundy-800 text-cream-100 hover:bg-maroon-700",
                        )}
                      >
                        {l.level}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="relative mx-auto w-[260px] sm:w-[320px]">
              <Image src="/images/mascot/koochu-idle.webp" alt="Koochu Puchu, ready to run" width={762} height={1000} sizes="320px" className="w-full" priority />
              <DiyaRow count={5} className="-mt-4 w-full" />
            </div>
          </motion.section>
        )}

        {screen.name === "confirm" && (
          <motion.section key="confirm" {...fade} className="mx-auto max-w-xl rounded-[var(--radius-panel)] bg-cream-100 p-7 text-ink md:p-9">
            <h2 className="display-m text-choc-900">Use a reward attempt?</h2>
            <p className="mt-4 text-[1.05rem] leading-relaxed">
              {status?.activeAttempt
                ? `You have an unfinished attempt waiting at Level ${status.activeAttempt.currentLevel}. Carry on from there.`
                : `This uses attempt ${(status?.attemptsUsed ?? 0) + 1} of ${status?.attemptsAllowed ?? settings.maxRewardAttempts}.`}
            </p>
            <ul className="mt-4 flex flex-col gap-2 text-[1rem] leading-relaxed">
              <li>• You can take a break between levels.</li>
              <li>• Once a level starts, finish it. Leaving or refreshing during a level ends the attempt.</li>
              <li>• Every tap is checked on our server, so play fair.</li>
            </ul>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" onClick={() => void startReward()} trailing={<ArrowRight />}>
                {status?.activeAttempt ? "Continue" : "Let's go"}
              </Button>
              <Button variant="dark" size="lg" onClick={goHome}>
                Not now
              </Button>
            </div>
          </motion.section>
        )}

        {screen.name === "level-intro" && run && cfg && (
          <motion.section key={`intro-${run.level}`} {...fade} className="mx-auto max-w-2xl text-center">
            <LevelPath current={run.level} levels={run.settings.levels} />
            <p className="mt-8 font-display text-[1.4rem] text-gold-300">
              {run.mode === "practice" ? "Practice" : `Reward attempt ${run.attemptNumber}`} · Level {cfg.level}
            </p>
            <h2 className="display-l text-sticker mt-2">{cfg.name}</h2>
            <p className="mx-auto mt-4 max-w-md text-[1.1rem] font-semibold leading-relaxed text-cream-100">{cfg.blurb}</p>
            <dl className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3">
              <Stat label="Catch" value={String(cfg.targetCatches)} />
              <Stat label="Hearts" value={String(cfg.lives)} />
              <Stat label="Seconds" value={String(Math.round(cfg.durationMs / 1000))} />
            </dl>
            {run.mode === "reward" && (
              <p className="mx-auto mt-5 flex max-w-md items-center justify-center gap-2 text-[0.98rem] font-bold text-cream-100">
                <Lock aria-hidden className="h-4 w-4 text-gold-400" />
                Once you start, this level must be finished.
              </p>
            )}
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" icon={<Play />} onClick={() => void beginLevel()}>
                Start level {cfg.level}
              </Button>
              <Button variant="outline" size="lg" onClick={goHome}>
                {run.mode === "reward" ? "Take a break" : "Back"}
              </Button>
            </div>
          </motion.section>
        )}

        {screen.name === "countdown" && (
          <motion.div key="countdown" {...fade} className="grid min-h-[420px] place-items-center" aria-live="assertive">
            <motion.p
              key={screen.n}
              initial={reduce ? false : { scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 16 }}
              className="text-sticker-gold font-display text-[9rem] leading-none"
            >
              {screen.n}
            </motion.p>
          </motion.div>
        )}

        {screen.name === "playing" && run && cfg && (
          <motion.div key={`play-${screen.seed}`} initial={false} animate={{ opacity: 1 }}>
            <GameBoard
              seed={screen.seed}
              config={cfg}
              settings={run.settings}
              sound={sound}
              reduceMotion={reduce}
              rewardMode={run.mode === "reward"}
              onFinish={(r) => void onBoardFinish(r)}
            />
          </motion.div>
        )}

        {screen.name === "submitting" && (
          <motion.div key="submitting" {...fade} className="grid min-h-[360px] place-items-center text-center" role="status">
            <div>
              <DiyaRow count={3} className="mx-auto w-40" />
              <p className="mt-4 text-[1.1rem] font-bold text-cream-100">Checking with the stall…</p>
            </div>
          </motion.div>
        )}

        {screen.name === "level-passed" && run && (
          <motion.section key="passed" {...fade} className="mx-auto max-w-xl text-center">
            <Image src="/images/mascot/koochu-excited.webp" alt="" width={282} height={356} className="mx-auto w-[150px]" />
            <h2 className="display-l text-sticker mt-4">Level cleared!</h2>
            <p className="mt-3 text-[1.1rem] font-semibold text-cream-100">
              {screen.catches} kittens caught. Next up: Level {run.mode === "practice" ? run.level + 1 : run.level}.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" trailing={<ArrowRight />} onClick={() => (run.mode === "practice" ? nextPracticeLevel() : setScreen({ name: "level-intro" }))}>
                Next level
              </Button>
              <Button variant="outline" size="lg" onClick={goHome}>
                Take a break
              </Button>
            </div>
          </motion.section>
        )}

        {screen.name === "won" && (
          <motion.section key="won" {...fade} className="mx-auto max-w-2xl text-center">
            <Image src="/images/mascot/koochu-win.webp" alt="Koochu Puchu holding a trophy" width={290} height={332} className="mx-auto w-[170px]" />
            <h2 className="display-l text-sticker-gold mt-4">You caught Koochu Puchu!</h2>
            {screen.reward === "practice" ? (
              <p className="mx-auto mt-4 max-w-md text-[1.1rem] font-semibold text-cream-100">
                All five levels cleared in practice. Now do it for real and win a coupon.
              </p>
            ) : screen.coupon ? (
              <>
                <p className="mx-auto mt-4 max-w-md text-[1.1rem] font-semibold text-cream-100">
                  Your coupon is saved in your wallet. Show it at the TERRA UTSAV stall.
                </p>
                <CouponTicket
                  className="mx-auto mt-8 max-w-xl text-left [--notch:#3a0f17]"
                  code={screen.coupon.code}
                  label={screen.coupon.label}
                  valueText={screen.coupon.valueText}
                  expiresAt={screen.coupon.expiresAt}
                  issuedAt={screen.coupon.issuedAt}
                />
              </>
            ) : (
              <p className="mx-auto mt-4 max-w-md text-[1.1rem] font-semibold text-cream-100">
                {screen.reward === "stock_exhausted"
                  ? "You won! Sadly all the coupons have been claimed. Show this screen to the team for a high five."
                  : "You won! Coupons are paused right now, so none was issued. The team will tell you what happens next."}
              </p>
            )}
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {screen.coupon && (
                <ButtonLink href="/rewards" size="lg" trailing={<ArrowRight />}>
                  My coupons
                </ButtonLink>
              )}
              <Button variant="outline" size="lg" onClick={goHome}>
                Back to the game
              </Button>
            </div>
          </motion.section>
        )}

        {screen.name === "lost" && run && (
          <motion.section key="lost" {...fade} className="mx-auto max-w-xl text-center">
            <Image src="/images/mascot/koochu-oops.webp" alt="" width={271} height={315} className="mx-auto w-[150px]" />
            <h2 className="display-l text-sticker mt-4">Oops! Koochu Puchu got away.</h2>
            <p className="mt-3 text-[1.1rem] font-semibold text-cream-100">{LOST_REASON[screen.reason] ?? LOST_REASON.failed_time}</p>
            <p className="mt-2 text-[1rem] text-cream-100">
              Level {run.level} · {screen.catches} caught
              {run.mode === "reward" && attemptsLeft !== null && ` · ${attemptsLeft} reward attempt${attemptsLeft === 1 ? "" : "s"} left`}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {run.mode === "practice" ? (
                <Button size="lg" icon={<RotateCcw />} onClick={() => setScreen({ name: "level-intro" })}>
                  Try the level again
                </Button>
              ) : attemptsLeft ? (
                <Button size="lg" icon={<RotateCcw />} onClick={() => setScreen({ name: "confirm" })}>
                  Use another attempt
                </Button>
              ) : null}
              <Button variant="outline" size="lg" onClick={goHome}>
                Back
              </Button>
            </div>
          </motion.section>
        )}

        {screen.name === "error" && (
          <motion.section key="error" {...fade} className="mx-auto max-w-xl rounded-[var(--radius-panel)] bg-cream-100 p-7 text-center text-ink" role="alert">
            <h2 className="title text-choc-900">Hold on a second</h2>
            <p className="mt-3 text-[1.05rem] leading-relaxed">{screen.message}</p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {screen.retry && (
                <Button onClick={screen.retry} icon={<RotateCcw />}>
                  Try again
                </Button>
              )}
              <Button variant="dark" onClick={goHome}>
                Back to the game
              </Button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

function RewardButton({ status, attemptsLeft, onStart }: { status: Status | null; attemptsLeft: number | null; onStart: () => void }) {
  if (!status) {
    return (
      <Button size="lg" disabled icon={<Trophy />}>
        Checking…
      </Button>
    );
  }
  if (!status.configured) {
    return (
      <p className="max-w-xs self-center text-[0.98rem] font-bold text-cream-100">Reward play opens once the stall&apos;s sign-in is switched on.</p>
    );
  }
  if (!status.signedIn) {
    return (
      <ButtonLink href="/login?next=/game" size="lg" icon={<Trophy />} trailing={<ArrowRight />}>
        Sign in to play for a reward
      </ButtonLink>
    );
  }
  if (status.activeAttempt) {
    return (
      <Button size="lg" icon={<Trophy />} onClick={onStart} trailing={<ArrowRight />}>
        Continue reward attempt
      </Button>
    );
  }
  if (attemptsLeft === 0) {
    return (
      <Button size="lg" disabled icon={<Lock />}>
        No reward attempts left
      </Button>
    );
  }
  return (
    <Button size="lg" icon={<Trophy />} onClick={onStart} trailing={<ArrowRight />}>
      Play for a reward
    </Button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-burgundy-800 px-3 py-3">
      <dt className="text-[0.875rem] font-bold text-gold-300">{label}</dt>
      <dd className="font-display text-[2rem] leading-none text-cream-100">{value}</dd>
    </div>
  );
}

function LevelPath({ current, levels }: { current: number; levels: LevelConfig[] }) {
  return (
    <ol className="mx-auto flex max-w-md items-center justify-between" aria-label="Level progress">
      {levels.map((l, i) => (
        <li key={l.level} className="flex flex-1 items-center last:flex-none">
          <span
            aria-current={l.level === current ? "step" : undefined}
            className={cn(
              "grid h-11 w-11 shrink-0 place-items-center rounded-full font-display text-[1.2rem]",
              l.level < current && "bg-success text-ink",
              l.level === current && "bg-gold-400 text-ink ring-4 ring-gold-400/30",
              l.level > current && "bg-burgundy-800 text-cream-100/80",
            )}
          >
            <span className="sr-only">Level </span>
            {l.level}
          </span>
          {i < levels.length - 1 && <span aria-hidden className={cn("mx-1 h-1 flex-1 rounded-full", l.level < current ? "bg-success" : "bg-burgundy-800")} />}
        </li>
      ))}
    </ol>
  );
}
