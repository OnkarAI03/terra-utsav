import { unstable_cache } from "next/cache";
import { z } from "zod";
import { fail, isSameOriginJson, json, readJson } from "@/lib/api";
import { answer } from "@/lib/koochu/answer";
import { loadKoochuFacts } from "@/lib/koochu/facts";

export const dynamic = "force-dynamic";

/** Site facts for the chat, cached like the pages (60 s) and refreshed when an admin saves. */
const facts = unstable_cache(loadKoochuFacts, ["koochu-facts"], { revalidate: 60, tags: ["site-content"] });

const body = z.object({ question: z.string().trim().min(1).max(300) });

/**
 * Koochu Puchu, the stall's chat. Answers come only from the site's own content (see
 * src/lib/koochu/answer.ts); nothing is stored and nothing is sent anywhere else.
 */
export async function POST(request: Request) {
  if (!isSameOriginJson(request)) return fail("bad_request", 400);
  let question: string;
  try {
    question = body.parse(await readJson(request, 2_000)).question;
  } catch {
    return fail("bad_request", 400);
  }
  return json(answer(question, await facts()));
}
