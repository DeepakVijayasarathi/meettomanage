import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const getDatabaseBackups = vi.fn();
const downloadDatabaseBackup = vi.fn();
vi.mock("@/api/monitoring", () => ({
  getDatabaseBackups: () => getDatabaseBackups(),
  downloadDatabaseBackup: (b: unknown) => downloadDatabaseBackup(b),
}));

import { DatabaseBackupsPanel } from "./DatabaseBackupsPanel";

const minutesAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();

describe("DatabaseBackupsPanel", () => {
  beforeEach(() => {
    getDatabaseBackups.mockReset();
    downloadDatabaseBackup.mockReset().mockResolvedValue(undefined);
  });

  it("lists backups and downloads the chosen file", async () => {
    getDatabaseBackups.mockResolvedValue({
      server: "App / API",
      newestScheduledAtUtc: minutesAgo(20),
      fetchedAtUtc: minutesAgo(0),
      backups: [
        { kind: "hourly", folder: "hourly", fileName: "reader_nest_20261008_0615IST.dump", sizeBytes: 4_880_000, createdAtUtc: minutesAgo(20) },
        { kind: "nightly", folder: "", fileName: "reader_nest_20261008_020001.dump", sizeBytes: 4_870_000, createdAtUtc: minutesAgo(300) },
      ],
    });

    render(<DatabaseBackupsPanel />);

    expect(await screen.findByText("reader_nest_20261008_0615IST.dump")).toBeInTheDocument();
    expect(screen.getByText(/Last backup 20m ago/)).toBeInTheDocument();
    expect(screen.getByText("Nightly")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Download reader_nest_20261008_020001.dump" }));
    await waitFor(() =>
      expect(downloadDatabaseBackup).toHaveBeenCalledWith(expect.objectContaining({ folder: "", fileName: "reader_nest_20261008_020001.dump" }))
    );
  });

  it("flags a missed schedule when the newest scheduled backup is over 3 hours old", async () => {
    getDatabaseBackups.mockResolvedValue({
      server: "App / API",
      newestScheduledAtUtc: minutesAgo(240),
      fetchedAtUtc: minutesAgo(0),
      backups: [{ kind: "hourly", folder: "hourly", fileName: "reader_nest_20261008_0215IST.dump", sizeBytes: 1, createdAtUtc: minutesAgo(240) }],
    });

    render(<DatabaseBackupsPanel />);

    expect(await screen.findByText(/Last backup 4h 0m ago/)).toBeInTheDocument();
  });

  it("shows the API's message instead of an empty table when the list can't be loaded", async () => {
    getDatabaseBackups.mockRejectedValue(new Error("SSH is not configured for 'App / API'."));

    render(<DatabaseBackupsPanel />);

    expect(await screen.findByText("SSH is not configured for 'App / API'.")).toBeInTheDocument();
  });
});
