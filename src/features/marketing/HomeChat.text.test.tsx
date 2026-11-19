import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChatText } from "./HomeChat";

describe("ChatText", () => {
  it("formats assistant emphasis instead of showing markdown markers", () => {
    const { container } = render(<p><ChatText text={"Share your **full name**, **phone number** and **email address**."} /></p>);

    expect(screen.getByText("full name").tagName).toBe("STRONG");
    expect(screen.getByText("phone number").tagName).toBe("STRONG");
    expect(screen.getByText("email address").tagName).toBe("STRONG");
    expect(container).not.toHaveTextContent("**");
  });

  it("keeps links safe and converts markdown bullets to readable bullets", () => {
    render(<p><ChatText text={"- View pricing: https://meettomanage.cloud/pricing."} /></p>);

    expect(screen.getByText(/• View pricing:/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "meettomanage.cloud/pricing" })).toHaveAttribute("href", "https://meettomanage.cloud/pricing");
  });
});
