import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FileUpload } from "@/components/file-upload";
import { MarkdownRender } from "@/components/markdown-render";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Loader2, FlaskConical, BarChart3, Layers, Upload, BookOpen, Globe, Search, Database } from "lucide-react";
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const allTypes = Object.keys(AI_ANALYSIS_PRESETS);
  const filteredTypes = category === "All"
    ? allTypes
    : AI_ANALYSIS_CATEGORIES.find((c) => c.name === category)?.types || allTypes;

  const needsCorpus = !corpusId;

  const corporaQuery = useQuery<{ corpora: Array<{ id: string; name: string; source: string; words: number; createdAt: number }> }>({
    queryKey: ["/api/corpora"],
    enabled: needsCorpus,
    refetchInterval: needsCorpus ? 5000 : false,
  });

  const existingCorpora = corporaQuery.data?.corpora || [];

  const sourceIcons: Record<string, typeof Brain> = {
    monolingual: BookOpen,
    bilingual: Globe,
    scraper: Search,
    "ai-insights": Brain,
  };

  const sourceColors: Record<string, string> = {
    monolingual: "from-indigo-500 to-blue-600",
    bilingual: "from-teal-500 to-emerald-600",
    scraper: "from-amber-500 to-orange-600",
    "ai-insights": "from-purple-500 to-violet-600",
  };

  const sourceLabels: Record<string, string> = {
    monolingual: "Monolingual",
    bilingual: "Bilingual",
    scraper: "Web Scraper",
    "ai-insights": "AI Insights",
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      selectedFiles.forEach((f) => formData.append("files", f));
      const res = await fetch("/api/corpus/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: (data) => {
      setCorpusId(data.corpusId);
      toast({ title: "Corpus loaded", description: `${data.stats.words.toLocaleString()} words ready for analysis` });
    },
    onError: () => toast({ title: "Upload failed", variant: "destructive" }),
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
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3.5 mb-2"
        >
          <div className="page-header-icon bg-gradient-to-br from-purple-500 to-violet-600">
            <Brain className="w-5 h-5 text-white relative z-10" />
          </div>
          <div>
            <h1 className="text-3xl font-bold italic tracking-tight text-purple-600 dark:text-purple-400" style={{ fontFamily: "'Playfair Display', serif" }} data-testid="text-page-title">AI Insights Lab</h1>
          </div>
        </motion.div>

        {existingCorpora.length > 0 && (
          <motion.div
            className="polished-card overflow-hidden"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          >
            <div className="h-1 bg-gradient-to-r from-purple-500 via-violet-400 to-fuchsia-500" />
            <div className="p-6 md:p-7">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-md" style={{ boxShadow: "0 4px 12px -2px rgba(168,85,247,0.3)" }}>
                  <Database className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold tracking-tight text-purple-600 dark:text-purple-400" style={{ fontFamily: "'Playfair Display', serif" }}>Your Datasets</h3>
              </div>
              <p className="text-xs text-muted-foreground/70 mb-5 ml-[52px]">
                Select a previously uploaded dataset to analyze with AI.
              </p>
              <div className="space-y-2">
                <AnimatePresence>
                  {existingCorpora.map((corpus, index) => {
                    const Icon = sourceIcons[corpus.source] || Brain;
                    const colors = sourceColors[corpus.source] || "from-purple-500 to-violet-600";
                    const label = sourceLabels[corpus.source] || corpus.source;
                    return (
                      <motion.button
                        key={corpus.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + index * 0.05, duration: 0.3 }}
                        onClick={() => {
                          setCorpusId(corpus.id);
                          toast({ title: "Dataset loaded", description: `${corpus.words.toLocaleString()} words ready for analysis` });
                        }}
                        className="w-full flex items-center gap-3.5 p-3.5 rounded-xl border border-border/50 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-all duration-200 text-left group"
                        data-testid={`button-select-corpus-${corpus.id}`}
                      >
                        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${colors} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-foreground">{corpus.name}</p>
                          <p className="text-xs text-muted-foreground/60">{label} · {corpus.words.toLocaleString()} words</p>
                        </div>
                        <div className="text-xs text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity font-medium flex-shrink-0">
                          Select →
                        </div>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          className="polished-card overflow-hidden"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: existingCorpora.length > 0 ? 0.3 : 0.2 }}
        >
          <div className="h-1 bg-gradient-to-r from-purple-500 via-violet-400 to-fuchsia-500" />
          <div className="p-6 md:p-7">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-md" style={{ boxShadow: "0 4px 12px -2px rgba(168,85,247,0.3)" }}>
                <Upload className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold tracking-tight text-purple-600 dark:text-purple-400" style={{ fontFamily: "'Playfair Display', serif" }}>Upload New Corpus</h3>
            </div>
            <p className="text-xs text-muted-foreground/70 mb-5 ml-[52px]">
              Upload files to run 31 specialized AI analyses on your corpus.
            </p>
            <FileUpload onFilesSelected={setSelectedFiles} />
            <div className="mt-5">
              <Button
                onClick={() => uploadMutation.mutate()}
                disabled={selectedFiles.length === 0 || uploadMutation.isPending}
                className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white shadow-md transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                data-testid="button-upload-ai"
              >
                {uploadMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Upload & Analyze
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-3.5 mb-2"
      >
        <div className="page-header-icon bg-gradient-to-br from-purple-500 to-violet-600">
          <Brain className="w-5 h-5 text-white relative z-10" />
        </div>
        <div>
          <h1 className="text-3xl font-bold italic tracking-tight text-purple-600 dark:text-purple-400" style={{ fontFamily: "'Playfair Display', serif" }} data-testid="text-page-title">AI Insights Lab</h1>
        </div>
      </motion.div>

      <Tabs defaultValue="analysis" className="space-y-5">
        <TabsList data-testid="tabs-ai-insights">
          <TabsTrigger value="analysis" data-testid="tab-analysis"><FlaskConical className="w-3.5 h-3.5 mr-1.5" />Specialized Analysis</TabsTrigger>
          <TabsTrigger value="topics" data-testid="tab-topics"><Layers className="w-3.5 h-3.5 mr-1.5" />Domain Classification</TabsTrigger>
          <TabsTrigger value="metrics" data-testid="tab-metrics"><BarChart3 className="w-3.5 h-3.5 mr-1.5" />Comparative Metrics</TabsTrigger>
          <TabsTrigger value="clusters" data-testid="tab-clusters"><Brain className="w-3.5 h-3.5 mr-1.5" />Term Clusters</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-5">
          <motion.div className="polished-card p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="section-header">
              <FlaskConical className="w-4 h-4 text-purple-500" />
              <h3>Specialized Analysis for Translation Studies</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-5 mb-5">
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1.5 block font-medium uppercase tracking-wider">Category</label>
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
                  <label className="text-[11px] text-muted-foreground mb-1.5 block font-medium uppercase tracking-wider">Analysis Type</label>
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
          </motion.div>

          {analysisMutation.isPending && (
            <div className="polished-card p-6">
              <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-4 w-full" />)}</div>
            </div>
          )}
          {analysisResult && (
            <motion.div
              className="polished-card p-6"
              data-testid="card-analysis-result"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="section-header">
                <Brain className="w-4 h-4 text-purple-500" />
                <h3>{analysisType} — Results</h3>
              </div>
              <div className="p-5 rounded-lg border bg-gradient-to-br from-muted/30 to-transparent">
                <MarkdownRender content={analysisResult} />
              </div>
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="topics" className="space-y-4">
          <motion.div className="polished-card p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="section-header">
              <Layers className="w-4 h-4 text-primary" />
              <h3>AI Domain Classification</h3>
            </div>
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
              <motion.div
                className="mt-5 p-5 rounded-lg border bg-gradient-to-br from-muted/30 to-transparent"
                data-testid="text-topics-result"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <MarkdownRender content={topicsResult} />
              </motion.div>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <motion.div className="polished-card p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="section-header">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h3>AI Comparative Metrics</h3>
            </div>
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
              <motion.div
                className="mt-5 p-5 rounded-lg border bg-gradient-to-br from-muted/30 to-transparent"
                data-testid="text-metrics-result"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <MarkdownRender content={metricsResult} />
              </motion.div>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="clusters" className="space-y-4">
          <motion.div className="polished-card p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="section-header">
              <Brain className="w-4 h-4 text-purple-500" />
              <h3>AI Term Clusters</h3>
            </div>
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
              <motion.div
                className="mt-5 p-5 rounded-lg border bg-gradient-to-br from-muted/30 to-transparent"
                data-testid="text-clusters-result"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <MarkdownRender content={clustersResult} />
              </motion.div>
            )}
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
