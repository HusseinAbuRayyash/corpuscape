import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownRender } from "@/components/markdown-render";
import { useToast } from "@/hooks/use-toast";
import { Brain, Loader2, FlaskConical, BarChart3, Layers, AlertCircle } from "lucide-react";
import { AI_ANALYSIS_CATEGORIES, AI_ANALYSIS_PRESETS } from "@shared/schema";

export default function AIInsights() {
  const { toast } = useToast();
  const [corpusId, setCorpusId] = useState<string | null>(null);
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

  const needsCorpus = !corpusId;

  const loadCorpusMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/corpus/sample");
      return res.json();
    },
    onSuccess: (data) => {
      setCorpusId(data.corpusId);
      toast({ title: "Sample corpus loaded", description: `${data.stats.words.toLocaleString()} words` });
    },
  });

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

  if (needsCorpus) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">AI Insights Lab</h1>
          <p className="text-sm text-muted-foreground mt-1">31 specialized analysis types for translation studies</p>
        </div>
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground mb-4">
            Upload a corpus in the Monolingual Track first, or load the sample corpus below.
          </p>
          <Button
            onClick={() => loadCorpusMutation.mutate()}
            disabled={loadCorpusMutation.isPending}
            data-testid="button-load-sample"
          >
            {loadCorpusMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Load Sample Corpus
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">AI Insights Lab</h1>
        <p className="text-sm text-muted-foreground mt-1">31 specialized analysis types - industry, criticism, visibility, gender, and more</p>
      </div>

      <Tabs defaultValue="analysis" className="space-y-4">
        <TabsList data-testid="tabs-ai-insights">
          <TabsTrigger value="analysis" data-testid="tab-analysis"><FlaskConical className="w-3.5 h-3.5 mr-1.5" />Specialized Analysis</TabsTrigger>
          <TabsTrigger value="topics" data-testid="tab-topics"><Layers className="w-3.5 h-3.5 mr-1.5" />Domain Classification</TabsTrigger>
          <TabsTrigger value="metrics" data-testid="tab-metrics"><BarChart3 className="w-3.5 h-3.5 mr-1.5" />Comparative Metrics</TabsTrigger>
          <TabsTrigger value="clusters" data-testid="tab-clusters"><Brain className="w-3.5 h-3.5 mr-1.5" />Term Clusters</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold text-sm mb-4">Specialized Analysis for Translation Studies</h3>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                  <Select value={category} onValueChange={(v) => { setCategory(v); setAnalysisType(v === "All" ? allTypes[0] : (AI_ANALYSIS_CATEGORIES.find(c => c.name === v)?.types[0] || allTypes[0])); }}>
                    <SelectTrigger data-testid="select-category">
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
                  <label className="text-xs text-muted-foreground mb-1 block">Analysis Type</label>
                  <Select value={analysisType} onValueChange={setAnalysisType}>
                    <SelectTrigger data-testid="select-analysis-type">
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
                  <p className="text-xs text-muted-foreground italic">{AI_ANALYSIS_PRESETS[analysisType].description}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  {analysisType === "Custom" ? "Custom Instructions (required)" : "Additional Instructions (optional)"}
                </label>
                <Textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder={analysisType === "Custom" ? "Enter your full analysis prompt here..." : "e.g. Focus on feminist strategies in literary texts..."}
                  className="min-h-[120px] resize-none"
                  data-testid="textarea-instructions"
                />
              </div>
            </div>
            <Button
              onClick={() => analysisMutation.mutate()}
              disabled={analysisMutation.isPending || (analysisType === "Custom" && !customInstructions.trim())}
              data-testid="button-run-analysis"
            >
              {analysisMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
              Run Analysis
            </Button>
          </Card>

          {analysisMutation.isPending && (
            <Card className="p-5">
              <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-4 w-full" />)}</div>
            </Card>
          )}
          {analysisResult && (
            <Card className="p-5" data-testid="card-analysis-result">
              <h3 className="font-semibold text-sm mb-3">{analysisType} - Results</h3>
              <div className="p-4 bg-muted/30 rounded-md">
                <MarkdownRender content={analysisResult} />
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="topics" className="space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold text-sm mb-3">AI Domain Classification</h3>
            <Button
              onClick={() => topicsMutation.mutate()}
              disabled={topicsMutation.isPending}
              data-testid="button-classify-domains"
            >
              {topicsMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Layers className="w-4 h-4 mr-2" />}
              Classify Domains
            </Button>
            {topicsMutation.isPending && <div className="mt-4 space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-4 w-full" />)}</div>}
            {topicsResult && (
              <div className="mt-4 p-4 bg-muted/30 rounded-md" data-testid="text-topics-result">
                <MarkdownRender content={topicsResult} />
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold text-sm mb-3">AI Comparative Metrics</h3>
            <Button
              onClick={() => metricsMutation.mutate()}
              disabled={metricsMutation.isPending}
              data-testid="button-generate-metrics"
            >
              {metricsMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BarChart3 className="w-4 h-4 mr-2" />}
              Generate Metrics
            </Button>
            {metricsMutation.isPending && <div className="mt-4 space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-4 w-full" />)}</div>}
            {metricsResult && (
              <div className="mt-4 p-4 bg-muted/30 rounded-md" data-testid="text-metrics-result">
                <MarkdownRender content={metricsResult} />
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="clusters" className="space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold text-sm mb-3">AI Term Clusters</h3>
            <Button
              onClick={() => clustersMutation.mutate()}
              disabled={clustersMutation.isPending}
              data-testid="button-extract-clusters"
            >
              {clustersMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
              Extract Term Clusters
            </Button>
            {clustersMutation.isPending && <div className="mt-4 space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-4 w-full" />)}</div>}
            {clustersResult && (
              <div className="mt-4 p-4 bg-muted/30 rounded-md" data-testid="text-clusters-result">
                <MarkdownRender content={clustersResult} />
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
