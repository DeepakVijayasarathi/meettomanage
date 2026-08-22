import { useRef, useState } from "react";
import { FileCheck2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  label?: string;
  hint?: string;
  accept?: string;
  onFile?: (file: File) => void;
  className?: string;
}

/**
 * Mirrors the backend's real allowlist (S3FileStorage.AllowedExtensions /
 * LocalFileStorage.AllowedExtensions) and its 100MB cap (ResourcesController.MaxUploadBytes) —
 * three different hardcoded, three different wrong hints ("PDF, PNG, JPG up to 10MB", "...25MB",
 * "...50MB") used to understate what actually works, discouraging file types and sizes the
 * server accepts fine. Single default here instead of a per-screen override, so there's one
 * string to keep in sync instead of three.
 */
export const DEFAULT_UPLOAD_HINT =
  "PDF, Word, PowerPoint, Excel, TXT, images (JPG/PNG/GIF/WEBP), video (MP4/WEBM/MOV), audio (MP3/WAV) or ZIP — up to 100MB";

export function FileDropzone({ label = "Drag & drop or click to upload", hint = DEFAULT_UPLOAD_HINT, accept, onFile, className }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) {
      setFileName(file.name);
      onFile?.(file);
    }
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      // The real control is the hidden <input type="file"> below — without these, this
      // div (and the file picker it opens) was unreachable by keyboard entirely, on every
      // screen where it's the only way to attach a file (e.g. admin/teacher Resources).
      role="button"
      tabIndex={0}
      aria-label={fileName ? `${fileName} selected. Click or press Enter to choose a different file.` : label}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40",
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <span className={cn("flex h-11 w-11 items-center justify-center rounded-full", fileName ? "bg-success/15 text-success" : "bg-primary/10 text-primary")}>
        {fileName ? <FileCheck2 className="h-5 w-5" /> : <UploadCloud className="h-5 w-5" />}
      </span>
      <p className="text-sm font-semibold text-foreground">{fileName ?? label}</p>
      {!fileName && <p className="text-xs text-muted-foreground">{hint}</p>}
      {fileName && <p className="text-xs text-success">Ready to upload</p>}
    </div>
  );
}
