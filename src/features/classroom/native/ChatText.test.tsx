import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ChatText } from "./NativeStage";

describe("ChatText", () => {
  it("links http(s) URLs only, without trailing punctuation", () => {
    const { container } = render(<ChatText text={"Worksheet: https://example.com/a?b=1. Not javascript:alert(1) or www.x.com"} />);
    const links = container.querySelectorAll("a");
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute("href")).toBe("https://example.com/a?b=1");
    expect(links[0].getAttribute("rel")).toBe("noopener noreferrer");
    expect(container.textContent).toBe("Worksheet: https://example.com/a?b=1. Not javascript:alert(1) or www.x.com");
  });
});
