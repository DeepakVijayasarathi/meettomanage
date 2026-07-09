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

export function FileDropzone({ label = "Drag & drop or click to upload", hint = "PDF, PNG, JPG up to 10MB", accept, onFile, className }: FileDropzoneProps) {
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
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
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
