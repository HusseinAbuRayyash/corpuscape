import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { BookMarked, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SaveToLibraryProps {
  type: "monolingual" | "bilingual" | "multilingual";
  sourceTrack: string;
  languagePair?: string;
  domain?: string;
  sizeLabel?: string;
  samplePairs?: any[];
  defaultName?: string;
  accentClass?: string;
}

export function SaveToLibrary({
  type,
  sourceTrack,
  languagePair,
  domain,
  sizeLabel,
  samplePairs,
  defaultName = "",
  accentClass = "from-indigo-500 to-blue-600",
}: SaveToLibraryProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/library/save", {
        name: name.trim() || defaultName || "My Corpus",
        type,
        sourceTrack,
        languagePair: languagePair || null,
        domain: domain || null,
        sizeLabel: sizeLabel || null,
        samplePairs: samplePairs || null,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Saved to Library", description: `"${name || defaultName}" is now in your corpus library.` });
      qc.invalidateQueries({ queryKey: ["/api/library"] });
      setOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="outline"
        onClick={() => { setName(defaultName); setOpen(!open); }}
        className="gap-1.5"
        data-testid="button-save-to-library"
      >
        <BookMarked className="w-3.5 h-3.5" />
        Save to Library
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-10 z-50 w-72 rounded-xl border border-border/60 bg-background shadow-xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${accentClass} flex items-center justify-center`}>
                  <BookMarked className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold">Save to Library</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Corpus name</label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. My Arabic News Corpus"
                className="h-8 text-sm"
                data-testid="input-corpus-name"
                onKeyDown={e => { if (e.key === "Enter") saveMutation.mutate(); }}
              />
            </div>

            {languagePair && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="px-1.5 py-0.5 rounded bg-muted font-mono">{languagePair}</span>
                {domain && <span>· {domain}</span>}
              </div>
            )}

            <Button
              size="sm"
              className={`w-full bg-gradient-to-r ${accentClass} text-white`}
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !name.trim()}
              data-testid="button-confirm-save"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BookMarked className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
