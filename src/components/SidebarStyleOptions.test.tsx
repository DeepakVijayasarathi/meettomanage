import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { SidebarStyleOptions } from "./SidebarStyleOptions";
import { getSidebarStyle } from "@/lib/sidebarStyle";

describe("SidebarStyleOptions", () => {
  beforeEach(() => localStorage.clear());

  it("defaults to Classic and shows all four styles", () => {
    render(<SidebarStyleOptions />);
    expect(screen.getAllByRole("button")).toHaveLength(4);
    expect(screen.getByText("Classic").closest("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("saves the chosen style and marks it selected", () => {
    render(<SidebarStyleOptions />);
    fireEvent.click(screen.getByText("Brand"));
    expect(getSidebarStyle()).toBe("brand");
    expect(screen.getByText("Brand").closest("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("ignores an invalid or retired stored value", () => {
    for (const v of ["nonsense", "dark", "compact"]) {
      localStorage.setItem("m2m.sidebarStyle", v);
      expect(getSidebarStyle()).toBe("classic");
    }
  });
});
