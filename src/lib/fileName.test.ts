import { describe, expect, it } from "vitest";
import { fileNameFor, isInlineViewable } from "@/lib/fileName";

describe("fileNameFor", () => {
  it("adds the extension the MIME type implies", () => {
    expect(fileNameFor("Divij Chawla Invoice", "application/pdf")).toBe("Divij Chawla Invoice.pdf");
    expect(fileNameFor("Slides", "application/vnd.openxmlformats-officedocument.presentationml.presentation")).toBe("Slides.pptx");
  });

  it("does not double an extension the title already has, regardless of case", () => {
    expect(fileNameFor("Worksheet 1.PDF", "application/pdf")).toBe("Worksheet 1.PDF");
  });

  it("ignores MIME parameters and leaves unknown types alone", () => {
    expect(fileNameFor("Notes", "text/plain; charset=utf-8")).toBe("Notes.txt");
    expect(fileNameFor("Mystery", "application/x-unknown")).toBe("Mystery");
    expect(fileNameFor("Mystery", null)).toBe("Mystery");
  });

  it("removes characters a file system rejects and never returns an empty name", () => {
    expect(fileNameFor('Level 1: "Module/2"?', "application/pdf")).toBe("Level 1 Module 2.pdf");
    expect(fileNameFor("///", "application/pdf")).toBe("download.pdf");
  });
});

describe("isInlineViewable", () => {
  it("is true for PDFs, images, video, audio and plain text only", () => {
    expect(isInlineViewable("application/pdf")).toBe(true);
    expect(isInlineViewable("image/png")).toBe(true);
    expect(isInlineViewable("video/mp4")).toBe(true);
    expect(isInlineViewable("text/plain; charset=utf-8")).toBe(true);
    expect(isInlineViewable("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(false);
    expect(isInlineViewable(null)).toBe(false);
  });
});
