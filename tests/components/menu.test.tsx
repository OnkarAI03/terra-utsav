// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", async () => (await import("../helpers/dom")).nextMocks.image());

import { ProductCard } from "@/components/menu/ProductCard";
import { DEFAULT_PRODUCTS } from "@/content/products";
import { AVAILABILITY_LABEL, formatPrice } from "@/lib/format";

afterEach(cleanup);

describe("menu configuration", () => {
  it("has the two dishes and the homemade diyas, with no invented prices", () => {
    expect(DEFAULT_PRODUCTS.map((p) => p.slug)).toEqual(["chocolate-bomb", "aloo-ponga", "diwali-diyas"]);
    expect(DEFAULT_PRODUCTS.every((p) => p.pricePaise === null)).toBe(true);
    expect(DEFAULT_PRODUCTS.find((p) => p.slug === "diwali-diyas")?.category).toBe("diyas");
  });

  it("formats confirmed prices in rupees and says so when a price is not confirmed", () => {
    expect(formatPrice(null)).toBe("Price to be announced");
    expect(formatPrice(null, "₹30 each")).toBe("₹30 each");
    expect(formatPrice(9900)).toBe("₹99");
    expect(formatPrice(12550)).toBe("₹125.5");
  });

  it("renders a product card with name, tagline, price state and availability", () => {
    const bomb = DEFAULT_PRODUCTS[0];
    render(<ProductCard product={bomb} />);
    expect(screen.getByRole("heading", { name: "Chocolate Bomb" })).toBeInTheDocument();
    expect(screen.getByText("Crack it. Pour it. Devour it.")).toBeInTheDocument();
    expect(screen.getByText("Price to be announced")).toBeInTheDocument();
    expect(screen.getByText(AVAILABILITY_LABEL.coming_soon)).toBeInTheDocument();
    expect(screen.queryByText("Illustrative image")).not.toBeInTheDocument();
  });

  it("shows a drawn illustration for diyas until real photos exist, never a broken image", () => {
    const diyas = DEFAULT_PRODUCTS[2];
    const { container } = render(<ProductCard product={diyas} />);
    expect(screen.getByRole("img", { name: "Illustration of lit diyas on a rangoli" })).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("On sale on event day")).toBeInTheDocument();
  });

  it("uses a sold-out label when an item runs out", () => {
    render(<ProductCard product={{ ...DEFAULT_PRODUCTS[1], availability: "sold_out", pricePaise: 6000 }} />);
    expect(screen.getByText("Sold out")).toBeInTheDocument();
    expect(screen.getByText("₹60")).toBeInTheDocument();
  });
});
