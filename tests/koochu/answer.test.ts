import { beforeAll, describe, expect, it } from "vitest";
import { answer, type KoochuFacts } from "@/lib/koochu/answer";
import { loadKoochuFacts } from "@/lib/koochu/facts";

let facts: KoochuFacts;
beforeAll(async () => {
  // No database here: these are the same defaults the public site falls back to.
  facts = await loadKoochuFacts();
});

const ask = (q: string) => answer(q, facts);

describe("Mini answers from the site", () => {
  it("knows when, with the real date and time", () => {
    for (const q of ["When is it?", "what time does the stall open", "kab hai?", "kevha aahe", "which day", "is it open on sunday?", "ravivar la aahe ka"]) {
      const r = ask(q);
      expect(r.topic, q).toBe("when");
      expect(r.text).toContain("Tuesday, 27 October 2026");
      expect(r.text).toContain("9 am to 3 pm");
    }
  });

  it("knows where, links to directions, and is honest about the stall spot", () => {
    for (const q of ["Where is the stall?", "location please", "kuthe aahe", "how do I get there"]) {
      const r = ask(q);
      expect(r.topic, q).toBe("where");
      expect(r.text).toContain("S. B. Patil Institute of Management");
      expect(r.text).toContain("will be announced");
      expect(r.links.some((l) => l.external && l.href.startsWith("https://www.google.com/maps/"))).toBe(true);
    }
  });

  it("answers 'when and where' together", () => {
    const r = ask("When and where?");
    expect(r.topic).toBe("event");
    expect(r.text).toContain("27 October 2026");
    expect(r.text).toContain("S. B. Patil");
  });

  it("lists the menu and never invents prices", () => {
    const r = ask("What's on the menu?");
    expect(r.topic).toBe("menu");
    expect(r.text).toContain("Chocolate Bomb");
    expect(r.text).toContain("Aloo Ponga");
    expect(r.text).toContain("Homemade Diwali Diyas");
    expect(r.text).not.toMatch(/₹|\brs\b/i);
    expect(ask("How much does it cost?").text).toContain("Prices aren't on the website yet");
  });

  it("describes a dish by name, even with typos and Hindi", () => {
    expect(ask("tell me about the chocolate bomb").topic).toBe("product:chocolate-bomb");
    expect(ask("chocolat bomb kitne ka hai").topic).toBe("product:chocolate-bomb");
    expect(ask("aloo ponge?").topic).toBe("product:aloo-ponga");
    const diyas = ask("do you sell diyas");
    expect(diyas.topic).toBe("product:diwali-diyas");
    expect(diyas.text).toContain("On sale on event day");
  });

  it("explains the game and how to win a prize with the live numbers", () => {
    const game = ask("How do I play?");
    expect(game.topic).toBe("game");
    expect(game.text).toContain("3 quick levels");
    // No database in tests, as on the live site: prizes come from the team, shown a winner card.
    const coupon = ask("how to win a prize");
    expect(coupon.topic).toBe("coupon");
    expect(coupon.text).toContain("2 prize attempts");
    expect(coupon.text).toContain("all 3 levels");
    expect(coupon.text).toContain("Congratulations! You won!");
    expect(coupon.text).not.toMatch(/% off|discount/i);
    expect(coupon.text).toContain("Collect your prize from the TERRA UTSAV team at the stall (Tuesday, 27 October 2026, 9 am to 3 pm)");
    expect(ask("how to win a coupon").topic).toBe("coupon");
    expect(ask("what do I win?").topic).toBe("coupon");
    expect(coupon.links.map((l) => l.href)).toContain("/rewards");
    expect(ask("catch mini").topic).toBe("game");
    expect(ask("mini game").topic).toBe("game");
    expect(ask("catch the koochu puchu").topic).toBe("game");
  });

  it("explains sign-in and the brick challenge", () => {
    for (const q of ["Do I need to sign in?", "do i need to sign up", "how to register"]) {
      const signin = ask(q);
      expect(signin.topic, q).toBe("signin");
      expect(signin.text).toContain("No sign-up and no sign-in");
    }
    const brick = ask("Brick challenge rules");
    expect(brick.topic).toBe("challenge");
    expect(brick.text).toContain("60 seconds");
    expect(brick.text).toContain("draft");
  });

  it("knows the team, by group, by role and by name", () => {
    const team = ask("Who made this stall?");
    expect(team.topic).toBe("team");
    expect(team.text).toContain("17 students in 7 teams");
    expect(team.text).toContain("Our mentors: Ankush, Jidnyesh, Sairaj and Giriraj");
    const mentors = ask("who are the mentors?");
    expect(mentors.topic).toBe("mentors");
    expect(mentors.text).toMatch(/^Our mentors: Ankush, Jidnyesh, Sairaj and Giriraj\./);
    expect(ask("who is the group leader").text).toContain("Saniya Bhor");
    const person = ask("Who is Sanket?");
    expect(person.topic).toBe("member");
    expect(person.text).toContain("Sanket Wakale is in Sales and Marketing");
    expect(ask("bhalerao").text).toMatch(/Kushal Bhalerao[\s\S]*Rushikesh Bhalerao/);
  });

  it("is honest when the site does not say", () => {
    const pay = ask("Can I pay by UPI?");
    expect(pay.topic).toBe("payment");
    expect(pay.text).toContain("doesn't say how to pay");
    const unknown = ask("Is there parking for cars?");
    expect(unknown.topic).toBe("unknown");
    expect(unknown.links.some((l) => l.href.includes("instagram.com"))).toBe(true);
  });

  it("handles small talk without hijacking real questions", () => {
    expect(ask("hi").topic).toBe("greeting");
    expect(ask("hi, when is it?").topic).toBe("when");
    expect(ask("who are you").topic).toBe("who");
    const mini = ask("who is mini?");
    expect(mini.topic).toBe("who");
    expect(mini.text).toContain("I'm Mini");
    expect(ask("thanks!").topic).toBe("thanks");
    expect(ask("???").topic).toBe("greeting");
  });

  it("keeps the mystery eggs a mystery", () => {
    const r = ask("any secret easter eggs?");
    expect(r.topic).toBe("eggs");
    expect(r.text).not.toMatch(/diya|footer name|header|tap the/i);
  });
});
