import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AIResultDisplay } from "@/components/ai-result-display";
import { EditableChart } from "@/components/editable-chart";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Loader2, FlaskConical, BarChart3, Layers, LineChart, Sparkles, X, MessageSquare } from "lucide-react";
import { CorpusChat } from "@/components/corpus-chat";
import { AI_ANALYSIS_CATEGORIES, AI_ANALYSIS_PRESETS } from "@shared/schema";
import { cn } from "@/lib/utils";

interface TrackTheme {
  gradient: string;
  accent: string;
  text: string;
}

interface AIAnalysisPanelProps {
  corpusId: string;
  theme?: TrackTheme;
}

interface ChartResult {
  id: number;
  title: string;
  data: { label: string; value: number }[];
  prompt: string;
}

const defaultTheme: TrackTheme = {
  gradient: "from-purple-500 to-violet-600",
  accent: "text-purple-500",
  text: "text-purple-600 dark:text-purple-400",
};

const CHART_SUGGESTIONS = [
  "Word frequency distribution by category",
  "Most frequent content words",
  "Sentence length distribution",
  "Register and formality levels",
  "Topic distribution across the corpus",
  "Parts of speech distribution",
  "Translation strategy frequency",
  "Domain-specific term density",
  "Lexical diversity by section",
  "Semantic field distribution",
];

type AiTab = "analysis" | "charts" | "topics" | "metrics" | "clusters" | "chat";

const AI_TABS: { id: AiTab; label: string; icon: React.ElementType }[] = [
  { id: "analysis",  label: "Analysis",        icon: FlaskConical  },
  { id: "charts",    label: "Chart Generator",  icon: LineChart     },
  { id: "topics",    label: "Domains",          icon: Layers        },
  { id: "metrics",   label: "Metrics",          icon: BarChart3     },
  { id: "clusters",  label: "Clusters",         icon: Brain         },
  { id: "chat",      label: "Chat",             icon: MessageSquare },
];

export function AIAnalysisPanel({ corpusId, theme = defaultTheme }: AIAnalysisPanelProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<AiTab>("analysis");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["All"]);
  const [selectedAnalysisTypes, setSelectedAnalysisTypes] = useState<string[]>(["Translation Strategies"]);
  const [customInstructions, setCustomInstructions] = useState("");
  const [analysisResult, setAnalysisResult] = useState("");
  const [topicsResult, setTopicsResult] = useState("");
  const [metricsResult, setMetricsResult] = useState("");
  const [clustersResult, setClustersResult] = useState("");
  const [chartPrompt, setChartPrompt] = useState("");
  const [charts, setCharts] = useState<ChartResult[]>([]);
  const [chartIdCounter, setChartIdCounter] = useState(0);

  const allTypes = Object.keys(AI_ANALYSIS_PRESETS);

  const isCustomMode = selectedCategories.includes("None");
  const filteredTypes = isCustomMode
    ? []
    : selectedCategories.includes("All") || selectedCategories.length === 0
      ? allTypes
      : AI_ANALYSIS_CATEGORIES
          .filter(c => selectedCategories.includes(c.name))
          .flatMap(c => c.types)
          .filter((t, i, arr) => arr.indexOf(t) === i);

  const toggleCategory = (cat: string) => {
    if (cat === "All") {
      setSelectedCategories(["All"]);
      setSelectedAnalysisTypes([allTypes[0]]);
      return;
    }
    if (cat === "None") {
      setSelectedCategories(["None"]);
      setSelectedAnalysisTypes(["Custom"]);
      return;
    }
    setSelectedCategories(prev => {
      const base = prev.filter(c => c !== "All" && c !== "None");
      const next = base.includes(cat) ? base.filter(c => c !== cat) : [...base, cat];
      if (next.length === 0) { setSelectedAnalysisTypes([allTypes[0]]); return ["All"]; }
      const available = AI_ANALYSIS_CATEGORIES.filter(c => next.includes(c.name)).flatMap(c => c.types);
      setSelectedAnalysisTypes(prev2 => {
        const kept = prev2.filter(t => available.includes(t));
        return kept.length > 0 ? kept : [available[0] || allTypes[0]];
      });
      return next;
    });
  };

  const toggleAnalysisType = (type: string) => {
    setSelectedAnalysisTypes(prev => {
      const next = prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type];
      return next.length === 0 ? [type] : next;
    });
  };

  const analysisMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/analyze", {
        corpusId,
        analysisTypes: selectedAnalysisTypes,
        customInstructions: customInstructions || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => setAnalysisResult(data.result),
    onError: () => toast({ title: "Analysis failed", variant: "destructive" }),
  });

  const topicsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/topics", { corpusId });
      return res.json();
    },
    onSuccess: (data) => setTopicsResult(data.result),
  });

  const metricsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/analyze", {
        corpusId, analysisType: "Custom",
        customInstructions: "Suggest 5 translation-relevant metrics or observations. Format as a markdown table with columns: Metric | Value | Interpretation",
      });
      return res.json();
    },
    onSuccess: (data) => setMetricsResult(data.result),
  });

  const clustersMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/analyze", {
        corpusId, analysisType: "Custom",
        customInstructions: "Extract 8-10 term clusters from this text. For each cluster provide: ClusterName | Terms (comma-separated) | Domain. Format as a markdown table.",
      });
      return res.json();
    },
    onSuccess: (data) => setClustersResult(data.result),
  });

  const chartMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const res = await apiRequest("POST", "/api/ai/chart", { corpusId, prompt });
      return res.json();
    },
    onSuccess: (data, prompt) => {
      if (!data.title || !Array.isArray(data.data) || data.data.length === 0) {
        toast({ title: "No chart data", description: "AI couldn't generate quantifiable data. Try a more specific prompt.", variant: "destructive" });
        return;
      }
      const newId = chartIdCounter + 1;
      setChartIdCounter(newId);
      setCharts(prev => [{ id: newId, title: data.title, data: data.data, prompt }, ...prev]);
      setChartPrompt("");
    },
    onError: (err: any) => toast({ title: "Chart generation failed", description: err.message, variant: "destructive" }),
  });

  const hasResult = (tab: AiTab) => {
    if (tab === "analysis") return !!analysisResult;
    if (tab === "topics") return !!topicsResult;
    if (tab === "metrics") return !!metricsResult;
    if (tab === "clusters") return !!clustersResult;
    if (tab === "charts") return charts.length > 0;
    return false;
  };

  return (
    /* ── Outer shell: light bg + subtle dot network ── */
    <div className="relative rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/50 shadow-lg">

      {/* Dot-grid background */}
      <svg aria-hidden className="absolute inset-0 w-full h-full pointer-events-none select-none opacity-[0.35] dark:opacity-[0.12]">
        <defs>
          <pattern id="aipanel-dots" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1.5" className="fill-slate-300 dark:fill-slate-600" />
          </pattern>
          <pattern id="aipanel-lines" width="110" height="110" patternUnits="userSpaceOnUse">
            <line x1="0" y1="55" x2="55" y2="0" stroke="currentColor" strokeWidth="0.6" className="text-slate-300 dark:text-slate-600" opacity="0.5" />
            <line x1="55" y1="110" x2="110" y2="55" stroke="currentColor" strokeWidth="0.6" className="text-slate-300 dark:text-slate-600" opacity="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#aipanel-dots)" />
        <rect width="100%" height="100%" fill="url(#aipanel-lines)" />
      </svg>

      <div className="relative">
        {/* ── Header ── */}
        <div className="flex items-center gap-3.5 px-6 pt-5 pb-4">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center shadow-md shrink-0`}>
            <Brain className="w-5.5 h-5.5 text-white w-[22px] h-[22px]" />
          </div>
          <div>
            <h2
              className={cn("text-xl font-bold tracking-tight", theme.text)}
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              AI Insights
            </h2>
          </div>
        </div>

        {/* ── Tab strip ── */}
        <div className="px-4 pb-0" data-testid="tabs-ai-analysis">
          <div className="flex gap-0.5 overflow-x-auto scrollbar-hide">
            {AI_TABS.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              const done = hasResult(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  data-testid={`tab-ai-${id}`}
                  className={cn(
                    "relative flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium rounded-t-xl transition-all duration-150 whitespace-nowrap border border-transparent",
                    active
                      ? "bg-white dark:bg-slate-800 text-foreground border-slate-200 dark:border-slate-600 border-b-white dark:border-b-slate-800 shadow-sm -mb-px z-10"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-slate-800/60"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5 shrink-0", active ? "opacity-100" : "opacity-50")} />
                  {label}
                  {done && !active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-1.5 right-1.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Content card ── */}
        <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-600 mx-0 rounded-b-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="p-6 space-y-5"
            >
              {/* ── ANALYSIS TAB ── */}
              {activeTab === "analysis" && (
                <div className="space-y-5">
                  {/* Section header */}
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center shadow-sm shrink-0`}>
                      <FlaskConical className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">Specialized Analysis for Translation Studies</h3>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Left col */}
                    <div className="space-y-4">
                      {/* Category chips */}
                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2.5 block">
                          Category
                          <span className="ml-1.5 text-[10px] font-normal normal-case tracking-normal text-slate-400 dark:text-slate-500">— pick one or more</span>
                        </label>
                        <div className="flex flex-wrap gap-1.5" data-testid="category-chips">
                          {/* All */}
                          <button
                            type="button"
                            onClick={() => toggleCategory("All")}
                            data-testid="chip-category-all"
                            className={cn(
                              "px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all duration-150",
                              selectedCategories.includes("All")
                                ? `bg-gradient-to-r ${theme.gradient} text-white border-transparent shadow-sm`
                                : "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300 hover:text-foreground"
                            )}
                          >All</button>

                          {AI_ANALYSIS_CATEGORIES.map((c) => {
                            const on = selectedCategories.includes(c.name);
                            return (
                              <button
                                key={c.name}
                                type="button"
                                onClick={() => toggleCategory(c.name)}
                                data-testid={`chip-category-${c.name.replace(/\s+/g, "-").toLowerCase()}`}
                                className={cn(
                                  "px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all duration-150",
                                  on
                                    ? `bg-gradient-to-r ${theme.gradient} text-white border-transparent shadow-sm`
                                    : "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300 hover:text-foreground"
                                )}
                              >{c.name}</button>
                            );
                          })}

                          {/* None / custom */}
                          <button
                            type="button"
                            onClick={() => toggleCategory("None")}
                            data-testid="chip-category-none"
                            className={cn(
                              "px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all duration-150",
                              isCustomMode
                                ? "bg-amber-500 text-white border-transparent shadow-sm"
                                : "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:border-slate-300 hover:text-foreground"
                            )}
                          >None · write my own</button>
                        </div>

                        {/* Selection summary */}
                        {!isCustomMode && !selectedCategories.includes("All") && selectedCategories.length > 0 && (
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                            Showing {filteredTypes.length} type{filteredTypes.length !== 1 ? "s" : ""} from {selectedCategories.length} selected categor{selectedCategories.length !== 1 ? "ies" : "y"}
                          </p>
                        )}
                      </div>

                      {/* Analysis Type chips — hidden in custom mode */}
                      {!isCustomMode && (
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2.5 block">
                            Analysis Type
                            <span className="ml-1.5 text-[10px] font-normal normal-case tracking-normal text-slate-400 dark:text-slate-500">— pick one or more</span>
                          </label>
                          <div className="flex flex-wrap gap-1.5" data-testid="analysis-type-chips">
                            {filteredTypes.map((t) => {
                              const on = selectedAnalysisTypes.includes(t);
                              return (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => toggleAnalysisType(t)}
                                  data-testid={`chip-type-${t.replace(/\s+/g, "-").toLowerCase()}`}
                                  className={cn(
                                    "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all duration-150",
                                    on
                                      ? `bg-gradient-to-r ${theme.gradient} text-white border-transparent shadow-sm`
                                      : "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300 hover:text-foreground"
                                  )}
                                >{t}</button>
                              );
                            })}
                          </div>
                          {selectedAnalysisTypes.length > 1 && (
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                              {selectedAnalysisTypes.length} types selected — AI will address each in a structured multi-focus response.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Custom mode hint */}
                      {isCustomMode && (
                        <div className="rounded-xl border border-dashed border-amber-200 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-900/10 px-4 py-3">
                          <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                            No preset selected — AI will run exactly the analysis you describe in the instructions box.
                          </p>
                        </div>
                      )}

                      {/* Preset description — only when exactly one type is selected */}
                      {!isCustomMode && selectedAnalysisTypes.length === 1 && AI_ANALYSIS_PRESETS[selectedAnalysisTypes[0]] && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic leading-relaxed">
                          {AI_ANALYSIS_PRESETS[selectedAnalysisTypes[0]].description}
                        </p>
                      )}
                    </div>

                    {/* Right col */}
                    <div>
                      {(() => {
                        const needsInstructions = isCustomMode || selectedAnalysisTypes.includes("Custom");
                        return (
                          <>
                            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 block">
                              {isCustomMode
                                ? "Your Analysis Instructions (required)"
                                : selectedAnalysisTypes.includes("Custom")
                                  ? "Custom Instructions (required)"
                                  : "Additional Instructions (optional)"}
                            </label>
                            <Textarea
                              value={customInstructions}
                              onChange={(e) => setCustomInstructions(e.target.value)}
                              placeholder={
                                isCustomMode
                                  ? "Describe exactly what you want AI to analyse — e.g. 'Identify all passive constructions and explain their effect on formality level.'"
                                  : selectedAnalysisTypes.includes("Custom")
                                    ? "Enter your full analysis prompt here..."
                                    : "e.g. Focus on feminist strategies in literary texts..."
                              }
                              className={cn(
                                "resize-none bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 rounded-xl text-sm",
                                needsInstructions ? "min-h-[178px]" : "min-h-[148px]",
                                needsInstructions && !customInstructions.trim() && "border-amber-300 dark:border-amber-600"
                              )}
                              data-testid="textarea-ai-instructions"
                            />
                            {needsInstructions && !customInstructions.trim() && (
                              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5 font-medium">Instructions are required when no preset is selected.</p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* CTA */}
                  {(() => {
                    const needsInstructions = isCustomMode || selectedAnalysisTypes.includes("Custom");
                    const analysisLabel = isCustomMode
                      ? "Custom"
                      : selectedAnalysisTypes.length === 1
                        ? selectedAnalysisTypes[0]
                        : `${selectedAnalysisTypes.length} Types`;
                    const filenameLabel = analysisLabel.replace(/\s/g, "_");
                    return (
                      <>
                        <button
                          onClick={() => analysisMutation.mutate()}
                          disabled={analysisMutation.isPending || (needsInstructions && !customInstructions.trim())}
                          data-testid="button-run-ai-analysis"
                          className={cn(
                            "flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-semibold transition-all duration-200",
                            "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md",
                            "hover:shadow-lg hover:from-emerald-400 hover:to-teal-400 hover:scale-[1.02] active:scale-[0.98]",
                            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-md"
                          )}
                        >
                          {analysisMutation.isPending
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Brain className="w-4 h-4" />}
                          {analysisMutation.isPending ? "Analysing…" : "Run Analysis"}
                        </button>

                        {/* Loading */}
                        {analysisMutation.isPending && (
                          <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 p-5">
                            <div className="flex items-center gap-3 mb-4">
                              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center`}>
                                <Loader2 className="w-4 h-4 text-white animate-spin" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold">Running {analysisLabel}…</p>
                                <p className="text-xs text-muted-foreground">Composing a research-grade analysis</p>
                              </div>
                            </div>
                            <div className="space-y-2">{[100,88,75,63,50].map((w, i) => <Skeleton key={i} className="h-3 rounded-full" style={{ width: `${w}%` }} />)}</div>
                          </div>
                        )}

                        {/* Result */}
                        {analysisResult && !analysisMutation.isPending && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden"
                            data-testid="card-ai-analysis-result"
                          >
                            <div className={`h-1 bg-gradient-to-r ${theme.gradient}`} />
                            <div className="p-5 bg-slate-50/50 dark:bg-slate-700/30">
                              <div className="flex items-center gap-2 mb-4">
                                <Brain className={`w-4 h-4 ${theme.accent}`} />
                                <span className="text-sm font-semibold">{analysisLabel} — Results</span>
                              </div>
                              <AIResultDisplay content={analysisResult} onContentChange={setAnalysisResult} downloadFilename={`AI_${filenameLabel}`} />
                            </div>
                          </motion.div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* ── CHART GENERATOR TAB ── */}
              {activeTab === "charts" && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center shadow-sm`}>
                      <LineChart className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">AI Chart Generator</h3>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">Describe what to visualize — AI builds an interactive chart</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={chartPrompt}
                        onChange={(e) => setChartPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !chartMutation.isPending && chartMutation.mutate(chartPrompt.trim())}
                        placeholder="e.g. Show the distribution of translation strategies..."
                        className="flex-1 bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 rounded-xl h-11"
                        data-testid="input-chart-prompt"
                      />
                      <button
                        onClick={() => chartPrompt.trim() && chartMutation.mutate(chartPrompt.trim())}
                        disabled={!chartPrompt.trim() || chartMutation.isPending}
                        data-testid="button-generate-chart"
                        className={cn(
                          "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shrink-0 transition-all duration-200",
                          `bg-gradient-to-r ${theme.gradient} text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]`,
                          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        )}
                      >
                        {chartMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        Generate
                      </button>
                    </div>

                    <div className="flex gap-1.5 flex-wrap">
                      {CHART_SUGGESTIONS.slice(0, 5).map((s) => (
                        <button
                          key={s}
                          onClick={() => setChartPrompt(s)}
                          className="text-[11px] px-3 py-1 rounded-full border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400 hover:text-foreground transition-colors"
                          data-testid={`button-chart-suggestion-${s.slice(0, 20).replace(/\s/g, "-").toLowerCase()}`}
                        >
                          <Sparkles className="w-2.5 h-2.5 inline mr-1 opacity-50" />
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {chartMutation.isPending && (
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center`}>
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">Building chart…</p>
                          <p className="text-xs text-muted-foreground">Generating visualization data from corpus</p>
                        </div>
                      </div>
                      <Skeleton className="h-[220px] w-full rounded-xl" />
                    </div>
                  )}

                  <AnimatePresence mode="popLayout">
                    {charts.map((chart) => (
                      <motion.div
                        key={chart.id}
                        className="rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden"
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                        layout
                      >
                        <div className={`h-1 bg-gradient-to-r ${theme.gradient}`} />
                        <div className="p-5 bg-slate-50/30 dark:bg-slate-700/20">
                          <div className="flex items-center justify-between mb-4">
                            <p className="text-[11px] text-muted-foreground italic truncate flex items-center gap-1.5">
                              <Sparkles className={`w-3 h-3 shrink-0 ${theme.accent}`} />
                              "{chart.prompt}"
                            </p>
                            <button onClick={() => setCharts(p => p.filter(c => c.id !== chart.id))} className="text-muted-foreground/40 hover:text-destructive transition-colors p-1 ml-2" data-testid={`button-remove-chart-${chart.id}`}>
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div data-testid={`chart-ai-generated-${chart.id}`}>
                            <EditableChart data={chart.data} defaultTitle={chart.title} layout="horizontal" />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {charts.length === 0 && !chartMutation.isPending && (
                    <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-700/20 p-10 text-center">
                      <LineChart className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-sm font-medium text-muted-foreground mb-1">No charts yet</p>
                      <p className="text-xs text-muted-foreground/60">Describe what you want to visualize or pick a suggestion above</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── DOMAINS TAB ── */}
              {activeTab === "topics" && (
                <SimpleSection theme={theme} icon={Layers} title="AI Domain Classification"
                  description="AI identifies the thematic domains present in your corpus, their relative weight, and cross-domain relationships relevant to translation research."
                  buttonLabel="Classify Domains" pendingLabel="Classifying…"
                  testId="button-ai-classify-domains" isPending={topicsMutation.isPending}
                  result={topicsResult} onRun={() => topicsMutation.mutate()}
                  onResultChange={setTopicsResult} downloadFilename="AI_Domain_Classification"
                  resultTestId="text-ai-topics-result" />
              )}

              {/* ── METRICS TAB ── */}
              {activeTab === "metrics" && (
                <SimpleSection theme={theme} icon={BarChart3} title="AI Comparative Metrics"
                  description="AI derives translation-relevant metrics — lexical richness, density, register markers, and more — and presents them as a research table."
                  buttonLabel="Generate Metrics" pendingLabel="Calculating…"
                  testId="button-ai-generate-metrics" isPending={metricsMutation.isPending}
                  result={metricsResult} onRun={() => metricsMutation.mutate()}
                  onResultChange={setMetricsResult} downloadFilename="AI_Comparative_Metrics"
                  resultTestId="text-ai-metrics-result" />
              )}

              {/* ── CLUSTERS TAB ── */}
              {activeTab === "clusters" && (
                <SimpleSection theme={theme} icon={Brain} title="AI Term Clusters"
                  description="AI groups semantically related terms into thematic clusters, revealing the conceptual structure of your corpus and its domain taxonomy."
                  buttonLabel="Extract Term Clusters" pendingLabel="Clustering…"
                  testId="button-ai-extract-clusters" isPending={clustersMutation.isPending}
                  result={clustersResult} onRun={() => clustersMutation.mutate()}
                  onResultChange={setClustersResult} downloadFilename="AI_Term_Clusters"
                  resultTestId="text-ai-clusters-result" />
              )}

              {/* ── CHAT TAB ── */}
              {activeTab === "chat" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center shadow-sm`}>
                      <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">Corpus Chat</h3>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">Ask any research question about your corpus in natural language</p>
                    </div>
                  </div>
                  <CorpusChat corpusId={corpusId} theme={theme} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ── Reusable single-action section (Domains / Metrics / Clusters) ── */
function SimpleSection({
  theme, icon: Icon, title, description,
  buttonLabel, pendingLabel, testId,
  isPending, result, onRun, onResultChange,
  downloadFilename, resultTestId,
}: {
  theme: TrackTheme; icon: React.ElementType;
  title: string; description: string;
  buttonLabel: string; pendingLabel: string; testId: string;
  isPending: boolean; result: string;
  onRun: () => void; onResultChange: (v: string) => void;
  downloadFilename: string; resultTestId: string;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center shadow-sm shrink-0`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground/70 mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>

      <button
        onClick={onRun}
        disabled={isPending}
        data-testid={testId}
        className={cn(
          "flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-semibold transition-all duration-200",
          "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md",
          "hover:shadow-lg hover:from-emerald-400 hover:to-teal-400 hover:scale-[1.02] active:scale-[0.98]",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-md"
        )}
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
        {isPending ? pendingLabel : (result ? `Re-run ${buttonLabel}` : buttonLabel)}
      </button>

      {isPending && (
        <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center`}>
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            </div>
            <div>
              <p className="text-sm font-semibold">{pendingLabel}</p>
              <p className="text-xs text-muted-foreground">AI is analysing your corpus</p>
            </div>
          </div>
          <div className="space-y-2">{[100,87,73,60,48].map((w, i) => <Skeleton key={i} className="h-3 rounded-full" style={{ width: `${w}%` }} />)}</div>
        </div>
      )}

      {result && !isPending && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden"
          data-testid={resultTestId}
        >
          <div className={`h-1 bg-gradient-to-r ${theme.gradient}`} />
          <div className="p-5 bg-slate-50/50 dark:bg-slate-700/30">
            <AIResultDisplay content={result} onContentChange={onResultChange} downloadFilename={downloadFilename} />
          </div>
        </motion.div>
      )}
    </div>
  );
}
