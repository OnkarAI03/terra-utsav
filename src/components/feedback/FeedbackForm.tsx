"use client";

import { Camera, Send, Star } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { readStallState } from "@/lib/game/prize";

const RATINGS = ["Not great", "Okay", "Good", "Loved it", "Pure chaos, the good kind!"];
const LOVED = ["Chocolate Bomb", "Aloo Ponga", "Homemade diyas", "Brick challenge", "Catch Mini", "The team", "This website"];

type State = "idle" | "sending" | "sent" | "failed";

/**
 * Visitor feedback, sent to Netlify Forms (the field list lives in public/__forms.html; the team
 * reads submissions under Forms in the Netlify dashboard). No account, no phone number, no email.
 */
export function FeedbackForm() {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [loved, setLoved] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [state, setState] = useState<State>("idle");

  const toggle = (item: string) => setLoved((cur) => (cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item]));

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!rating || state === "sending") return;
    setState("sending");
    const body = new URLSearchParams({
      "form-name": "feedback",
      "bot-field": String(new FormData(e.currentTarget).get("bot-field") ?? ""),
      rating: `${rating} of 5`,
      loved: loved.join(", "),
      message: message.trim(),
      name: name.trim(),
      device: readStallState("") === "on" ? "Stall device" : "Visitor's own device",
    });
    try {
      const res = await fetch("/__forms.html", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() });
      setState(res.ok ? "sent" : "failed");
    } catch {
      setState("failed");
    }
  };

  const again = () => {
    setRating(0);
    setLoved([]);
    setMessage("");
    setName("");
    setState("idle");
  };

  if (state === "sent") {
    return (
      <div role="status" className="rounded-[var(--radius-panel)] bg-cream-100 p-7 text-center text-ink md:p-10">
        <p aria-hidden className="text-[3rem] leading-none">🪔</p>
        <h2 className="display-m mt-3 text-choc-900">Thank you!</h2>
        <p className="mx-auto mt-3 max-w-md text-[1.08rem] leading-relaxed">Your feedback just reached the TERRA UTSAV team. Happy Diwali!</p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#selfie"
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-maroon-600 px-6 py-3 font-display text-[1.05rem] uppercase tracking-[0.02em] text-cream-100 shadow-[0_5px_0_var(--color-maroon-700)] transition-transform duration-150 ease-out hover:-translate-y-0.5 active:translate-y-[3px]"
          >
            <Camera aria-hidden className="h-5 w-5" />
            Take a Diwali selfie
          </a>
          <Button variant="dark" onClick={again}>
            Send another
          </Button>
        </div>
      </div>
    );
  }

  const shown = hover || rating;
  return (
    <form onSubmit={submit} className="rounded-[var(--radius-panel)] bg-cream-100 p-6 text-ink md:p-9">
      {/* Spam trap: people never see or fill this. */}
      <p className="sr-only" aria-hidden>
        <label>
          Leave this empty <input name="bot-field" tabIndex={-1} autoComplete="off" />
        </label>
      </p>

      <fieldset>
        <legend className="font-display text-[1.7rem] leading-tight text-choc-900 md:text-[2rem]">How was your visit?</legend>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3" onMouseLeave={() => setHover(0)}>
          <div className="flex gap-1.5">
            {RATINGS.map((label, i) => {
              const value = i + 1;
              return (
                <label key={label} onMouseEnter={() => setHover(value)} className="cursor-pointer rounded-full p-1 transition-transform duration-150 ease-out active:scale-90 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-gold-400">
                  <input type="radio" name="rating" value={value} checked={rating === value} onChange={() => setRating(value)} className="sr-only" />
                  <Star
                    aria-hidden
                    strokeWidth={1.8}
                    className={cn("h-11 w-11 transition-colors duration-150 md:h-12 md:w-12", value <= shown ? "fill-gold-400 text-gold-500" : "fill-transparent text-choc-900/35")}
                  />
                  <span className="sr-only">
                    {value} of 5: {label}
                  </span>
                </label>
              );
            })}
          </div>
          <p aria-live="polite" className="min-h-7 text-[1.1rem] font-extrabold text-maroon-600">
            {shown ? RATINGS[shown - 1] : "Tap a star"}
          </p>
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="text-[1.05rem] font-extrabold">What did you love? (pick any)</legend>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {LOVED.map((item) => (
            <label
              key={item}
              className={cn(
                "inline-flex min-h-11 cursor-pointer items-center rounded-full border-2 px-4 py-2 text-[0.98rem] font-extrabold transition-colors duration-150 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-gold-400",
                loved.includes(item) ? "border-maroon-600 bg-maroon-600 text-cream-100" : "border-choc-900/20 bg-cream-50 text-ink hover:border-maroon-600",
              )}
            >
              <input type="checkbox" checked={loved.includes(item)} onChange={() => toggle(item)} className="sr-only" />
              {item}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-8 block">
        <span className="text-[1.05rem] font-extrabold">Anything else? (optional)</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={600}
          rows={4}
          placeholder="The best bit, the funniest moment, or what we could do better"
          className="mt-2 w-full rounded-xl border-2 border-choc-900/15 bg-cream-50 px-3.5 py-2.5 text-[1rem] text-ink outline-none transition-colors placeholder:text-ink-soft/80 focus:border-maroon-600"
        />
      </label>

      <label className="mt-5 block">
        <span className="text-[1.05rem] font-extrabold">Your name (optional)</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          autoComplete="given-name"
          className="mt-2 w-full max-w-sm rounded-xl border-2 border-choc-900/15 bg-cream-50 px-3.5 py-2.5 text-[1rem] text-ink outline-none transition-colors focus:border-maroon-600"
        />
      </label>

      <p className="mt-5 text-[0.95rem] font-semibold text-ink-soft">Please don&apos;t share phone numbers or emails here. We read every message.</p>

      {state === "failed" && (
        <p role="alert" className="mt-4 text-[1rem] font-extrabold text-danger-ink">
          Couldn&apos;t send just now. Check your connection and try again, or tell us at the stall.
        </p>
      )}

      <Button type="submit" size="lg" className="mt-6" icon={<Send />} disabled={!rating || state === "sending"}>
        {state === "sending" ? "Sending…" : "Send feedback"}
      </Button>
    </form>
  );
}
