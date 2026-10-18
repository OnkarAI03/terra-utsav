/**
 * Koochu Puchu's answers. A small, honest matcher: it scores the question against topics and the
 * site's own facts (event, menu, game, coupons, challenge, team) and replies only with what the
 * website already says. When the site does not say something, Koochu Puchu says so and points to
 * Instagram or the team, rather than guessing. Pure and synchronous, so it is easy to test.
 */

export interface KoochuFacts {
  event: {
    festivalName: string | null;
    dateText: string | null;
    timeText: string | null;
    venue: string | null;
    stallLocation: string | null;
    mapUrl: string | null;
    instagramUrl: string | null;
    contactEmail: string | null;
  };
  rewards: {
    rewardsEnabled: boolean;
    couponValueText: string | null;
    maxRedemptions: number;
    maxCouponsTotal: number | null;
  };
  game: { attempts: number; levels: { name: string; target: number; seconds: number }[] };
  products: { slug: string; name: string; category: "food" | "diyas"; tagline: string | null; description: string; price: string; priceKnown: boolean; availability: string }[];
  team: {
    groups: { name: string; members: string[] }[];
    students: { name: string; title: string; group: string | null }[];
    mentors: { name: string; title: string }[];
    mentorsPending: boolean;
  };
  challenge: { seconds: number; rulesApproved: boolean };
}

export interface KoochuLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface KoochuReply {
  topic: string;
  text: string;
  links: KoochuLink[];
  chips: string[];
}

type Topic =
  | "greeting"
  | "thanks"
  | "bye"
  | "who"
  | "when"
  | "where"
  | "menu"
  | "price"
  | "game"
  | "coupon"
  | "signin"
  | "challenge"
  | "team"
  | "instagram"
  | "diyas"
  | "eggs"
  | "rules"
  | "payment";

/** Keywords per topic, including common Hinglish and Marathi words. Weight 1 unless listed as weak (0.5). */
const KEYWORDS: Record<Topic, string[]> = {
  greeting: ["hi", "hii", "hiii", "hello", "helo", "hey", "namaste", "namaskar", "hola", "yo", "morning", "evening"],
  thanks: ["thanks", "thank", "thx", "ty", "dhanyavad", "dhanyawad", "shukriya", "awesome", "cool", "nice", "great"],
  bye: ["bye", "goodbye", "tata", "cya", "byee"],
  who: ["koochu", "puchu", "mascot", "bot", "yourself"],
  when: ["when", "date", "day", "time", "timing", "timings", "schedule", "open", "opens", "close", "closes", "start", "starts", "end", "ends", "kab", "kevha", "kadhi", "baje", "vajta", "today", "tomorrow", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "weekend", "somvar", "mangalvar", "budhvar", "guruvar", "shukravar", "shanivar", "ravivar", "october", "oct"],
  where: ["where", "venue", "location", "address", "place", "kahan", "kaha", "kuthe", "map", "maps", "direction", "directions", "route", "reach", "stall", "spot", "campus", "college", "institute", "patil", "pradhikaran", "pune", "nigdi", "akurdi", "haveli", "find"],
  menu: ["menu", "food", "foods", "eat", "eating", "sell", "selling", "sold", "items", "item", "dish", "dishes", "snack", "snacks", "khana", "khaana", "khane", "khau", "serve", "serving", "buy", "order", "veg"],
  price: ["price", "prices", "pricing", "cost", "costs", "rate", "rates", "rs", "rupees", "rupee", "inr", "kitne", "kitna", "kiti", "paise", "paisa", "cheap", "expensive", "much"],
  game: ["game", "games", "play", "playing", "catch", "level", "levels", "practice", "practise", "score", "hearts", "timer", "decoy", "decoys", "tap", "kitten", "hard", "difficult"],
  coupon: ["coupon", "coupons", "reward", "rewards", "win", "winning", "won", "winner", "prize", "prizes", "free", "discount", "offer", "attempt", "attempts", "wallet", "redeem", "voucher"],
  signin: ["sign", "signin", "login", "log", "account", "email", "otp", "code", "password", "register", "signup"],
  challenge: ["brick", "bricks", "challenge", "wet", "hold", "holding", "sixty", "60", "seconds", "veet", "vit", "eent", "safety", "safe"],
  team: ["team", "students", "student", "members", "member", "people", "crew", "mentor", "mentors", "organiser", "organizer", "organisers", "organizers", "leader", "group", "groups", "made", "behind", "run", "runs"],
  instagram: ["instagram", "insta", "ig", "follow", "social", "reel", "reels", "contact", "dm", "message", "whatsapp", "phone", "call"],
  diyas: ["diya", "diyas", "diva", "divas", "deep", "deepak", "lamp", "lamps", "panti", "pantya", "candle", "candles"],
  eggs: ["egg", "eggs", "easter", "secret", "secrets", "hidden", "surprise", "surprises"],
  rules: ["rules", "rule", "privacy", "data", "terms", "fair"],
  payment: ["pay", "payment", "payments", "upi", "cash", "gpay", "phonepe", "paytm", "card"],
};

const WEAK = new Set(["day", "time", "much", "free", "play", "people", "made", "behind", "run", "runs", "find", "stall", "spot", "data", "nice", "cool", "great", "hard", "difficult", "safe", "code", "log", "order", "buy", "kitten", "open", "close", "start", "end", "message", "call", "phone"]);

const PHRASES: [RegExp, Topic, number][] = [
  [/\bhow much\b/, "price", 2],
  [/\bwhat time\b/, "when", 2],
  [/\bwhich day\b/, "when", 2],
  [/\bhow (do i|to|can i) (get|reach|come|go)\b/, "where", 2],
  [/\bwho are you\b|\bwhat are you\b|\byour name\b/, "who", 3],
  [/\bhow (do i|to|can i) play\b/, "game", 2],
  [/\bhow (do i|to|can i) win\b/, "coupon", 2],
  [/\bwho (made|runs|built|organi[sz]es?)\b/, "team", 2],
  [/\bsign ?in\b|\blog ?in\b/, "signin", 2],
  [/\bcatch (the )?koochu\b/, "game", 3],
  [/\bwhat (do|can|will|would) (i|you|we) (get|win)\b|\bwhat('?s| is) the (prize|reward)\b/, "coupon", 3],
  [/\bwhat('?s| is) (on|in) (the )?menu\b|\bwhat do you sell\b/, "menu", 2],
];

const PRODUCT_WORDS: Record<string, string[]> = {
  "chocolate-bomb": ["chocolate", "choco", "bomb", "bombs"],
  "chat-papdi": ["chat", "chaat", "papdi", "papri", "chatpapdi"],
  "diwali-diyas": ["diya", "diyas", "diva", "divas", "lamp", "lamps", "panti", "deep"],
};

const DEFAULT_CHIPS = ["When and where?", "What's on the menu?", "How do I win a coupon?", "Brick challenge rules"];

function normalise(question: string): string[] {
  return question
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[₹]/g, " rs ")
    .replace(/[^a-z0-9ऀ-ॿ\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** One edit (insert, delete, substitute) apart. Used for typos in longer words only. */
function nearlyEqual(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1 || a.length < 5 || b.length < 5) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function hasWord(tokens: string[], words: string[]): boolean {
  return tokens.some((t) => words.some((w) => nearlyEqual(t, w)));
}

function score(tokens: string[], text: string): Map<Topic, number> {
  const scores = new Map<Topic, number>();
  const add = (topic: Topic, n: number) => scores.set(topic, (scores.get(topic) ?? 0) + n);
  for (const [topic, words] of Object.entries(KEYWORDS) as [Topic, string[]][]) {
    for (const t of tokens) {
      const exact = words.includes(t);
      const fuzzy = !exact && words.some((w) => nearlyEqual(t, w));
      if (exact || fuzzy) add(topic, (WEAK.has(t) ? 0.5 : 1) * (exact ? 1 : 0.8));
    }
  }
  for (const [re, topic, n] of PHRASES) if (re.test(text)) add(topic, n);
  return scores;
}

const linkFindUs: KoochuLink = { label: "Find us card", href: "/#find-us" };
const linkMenu: KoochuLink = { label: "See the menu", href: "/menu" };
const linkGame: KoochuLink = { label: "Play the game", href: "/game" };
const linkRules: KoochuLink = { label: "Read the rules", href: "/rules" };

function sentenceList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function whenText(f: KoochuFacts): string | null {
  const when = [f.event.dateText, f.event.timeText].filter(Boolean).join(", ");
  if (!when) return null;
  return `${f.event.festivalName ?? "The Mandi"} is on ${when}.`;
}

function whereText(f: KoochuFacts): string {
  const venue = f.event.venue ? `We're at ${f.event.venue}.` : "The venue will be announced soon.";
  const spot = f.event.stallLocation
    ? ` Our stall: ${f.event.stallLocation}.`
    : " The exact stall spot on campus will be announced, so look for our sign: the colourful TERRA UTSAV logo.";
  return venue + spot;
}

function directions(f: KoochuFacts): KoochuLink[] {
  return f.event.mapUrl ? [{ label: "Get directions", href: f.event.mapUrl, external: true }, linkFindUs] : [linkFindUs];
}

function instagramLink(f: KoochuFacts): KoochuLink[] {
  if (!f.event.instagramUrl) return [];
  const handle = f.event.instagramUrl.match(/instagram\.com\/([^/?#]+)/i)?.[1];
  return [{ label: handle ? `@${handle} on Instagram` : "Instagram", href: f.event.instagramUrl, external: true }];
}

function productReply(f: KoochuFacts, slug: string): KoochuReply | null {
  const p = f.products.find((x) => x.slug === slug);
  if (!p) return null;
  const tagline = p.tagline ? ` ${p.tagline}` : "";
  const price = p.priceKnown ? `Price: ${p.price}.` : "The price will be announced before the Mandi.";
  return {
    topic: `product:${p.slug}`,
    text: `${p.name}:${tagline} ${p.description} ${price} ${p.availability}.`.replace(/\s+/g, " ").replace(/\.\./g, ".").trim(),
    links: [{ label: `${p.name} on the menu`, href: `/menu#${p.category === "diyas" ? "diyas" : p.slug}` }],
    chips: ["What's on the menu?", "When and where?"],
  };
}

function menuReply(f: KoochuFacts, pricesOnly = false): KoochuReply {
  const items = f.products.map((p) => (pricesOnly || p.priceKnown ? `${p.name} (${p.price})` : p.name));
  const anyUnknown = f.products.some((p) => !p.priceKnown);
  const text = pricesOnly
    ? anyUnknown && f.products.every((p) => !p.priceKnown)
      ? "Prices aren't on the website yet. The team will announce them before the Mandi, and they'll show up on the menu page."
      : `Prices: ${sentenceList(items)}.`
    : `At the counter: ${sentenceList(items)}.${anyUnknown ? " Prices will be announced before the Mandi." : ""} Plus the 60-second brick challenge and my game.`;
  return { topic: pricesOnly ? "price" : "menu", text, links: [linkMenu], chips: ["Tell me about the Chocolate Bomb", "Tell me about the diyas", "How do I win a coupon?"] };
}

function memberReply(f: KoochuFacts, tokens: string[]): KoochuReply | null {
  const people = [...f.team.students.map((s) => ({ ...s, mentor: false })), ...f.team.mentors.map((m) => ({ ...m, group: null, mentor: true }))];
  const found = people.filter((p) =>
    p.name
      .toLowerCase()
      .split(/\s+/)
      .filter((part) => part.length >= 4)
      .some((part) => tokens.includes(part)),
  );
  if (found.length === 0) return null;
  const lines = found.slice(0, 4).map((p) => (p.mentor ? `${p.name} is one of our mentors (${p.title}).` : `${p.name} is in ${p.group ?? "the team"}${p.title && p.title !== p.group ? `, as ${p.title}` : ""}.`));
  return { topic: "member", text: lines.join(" "), links: [{ label: "Meet the team", href: "/team" }], chips: ["Who made this stall?", "When and where?"] };
}

function reply(topic: Topic, f: KoochuFacts, tokens: string[]): KoochuReply {
  const { levels, attempts } = f.game;
  switch (topic) {
    case "greeting":
      return {
        topic,
        text: "Meow! I'm Koochu Puchu, the TERRA UTSAV kitten. Ask me about the date and place, the menu, my game and its coupons, the brick challenge or the team.",
        links: [],
        chips: DEFAULT_CHIPS,
      };
    case "who":
      return {
        topic,
        text: "I'm Koochu Puchu, the stall's original mascot: a calico kitten who got into the chocolate. I answer from what's on this website, so if something isn't here, I won't make it up.",
        links: [],
        chips: DEFAULT_CHIPS,
      };
    case "thanks":
      return { topic, text: "Happy to help! Happy Diwali, and see you at the stall.", links: [], chips: ["When and where?", "What's on the menu?"] };
    case "bye":
      return { topic, text: `Bye! See you at the stall${f.event.dateText ? ` on ${f.event.dateText}` : ""}.`, links: [], chips: [] };
    case "when": {
      const w = whenText(f);
      return {
        topic,
        text: w ?? "The date and time will be announced soon.",
        links: [linkFindUs],
        chips: ["Where is it?", "What's on the menu?"],
      };
    }
    case "where":
      return { topic, text: whereText(f), links: directions(f), chips: ["When is it?", "What's on the menu?"] };
    case "menu":
      return menuReply(f);
    case "price":
      return menuReply(f, true);
    case "diyas":
      return productReply(f, "diwali-diyas") ?? menuReply(f);
    case "game":
      return {
        topic,
        text: `Catch the Koochu Puchu has ${levels.length} quick levels: ${sentenceList(levels.map((l) => l.name))}. Tap me when I pop out of the Diwali gift boxes, don't tap the snacks, and catch enough before the timer ends. Practice is free and unlimited.`,
        links: [linkGame, { label: "Game rules", href: "/rules#game" }],
        chips: ["How do I win a coupon?", "Do I need to sign in?"],
      };
    case "coupon": {
      const value = f.rewards.couponValueText ? ` A coupon is worth: ${f.rewards.couponValueText}.` : " What a coupon is worth will be announced by the organisers.";
      const paused = f.rewards.rewardsEnabled ? "" : " Coupons are paused right now.";
      const day = [f.event.dateText, f.event.timeText].filter(Boolean).join(", ");
      const eventDay = ` Coupons can be won on event day only${day ? ` (${day})` : ""}, and you can sign up now.`;
      return {
        topic,
        text: `Sign in and you get ${attempts} reward attempt${attempts === 1 ? "" : "s"}. Clear all ${levels.length} levels in one attempt and a coupon lands in your wallet. Show it at the stall and a team member scans it.${value} It's meant to be hard: roughly 2 or 3 players in 10 win, so practise first.${eventDay}${paused}`,
        links: [linkGame, { label: "My coupons", href: "/rewards" }, { label: "Coupon rules", href: "/rules#coupons" }],
        chips: ["Do I need to sign in?", "How do I play?"],
      };
    }
    case "signin":
      return {
        topic,
        text: "Only reward play needs a sign-in, and sign-ups are open now. Enter your email and we send you a 6-digit code (and a link). No password. Coupons can be won on event day only. Practice works without signing in.",
        links: [{ label: "Sign in", href: "/login" }, linkRules],
        chips: ["How do I win a coupon?", "Privacy and rules"],
      };
    case "challenge":
      return {
        topic,
        text: `Hold one wet brick in one hand for ${f.challenge.seconds} seconds. A TERRA UTSAV team member explains the rules, supervises and times every attempt, and you can stop at any moment.${f.challenge.rulesApproved ? "" : " (The safety rules are a draft until the organisers approve them.)"}`,
        links: [{ label: "The brick challenge", href: "/challenge" }],
        chips: ["How do I win a coupon?", "When and where?"],
      };
    case "team": {
      const member = memberReply(f, tokens);
      if (member) return member;
      // A role: "who is the group leader?", "who does the decor?"
      const roleGroups = f.team.groups.filter(
        (g) =>
          g.members.length > 0 &&
          g.name
            .toLowerCase()
            .split(/[\s,]+/)
            .filter((w) => w.length >= 5 && !["group", "media", "team"].includes(w))
            .some((w) => tokens.some((t) => nearlyEqual(t, w))),
      );
      if (roleGroups.length > 0) {
        return {
          topic: "role",
          text: roleGroups.map((g) => `${g.name}: ${sentenceList(g.members)}.`).join(" "),
          links: [{ label: "Meet the team", href: "/team" }],
          chips: ["Who made this stall?", "When and where?"],
        };
      }
      // "Who are the mentors?" gets the mentors, not the whole crew.
      if (f.team.mentors.length > 0 && tokens.some((t) => nearlyEqual(t, "mentor") || nearlyEqual(t, "mentors"))) {
        return {
          topic: "mentors",
          text: `Our mentors: ${sentenceList(f.team.mentors.map((m) => m.name))}. They guide the ${f.team.students.length} students who run TERRA UTSAV.`,
          links: [{ label: "Meet the team", href: "/team" }],
          chips: ["Who made this stall?", "When and where?"],
        };
      }
      const groups = f.team.groups.filter((g) => g.members.length > 0);
      const mentors = f.team.mentorsPending ? " Our mentors will be added soon." : f.team.mentors.length ? ` Our mentors: ${sentenceList(f.team.mentors.map((m) => m.name))}.` : "";
      return {
        topic,
        text: `TERRA UTSAV is run by ${f.team.students.length} students in ${groups.length} teams: ${sentenceList(groups.map((g) => g.name))}.${mentors}`,
        links: [{ label: "Meet the team", href: "/team" }],
        chips: ["Who is the group leader?", "When and where?"],
      };
    }
    case "instagram":
      return {
        topic,
        text: `Follow us on Instagram for updates and reels.${f.event.contactEmail ? ` You can also email ${f.event.contactEmail}.` : ""}`,
        links: instagramLink(f),
        chips: ["When and where?"],
      };
    case "eggs":
      return {
        topic,
        text: "There are four mystery eggs hidden on this site. I'm not telling where, but the bottom of every page has hints. Meow.",
        links: [],
        chips: ["How do I win a coupon?"],
      };
    case "rules":
      return {
        topic,
        text: "The game, coupon, brick challenge and privacy rules are all on the Rules page.",
        links: [linkRules],
        chips: ["How do I win a coupon?", "Brick challenge rules"],
      };
    case "payment":
      return {
        topic,
        text: "The website doesn't say how to pay yet. Ask the team at the stall, or message us on Instagram.",
        links: instagramLink(f),
        chips: ["What's on the menu?", "When and where?"],
      };
  }
  return fallback(f);
}

function fallback(f: KoochuFacts): KoochuReply {
  return {
    topic: "unknown",
    text: "Hmm, my whiskers can't find that on this website. I know about the date and place, the menu, my game and coupons, the brick challenge and the team. For anything else, ask us on Instagram.",
    links: instagramLink(f),
    chips: DEFAULT_CHIPS,
  };
}

/** Answer one question from the site's facts. */
export function answer(question: string, facts: KoochuFacts): KoochuReply {
  const text = question.toLowerCase().replace(/\s+/g, " ");
  const tokens = normalise(question);
  if (tokens.length === 0) return reply("greeting", facts, tokens);

  // A person on the team, by name.
  const member = memberReply(facts, tokens);
  if (member) return member;

  const scores = score(tokens, text);
  // Small talk loses ties: "hi, when is it?" is a question about the date.
  const SOCIAL: Topic[] = ["greeting", "thanks", "bye"];
  const rank = ([t, n]: [Topic, number]) => n - (SOCIAL.includes(t) ? 0.25 : 0);
  const top = [...scores.entries()].sort((a, b) => rank(b) - rank(a));
  const best = top[0];

  // A product by name answers price and menu questions about it.
  const product = Object.entries(PRODUCT_WORDS).find(([, words]) => hasWord(tokens, words))?.[0];
  if (product && (!best || ["menu", "price", "diyas", "when", "where"].includes(best[0]) || best[1] < 2)) {
    const r = productReply(facts, product);
    if (r) return r;
  }

  if (!best || best[1] < 1) return fallback(facts);

  // "When and where?" in one go.
  const when = scores.get("when") ?? 0;
  const where = scores.get("where") ?? 0;
  if (when >= 1 && where >= 1) {
    return {
      topic: "event",
      text: `${whenText(facts) ?? "The date will be announced soon."} ${whereText(facts)}`,
      links: directions(facts),
      chips: ["What's on the menu?", "How do I win a coupon?"],
    };
  }

  return reply(best[0], facts, tokens);
}

export const KOOCHU_GREETING: KoochuReply = {
  topic: "greeting",
  text: "Meow! I'm Koochu Puchu, the TERRA UTSAV kitten. Ask me anything about the stall: timings, the menu, my game and its coupons, or the brick challenge. I only answer from this website.",
  links: [],
  chips: DEFAULT_CHIPS,
};
