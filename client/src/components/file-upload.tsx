import { useCallback, useState, useId } from "react";
import { Upload, FileText, X } from "lucide-react";
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
          onChange={(e) => handleFiles(e.target.files)}
          data-testid="input-file"
        />
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-3">
          <Upload className="w-5 h-5 text-primary/60" />
        </div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground/60 mt-1">{description}</p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-muted/50 to-muted/30 text-sm border border-border/30 group"
              data-testid={`file-item-${i}`}
            >
              <FileText className="w-4 h-4 text-primary/50 flex-shrink-0" />
              <span className="flex-1 truncate font-medium text-sm">{file.name}</span>
              <span className="text-xs text-muted-foreground/60 font-mono">
                {(file.size / 1024).toFixed(0)}KB
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                data-testid={`button-remove-file-${i}`}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
