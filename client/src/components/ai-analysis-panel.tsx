import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AIResultDisplay } from "@/components/ai-result-display";
import { EditableChart } from "@/components/editable-chart";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Loader2, FlaskConical, BarChart3, Layers, LineChart, Sparkles, X, MessageSquare, Zap } from "lucide-react";
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
  { id: "analysis",  label: "Analysis",       icon: FlaskConical  },
  { id: "charts",    label: "Chart Generator", icon: LineChart     },
  { id: "topics",    label: "Domains",         icon: Layers        },
  { id: "metrics",   label: "Metrics",         icon: BarChart3     },
  { id: "clusters",  label: "Clusters",        icon: Brain         },
  { id: "chat",      label: "Chat",            icon: MessageSquare },
];

export function AIAnalysisPanel({ corpusId, theme = defaultTheme }: AIAnalysisPanelProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<AiTab>("analysis");
  const [category, setCategory] = useState("All");
  const [analysisType, setAnalysisType] = useState("Translation Strategies");
  const [customInstructions, setCustomInstructions] = useState("");
  const [analysisResult, setAnalysisResult] = useState("");
  const [topicsResult, setTopicsResult] = useState("");
  const [metricsResult, setMetricsResult] = useState("");
  const [clustersResult, setClustersResult] = useState("");
  const [chartPrompt, setChartPrompt] = useState("");
  const [charts, setCharts] = useState<ChartResult[]>([]);
  const [chartIdCounter, setChartIdCounter] = useState(0);

  const allTypes = Object.keys(AI_ANALYSIS_PRESETS);
  const filteredTypes = category === "All"
    ? allTypes
    : AI_ANALYSIS_CATEGORIES.find((c) => c.name === category)?.types || allTypes;

  const analysisMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/analyze", {
        corpusId,
        analysisType,
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
        corpusId,
        analysisType: "Custom",
        customInstructions: "Suggest 5 translation-relevant metrics or observations. Format as a markdown table with columns: Metric | Value | Interpretation",
      });
      return res.json();
    },
    onSuccess: (data) => setMetricsResult(data.result),
  });

  const clustersMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/analyze", {
        corpusId,
        analysisType: "Custom",
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
        toast({ title: "No chart data", description: "AI couldn't generate quantifiable data for this prompt. Try being more specific.", variant: "destructive" });
        return;
      }
      const newId = chartIdCounter + 1;
      setChartIdCounter(newId);
      setCharts(prev => [{ id: newId, title: data.title, data: data.data, prompt }, ...prev]);
      setChartPrompt("");
    },
    onError: (error: any) => toast({ title: "Chart generation failed", description: error.message, variant: "destructive" }),
  });

  const handleChartGenerate = () => {
    if (!chartPrompt.trim()) return;
    chartMutation.mutate(chartPrompt.trim());
  };

  const removeChart = (id: number) => {
    setCharts(prev => prev.filter(c => c.id !== id));
  };

  const hasResult = (tab: AiTab) => {
    if (tab === "analysis") return !!analysisResult;
    if (tab === "topics") return !!topicsResult;
    if (tab === "metrics") return !!metricsResult;
    if (tab === "clusters") return !!clustersResult;
    if (tab === "charts") return charts.length > 0;
    return false;
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-border/50 shadow-lg bg-card">
      {/* Header — gradient background with network dots */}
      <div className={`relative bg-gradient-to-br ${theme.gradient} p-6 overflow-hidden`}>
        {/* Decorative dots grid */}
        <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="ai-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="white" />
            </pattern>
            <pattern id="ai-lines" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="80" y2="80" stroke="white" strokeWidth="0.5" opacity="0.3" />
              <line x1="80" y1="0" x2="0" y2="80" stroke="white" strokeWidth="0.5" opacity="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ai-dots)" />
          <rect width="100%" height="100%" fill="url(#ai-lines)" />
        </svg>

        {/* Glowing orb */}
        <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/10 blur-xl pointer-events-none" />

        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-lg shrink-0">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              AI Insights
            </h2>
            <p className="text-white/70 text-xs mt-0.5 font-medium tracking-wide">Powered by Gemini 2.5 Flash</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5">
            <Zap className="w-3 h-3 text-white/80" />
            <span className="text-[11px] font-semibold text-white/90 tracking-wide">AI</span>
          </div>
        </div>
      </div>

      {/* Custom tab strip */}
      <div className="border-b border-border/50 bg-muted/30 px-4 overflow-x-auto scrollbar-hide" data-testid="tabs-ai-analysis">
        <div className="flex gap-0.5 min-w-max py-1.5">
          {AI_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const done = hasResult(tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                data-testid={`tab-ai-${tab.id}`}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 whitespace-nowrap relative",
                  isActive
                    ? "bg-background text-foreground shadow-sm border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "opacity-100" : "opacity-60")} />
                {tab.label}
                {done && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-1.5 right-1.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-6 space-y-5">
        <AnimatePresence mode="wait">
          {activeTab === "analysis" && (
            <motion.div key="analysis" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-5">
              {/* Form card */}
              <div className="rounded-xl border border-border/50 bg-background p-5 shadow-sm">
                <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-border/40">
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center`}>
                    <FlaskConical className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Specialized Analysis for Translation Studies</h3>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5 mb-5">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1.5 block font-bold uppercase tracking-widest">Category</label>
                      <Select value={category} onValueChange={(v) => { setCategory(v); setAnalysisType(v === "All" ? allTypes[0] : (AI_ANALYSIS_CATEGORIES.find(c => c.name === v)?.types[0] || allTypes[0])); }}>
                        <SelectTrigger data-testid="select-ai-category" className="bg-muted/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All">All Categories</SelectItem>
                          {AI_ANALYSIS_CATEGORIES.map((c) => (
                            <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1.5 block font-bold uppercase tracking-widest">Analysis Type</label>
                      <Select value={analysisType} onValueChange={setAnalysisType}>
                        <SelectTrigger data-testid="select-ai-analysis-type" className="bg-muted/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredTypes.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {AI_ANALYSIS_PRESETS[analysisType] && (
                      <p className="text-xs text-muted-foreground/70 italic leading-relaxed border-l-2 border-border/50 pl-3">
                        {AI_ANALYSIS_PRESETS[analysisType].description}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1.5 block font-bold uppercase tracking-widest">
                      {analysisType === "Custom" ? "Custom Instructions (required)" : "Additional Instructions (optional)"}
                    </label>
                    <Textarea
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      placeholder={analysisType === "Custom" ? "Enter your full analysis prompt here..." : "e.g. Focus on feminist strategies in literary texts..."}
                      className="min-h-[130px] resize-none bg-muted/30 text-sm"
                      data-testid="textarea-ai-instructions"
                    />
                  </div>
                </div>

                <button
                  onClick={() => analysisMutation.mutate()}
                  disabled={analysisMutation.isPending || (analysisType === "Custom" && !customInstructions.trim())}
                  data-testid="button-run-ai-analysis"
                  className={cn(
                    "flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-md",
                    "bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-md"
                  )}
                >
                  {analysisMutation.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Brain className="w-4 h-4" />}
                  {analysisMutation.isPending ? "Analysing…" : "Run Analysis"}
                </button>
              </div>

              {analysisMutation.isPending && (
                <div className="rounded-xl border border-border/40 bg-muted/20 p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center shrink-0`}>
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Running {analysisType}…</p>
                      <p className="text-xs text-muted-foreground">AI is reading your corpus and composing a research-grade analysis</p>
                    </div>
                  </div>
                  <div className="space-y-2">{[100,90,80,70,60].map((w, i) => <Skeleton key={i} className="h-3.5 rounded" style={{ width: `${w}%` }} />)}</div>
                </div>
              )}

              {analysisResult && !analysisMutation.isPending && (
                <motion.div
                  className="rounded-xl border border-border/40 bg-background overflow-hidden shadow-sm"
                  data-testid="card-ai-analysis-result"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className={`h-1 bg-gradient-to-r ${theme.gradient}`} />
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Brain className={`w-4 h-4 ${theme.accent}`} />
                      <h4 className="text-sm font-semibold">{analysisType} — Results</h4>
                    </div>
                    <AIResultDisplay content={analysisResult} onContentChange={setAnalysisResult} downloadFilename={`AI_${analysisType.replace(/\s/g, "_")}`} />
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === "charts" && (
            <motion.div key="charts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-5">
              <div className="rounded-xl border border-border/50 bg-background p-5 shadow-sm">
                <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-border/40">
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center`}>
                    <LineChart className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">AI Chart Generator</h3>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">Describe what to visualize — AI builds an interactive chart from your corpus</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={chartPrompt}
                      onChange={(e) => setChartPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !chartMutation.isPending && handleChartGenerate()}
                      placeholder="e.g. Show the distribution of translation strategies..."
                      className="flex-1 bg-muted/30"
                      data-testid="input-chart-prompt"
                    />
                    <button
                      onClick={handleChartGenerate}
                      disabled={!chartPrompt.trim() || chartMutation.isPending}
                      data-testid="button-generate-chart"
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm shrink-0",
                        `bg-gradient-to-r ${theme.gradient} text-white hover:shadow-md hover:scale-[1.02] active:scale-[0.98]`,
                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      )}
                    >
                      {chartMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Generate
                    </button>
                  </div>

                  <div className="flex gap-1.5 flex-wrap">
                    {CHART_SUGGESTIONS.slice(0, 5).map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setChartPrompt(suggestion)}
                        className="text-[11px] px-2.5 py-1 rounded-full border border-border/60 bg-muted/40 hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                        data-testid={`button-chart-suggestion-${suggestion.slice(0, 20).replace(/\s/g, "-").toLowerCase()}`}
                      >
                        <Sparkles className="w-2.5 h-2.5 inline mr-1 opacity-50" />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {chartMutation.isPending && (
                <div className="rounded-xl border border-border/40 bg-muted/20 p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center`}>
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Building visualization…</p>
                      <p className="text-xs text-muted-foreground">AI is analysing corpus data and generating chart values</p>
                    </div>
                  </div>
                  <Skeleton className="h-[240px] w-full rounded-lg" />
                </div>
              )}

              <AnimatePresence mode="popLayout">
                {charts.map((chart) => (
                  <motion.div
                    key={chart.id}
                    className="rounded-xl border border-border/50 bg-background overflow-hidden shadow-sm"
                    initial={{ opacity: 0, y: 20, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.97 }}
                    transition={{ duration: 0.3 }}
                    layout
                  >
                    <div className={`h-1 bg-gradient-to-r ${theme.gradient}`} />
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <Sparkles className={`w-3.5 h-3.5 shrink-0 ${theme.accent}`} />
                          <p className="text-[11px] text-muted-foreground truncate italic" title={chart.prompt}>
                            "{chart.prompt}"
                          </p>
                        </div>
                        <button
                          onClick={() => removeChart(chart.id)}
                          className="text-muted-foreground/40 hover:text-destructive transition-colors shrink-0 p-1 rounded"
                          data-testid={`button-remove-chart-${chart.id}`}
                        >
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
                <div className="rounded-xl border border-dashed border-border/50 bg-muted/10 p-10 text-center">
                  <LineChart className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground mb-1">No charts yet</p>
                  <p className="text-xs text-muted-foreground/60">Describe what you want to visualize, or click a suggestion above</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "topics" && (
            <motion.div key="topics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <SimpleAiSection
                theme={theme}
                icon={Layers}
                title="AI Domain Classification"
                description="AI identifies the thematic domains present in your corpus, their relative weight, and cross-domain relationships relevant to translation research."
                buttonLabel="Classify Domains"
                pendingLabel="Classifying…"
                testId="button-ai-classify-domains"
                isPending={topicsMutation.isPending}
                hasResult={!!topicsResult}
                result={topicsResult}
                onRun={() => topicsMutation.mutate()}
                onResultChange={setTopicsResult}
                downloadFilename="AI_Domain_Classification"
                resultTestId="text-ai-topics-result"
              />
            </motion.div>
          )}

          {activeTab === "metrics" && (
            <motion.div key="metrics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <SimpleAiSection
                theme={theme}
                icon={BarChart3}
                title="AI Comparative Metrics"
                description="AI derives translation-relevant metrics — lexical richness, density, register markers, and more — and presents them as an interpretable research table."
                buttonLabel="Generate Metrics"
                pendingLabel="Calculating…"
                testId="button-ai-generate-metrics"
                isPending={metricsMutation.isPending}
                hasResult={!!metricsResult}
                result={metricsResult}
                onRun={() => metricsMutation.mutate()}
                onResultChange={setMetricsResult}
                downloadFilename="AI_Comparative_Metrics"
                resultTestId="text-ai-metrics-result"
              />
            </motion.div>
          )}

          {activeTab === "clusters" && (
            <motion.div key="clusters" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <SimpleAiSection
                theme={theme}
                icon={Brain}
                title="AI Term Clusters"
                description="AI groups semantically related terms into thematic clusters, revealing the conceptual structure of your corpus and its domain taxonomy."
                buttonLabel="Extract Term Clusters"
                pendingLabel="Clustering…"
                testId="button-ai-extract-clusters"
                isPending={clustersMutation.isPending}
                hasResult={!!clustersResult}
                result={clustersResult}
                onRun={() => clustersMutation.mutate()}
                onResultChange={setClustersResult}
                downloadFilename="AI_Term_Clusters"
                resultTestId="text-ai-clusters-result"
              />
            </motion.div>
          )}

          {activeTab === "chat" && (
            <motion.div key="chat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <div className="rounded-xl border border-border/50 bg-background p-5 shadow-sm">
                <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-border/40">
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center`}>
                    <MessageSquare className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Corpus Chat</h3>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">Ask any research question about your corpus in natural language</p>
                  </div>
                </div>
                <CorpusChat corpusId={corpusId} theme={theme} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SimpleAiSection({
  theme, icon: Icon, title, description, buttonLabel, pendingLabel,
  testId, isPending, hasResult: hasRes, result, onRun, onResultChange,
  downloadFilename, resultTestId,
}: {
  theme: TrackTheme;
  icon: React.ElementType;
  title: string;
  description: string;
  buttonLabel: string;
  pendingLabel: string;
  testId: string;
  isPending: boolean;
  hasResult: boolean;
  result: string;
  onRun: () => void;
  onResultChange: (v: string) => void;
  downloadFilename: string;
  resultTestId: string;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/50 bg-background p-5 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-border/40">
          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center`}>
            <Icon className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
          </div>
        </div>
        <p className="text-xs text-muted-foreground/80 leading-relaxed mb-4">{description}</p>
        <button
          onClick={onRun}
          disabled={isPending}
          data-testid={testId}
          className={cn(
            "flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-md",
            "bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-md"
          )}
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
          {isPending ? pendingLabel : (hasRes ? `Re-run ${buttonLabel}` : buttonLabel)}
        </button>
      </div>

      {isPending && (
        <div className="rounded-xl border border-border/40 bg-muted/20 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center`}>
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            </div>
            <div>
              <p className="text-sm font-semibold">{pendingLabel}</p>
              <p className="text-xs text-muted-foreground">AI is analysing your corpus</p>
            </div>
          </div>
          <div className="space-y-2">{[100,88,76,64,52].map((w, i) => <Skeleton key={i} className="h-3.5 rounded" style={{ width: `${w}%` }} />)}</div>
        </div>
      )}

      {hasRes && !isPending && (
        <motion.div
          className="rounded-xl border border-border/40 bg-background overflow-hidden shadow-sm"
          data-testid={resultTestId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className={`h-1 bg-gradient-to-r ${theme.gradient}`} />
          <div className="p-5">
            <AIResultDisplay content={result} onContentChange={onResultChange} downloadFilename={downloadFilename} />
          </div>
        </motion.div>
      )}
    </div>
  );
}
