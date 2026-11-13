import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import RecordingControl from "./RecordingControl";

const base = {
  serverOn: false,
  serverStarting: false,
  browser: null,
  canChoose: true,
  browserUnavailableReason: null,
  defaultPlace: "browser" as const,
  onStart: vi.fn(),
  onStop: vi.fn(),
};

describe("RecordingControl", () => {
  it("starts where the teacher picks, with the cost of each place shown", () => {
    const onStart = vi.fn();
    render(<RecordingControl {...base} onStart={onStart} />);
    fireEvent.click(screen.getByRole("button", { name: "Recording options" }));
    expect(screen.getByText("No server cost")).toBeTruthy();
    expect(screen.getByText("Uses recording-server time")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: /On the server/ }));
    fireEvent.click(screen.getByRole("button", { name: /Start recording/ }));
    expect(onStart).toHaveBeenCalledWith("server");
  });

  it("says why this computer can't record, and doesn't offer it", () => {
    render(<RecordingControl {...base} defaultPlace="server" browserUnavailableReason="Needs the new class screen." />);
    fireEvent.click(screen.getByRole("button", { name: "Recording options" }));
    expect(screen.getByText("Needs the new class screen.")).toBeTruthy();
    expect((screen.getByRole("radio", { name: /On this computer/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows a live browser recording and offers stop and switch", () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    render(
      <RecordingControl
        {...base}
        onStart={onStart}
        onStop={onStop}
        browser={{ status: "recording", startedAt: Date.now() - 65_000, uploadedBytes: 40 * 1024 * 1024, pendingBytes: 0 }}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Recording on this computer/ }));
    expect(screen.getByText(/40 MB uploaded/)).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: /On the server/ }));
    fireEvent.click(screen.getByRole("button", { name: /Switch to the server/ }));
    expect(onStart).toHaveBeenCalledWith("server");
    fireEvent.click(screen.getByRole("button", { name: /Stop/ }));
    expect(onStop).toHaveBeenCalled();
  });

  it("hides the choice when the academy doesn't allow switching", () => {
    render(<RecordingControl {...base} canChoose={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Recording options" }));
    expect(screen.queryByRole("radio")).toBeNull();
  });
});
