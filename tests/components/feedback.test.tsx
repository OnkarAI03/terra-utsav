// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";

describe("feedback", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("needs a rating, then sends everything to Netlify Forms and thanks the visitor", async () => {
    const send = vi.fn(async () => new Response("", { status: 200 }));
    vi.stubGlobal("fetch", send);
    render(<FeedbackForm />);

    const button = screen.getByRole("button", { name: "Send feedback" });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByLabelText("4 of 5: Loved it"));
    expect(screen.getByText("Loved it", { selector: "p" })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Aloo Ponga"));
    fireEvent.click(screen.getByLabelText("Catch Mini"));
    fireEvent.change(screen.getByLabelText("Anything else? (optional)"), { target: { value: "  The kitten won  " } });
    fireEvent.change(screen.getByLabelText("Your name (optional)"), { target: { value: "Asha" } });
    fireEvent.click(button);

    expect(await screen.findByRole("heading", { name: "Thank you!" })).toBeInTheDocument();
    expect(send).toHaveBeenCalledWith("/__forms.html", expect.objectContaining({ method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" } }));
    const body = new URLSearchParams(String((send.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(Object.fromEntries(body)).toEqual({
      "form-name": "feedback",
      "bot-field": "",
      rating: "4 of 5",
      loved: "Aloo Ponga, Catch Mini",
      message: "The kitten won",
      name: "Asha",
      device: "Visitor's own device",
    });

    fireEvent.click(screen.getByRole("button", { name: "Send another" }));
    expect(screen.getByRole("button", { name: "Send feedback" })).toBeDisabled();
  });

  it("keeps what was written and says so when sending fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("Not found", { status: 404 })));
    render(<FeedbackForm />);
    fireEvent.click(screen.getByLabelText("5 of 5: Pure chaos, the good kind!"));
    fireEvent.change(screen.getByLabelText("Anything else? (optional)"), { target: { value: "Amazing stall" } });
    fireEvent.click(screen.getByRole("button", { name: "Send feedback" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't send just now");
    expect(screen.getByLabelText("Anything else? (optional)")).toHaveValue("Amazing stall");
  });
});
