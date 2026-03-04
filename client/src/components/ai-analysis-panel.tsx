import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownRender } from "@/components/markdown-render";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Brain, Loader2, FlaskConical, BarChart3, Layers } from "lucide-react";
import { AI_ANALYSIS_CATEGORIES, AI_ANALYSIS_PRESETS } from "@shared/schema";

interface TrackTheme {
  gradient: string;
  accent: string;
  text: string;
}

interface AIAnalysisPanelProps {
  corpusId: string;
  theme?: TrackTheme;
}

const defaultTheme: TrackTheme = {
  gradient: "from-purple-500 to-violet-600",
  accent: "text-purple-500",
  text: "text-purple-600 dark:text-purple-400",
};

export function AIAnalysisPanel({ corpusId, theme = defaultTheme }: AIAnalysisPanelProps) {
  const { toast } = useToast();
  const [category, setCategory] = useState("All");
  const [analysisType, setAnalysisType] = useState("Translation Strategies");
  const [customInstructions, setCustomInstructions] = useState("");
  const [analysisResult, setAnalysisResult] = useState("");
  const [topicsResult, setTopicsResult] = useState("");
  const [metricsResult, setMetricsResult] = useState("");
  const [clustersResult, setClustersResult] = useState("");

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

  return (
    <div className="space-y-5">
      <motion.div
        className="flex items-center gap-3 mb-1"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center shadow-md`}>
          <Brain className="w-5 h-5 text-white" />
        </div>
        <h3 className={`text-lg font-bold tracking-tight ${theme.text}`} style={{ fontFamily: "'Playfair Display', serif" }}>AI Insights</h3>
      </motion.div>

      <Tabs defaultValue="analysis" className="space-y-5">
        <TabsList data-testid="tabs-ai-analysis">
          <TabsTrigger value="analysis" data-testid="tab-ai-specialized"><FlaskConical className="w-3.5 h-3.5 mr-1.5" />Specialized Analysis</TabsTrigger>
          <TabsTrigger value="topics" data-testid="tab-ai-topics"><Layers className="w-3.5 h-3.5 mr-1.5" />Domain Classification</TabsTrigger>
          <TabsTrigger value="metrics" data-testid="tab-ai-metrics"><BarChart3 className="w-3.5 h-3.5 mr-1.5" />Comparative Metrics</TabsTrigger>
          <TabsTrigger value="clusters" data-testid="tab-ai-clusters"><Brain className="w-3.5 h-3.5 mr-1.5" />Term Clusters</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-5">
          <motion.div className="polished-card p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="section-header">
              <FlaskConical className={`w-4 h-4 ${theme.accent}`} />
              <h3>Specialized Analysis for Translation Studies</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-5 mb-5">
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1.5 block font-medium uppercase tracking-wider">Category</label>
                  <Select value={category} onValueChange={(v) => { setCategory(v); setAnalysisType(v === "All" ? allTypes[0] : (AI_ANALYSIS_CATEGORIES.find(c => c.name === v)?.types[0] || allTypes[0])); }}>
                    <SelectTrigger data-testid="select-ai-category">
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
                  <label className="text-[11px] text-muted-foreground mb-1.5 block font-medium uppercase tracking-wider">Analysis Type</label>
                  <Select value={analysisType} onValueChange={setAnalysisType}>
                    <SelectTrigger data-testid="select-ai-analysis-type">
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
                  <p className="text-xs text-muted-foreground/70 italic leading-relaxed">{AI_ANALYSIS_PRESETS[analysisType].description}</p>
                )}
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1.5 block font-medium uppercase tracking-wider">
                  {analysisType === "Custom" ? "Custom Instructions (required)" : "Additional Instructions (optional)"}
                </label>
                <Textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder={analysisType === "Custom" ? "Enter your full analysis prompt here..." : "e.g. Focus on feminist strategies in literary texts..."}
                  className="min-h-[120px] resize-none"
                  data-testid="textarea-ai-instructions"
                />
              </div>
            </div>
            <Button
              onClick={() => analysisMutation.mutate()}
              disabled={analysisMutation.isPending || (analysisType === "Custom" && !customInstructions.trim())}
              data-testid="button-run-ai-analysis"
            >
              {analysisMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
              Run Analysis
            </Button>
          </motion.div>

          {analysisMutation.isPending && (
            <div className="polished-card p-6">
              <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-4 w-full" />)}</div>
            </div>
          )}
          {analysisResult && (
            <motion.div
              className="polished-card p-6"
              data-testid="card-ai-analysis-result"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="section-header">
                <Brain className={`w-4 h-4 ${theme.accent}`} />
                <h3>{analysisType} — Results</h3>
              </div>
              <div className="p-5 rounded-lg border bg-gradient-to-br from-muted/30 to-transparent">
                <MarkdownRender content={analysisResult} downloadFilename={`AI_${analysisType.replace(/\s/g, "_")}`} />
              </div>
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="topics" className="space-y-4">
          <motion.div className="polished-card p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="section-header">
              <Layers className={`w-4 h-4 ${theme.accent}`} />
              <h3>AI Domain Classification</h3>
            </div>
            <Button
              onClick={() => topicsMutation.mutate()}
              disabled={topicsMutation.isPending}
              data-testid="button-ai-classify-domains"
            >
              {topicsMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Layers className="w-4 h-4 mr-2" />}
              Classify Domains
            </Button>
            {topicsMutation.isPending && <div className="mt-4 space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-4 w-full" />)}</div>}
            {topicsResult && (
              <motion.div
                className="mt-5 p-5 rounded-lg border bg-gradient-to-br from-muted/30 to-transparent"
                data-testid="text-ai-topics-result"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <MarkdownRender content={topicsResult} downloadFilename="AI_Domain_Classification" />
              </motion.div>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <motion.div className="polished-card p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="section-header">
              <BarChart3 className={`w-4 h-4 ${theme.accent}`} />
              <h3>AI Comparative Metrics</h3>
            </div>
            <Button
              onClick={() => metricsMutation.mutate()}
              disabled={metricsMutation.isPending}
              data-testid="button-ai-generate-metrics"
            >
              {metricsMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BarChart3 className="w-4 h-4 mr-2" />}
              Generate Metrics
            </Button>
            {metricsMutation.isPending && <div className="mt-4 space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-4 w-full" />)}</div>}
            {metricsResult && (
              <motion.div
                className="mt-5 p-5 rounded-lg border bg-gradient-to-br from-muted/30 to-transparent"
                data-testid="text-ai-metrics-result"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <MarkdownRender content={metricsResult} downloadFilename="AI_Comparative_Metrics" />
              </motion.div>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="clusters" className="space-y-4">
          <motion.div className="polished-card p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="section-header">
              <Brain className={`w-4 h-4 ${theme.accent}`} />
              <h3>AI Term Clusters</h3>
            </div>
            <Button
              onClick={() => clustersMutation.mutate()}
              disabled={clustersMutation.isPending}
              data-testid="button-ai-extract-clusters"
            >
              {clustersMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
              Extract Term Clusters
            </Button>
            {clustersMutation.isPending && <div className="mt-4 space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-4 w-full" />)}</div>}
            {clustersResult && (
              <motion.div
                className="mt-5 p-5 rounded-lg border bg-gradient-to-br from-muted/30 to-transparent"
                data-testid="text-ai-clusters-result"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <MarkdownRender content={clustersResult} downloadFilename="AI_Term_Clusters" />
              </motion.div>
            )}
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
