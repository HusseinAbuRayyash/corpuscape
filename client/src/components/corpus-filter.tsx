import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, X, Loader2, ArrowRight, Search } from "lucide-react";
import type { CorpusStats } from "@shared/schema";

interface CorpusFilterProps {
  corpusId: string;
  originalStats: CorpusStats;
  onFilterApplied: (filteredCorpusId: string, filteredStats: CorpusStats) => void;
  onFilterCleared: () => void;
  isFiltered: boolean;
  filteredStats?: CorpusStats | null;
  theme?: { gradient: string; accent: string; text: string };
}

const defaultTheme = {
  gradient: "from-indigo-500 to-blue-600",
  accent: "text-indigo-500",
  text: "text-indigo-600 dark:text-indigo-400",
};

export function CorpusFilter({
  corpusId,
  originalStats,
  onFilterApplied,
  onFilterCleared,
  isFiltered,
  filteredStats,
  theme = defaultTheme,
}: CorpusFilterProps) {
  const { toast } = useToast();
  const [filterText, setFilterText] = useState("");
  const [filterMode, setFilterMode] = useState<"include" | "exclude">("include");

  const filterMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/corpus/filter", {
        corpusId,
        filterText: filterText.trim(),
        filterMode,
      });
      return res.json();
    },
    onSuccess: (data) => {
      onFilterApplied(data.corpusId, data.stats);
      toast({
        title: "Filter applied",
        description: `${data.matchedParagraphs} of ${data.totalParagraphs} paragraphs matched — ${data.stats.words.toLocaleString()} words`,
      });
    },
    onError: (error: any) => {
      const msg = error?.message || "Filter returned no results";
      toast({ title: "Filter failed", description: msg, variant: "destructive" });
    },
  });

  const handleApply = () => {
    if (!filterText.trim()) return;
    filterMutation.mutate();
  };

  const handleClear = () => {
    setFilterText("");
    onFilterCleared();
  };

  return (
    <motion.div
      className="polished-card overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={`h-0.5 bg-gradient-to-r ${theme.gradient}`} />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center`}>
            <Filter className="w-3.5 h-3.5 text-white" />
          </div>
          <h4 className={`text-sm font-bold ${theme.text}`}>Filter Corpus</h4>
          {isFiltered && (
            <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider" data-testid="badge-filtered">
              Filtered
            </span>
          )}
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          <Select value={filterMode} onValueChange={(v) => setFilterMode(v as "include" | "exclude")}>
            <SelectTrigger className="w-28 h-8 text-xs" data-testid="select-filter-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="include">Include</SelectItem>
              <SelectItem value="exclude">Exclude</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <Input
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && filterText.trim() && handleApply()}
              placeholder="Keyword or phrase to filter by..."
              className="h-8 text-xs pl-8"
              data-testid="input-filter-text"
            />
          </div>
          <Button
            size="sm"
            onClick={handleApply}
            disabled={!filterText.trim() || filterMutation.isPending}
            className={`h-8 bg-gradient-to-r ${theme.gradient} text-white text-xs`}
            data-testid="button-apply-filter"
          >
            {filterMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Filter className="w-3.5 h-3.5 mr-1.5" />}
            Apply
          </Button>
          {isFiltered && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClear}
              className="h-8 text-xs text-destructive hover:text-destructive"
              data-testid="button-clear-filter"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Clear
            </Button>
          )}
        </div>

        <AnimatePresence>
          {isFiltered && filteredStats && (
            <motion.div
              className="mt-3 flex items-center gap-3 text-xs flex-wrap"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              data-testid="filter-stats-comparison"
            >
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/40">
                <span className="text-muted-foreground font-medium">Original:</span>
                <span className="font-bold tabular-nums">{originalStats.words.toLocaleString()} words</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50" />
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r ${theme.gradient.replace("from-", "from-").replace("to-", "to-")}/10 border border-border/40`}>
                <span className={`${theme.text} font-medium`}>Filtered:</span>
                <span className={`font-bold tabular-nums ${theme.text}`}>{filteredStats.words.toLocaleString()} words</span>
                <span className="text-muted-foreground">
                  ({Math.round((filteredStats.words / originalStats.words) * 100)}%)
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

interface BilingualFilterProps {
  corpusId: string;
  totalPairs: number;
  strategies: string[];
  onFilterApplied: (filteredCorpusId: string, filteredPairs: any[]) => void;
  onFilterCleared: () => void;
  isFiltered: boolean;
  filteredPairCount?: number;
}

export function BilingualFilter({
  corpusId,
  totalPairs,
  strategies,
  onFilterApplied,
  onFilterCleared,
  isFiltered,
  filteredPairCount,
}: BilingualFilterProps) {
  const { toast } = useToast();
  const [filterText, setFilterText] = useState("");
  const [filterField, setFilterField] = useState("both");
  const [filterStrategy, setFilterStrategy] = useState("all");

  const filterMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bilingual/filter", {
        corpusId,
        filterText: filterText.trim() || undefined,
        filterField,
        filterStrategy: filterStrategy !== "all" ? filterStrategy : undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      onFilterApplied(data.corpusId, data.pairs);
      toast({
        title: "Filter applied",
        description: `${data.filteredPairs} of ${data.totalPairs} pairs matched`,
      });
    },
    onError: (error: any) => {
      toast({ title: "Filter failed", description: error?.message || "No results", variant: "destructive" });
    },
  });

  const handleApply = () => {
    if (!filterText.trim() && filterStrategy === "all") return;
    filterMutation.mutate();
  };

  const handleClear = () => {
    setFilterText("");
    setFilterStrategy("all");
    onFilterCleared();
  };

  const uniqueStrategies = [...new Set(strategies.filter(Boolean))];

  return (
    <motion.div
      className="polished-card overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="h-0.5 bg-gradient-to-r from-teal-500 to-emerald-500" />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
            <Filter className="w-3.5 h-3.5 text-white" />
          </div>
          <h4 className="text-sm font-bold text-teal-600 dark:text-teal-400">Filter Pairs</h4>
          {isFiltered && (
            <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider" data-testid="badge-bilingual-filtered">
              Filtered
            </span>
          )}
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          <Select value={filterField} onValueChange={setFilterField}>
            <SelectTrigger className="w-24 h-8 text-xs" data-testid="select-filter-field">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="both">Both</SelectItem>
              <SelectItem value="source">Source</SelectItem>
              <SelectItem value="target">Target</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1 min-w-[140px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <Input
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApply()}
              placeholder="Search in pairs..."
              className="h-8 text-xs pl-8"
              data-testid="input-bilingual-filter-text"
            />
          </div>
          {uniqueStrategies.length > 0 && (
            <Select value={filterStrategy} onValueChange={setFilterStrategy}>
              <SelectTrigger className="w-36 h-8 text-xs" data-testid="select-filter-strategy">
                <SelectValue placeholder="Strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Strategies</SelectItem>
                {uniqueStrategies.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            size="sm"
            onClick={handleApply}
            disabled={(!filterText.trim() && filterStrategy === "all") || filterMutation.isPending}
            className="h-8 bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-xs"
            data-testid="button-apply-bilingual-filter"
          >
            {filterMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Filter className="w-3.5 h-3.5 mr-1.5" />}
            Apply
          </Button>
          {isFiltered && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClear}
              className="h-8 text-xs text-destructive hover:text-destructive"
              data-testid="button-clear-bilingual-filter"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Clear
            </Button>
          )}
        </div>

        <AnimatePresence>
          {isFiltered && filteredPairCount !== undefined && (
            <motion.div
              className="mt-3 flex items-center gap-3 text-xs flex-wrap"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              data-testid="bilingual-filter-stats"
            >
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/40">
                <span className="text-muted-foreground font-medium">Original:</span>
                <span className="font-bold tabular-nums">{totalPairs} pairs</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50" />
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-500/10 border border-border/40">
                <span className="text-teal-600 dark:text-teal-400 font-medium">Filtered:</span>
                <span className="font-bold tabular-nums text-teal-600 dark:text-teal-400">{filteredPairCount} pairs</span>
                <span className="text-muted-foreground">
                  ({Math.round((filteredPairCount / totalPairs) * 100)}%)
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
