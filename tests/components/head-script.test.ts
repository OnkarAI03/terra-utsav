// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { HEAD_SCRIPT } from "@/lib/head-script";

describe("the first script in <head>", () => {
  it("marks the page as script-enabled and clears what a host injected into <head>", () => {
    document.head.innerHTML =
      '<meta charset="utf-8">\n<!-- This site is hosted on Netlify. -->\n<meta name="viewport" content="width=device-width"><title>TERRA UTSAV</title>';
    new Function(HEAD_SCRIPT)();
    expect(document.documentElement.classList.contains("js")).toBe(true);
    // Only the elements React rendered are left, in order.
    expect([...document.head.childNodes].map((n) => n.nodeName)).toEqual(["META", "META", "TITLE"]);
  });
});
