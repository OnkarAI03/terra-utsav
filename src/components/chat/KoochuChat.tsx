"use client";

import { ArrowUpRight, Send, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { KoochuLink, KoochuReply } from "@/lib/koochu/answer";

/** Pages where the chat would get in the way: playing, staff and admin tools, sign-in. */
const HIDDEN_ON = ["/game", "/admin", "/staff", "/login", "/auth"];

const GREETING: KoochuReply = {
  topic: "greeting",
  text: "Meow! I'm Mini, the TERRA UTSAV kitten. Ask me about the stall: timings, the menu, my game and its prizes, or the brick challenge. I only answer from this website.",
  links: [],
  chips: ["When and where?", "What's on the menu?", "How do I win a prize?", "Brick challenge rules"],
};

const OFFLINE: KoochuReply = {
  topic: "error",
  text: "I can't reach my notes right now. Check your connection and ask me again in a moment.",
  links: [],
  chips: [],
};

type Message = { id: number; from: "bot"; reply: KoochuReply } | { id: number; from: "you"; text: string };

const NUDGE_KEY = "tu-koochu-hello";

/**
 * Mini, the stall's chat. A round launcher in the corner opens a small panel; answers
 * come from /api/koochu, which only uses the site's own content. Nothing is stored.
 */
export function KoochuChat() {
  const pathname = usePathname();
  const hidden = HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [nudge, setNudge] = useState(false);
  // On a phone's first screen of the homepage the button would sit on the hero's main button,
  // so there it waits until the visitor scrolls a little. Everywhere else it is always there.
  const [waitForScroll, setWaitForScroll] = useState(false);
  const nextId = useRef(1);
  const launcher = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const titleId = useId();

  useEffect(() => {
    if (pathname !== "/" || !window.matchMedia("(max-width: 639px)").matches) {
      setWaitForScroll(false);
      return;
    }
    // A 160px marker at the top of the page: while it is on screen, the visitor hasn't scrolled.
    const marker = document.createElement("div");
    marker.setAttribute("aria-hidden", "true");
    marker.style.cssText = "position:absolute;top:0;left:0;width:1px;height:160px;pointer-events:none";
    document.body.prepend(marker);
    const io = new IntersectionObserver(([entry]) => setWaitForScroll(entry.isIntersecting));
    io.observe(marker);
    return () => {
      io.disconnect();
      marker.remove();
    };
  }, [pathname]);

  // A one-time hello on the homepage, after the visitor has had a look around.
  useEffect(() => {
    if (pathname !== "/") return;
    // No pop-up hello inside Instagram's or Facebook's in-app browser.
    if (/Instagram|FBAN|FBAV|FB_IAB/i.test(navigator.userAgent)) return;
    let seen = false;
    try {
      seen = localStorage.getItem(NUDGE_KEY) === "1";
    } catch {
      seen = true;
    }
    if (seen) return;
    const show = setTimeout(() => setNudge(true), 9000);
    const hide = setTimeout(() => setNudge(false), 17000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [pathname]);

  const remember = () => {
    setNudge(false);
    try {
      localStorage.setItem(NUDGE_KEY, "1");
    } catch {
      /* private mode */
    }
  };

  const openChat = () => {
    remember();
    setOpen(true);
    setMessages((m) => (m.length ? m : [{ id: nextId.current++, from: "bot", reply: GREETING }]));
  };

  const close = useCallback(() => {
    setOpen(false);
    // On phones the launcher is hidden while the chat is open, so focus it once it shows again.
    requestAnimationFrame(() => launcher.current?.focus());
  }, []);

  // Focus the box on a mouse or trackpad; on a phone, don't throw the keyboard up over the chips:
  // focus the close button instead, so screen readers start inside the chat.
  useEffect(() => {
    if (!open) return;
    if (window.matchMedia("(pointer: fine)").matches) input.current?.focus();
    else closeButton.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [messages, pending]);

  // Leaving for another page closes the panel, so the page is not hidden behind it.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const ask = async (question: string) => {
    const q = question.trim().slice(0, 300);
    if (!q || pending) return;
    setDraft("");
    setMessages((m) => [...m, { id: nextId.current++, from: "you", text: q }]);
    setPending(true);
    let reply = OFFLINE;
    try {
      const res = await fetch("/api/koochu", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: q }) });
      if (res.ok) reply = (await res.json()) as KoochuReply;
    } catch {
      /* offline: say so */
    }
    setMessages((m) => [...m, { id: nextId.current++, from: "bot", reply }]);
    setPending(false);
  };

  if (hidden) return null;

  const last = messages[messages.length - 1];
  const chips = !pending && last?.from === "bot" ? last.reply.chips : [];

  return (
    <div className="print:hidden">
      {open && (
        <section
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          data-lenis-prevent
          className="koochu-panel fixed inset-x-2 bottom-2 top-[calc(var(--header-h)+8px)] z-[48] flex flex-col overflow-hidden rounded-[26px] bg-burgundy-950 text-cream-100 shadow-[var(--shadow-lift)] ring-2 ring-gold-400/40 sm:inset-x-auto sm:left-4 sm:top-auto sm:bottom-[92px] sm:h-[min(600px,calc(100dvh-130px))] sm:w-[400px]"
        >
          <div className="flex items-center gap-3 bg-maroon-600 px-4 py-3">
            <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-cream-100 ring-2 ring-gold-300">
              <Image src="/images/game/koochu-peek.webp" alt="" width={520} height={474} sizes="44px" className="h-full w-full object-cover object-top" />
            </span>
            <span className="min-w-0 flex-1">
              <h2 id={titleId} className="font-display text-[1.3rem] leading-none">
                Mini
              </h2>
              <span className="mt-1 block text-[0.8125rem] font-bold text-cream-100/90">Answers from this website</span>
            </span>
            <button
              ref={closeButton}
              type="button"
              onClick={close}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors duration-150 hover:bg-maroon-700 active:scale-95"
              aria-label="Close the chat"
            >
              <X aria-hidden className="h-5 w-5" />
            </button>
          </div>

          <div ref={log} role="log" aria-live="polite" aria-relevant="additions" className="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-4">
            {messages.map((m) =>
              m.from === "you" ? (
                <p key={m.id} className="koochu-msg max-w-[85%] self-end rounded-[18px] rounded-br-[6px] bg-maroon-600 px-4 py-2.5 text-[0.98rem] font-semibold leading-snug">
                  <span className="sr-only">You: </span>
                  {m.text}
                </p>
              ) : (
                <div key={m.id} className="koochu-msg max-w-[92%] self-start">
                  <p className="rounded-[18px] rounded-bl-[6px] bg-cream-100 px-4 py-3 text-[0.98rem] font-semibold leading-relaxed text-ink">
                    <span className="sr-only">Mini: </span>
                    {m.reply.text}
                  </p>
                  {m.reply.links.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.reply.links.map((l) => (
                        <ReplyLink key={`${m.id}-${l.href}`} link={l} onNavigate={() => setOpen(false)} />
                      ))}
                    </div>
                  )}
                </div>
              ),
            )}
            {pending && (
              <p aria-hidden className="koochu-typing flex w-fit items-center gap-1.5 rounded-[18px] rounded-bl-[6px] bg-cream-100 px-4 py-3.5">
                <span />
                <span />
                <span />
              </p>
            )}
            {pending && <span className="sr-only">Mini is thinking.</span>}
          </div>

          {chips.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 pb-3">
              {chips.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => void ask(c)}
                  className="rounded-full border-2 border-cream-100/60 px-3 py-1.5 text-[0.9rem] font-extrabold transition-colors duration-150 hover:bg-cream-100 hover:text-ink active:scale-[0.97]"
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          <form
            className="flex items-center gap-2 border-t-2 border-burgundy-800 bg-burgundy-900 px-3 py-3 pb-[max(12px,env(safe-area-inset-bottom))]"
            onSubmit={(e) => {
              e.preventDefault();
              void ask(draft);
            }}
          >
            <label htmlFor={`${panelId}-q`} className="sr-only">
              Ask Mini a question
            </label>
            <input
              id={`${panelId}-q`}
              ref={input}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={300}
              autoComplete="off"
              enterKeyHint="send"
              placeholder="Ask about timings, menu, the game…"
              className="min-w-0 flex-1 rounded-full bg-cream-50 px-4 py-3 text-ink outline-none placeholder:text-ink-soft focus-visible:ring-2 focus-visible:ring-gold-400"
            />
            <button
              type="submit"
              disabled={!draft.trim() || pending}
              aria-label="Send"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-maroon-600 text-cream-100 shadow-[inset_0_0_0_2px_rgb(251_239_219/0.7)] transition-transform duration-150 ease-out active:scale-95 disabled:opacity-50"
            >
              <Send aria-hidden className="h-5 w-5" />
            </button>
          </form>
        </section>
      )}

      {nudge && !open && !waitForScroll && (
        <p aria-hidden className="koochu-nudge paper-note hand fixed bottom-[96px] left-5 z-[45] px-4 py-2.5 text-[1.05rem] uppercase sm:left-6" style={{ rotate: "4deg" }}>
          Ask me anything!
        </p>
      )}

      <button
        ref={launcher}
        type="button"
        onClick={() => (open ? close() : openChat())}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={open ? "Close chat" : "Ask Mini"}
        inert={waitForScroll && !open ? true : undefined}
        className={cn(
          // Bottom left: Netlify's free-plan badge takes the bottom right corner.
          "group fixed bottom-[max(16px,env(safe-area-inset-bottom))] left-[max(16px,env(safe-area-inset-left))] z-[45] grid place-items-center rounded-full transition-[opacity,transform] duration-200 ease-out active:scale-95 sm:left-6",
          open && "max-sm:hidden",
          waitForScroll && !open && "pointer-events-none translate-y-3 opacity-0",
        )}
      >
        {/* Positioned outside the button's box, so only the round kitten is clickable. */}
        <span aria-hidden className="pointer-events-none absolute left-full top-1/2 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-full bg-cream-100 px-3 py-1.5 font-display text-[0.95rem] uppercase text-ink opacity-0 shadow-[0_4px_0_var(--color-cream-300)] transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 sm:block">
          {open ? "Close chat" : "Ask Mini"}
        </span>
        <span className="relative grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-cream-100 shadow-[var(--shadow-lift)] ring-[3px] ring-maroon-600 sm:h-16 sm:w-16">
          {open ? (
            <X aria-hidden className="h-7 w-7 text-maroon-600" />
          ) : (
            <Image src="/images/game/koochu-peek.webp" alt="" width={520} height={474} sizes="64px" className="h-full w-full object-cover object-top" />
          )}
        </span>
      </button>
    </div>
  );
}

function ReplyLink({ link, onNavigate }: { link: KoochuLink; onNavigate: () => void }) {
  const cls =
    "inline-flex items-center gap-1.5 rounded-full bg-choc-800 px-3 py-1.5 text-[0.9rem] font-extrabold text-cream-100 shadow-[0_3px_0_var(--color-choc-950)] transition-transform duration-150 ease-out hover:-translate-y-0.5 active:translate-y-[2px]";
  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className={cls}>
        {link.label}
        <ArrowUpRight aria-hidden className="h-4 w-4" />
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <Link href={link.href} onClick={onNavigate} className={cls}>
      {link.label}
    </Link>
  );
}
