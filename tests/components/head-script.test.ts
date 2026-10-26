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

  it("shows the splash on the first page of a visit only, and a tap skips it", () => {
    sessionStorage.clear();
    const html = document.documentElement;
    html.className = "";
    new Function(HEAD_SCRIPT)();
    expect(html.classList.contains("splash-seen")).toBe(false);

    document.body.innerHTML = '<div id="splash"><p>TERRA UTSAV</p></div>';
    document.querySelector("#splash p")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(html.classList.contains("splash-done")).toBe(true);

    html.className = "";
    new Function(HEAD_SCRIPT)();
    expect(html.classList.contains("splash-seen")).toBe(true);
  });
});
