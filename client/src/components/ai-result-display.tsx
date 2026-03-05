import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRender } from "@/components/markdown-render";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Pencil, Check, X, Copy, CopyCheck } from "lucide-react";

interface AIResultDisplayProps {
  content: string;
  onContentChange?: (newContent: string) => void;
  downloadFilename?: string;
  collapsedLines?: number;
  className?: string;
}

export function AIResultDisplay({
  content,
  onContentChange,
  downloadFilename = "AI_Results",
  collapsedLines = 12,
  className = "",
}: AIResultDisplayProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);
  const [copied, setCopied] = useState(false);
  const [isLong, setIsLong] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditValue(content);
  }, [content]);

  useEffect(() => {
    const lineCount = content.split("\n").length;
    const charCount = content.length;
    setIsLong(lineCount > collapsedLines || charCount > 800);
  }, [content, collapsedLines]);

  const handleSave = () => {
    if (onContentChange) {
      onContentChange(editValue);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setEditValue(content);
    setEditing(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const collapsedMaxH = `${collapsedLines * 1.7}em`;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-end gap-1">
        {isLong && !editing && (
          <Button
            variant="ghost"
            size="sm"
            className="text-[11px] px-2 gap-1 text-muted-foreground"
            onClick={() => setExpanded(!expanded)}
            data-testid="button-toggle-expand-ai"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Show less" : "Show full"}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="text-[11px] px-2 gap-1 text-muted-foreground"
          onClick={handleCopy}
          data-testid="button-copy-ai"
        >
          {copied ? <CopyCheck className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        {onContentChange && !editing && (
          <Button
            variant="ghost"
            size="sm"
            className="text-[11px] px-2 gap-1 text-muted-foreground"
            onClick={() => { setEditing(true); setExpanded(true); }}
            data-testid="button-edit-ai"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {editing ? (
          <motion.div
            key="edit"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="min-h-[300px] font-mono text-xs resize-y"
              data-testid="textarea-edit-ai-result"
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={handleCancel} data-testid="button-cancel-edit-ai">
                <X className="w-3 h-3 mr-1" />Cancel
              </Button>
              <Button size="sm" onClick={handleSave} data-testid="button-save-edit-ai">
                <Check className="w-3 h-3 mr-1" />Save
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div
              ref={contentRef}
              className={`transition-all duration-300 ${
                !expanded && isLong ? "overflow-hidden" : ""
              }`}
              style={!expanded && isLong ? { maxHeight: collapsedMaxH } : undefined}
            >
              <MarkdownRender content={content} downloadFilename={downloadFilename} />
            </div>
            {!expanded && isLong && (
              <div className="relative -mt-10 h-10 bg-gradient-to-t from-background to-transparent pointer-events-none" />
            )}
            {isLong && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 mx-auto mt-1 text-xs font-medium text-muted-foreground"
                data-testid="button-expand-collapse-ai"
              >
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {expanded ? "Show less" : "Show full result"}
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
