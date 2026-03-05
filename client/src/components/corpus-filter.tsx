import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, X, Loader2, ArrowRight, Search, Calendar, Columns3, Check, ChevronDown } from "lucide-react";
import type { CorpusStats } from "@shared/schema";

export interface ColumnMeta {
  headers: string[];
  dateColumns: string[];
  totalRows: number;
}

function InlineColumnPicker({ headers, selected, onChange, expanded, onToggleExpanded, testId }: {
  headers: string[];
  selected: string[];
  onChange: (cols: string[]) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  testId?: string;
}) {
  const allSelected = selected.length === 0;
  const label = allSelected
    ? "All columns"
    : selected.length === 1
      ? (selected[0].length > 18 ? selected[0].slice(0, 18) + "..." : selected[0])
      : `${selected.length} columns`;

  const toggle = (col: string) => {
    if (selected.includes(col)) {
      onChange(selected.filter(c => c !== col));
    } else {
      onChange([...selected, col]);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={onToggleExpanded}
        className="flex items-center gap-1.5 h-8 px-3 text-xs border border-input rounded-md bg-background hover:bg-accent/50 transition-colors min-w-[140px] max-w-[200px]"
        data-testid={testId}
      >
        <Columns3 className="w-3 h-3 text-muted-foreground/60 shrink-0" />
        <span className="truncate flex-1 text-left">{label}</span>
        <ChevronDown className={`w-3 h-3 text-muted-foreground/60 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="w-full mt-3 rounded-xl border border-border/60 bg-muted/20 p-3" data-testid="column-picker-panel">
          <div className="flex items-center gap-3 mb-2.5">
            <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Select columns to search in:</span>
            <button
              type="button"
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
              onClick={() => onChange([])}
              data-testid="button-select-all-columns"
            >
              All columns
            </button>
            <span className="text-muted-foreground/30">|</span>
            <button
              type="button"
              className="text-[11px] text-muted-foreground hover:text-foreground hover:underline font-medium"
              onClick={() => onChange([...headers])}
              data-testid="button-select-every-column"
            >
              Select every column
            </button>
            {selected.length > 0 && (
              <>
                <span className="text-muted-foreground/30">|</span>
                <button
                  type="button"
                  className="text-[11px] text-destructive hover:underline font-medium"
                  onClick={() => onChange([])}
                  data-testid="button-clear-columns"
                >
                  Clear
                </button>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {headers.map(h => (
              <button
                key={h}
                type="button"
                onClick={() => toggle(h)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all border ${
                  selected.length === 0 || selected.includes(h)
                    ? "bg-blue-50 dark:bg-blue-900/25 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50 shadow-sm"
                    : "bg-background hover:bg-muted/60 text-foreground/60 border-border/40 hover:border-border"
                }`}
                data-testid={`column-option-${h.replace(/\s+/g, "-").toLowerCase()}`}
              >
                <div className={`w-3.5 h-3.5 rounded border-[1.5px] flex items-center justify-center shrink-0 transition-colors ${
                  selected.length === 0 || selected.includes(h)
                    ? "bg-blue-500 border-blue-500"
                    : "border-muted-foreground/40"
                }`}>
                  {(selected.length === 0 || selected.includes(h)) && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                {h}
              </button>
            ))}
          </div>
          {selected.length > 0 && (
            <div className="mt-2.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">
              {selected.length} of {headers.length} column{selected.length !== 1 ? "s" : ""} selected
            </div>
          )}
        </div>
      )}
    </>
  );
}

interface CorpusFilterProps {
  corpusId: string;
  originalStats: CorpusStats;
  onFilterApplied: (filteredCorpusId: string, filteredStats: CorpusStats, columns?: ColumnMeta | null) => void;
  onFilterCleared: () => void;
  isFiltered: boolean;
  filteredStats?: CorpusStats | null;
  columns?: ColumnMeta | null;
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
  columns,
  theme = defaultTheme,
}: CorpusFilterProps) {
  const { toast } = useToast();
  const [filterText, setFilterText] = useState("");
  const [filterMode, setFilterMode] = useState<"include" | "exclude">("include");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [columnPickerExpanded, setColumnPickerExpanded] = useState(false);

  const hasColumns = columns && columns.headers.length > 0;
  const hasDateColumns = columns && columns.dateColumns.length > 0;

  const canApply = filterText.trim() || (hasDateColumns && (dateFrom || dateTo));

  const filterMutation = useMutation({
    mutationFn: async () => {
      const body: any = { corpusId, filterMode };
      if (filterText.trim()) body.filterText = filterText.trim();
      if (hasColumns && selectedColumns.length > 0) body.filterColumns = selectedColumns;
      if (dateFrom) body.dateFrom = dateFrom;
      if (dateTo) body.dateTo = dateTo;
      const res = await apiRequest("POST", "/api/corpus/filter", body);
      return res.json();
    },
    onSuccess: (data) => {
      onFilterApplied(data.corpusId, data.stats, data.columns || null);
      const desc = data.matchedParagraphs !== undefined
        ? `${data.matchedParagraphs} of ${data.totalParagraphs} ${hasColumns ? "rows" : "paragraphs"} matched — ${data.stats.words.toLocaleString()} words`
        : `${data.stats.words.toLocaleString()} words in filtered corpus`;
      toast({ title: "Filter applied", description: desc });
    },
    onError: (error: any) => {
      const msg = error?.message || "Filter returned no results";
      toast({ title: "Filter failed", description: msg, variant: "destructive" });
    },
  });

  const handleApply = () => {
    if (!canApply) return;
    filterMutation.mutate();
  };

  const handleClear = () => {
    setFilterText("");
    setSelectedColumns([]);
    setDateFrom("");
    setDateTo("");
    onFilterCleared();
  };

  return (
    <motion.div
      className="polished-card overflow-visible"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={`h-0.5 bg-gradient-to-r ${theme.gradient}`} />
      <div className="p-4 overflow-visible">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center`}>
            <Filter className="w-3.5 h-3.5 text-white" />
          </div>
          <h4 className={`text-sm font-bold ${theme.text}`}>Filter Dataset</h4>
          {hasColumns && (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-medium flex items-center gap-1" data-testid="badge-columns">
              <Columns3 className="w-2.5 h-2.5" />
              {columns!.headers.length} columns
            </span>
          )}
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
          {hasColumns && (
            <InlineColumnPicker
              headers={columns!.headers}
              selected={selectedColumns}
              onChange={setSelectedColumns}
              expanded={columnPickerExpanded}
              onToggleExpanded={() => setColumnPickerExpanded(!columnPickerExpanded)}
              testId="select-filter-columns"
            />
          )}
          <div className="relative flex-1 min-w-[150px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <Input
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canApply && handleApply()}
              placeholder={hasColumns ? "Search in rows..." : "Keyword or phrase to filter by..."}
              className="h-8 text-xs pl-8"
              data-testid="input-filter-text"
            />
          </div>
          <Button
            size="sm"
            onClick={handleApply}
            disabled={!canApply || filterMutation.isPending}
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

        {hasColumns && selectedColumns.length > 0 && (
          <div className="flex gap-1.5 mt-3 flex-wrap items-center">
            <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mr-0.5">Filtering:</span>
            {selectedColumns.map(col => (
              <span
                key={col}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[11px] font-semibold border border-blue-200 dark:border-blue-800/50 shadow-sm"
                data-testid={`tag-column-${col.replace(/\s+/g, "-").toLowerCase()}`}
              >
                <Columns3 className="w-3 h-3 opacity-60" />
                {col.length > 22 ? col.slice(0, 22) + "…" : col}
                <button
                  type="button"
                  onClick={() => setSelectedColumns(selectedColumns.filter(c => c !== col))}
                  className="ml-0.5 hover:text-blue-900 dark:hover:text-blue-100 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800/50 p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {hasDateColumns && (
          <div className="flex gap-2 items-center mt-3 flex-wrap px-1 py-2 rounded-lg bg-muted/30 border border-border/30">
            <Calendar className="w-4 h-4 text-muted-foreground/70 ml-1" />
            <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mr-1">Date/Year:</span>
            <Input
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From (e.g. 2020)"
              className="h-8 text-xs w-36"
              data-testid="input-date-from"
            />
            <span className="text-xs text-muted-foreground font-medium">to</span>
            <Input
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To (e.g. 2025)"
              className="h-8 text-xs w-36"
              data-testid="input-date-to"
            />
            <span className="text-[11px] text-muted-foreground/70 italic">
              ({columns!.dateColumns.join(", ")})
            </span>
          </div>
        )}

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
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r ${theme.gradient}/10 border border-border/40`}>
                <span className={`${theme.text} font-medium`}>Filtered:</span>
                <span className={`font-bold tabular-nums ${theme.text}`}>{filteredStats.words.toLocaleString()} words</span>
                <span className="text-muted-foreground">
                  ({originalStats.words > 0 ? Math.round((filteredStats.words / originalStats.words) * 100) : 0}%)
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
