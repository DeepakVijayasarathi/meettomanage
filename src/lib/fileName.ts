const EXTENSION_BY_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "audio/mpeg": ".mp3",
  "text/plain": ".txt",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/zip": ".zip",
};

/**
 * A resource is stored under its display title ("Level 1 Module 1"), which has no extension, so a
 * saved copy used to land as a file with no type. Adds the extension the file's MIME type implies,
 * unless the title already ends with it, and strips characters a file system rejects.
 */
export function fileNameFor(title: string, mimeType?: string | null): string {
  const base = title.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim() || "download";
  const extension = EXTENSION_BY_MIME[(mimeType ?? "").split(";")[0].trim().toLowerCase()];
  if (!extension || base.toLowerCase().endsWith(extension)) return base;
  return `${base}${extension}`;
}

/** Types a browser tab can show itself; anything else is better handed over as a download. */
export function isInlineViewable(mimeType?: string | null): boolean {
  const type = (mimeType ?? "").split(";")[0].trim().toLowerCase();
  return type === "application/pdf" || type === "text/plain" || /^(image|video|audio)\//.test(type);
}
