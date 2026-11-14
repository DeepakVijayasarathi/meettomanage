import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Logo } from "@/components/Logo";
import { BRAND_NAME, resetBranding, setBrand } from "./branding";

describe("tenant branding", () => {
  afterEach(() => {
    cleanup();
    resetBranding();
    document.querySelectorAll('link[data-test-brand-icon]').forEach((node) => node.remove());
  });

  it("uses a tenant logo even when the tenant keeps the default product name", () => {
    setBrand({ name: BRAND_NAME, logoUrl: "https://cdn.example/academy.png" });
    render(<Logo />);

    expect(screen.getByRole("img", { name: BRAND_NAME })).toHaveAttribute("src", "https://cdn.example/academy.png");
  });

  it("updates and restores the browser icon", () => {
    const icon = document.createElement("link");
    icon.rel = "icon";
    icon.href = "/favicon-32.png";
    icon.dataset.testBrandIcon = "true";
    document.head.appendChild(icon);

    setBrand({ name: "Academy One", logoUrl: "https://cdn.example/academy.png" });
    expect(icon.href).toBe("https://cdn.example/academy.png");

    resetBranding();
    expect(new URL(icon.href).pathname).toBe("/favicon-32.png");
    expect(document.title).toBe(BRAND_NAME);
  });
});
