import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CountUp } from "./fx";

describe("CountUp prerendering", () => {
  it("publishes one final metric value for crawlers and no-JavaScript visitors", () => {
    const html = renderToStaticMarkup(<CountUp to={145} suffix="+" />);
    const container = document.createElement("div");
    container.innerHTML = html;
    const metric = container.firstElementChild;

    expect(metric?.textContent).toBe("145+");
    expect(metric?.hasAttribute("aria-label")).toBe(false);
    expect(metric?.children).toHaveLength(0);
  });
});
