import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ban, Plus, X, Upload, Download, Trash2, ChevronDown, ChevronUp, FileText,
} from "lucide-react";

const COMMON_ENGLISH_STOPS = [
  "the", "and", "that", "this", "with", "from", "have", "been", "were", "they",
  "their", "them", "there", "then", "than", "these", "those", "what", "when",
  "where", "which", "while", "will", "would", "could", "should", "about",
  "after", "before", "between", "into", "through", "during", "each", "also",
  "some", "other", "more", "most", "only", "very", "just", "over", "such",
  "both", "even", "back", "like", "well", "also", "much", "being", "does",
  "done", "made", "make", "many", "must", "need", "come", "came", "goes",
  "going", "here", "itself", "said", "same", "shall", "still", "under",
  "upon", "your", "yours", "itself", "myself", "ourselves",
];

const COMMON_ARABIC_STOPS = [
  "في", "من", "على", "إلى", "عن", "هذا", "هذه", "ذلك", "تلك", "التي",
  "الذي", "التي", "الذين", "كان", "كانت", "يكون", "تكون", "بين", "حتى",
  "بعد", "قبل", "أنه", "أنها", "لكن", "ولكن", "ثم", "أيضا", "عند", "كل",
  "بعض", "معظم", "فقط", "مع", "أو", "قد", "لقد", "هو", "هي", "هم", "نحن",
  "أنت", "أنا", "ما", "لا", "لم", "لن", "إذا", "أن", "كما", "وقد",
];

interface StopListManagerProps {
  stopWords: string[];
  onChange: (words: string[]) => void;
  theme?: { gradient: string; text: string };
}

export function StopListManager({ stopWords, onChange, theme }: StopListManagerProps) {
  const [newWord, setNewWord] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gradient = theme?.gradient || "from-indigo-500 to-blue-600";
  const textColor = theme?.text || "text-indigo-600 dark:text-indigo-400";

  const addWord = () => {
    const word = newWord.trim().toLowerCase();
    if (word && !stopWords.includes(word)) {
      onChange([...stopWords, word]);
      setNewWord("");
    }
  };

  const addMultiple = (words: string[]) => {
    const cleaned = words.map(w => w.trim().toLowerCase()).filter(w => w.length > 0 && !stopWords.includes(w));
    if (cleaned.length > 0) {
      onChange([...stopWords, ...cleaned]);
    }
  };

  const removeWord = (word: string) => {
    onChange(stopWords.filter(w => w !== word));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const words = text
      .split(/[\n\r,;\t]+/)
      .map(w => w.trim().toLowerCase().replace(/[^a-zA-Z\u0600-\u06FF\s]/g, "").trim())
      .filter(w => w.length > 1);

    const unique = [...new Set(words)].filter(w => !stopWords.includes(w));
    if (unique.length > 0) {
      onChange([...stopWords, ...unique]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const exportList = () => {
    const blob = new Blob([stopWords.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stoplist.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      className="polished-card overflow-visible"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={`h-0.5 bg-gradient-to-r ${gradient}`} />
      <div className="p-4">
        <button
          type="button"
          className="flex items-center gap-2 w-full text-left"
          onClick={() => setIsExpanded(!isExpanded)}
          data-testid="button-toggle-stoplist"
        >
          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <Ban className="w-3.5 h-3.5 text-white" />
          </div>
          <h4 className={`text-sm font-bold ${textColor} flex-1`}>Stop List</h4>
          {stopWords.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-[10px] font-bold tabular-nums" data-testid="badge-stopword-count">
              {stopWords.length} word{stopWords.length !== 1 ? "s" : ""}
            </span>
          )}
          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <p className="text-[11px] text-muted-foreground/60 mt-2 mb-3">
                Words in the stop list are excluded from keywords, n-grams, collocations, and word cloud results.
              </p>

              <div className="flex gap-2 items-center mb-3">
                <div className="relative flex-1">
                  <Input
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addWord()}
                    placeholder="Type a word to exclude..."
                    className="h-8 text-xs pr-8"
                    data-testid="input-stopword"
                  />
                  {newWord.trim() && (
                    <button
                      type="button"
                      onClick={addWord}
                      className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center ${textColor} hover:bg-muted transition-colors`}
                      data-testid="button-add-stopword"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.csv,.tsv,.list"
                  className="hidden"
                  onChange={handleFileUpload}
                  data-testid="input-stoplist-file"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-upload-stoplist"
                >
                  <Upload className="w-3 h-3 mr-1.5" />
                  Upload
                </Button>
              </div>

              <div className="flex gap-1.5 flex-wrap mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] rounded-lg"
                  onClick={() => addMultiple(COMMON_ENGLISH_STOPS)}
                  data-testid="button-add-english-stops"
                >
                  + English Stop Words
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] rounded-lg"
                  onClick={() => addMultiple(COMMON_ARABIC_STOPS)}
                  data-testid="button-add-arabic-stops"
                >
                  + Arabic Stop Words
                </Button>
                {stopWords.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] rounded-lg"
                      onClick={exportList}
                      data-testid="button-export-stoplist"
                    >
                      <Download className="w-2.5 h-2.5 mr-1" />
                      Export
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] rounded-lg text-destructive hover:text-destructive"
                      onClick={() => onChange([])}
                      data-testid="button-clear-stoplist"
                    >
                      <Trash2 className="w-2.5 h-2.5 mr-1" />
                      Clear All
                    </Button>
                  </>
                )}
              </div>

              {stopWords.length > 0 ? (
                <div className="border border-border/40 rounded-xl p-3 bg-muted/20 max-h-44 overflow-y-auto">
                  <div className="flex gap-1.5 flex-wrap">
                    {stopWords.map((word) => (
                      <span
                        key={word}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-[11px] font-medium border border-red-200/60 dark:border-red-800/40 group hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        data-testid={`tag-stopword-${word}`}
                      >
                        {word}
                        <button
                          type="button"
                          onClick={() => removeWord(word)}
                          className="opacity-50 group-hover:opacity-100 transition-opacity rounded-full hover:bg-red-200 dark:hover:bg-red-800/50 p-0.5"
                          data-testid={`button-remove-stopword-${word}`}
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-border/40 rounded-xl p-4 text-center">
                  <FileText className="w-5 h-5 text-muted-foreground/30 mx-auto mb-1.5" />
                  <p className="text-[11px] text-muted-foreground/50">No stop words added yet. Add words manually, upload a file, or use a preset list.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
