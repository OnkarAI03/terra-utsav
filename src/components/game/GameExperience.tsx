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
import { gameFacts } from "@/lib/game/copy";
import {
  localPrizeOpen,
  markLocalPrizeGiven,
  nextPlayer,
  prizesGiven,
  readLocalPrize,
  readStallLog,
  readStallState,
  recordLocalWin,
  spendLocalAttempt,
  stallPinMatches,
  unlockStall,
  type LocalPrize,
  type StallState,
  type StallUnlock,
  type StallWin,
} from "@/lib/game/prize";
import { randomSeed } from "@/lib/game/rng";
import { sfx } from "@/lib/game/sound";
import type { RewardPhase } from "@/lib/game/window";
import { GameBoard, type BoardResult } from "./GameBoard";
import { ResultKitten } from "./ResultKitten";
import { loadSprites } from "./sprites";
import { StallPinDialog } from "./StallPinDialog";
import { WinnerCard } from "./WinnerCard";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * "reward" is server-checked play for a coupon (Supabase configured). "prize" is the same three
 * levels without the database: the phone keeps the record and the team checks a live winner card.
 */
type Mode = "practice" | "reward" | "prize";

interface Status {
  configured: boolean;
  signedIn: boolean;
  /** Set when sign-in is configured; see src/lib/game/window.ts. */
  rewardPhase?: RewardPhase;
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
  | { name: "won-local" }
  | { name: "lost"; reason: string; catches: number }
  | { name: "error"; message: string; retry?: () => void };

/** What the team sees when the PIN doesn't turn stall mode on. */
const UNLOCK_PROBLEMS: Record<Exclude<StallUnlock, "ok">, string> = {
  wrong: "That PIN didn't work. Try again.",
  busy: "Too many wrong tries. Wait 10 minutes, then try again.",
  "not-set": "The team PIN isn't set up on the website yet (STALL_PIN in Netlify).",
  offline: "Couldn't reach the website. Check the internet connection and try again.",
};

const ERRORS: Record<string, string> = {
  not_configured: "Reward play is not switched on yet. You can still practise.",
  unauthenticated: "This phone lost its place in the game. Reload the page and tap Play for a reward again.",
  guest_failed: "Couldn't start reward play just now. Check your connection and try again in a minute.",
  no_attempts_left: "You have used all your reward attempts.",
  rewards_closed: "Coupons are paused right now. Practise meanwhile: the levels are the same.",
  not_open_yet: "Coupons can be won on event day only. Practise meanwhile: the levels are the same.",
  event_over: "Reward play has ended. Thank you for playing!",
  already_won: "You have already won your coupon. It's one per person, so give someone else a chance! Practice is still open.",
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
  eventDay,
  couponValueText,
  eventEndsAt = null,
}: {
  settings: GameSettings;
  /** When coupons can be won, e.g. "Tuesday, 27 October 2026, 9 am to 3 pm". */
  eventDay: string | null;
  couponValueText: string | null;
  /** Prize play without the database closes when the event ends. */
  eventEndsAt?: string | null;
}) {
  const reduce = usePrefersReducedMotion();
  const facts = gameFacts(settings, couponValueText);
  const [status, setStatus] = useState<Status | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [sound, setSound] = useState(false);
  const [practiceLevel, setPracticeLevel] = useState(1);
  // This device's prize record, used when the database is not configured.
  const [local, setLocal] = useState<LocalPrize | null>(null);
  // The team's own laptops and phone at the stall, shared by many players: turned on with
  // /game?stall=1 and the team PIN, which is asked for again before each new player.
  const [stall, setStall] = useState<StallState>("off");
  const [stallLog, setStallLog] = useState<StallWin[]>([]);
  const [pinFor, setPinFor] = useState<"unlock" | "next" | null>(null);
  // Once someone plays with the keys, every later level shows the key numbers from the start.
  const [keyboardPlayer, setKeyboardPlayer] = useState(false);

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
    setLocal(readLocalPrize());
    const stallState = readStallState();
    setStall(stallState);
    if (stallState === "ask") setPinFor("unlock");
    setStallLog(readStallLog());
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

  /** Prize play without the database. The attempt is counted when Level 1 starts. */
  const startPrize = () => {
    setRun({ mode: "prize", settings, level: 1, attemptNumber: readLocalPrize().attemptsUsed + 1 });
    setScreen({ name: "level-intro" });
  };

  const givePrize = () => setLocal(markLocalPrizeGiven());

  /** Drops ?stall=1 from the address once it has done its job, so a reload doesn't ask again. */
  const forgetStallLink = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("stall");
      window.history.replaceState(window.history.state, "", url);
    } catch {
      /* the address just keeps it */
    }
  };

  const checkUnlock = async (pin: string) => {
    const result = await unlockStall(pin);
    return result === "ok" ? null : UNLOCK_PROBLEMS[result];
  };

  const stallTurnedOn = () => {
    setStall("on");
    setPinFor(null);
    setStallLog(readStallLog());
    forgetStallLink();
  };

  const stallNotNow = () => {
    setStall("off");
    setPinFor(null);
    forgetStallLink();
  };

  const checkNextPlayer = async (pin: string) => ((await stallPinMatches(pin)) ? null : "That PIN didn't work. Try again.");

  /** Stall devices: once the team PIN is entered, the next player starts with fresh attempts. */
  const startNextPlayer = () => {
    setLocal(nextPlayer());
    setStallLog(readStallLog());
    setRun(null);
    setScreen({ name: "home" });
    setPinFor(null);
  };

  /**
   * No sign-up: the first time a phone or browser plays for a reward, it gets a nameless guest
   * account (Supabase anonymous sign-in). Attempts and the coupon belong to that guest.
   */
  const playForReward = async () => {
    if (!status?.signedIn) {
      setScreen({ name: "submitting" });
      const supabase = getSupabaseBrowserClient();
      const result = supabase ? await supabase.auth.signInAnonymously() : null;
      if (!result || result.error) {
        setScreen({ name: "error", message: ERRORS.guest_failed });
        return;
      }
      await refreshStatus();
    }
    setScreen({ name: "confirm" });
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
      if (run.mode === "prize" && run.level === 1) setLocal(spendLocalAttempt());
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
      if (run.mode !== "reward") {
        if (result.outcome === "passed" && !result.aborted) {
          if (sound) sfx.levelUp();
          // The last level comes from the live settings (3 by default; admins may choose 1 to 5).
          if (run.level >= run.settings.levels.length) {
            if (run.mode === "prize") {
              setLocal(recordLocalWin());
              setScreen({ name: "won-local" });
            } else setScreen({ name: "won", coupon: null, reward: "practice" });
          } else setScreen({ name: "level-passed", catches: result.catches });
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
    setRun((cur) => (cur ? { ...cur, level: Math.min(cur.settings.levels.length, cur.level + 1) } : cur));
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
  // No database on this site: prizes are won and collected through the device's own record.
  const offline = status !== null && !status.configured;
  const stallOn = offline && stall === "on";
  const prizeLeft = local ? Math.max(0, settings.maxRewardAttempts - local.attemptsUsed) : null;
  const leftFor = (mode: Mode) => (mode === "prize" ? prizeLeft : attemptsLeft);
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

      <AnimatePresence mode="wait" initial={false}>
        {screen.name === "home" && (
          <motion.section key="home" {...fade} aria-labelledby="game-home-title" className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
            <div>
              {stallOn && (
                <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-burgundy-800 px-5 py-3 text-cream-100">
                  <p className="text-[0.95rem] font-extrabold">
                    <span className="text-gold-300">Stall mode</span> · Prizes given on this device: {prizesGiven(stallLog, local)}
                  </p>
                  <Button variant="secondary" size="sm" icon={<RotateCcw />} onClick={() => setPinFor("next")}>
                    Next player
                  </Button>
                </div>
              )}
              <h2 id="game-home-title" className="display-m text-sticker">
                Ready to play?
              </h2>
              {settings.practiceEnabled && (
                <div className="mt-6">
                  <p className="text-[0.95rem] font-extrabold text-gold-300">Practise level</p>
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

              <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
                {settings.practiceEnabled && (
                  <Button variant="secondary" size="lg" icon={<Play />} onClick={() => startPractice(practiceLevel)}>
                    Practise level {practiceLevel}
                  </Button>
                )}
                {offline ? (
                  <PrizeButton
                    local={local}
                    open={localPrizeOpen(eventEndsAt)}
                    left={prizeLeft}
                    onStart={() => setScreen({ name: "confirm" })}
                    onShow={() => setScreen({ name: "won-local" })}
                  />
                ) : (
                  <RewardButton status={status} attemptsLeft={attemptsLeft} onStart={() => void playForReward()} />
                )}
              </div>

              {offline && !local?.win && (
                <p className="mt-4 max-w-md text-[1rem] font-bold text-gold-300">
                  {stallOn
                    ? `Win all ${facts.levelsWord} levels and collect your prize from our team, right here.`
                    : `No sign-up needed. Win all ${facts.levelsWord} levels, then collect your prize from our team at the stall${eventDay ? `: ${eventDay}` : ""}.`}
                </p>
              )}

              {offline && local && !local.win && local.attemptsUsed > 0 && (
                <p className="mt-4 text-[1rem] font-bold text-cream-100">
                  Prize attempts used {stallOn ? "by this player" : "on this device"}: {Math.min(local.attemptsUsed, settings.maxRewardAttempts)} of{" "}
                  {settings.maxRewardAttempts}
                </p>
              )}

              {status?.rewardPhase === "before" && (
                <p className="mt-4 max-w-md text-[1rem] font-bold text-gold-300">
                  No sign-up needed. Coupons can be won on event day only{eventDay ? `: ${eventDay}` : ""}.
                </p>
              )}

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

              <h3 className="mt-10 font-display text-[1.6rem] leading-none text-cream-100">How to play</h3>
              <ul className="mt-4 flex flex-col gap-3 text-[1.08rem] leading-relaxed text-cream-100">
                <li className="flex gap-3">
                  <Gamepad2 aria-hidden className="mt-1 h-5 w-5 shrink-0 text-gold-400" />
                  Mini pops out of the Diwali gift boxes and dashes across the stall. Tap it to catch it.
                </li>
                <li className="flex gap-3">
                  <Heart aria-hidden className="mt-1 h-5 w-5 shrink-0 text-gold-400" />
                  Snacks pop up too. Tap one and you lose a heart.
                </li>
                <li className="flex gap-3">
                  <Timer aria-hidden className="mt-1 h-5 w-5 shrink-0 text-gold-400" />
                  Catch enough kittens before the timer runs out to clear the level. {facts.levels} levels, each harder than the last.
                </li>
                <li className="flex gap-3">
                  <Trophy aria-hidden className="mt-1 h-5 w-5 shrink-0 text-gold-400" />
                  {offline
                    ? `Clear Level ${facts.lastLevel} in a prize attempt and you win! Collect your prize from our team at the stall. One prize per player.`
                    : `Clear Level ${facts.lastLevel} in a reward attempt to win ${facts.prize}. One coupon per player.`}
                </li>
              </ul>
              <p className="mt-4 text-[0.98rem] text-cream-100/90 [@media(pointer:coarse)]:hidden">
                Keyboard players: number keys 1 to 9 tap the boxes, laid out like a number pad with 7 8 9 along the top. Each box shows its key.
              </p>
              <p className="mt-2 text-[0.98rem] text-cream-100/90">This game needs sight and quick taps. If it doesn&apos;t work for you, talk to us at the stall.</p>
            </div>
            <div className="relative mx-auto w-[260px] sm:w-[320px]">
              <Image src="/images/mascot/koochu-idle.webp" alt="Mini, ready to run" width={762} height={1000} sizes="320px" className="w-full" priority />
              <DiyaRow count={5} className="-mt-4 w-full" />
            </div>
          </motion.section>
        )}

        {screen.name === "confirm" && offline && (
          <motion.section key="confirm-prize" {...fade} className="mx-auto max-w-xl rounded-[var(--radius-panel)] bg-cream-100 p-7 text-ink md:p-9">
            <h2 className="display-m text-choc-900">Use a prize attempt?</h2>
            <p className="mt-4 text-[1.05rem] leading-relaxed">
              This will be attempt {Math.min((local?.attemptsUsed ?? 0) + 1, settings.maxRewardAttempts)} of {settings.maxRewardAttempts}{" "}
              {stallOn ? "for this player" : "on this device"}.
            </p>
            <ul className="mt-4 flex flex-col gap-2 text-[1rem] leading-relaxed">
              <li>• Play the {facts.levelsWord} levels in a row. Lose one and the attempt ends.</li>
              <li>• Once a level starts, finish it. Leaving or refreshing during a level ends the attempt.</li>
              <li>
                • Win and you get a live winner card. {stallOn ? "Our team hands over your prize right here." : "Show it to our team at the stall to collect your prize."}
              </li>
              <li>• One prize per person.</li>
            </ul>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" onClick={startPrize} trailing={<ArrowRight />}>
                Let&apos;s go
              </Button>
              <Button variant="dark" size="lg" onClick={goHome}>
                Not now
              </Button>
            </div>
          </motion.section>
        )}

        {screen.name === "confirm" && !offline && (
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
              <li>• One coupon per person. Playing again on another phone or browser won&apos;t get you a second one at the stall.</li>
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

        {screen.name === "level-intro" && run && !cfg && (
          // Never a blank panel: if a level number has no settings (an admin changed the level
          // count mid-run), offer the way back.
          <motion.section key="no-level" {...fade} className="mx-auto max-w-xl text-center">
            <p className="text-[1.1rem] font-semibold text-cream-100">That level isn&apos;t set up any more.</p>
            <div className="mt-6 flex justify-center">
              <Button size="lg" onClick={goHome}>
                Back to the game
              </Button>
            </div>
          </motion.section>
        )}

        {screen.name === "level-intro" && run && cfg && (
          <motion.section key={`intro-${run.level}`} {...fade} className="mx-auto max-w-2xl text-center">
            <LevelPath current={run.level} levels={run.settings.levels} />
            <p className="mt-8 font-display text-[1.4rem] text-gold-300">
              {run.mode === "practice" ? "Practice" : `${run.mode === "prize" ? "Prize" : "Reward"} attempt ${run.attemptNumber}`} · Level {cfg.level}
            </p>
            <h2 className="display-l text-sticker mt-2">{cfg.name}</h2>
            <p className="mx-auto mt-4 max-w-md text-[1.1rem] font-semibold leading-relaxed text-cream-100">{cfg.blurb}</p>
            <dl className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3">
              <Stat label="Catch" value={String(cfg.targetCatches)} />
              <Stat label="Hearts" value={String(cfg.lives)} />
              <Stat label="Seconds" value={String(Math.round(cfg.durationMs / 1000))} />
            </dl>
            {run.mode !== "practice" && (
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
                {run.mode === "practice" ? "Back" : run.mode === "reward" ? "Take a break" : run.level === 1 ? "Not now" : "Give up"}
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
              rewardMode={run.mode !== "practice"}
              showKeys={keyboardPlayer}
              onKeyboard={() => setKeyboardPlayer(true)}
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
            <ResultKitten mood="cheer" />
            <h2 className="display-l text-sticker mt-4">Level cleared!</h2>
            <p className="mt-3 text-[1.1rem] font-semibold text-cream-100">
              {screen.catches} kittens caught. Next up: Level {run.mode === "reward" ? run.level : run.level + 1}.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" trailing={<ArrowRight />} onClick={() => (run.mode === "reward" ? setScreen({ name: "level-intro" }) : nextPracticeLevel())}>
                Next level
              </Button>
              {/* A prize attempt lives only on this page, so it carries straight on to the next level. */}
              {run.mode !== "prize" && (
                <Button variant="outline" size="lg" onClick={goHome}>
                  Take a break
                </Button>
              )}
            </div>
          </motion.section>
        )}

        {screen.name === "won" && (
          <motion.section key="won" {...fade} className="mx-auto max-w-2xl text-center">
            <ResultKitten mood="win" />
            <h2 className="display-l text-sticker-gold mt-4">{screen.reward === "practice" ? "You caught Mini!" : "Congratulations! You won!"}</h2>
            {screen.reward === "practice" ? (
              <p className="mx-auto mt-4 max-w-md text-[1.1rem] font-semibold text-cream-100">
                All {facts.levelsWord} levels cleared in practice. Now do it for real and win {facts.prize}.
              </p>
            ) : screen.coupon ? (
              <>
                <p className="mx-auto mt-4 max-w-md text-[1.1rem] font-semibold text-cream-100">
                  Please collect your prize from the TERRA UTSAV team: show them this coupon at the stall. It&apos;s also saved under My
                  prize on this phone. One prize per person.
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
                  My prize
                </ButtonLink>
              )}
              <Button variant="outline" size="lg" onClick={goHome}>
                Back to the game
              </Button>
            </div>
          </motion.section>
        )}

        {screen.name === "won-local" && local?.win && (
          <motion.section key="won-local" {...fade} className="mx-auto max-w-2xl text-center">
            <ResultKitten mood="win" />
            <h2 className="display-l text-sticker-gold mt-4">Congratulations! You won!</h2>
            <p className="mx-auto mt-4 max-w-lg text-[1.15rem] font-semibold leading-relaxed text-cream-100">
              {local.win.claimedAt
                ? "You have collected your prize. Thank you for playing!"
                : stallOn
                  ? "Please collect your prize from the TERRA UTSAV team, right here at the stall."
                  : `Please collect your prize from the TERRA UTSAV team at the stall${eventDay ? ` (${eventDay})` : ""}. Show them this card, live on this device.`}
            </p>
            <WinnerCard className="mx-auto mt-8 max-w-xl text-left" win={local.win} prize={couponValueText} onGiven={givePrize} />
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {stallOn && local.win.claimedAt && (
                <Button size="lg" icon={<RotateCcw />} onClick={() => setPinFor("next")}>
                  Next player
                </Button>
              )}
              <Button variant="outline" size="lg" onClick={goHome}>
                Back to the game
              </Button>
            </div>
          </motion.section>
        )}

        {screen.name === "lost" && run && (
          <motion.section key="lost" {...fade} className="mx-auto max-w-xl text-center">
            <ResultKitten mood="oops" />
            <h2 className="display-l text-sticker mt-4">Oops! Mini got away.</h2>
            <p className="mt-3 text-[1.1rem] font-semibold text-cream-100">{LOST_REASON[screen.reason] ?? LOST_REASON.failed_time}</p>
            <p className="mt-2 text-[1rem] text-cream-100">
              Level {run.level} · {screen.catches} caught
              {run.mode !== "practice" &&
                leftFor(run.mode) !== null &&
                ` · ${leftFor(run.mode)} ${run.mode} attempt${leftFor(run.mode) === 1 ? "" : "s"} left`}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {run.mode === "practice" ? (
                <Button size="lg" icon={<RotateCcw />} onClick={() => setScreen({ name: "level-intro" })}>
                  Try the level again
                </Button>
              ) : leftFor(run.mode) ? (
                <Button size="lg" icon={<RotateCcw />} onClick={() => setScreen({ name: "confirm" })}>
                  Use another attempt
                </Button>
              ) : run.mode === "prize" && stallOn ? (
                <Button size="lg" icon={<RotateCcw />} onClick={() => setPinFor("next")}>
                  Next player
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

      {offline && pinFor === "unlock" && (
        <StallPinDialog
          title="Turn on stall mode"
          note="For the TERRA UTSAV team's own laptops and phone at the stall. Players then take turns on this device, and the team starts each new player with this PIN."
          submitLabel="Turn on"
          check={checkUnlock}
          onAccepted={stallTurnedOn}
          onCancel={stallNotNow}
        />
      )}
      {stallOn && pinFor === "next" && (
        <StallPinDialog
          title="Next player"
          note={
            local?.win && !local.win.claimedAt
              ? "This player's prize isn't marked as given yet. Starting the next player clears this player's game on this device."
              : "This clears the current player's attempts on this device, so the next person can play."
          }
          submitLabel="Start next player"
          check={checkNextPlayer}
          onAccepted={startNextPlayer}
          onCancel={() => setPinFor(null)}
        />
      )}
    </div>
  );
}

const REWARD_NOTE = "max-w-xs text-[0.98rem] font-bold text-gold-300 sm:self-center";

/** The prize button when the site has no database: this device's own record decides what it says. */
function PrizeButton({ local, open, left, onStart, onShow }: { local: LocalPrize | null; open: boolean; left: number | null; onStart: () => void; onShow: () => void }) {
  if (!local) {
    return (
      <Button size="lg" disabled icon={<Trophy />}>
        Checking…
      </Button>
    );
  }
  if (local.win) {
    return (
      <Button size="lg" icon={<Trophy />} onClick={onShow} trailing={<ArrowRight />}>
        {local.win.claimedAt ? "My winner card" : "Show my winner card"}
      </Button>
    );
  }
  if (!open) return <p className={REWARD_NOTE}>Prize play has ended. Thank you for playing!</p>;
  if (left === 0) {
    return (
      <Button size="lg" disabled icon={<Lock />}>
        No prize attempts left
      </Button>
    );
  }
  return (
    <Button size="lg" icon={<Trophy />} onClick={onStart} trailing={<ArrowRight />}>
      Play for a prize
    </Button>
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
    return <p className={REWARD_NOTE}>Reward play isn&apos;t switched on yet. Practice is open now.</p>;
  }
  // No sign-up: a visitor without a guest account yet gets one when they tap Play for a reward.
  if (status.activeAttempt) {
    return (
      <Button size="lg" icon={<Trophy />} onClick={onStart} trailing={<ArrowRight />}>
        Continue reward attempt
      </Button>
    );
  }
  if (status.rewardPhase === "after") {
    return <p className={REWARD_NOTE}>Reward play has ended. Thank you for playing!</p>;
  }
  if (status.rewardPhase === "before") {
    return (
      <Button size="lg" disabled icon={<Lock />}>
        Reward play opens on event day
      </Button>
    );
  }
  if (status.rewardPhase === "paused") {
    return <p className={REWARD_NOTE}>Coupons are paused right now. Practice is open.</p>;
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
