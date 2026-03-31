import { useCallback, useState, useId } from "react";
import { Upload, FileText, X, FileSpreadsheet, FileType } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
  description?: string;
}

export function FileUpload({
  onFilesSelected,
  accept = ".txt,.docx,.pdf,.xlsx,.xls",
  multiple = true,
  label = "Upload corpus files",
  description = "Supports TXT, DOCX, PDF, Excel",
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const uniqueId = useId();
  const inputId = `file-input-${uniqueId.replace(/:/g, "")}`;

  const handleFiles = useCallback(
    (newFiles: FileList | null) => {
      if (!newFiles) return;
      const arr = Array.from(newFiles);
      setFiles((prev) => {
        const updated = [...prev, ...arr];
        onFilesSelected(updated);
        return updated;
      });
    },
    [onFilesSelected]
  );

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      onFilesSelected(updated);
      return updated;
    });
  };

  const getFileIcon = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext === "xlsx" || ext === "xls") return FileSpreadsheet;
    if (ext === "pdf" || ext === "docx") return FileType;
    return FileText;
  };

  return (
    <div className="space-y-3">
      <div
        className={`upload-zone ${isDragging ? "dragging" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => document.getElementById(inputId)?.click()}
        data-testid="dropzone-upload"
      >
        <input
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
          data-testid="input-file"
        />
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/12 to-primary/6 flex items-center justify-center mx-auto mb-4 border border-primary/10">
          <Upload className="w-6 h-6 text-primary/50" />
        </div>
        <p className="text-sm font-semibold tracking-tight">{label}</p>
        <p className="text-[11px] text-muted-foreground/50 mt-1.5">{description}</p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => {
            const FileIcon = getFileIcon(file.name);
            return (
              <div
                key={`${file.name}-${i}`}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-muted/40 to-muted/20 text-sm border border-border/30 group hover:border-primary/20 transition-all duration-200"
                data-testid={`file-item-${i}`}
              >
                <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0">
                  <FileIcon className="w-4 h-4 text-primary/50" />
                </div>
                <span className="flex-1 truncate font-medium text-[13px]">{file.name}</span>
                <span className="text-[11px] text-muted-foreground/50 font-mono tabular-nums">
                  {(file.size / 1024).toFixed(0)} KB
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-7 h-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                  data-testid={`button-remove-file-${i}`}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
