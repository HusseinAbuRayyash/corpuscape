import { useState, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SaveToLibrary } from "@/components/save-to-library";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FileUpload } from "@/components/file-upload";
import { MarkdownRender } from "@/components/markdown-render";
import { AIResultDisplay } from "@/components/ai-result-display";
import { AIAnalysisPanel } from "@/components/ai-analysis-panel";
import { EditableChart } from "@/components/editable-chart";
import { TableDownload } from "@/components/table-download";
import { CorpusFilter, type ColumnMeta } from "@/components/corpus-filter";
import { DatasetViewer } from "@/components/dataset-viewer";
import { StopListManager } from "@/components/stop-list-manager";
import { ReportGenerator } from "@/components/report-generator";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { WordCloud } from "@/components/word-cloud";
import {
  Upload, BarChart3, Link2, Search, Hash, Brain, BookText, Download,
  Loader2, TrendingUp, BookOpen, Cloud, Layers, Table, ChevronDown, ChevronUp,
} from "lucide-react";
import type { CorpusStats, KeywordResult, NgramResult, CollocationResult, ConcordanceResult } from "@shared/schema";

export default function Monolingual() {
  const { toast } = useToast();
  const [corpusId, setCorpusId] = useState<string | null>(null);
  const [stats, setStats] = useState<CorpusStats | null>(null);
  const [keywords, setKeywords] = useState<KeywordResult[]>([]);
  const [ngrams, setNgrams] = useState<NgramResult[]>([]);
  const [collocations, setCollocations] = useState<CollocationResult[]>([]);
  const [concordanceResults, setConcordanceResults] = useState<ConcordanceResult[]>([]);
  const [aiResult, setAiResult] = useState<string>("");
  const [termsResult, setTermsResult] = useState<string>("");
  const [concordanceQuery, setConcordanceQuery] = useState("");
  const [ngramN, setNgramN] = useState("2");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [originalCorpusId, setOriginalCorpusId] = useState<string | null>(null);
  const [originalStats, setOriginalStats] = useState<CorpusStats | null>(null);
  const [isFiltered, setIsFiltered] = useState(false);
  const [filteredStats, setFilteredStats] = useState<CorpusStats | null>(null);
  const [columns, setColumns] = useState<ColumnMeta | null>(null);
  const [originalColumns, setOriginalColumns] = useState<ColumnMeta | null>(null);
  const [segments, setSegments] = useState<{ index: number; preview: string; text: string; wordCount: number; charCount: number }[]>([]);
  const [stopWords, setStopWords] = useState<string[]>([]);
  const [cloudWords, setCloudWords] = useState<{text: string; value: number}[]>([]);
  const [kwChartExpanded, setKwChartExpanded] = useState(false);
  const [kwTableExpanded, setKwTableExpanded] = useState(false);
  const [ngChartExpanded, setNgChartExpanded] = useState(false);
  const [ngTableExpanded, setNgTableExpanded] = useState(false);
  const [colTableExpanded, setColTableExpanded] = useState(false);

  useEffect(() => {
    const scrapedId = sessionStorage.getItem("scraped_corpus_id");
    const scrapedStats = sessionStorage.getItem("scraped_corpus_stats");
    if (scrapedId && scrapedStats) {
      setCorpusId(scrapedId);
      setStats(JSON.parse(scrapedStats));
      sessionStorage.removeItem("scraped_corpus_id");
      sessionStorage.removeItem("scraped_corpus_stats");
      toast({ title: "Scraped corpus loaded", description: "Ready for analysis" });
      return;
    }

    const raw = sessionStorage.getItem("library_load");
    if (!raw || !window.location.search.includes("libraryId")) return;
    try {
      const data = JSON.parse(raw);
      sessionStorage.removeItem("library_load");
      if (data.corpusId && data.stats) {
        setCorpusId(data.corpusId);
        setStats(data.stats);
        toast({ title: `"${data.name}" loaded from Library`, description: "Ready for analysis" });
      }
    } catch {}
  }, []);

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      const res = await fetch("/api/corpus/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: (data) => {
      setCorpusId(data.corpusId);
      setStats(data.stats);
      setColumns(data.columns || null);
      setOriginalColumns(null);
      setIsFiltered(false);
      setFilteredStats(null);
      setOriginalCorpusId(null);
      setOriginalStats(null);
      toast({ title: "Corpus loaded", description: `${data.stats.words.toLocaleString()} words ready for analysis${data.columns ? ` · ${data.columns.headers.length} columns detected` : ""}` });
    },
    onError: () => toast({ title: "Upload failed", variant: "destructive" }),
  });

  const sampleMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/corpus/sample");
      return res.json();
    },
    onSuccess: (data) => {
      setCorpusId(data.corpusId);
      setStats(data.stats);
      toast({ title: "Sample loaded", description: `${data.stats.words.toLocaleString()} words` });
    },
  });

  const keywordsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/corpus/keywords", { corpusId, topN: 100, stopWords });
      return res.json();
    },
    onSuccess: (data) => {
      setKeywords(data);
      setCloudWords(data.map((kw: any) => ({ text: kw.term, value: kw.frequency })));
    },
  });

  const ngramsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/corpus/ngrams", { corpusId, n: parseInt(ngramN), topN: 50, stopWords });
      return res.json();
    },
    onSuccess: setNgrams,
  });

  const collocationsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/corpus/collocations", { corpusId, topN: 50, stopWords });
      return res.json();
    },
    onSuccess: setCollocations,
  });

  const concordanceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/corpus/concordance", { corpusId, query: concordanceQuery });
      return res.json();
    },
    onSuccess: setConcordanceResults,
  });

  const aiMutation = useMutation({
    mutationFn: async (type: string) => {
      const res = await apiRequest("POST", "/api/ai/summarize", { corpusId });
      return res.json();
    },
    onSuccess: (data) => setAiResult(data.result),
  });

  const termsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/terminology", { corpusId });
      return res.json();
    },
    onSuccess: (data) => setTermsResult(data.result),
  });

  const segmentsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/corpus/segment", { corpusId });
      return res.json();
    },
    onSuccess: (data) => setSegments(data.segments),
  });

  const handleUpload = useCallback(() => {
    if (selectedFiles.length > 0) uploadMutation.mutate(selectedFiles);
  }, [selectedFiles]);

  const MetricCard = ({ label, value, index = 0 }: { label: string; value: string | number; index?: number }) => (
    <motion.div
      className="metric-card p-4 text-center"
      data-testid={`metric-${label.toLowerCase().replace(/\s/g, "-")}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
    >
      <p className="text-2xl font-extrabold tabular-nums tracking-tight text-gradient">{typeof value === "number" ? value.toLocaleString() : value}</p>
      <p className="text-[11px] text-muted-foreground mt-1.5 font-medium uppercase tracking-wider">{label}</p>
    </motion.div>
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-4 mb-2"
      >
        <div className="page-header-icon bg-gradient-to-br from-indigo-500 to-blue-600">
          <BookOpen className="w-5 h-5 text-white relative z-10" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold italic tracking-tight text-indigo-600 dark:text-indigo-400" style={{ fontFamily: "'Playfair Display', serif" }} data-testid="text-page-title">Monolingual Track</h1>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5 font-medium tracking-wide">Corpus analysis, statistics & AI insights</p>
        </div>
      </motion.div>

      {corpusId && stats && (
        <CorpusFilter
          corpusId={originalCorpusId || corpusId}
          originalStats={originalStats || stats}
          columns={originalColumns || columns}
          onFilterApplied={(filteredId, fStats, filteredCols) => {
            if (!originalCorpusId) {
              setOriginalCorpusId(corpusId);
              setOriginalStats(stats);
              setOriginalColumns(columns);
            }
            setCorpusId(filteredId);
            setStats(fStats);
            setFilteredStats(fStats);
            if (filteredCols) setColumns(filteredCols);
            setIsFiltered(true);
            setKeywords([]);
            setNgrams([]);
            setCollocations([]);
            setConcordanceResults([]);
            setAiResult("");
            setTermsResult("");
            setSegments([]);
          }}
          onFilterCleared={() => {
            if (originalCorpusId) {
              setCorpusId(originalCorpusId);
              setStats(originalStats);
            }
            if (originalColumns) setColumns(originalColumns);
            setIsFiltered(false);
            setFilteredStats(null);
            setOriginalCorpusId(null);
            setOriginalStats(null);
            setOriginalColumns(null);
            setKeywords([]);
            setNgrams([]);
            setCollocations([]);
            setConcordanceResults([]);
            setAiResult("");
            setTermsResult("");
            setSegments([]);
          }}
          isFiltered={isFiltered}
          filteredStats={filteredStats}
          theme={{ gradient: "from-indigo-500 to-blue-600", accent: "text-indigo-500", text: "text-indigo-600 dark:text-indigo-400" }}
        />
      )}

      {corpusId && (
        <StopListManager
          stopWords={stopWords}
          onChange={setStopWords}
          theme={{ gradient: "from-indigo-500 to-blue-600", text: "text-indigo-600 dark:text-indigo-400" }}
        />
      )}

      <Tabs defaultValue="upload" className="space-y-5">
        <TabsList className="w-full justify-start overflow-x-auto scrollbar-hide flex-nowrap" data-testid="tabs-monolingual">
          <TabsTrigger value="upload" className="shrink-0" data-testid="tab-upload"><Upload className="w-3.5 h-3.5 mr-1.5" />Upload</TabsTrigger>
          <TabsTrigger value="dataset" disabled={!columns} className="shrink-0" data-testid="tab-dataset"><Table className="w-3.5 h-3.5 mr-1.5" />Dataset</TabsTrigger>
          <TabsTrigger value="stats" disabled={!corpusId} className="shrink-0" data-testid="tab-stats"><BarChart3 className="w-3.5 h-3.5 mr-1.5" />Stats</TabsTrigger>
          <TabsTrigger value="keywords" disabled={!corpusId} className="shrink-0" data-testid="tab-keywords"><TrendingUp className="w-3.5 h-3.5 mr-1.5" />Keywords</TabsTrigger>
          <TabsTrigger value="collocations" disabled={!corpusId} className="shrink-0" data-testid="tab-collocations"><Link2 className="w-3.5 h-3.5 mr-1.5" />Collocations</TabsTrigger>
          <TabsTrigger value="concordance" disabled={!corpusId} className="shrink-0" data-testid="tab-concordance"><Search className="w-3.5 h-3.5 mr-1.5" />Concordance</TabsTrigger>
          <TabsTrigger value="ngrams" disabled={!corpusId} className="shrink-0" data-testid="tab-ngrams"><Hash className="w-3.5 h-3.5 mr-1.5" />N-grams</TabsTrigger>
          <TabsTrigger value="wordcloud" disabled={!corpusId} className="shrink-0" data-testid="tab-wordcloud"><Cloud className="w-3.5 h-3.5 mr-1.5" />Word Cloud</TabsTrigger>
          <TabsTrigger value="segments" disabled={!corpusId} className="shrink-0" data-testid="tab-segments"><Layers className="w-3.5 h-3.5 mr-1.5" />Segments</TabsTrigger>
          <TabsTrigger value="ai" disabled={!corpusId} className="shrink-0" data-testid="tab-ai"><Brain className="w-3.5 h-3.5 mr-1.5" />AI Insights</TabsTrigger>
          <TabsTrigger value="terms" disabled={!corpusId} className="shrink-0" data-testid="tab-terms"><BookText className="w-3.5 h-3.5 mr-1.5" />Terminology</TabsTrigger>
          <TabsTrigger value="export" disabled={!corpusId} className="shrink-0" data-testid="tab-export"><Download className="w-3.5 h-3.5 mr-1.5" />Export</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-5">
          <motion.div
            className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/50 dark:from-indigo-950/40 dark:via-slate-900/60 dark:to-blue-950/30 border border-indigo-100/60 dark:border-indigo-800/20"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{ boxShadow: "0 4px 20px -4px rgba(99,102,241,0.1), 0 1px 4px rgba(0,0,0,0.04)" }}
          >
            <div className="absolute top-0 left-[10%] right-[10%] h-[3px] opacity-60" style={{ background: "linear-gradient(90deg, transparent, #6366f1, #3b82f6, transparent)", borderRadius: "0 0 4px 4px" }} />
            <div className="absolute top-0 right-0 w-48 h-48 opacity-[0.04] pointer-events-none" style={{ background: "radial-gradient(circle at 100% 0%, #6366f1, transparent 70%)" }} />
            <div className="absolute bottom-0 left-0 w-40 h-40 opacity-[0.03] pointer-events-none" style={{ background: "radial-gradient(circle at 0% 100%, #3b82f6, transparent 70%)" }} />

            <div className="relative p-7 md:p-9">
              <motion.div
                className="flex flex-col items-center text-center mb-6"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center mb-4 shadow-lg" style={{ boxShadow: "0 8px 20px -4px rgba(99,102,241,0.35)" }}>
                  <Upload className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400" style={{ fontFamily: "'Playfair Display', serif" }}>Add Your Corpus</h3>
                <p className="text-xs text-muted-foreground/60 mt-1.5 max-w-sm">
                  Upload one or more files — they will be merged into a single corpus for analysis
                </p>
              </motion.div>

              <motion.div
                className="max-w-lg mx-auto"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.4 }}
              >
                <FileUpload onFilesSelected={setSelectedFiles} />
              </motion.div>

              <motion.div
                className="mt-6 flex justify-center"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.4 }}
              >
                <Button
                  onClick={handleUpload}
                  disabled={selectedFiles.length === 0 || uploadMutation.isPending}
                  className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 px-8 h-11 rounded-xl text-sm font-semibold"
                  data-testid="button-upload"
                  style={{ boxShadow: selectedFiles.length > 0 ? "0 8px 24px -6px rgba(99,102,241,0.4)" : undefined }}
                >
                  {uploadMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Upload & Process
                </Button>
              </motion.div>
            </div>
          </motion.div>

          {stats && (
            <div className="flex justify-end">
              <SaveToLibrary
                type="monolingual"
                sourceTrack="monolingual"
                sizeLabel={`${stats.words.toLocaleString()} words`}
                defaultName={selectedFiles.length > 0 ? selectedFiles.map(f => f.name.replace(/\.[^.]+$/, "")).join(", ") : "Monolingual Corpus"}
                accentClass="from-indigo-500 to-blue-600"
              />
            </div>
          )}

          {stats && (
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
              data-testid="stats-overview"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <MetricCard label="Words" value={stats.words} index={0} />
              <MetricCard label="Unique" value={stats.uniqueWords} index={1} />
              <MetricCard label="Sentences" value={stats.sentences} index={2} />
              <MetricCard label="TTR" value={stats.typeTokenRatio.toFixed(3)} index={3} />
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="dataset" className="space-y-5">
          {corpusId && columns && (
            <DatasetViewer
              corpusId={corpusId}
              theme={{ gradient: "from-indigo-500 to-blue-600", accent: "text-indigo-500", text: "text-indigo-600 dark:text-indigo-400" }}
            />
          )}
        </TabsContent>

        <TabsContent value="stats" className="space-y-5">
          {stats && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard label="Characters" value={stats.characters} index={0} />
                <MetricCard label="Words" value={stats.words} index={1} />
                <MetricCard label="Unique Words" value={stats.uniqueWords} index={2} />
                <MetricCard label="Sentences" value={stats.sentences} index={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="Type-Token Ratio" value={stats.typeTokenRatio.toFixed(4)} index={0} />
                <MetricCard label="Avg Words/Sentence" value={stats.avgWordsPerSentence} index={1} />
              </div>
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="keywords" className="space-y-4">
          <motion.div className="polished-card p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="section-header">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3>Keywords</h3>
              <div className="ml-auto">
                <Button
                  size="sm"
                  onClick={() => keywordsMutation.mutate()}
                  disabled={keywordsMutation.isPending}
                  data-testid="button-extract-keywords"
                >
                  {keywordsMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
                  Extract Keywords
                </Button>
              </div>
            </div>
            {keywordsMutation.isPending && (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
            )}
            {keywords.length > 0 && (
              <motion.div className="space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div data-testid="chart-keywords">
                  <EditableChart
                    data={(kwChartExpanded ? keywords : keywords.slice(0, 15)).map(kw => ({ label: kw.term, value: kw.frequency }))}
                    defaultTitle=""
                    layout="horizontal"
                  />
                  {keywords.length > 15 && (
                    <button
                      type="button"
                      onClick={() => setKwChartExpanded(!kwChartExpanded)}
                      className="flex items-center gap-1 mx-auto mt-2 text-xs font-medium text-primary hover:underline"
                      data-testid="button-expand-keywords-chart"
                    >
                      {kwChartExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {kwChartExpanded ? "Show top 15" : `Show all ${keywords.length} keywords`}
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-muted-foreground font-medium">{keywords.length} keywords extracted</span>
                  <TableDownload
                    data={keywords.map((kw, i) => ({ rank: i + 1, term: kw.term, frequency: kw.frequency }))}
                    columns={[
                      { header: "#", key: "rank", align: "left" },
                      { header: "Term", key: "term", align: "left" },
                      { header: "Frequency", key: "frequency", align: "right" },
                    ]}
                    filename="Keywords"
                  />
                </div>
                <div className={`${kwTableExpanded ? "max-h-[600px]" : "max-h-64"} overflow-auto rounded-lg border transition-all duration-300`}>
                  <table className="w-full text-sm polished-table" data-testid="table-keywords">
                    <thead className="sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3 text-left">#</th>
                        <th className="py-2.5 px-3 text-left">Term</th>
                        <th className="py-2.5 px-3 text-right">Frequency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keywords.map((kw, i) => (
                        <tr key={kw.term} className="border-b border-border/30">
                          <td className="py-2 px-3 text-muted-foreground text-xs">{i + 1}</td>
                          <td className="py-2 px-3 font-semibold text-sm">{kw.term}</td>
                          <td className="py-2 px-3 text-right tabular-nums font-medium">{kw.frequency}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {keywords.length > 10 && (
                  <button
                    type="button"
                    onClick={() => setKwTableExpanded(!kwTableExpanded)}
                    className="flex items-center gap-1 mx-auto text-xs font-medium text-primary hover:underline"
                    data-testid="button-expand-keywords-table"
                  >
                    {kwTableExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {kwTableExpanded ? "Compact view" : "Expand table"}
                  </button>
                )}
              </motion.div>
            )}
            {keywords.length === 0 && !keywordsMutation.isPending && (
              <div className="empty-state">
                <TrendingUp className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Click "Extract Keywords" to analyze the most frequent terms in your corpus.</p>
              </div>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="collocations" className="space-y-4">
          <motion.div className="polished-card p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="section-header">
              <Link2 className="w-4 h-4 text-primary" />
              <h3>Collocations</h3>
              <div className="ml-auto">
                <Button
                  size="sm"
                  onClick={() => collocationsMutation.mutate()}
                  disabled={collocationsMutation.isPending}
                  data-testid="button-extract-collocations"
                >
                  {collocationsMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Extract Collocations
                </Button>
              </div>
            </div>
            {collocationsMutation.isPending && (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
            )}
            {collocations.length > 0 && (
              <motion.div className="space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground font-medium">{collocations.length} collocations found</span>
                  <TableDownload
                    data={collocations.map(c => ({ collocate: c.collocate, frequency: c.frequency, mi: c.mi.toFixed(2), dice: c.dice.toFixed(3) }))}
                    columns={[
                      { header: "Collocate", key: "collocate", align: "left" },
                      { header: "Frequency", key: "frequency", align: "right" },
                      { header: "MI", key: "mi", align: "right" },
                      { header: "Dice", key: "dice", align: "right" },
                    ]}
                    filename="Collocations"
                  />
                </div>
                <div className={`${colTableExpanded ? "max-h-[600px]" : "max-h-72"} overflow-auto rounded-lg border transition-all duration-300`}>
                <table className="w-full text-sm polished-table" data-testid="table-collocations">
                  <thead className="sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Collocate</th>
                      <th className="py-2.5 px-3 text-right">Freq</th>
                      <th className="py-2.5 px-3 text-right">MI</th>
                      <th className="py-2.5 px-3 text-right">Dice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collocations.map((c, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="py-2 px-3 font-semibold">{c.collocate}</td>
                        <td className="py-2 px-3 text-right tabular-nums">{c.frequency}</td>
                        <td className="py-2 px-3 text-right tabular-nums">{c.mi.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right tabular-nums">{c.dice.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                {collocations.length > 10 && (
                  <button
                    type="button"
                    onClick={() => setColTableExpanded(!colTableExpanded)}
                    className="flex items-center gap-1 mx-auto text-xs font-medium text-primary hover:underline"
                    data-testid="button-expand-collocations-table"
                  >
                    {colTableExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {colTableExpanded ? "Compact view" : "Expand table"}
                  </button>
                )}
              </motion.div>
            )}
            {collocations.length === 0 && !collocationsMutation.isPending && (
              <div className="empty-state">
                <Link2 className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Click "Extract Collocations" to analyze word co-occurrence patterns.</p>
              </div>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="concordance" className="space-y-4">
          <motion.div className="polished-card p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="section-header">
              <Search className="w-4 h-4 text-primary" />
              <h3>KWIC Concordance</h3>
            </div>
            <div className="flex gap-2 mb-5 flex-wrap">
              <Input
                placeholder="Search term..."
                value={concordanceQuery}
                onChange={(e) => setConcordanceQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && concordanceQuery && concordanceMutation.mutate()}
                className="max-w-xs"
                data-testid="input-concordance"
              />
              <Button
                size="sm"
                onClick={() => concordanceMutation.mutate()}
                disabled={!concordanceQuery || concordanceMutation.isPending}
                data-testid="button-concordance-search"
              >
                {concordanceMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                Search
              </Button>
            </div>
            {concordanceMutation.isPending && (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
            )}
            {concordanceResults.length > 0 && (
              <motion.div className="space-y-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex justify-end">
                  <TableDownload
                    data={concordanceResults.map(c => ({ left: c.left, match: c.match, right: c.right }))}
                    columns={[
                      { header: "Left Context", key: "left", align: "right" },
                      { header: "Match", key: "match", align: "center" },
                      { header: "Right Context", key: "right", align: "left" },
                    ]}
                    filename="Concordance"
                  />
                </div>
                <div className="max-h-96 overflow-auto rounded-lg border">
                <table className="w-full text-sm font-mono polished-table" data-testid="table-concordance">
                  <thead className="sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3 text-right w-2/5">Left Context</th>
                      <th className="py-2.5 px-3 text-center">Match</th>
                      <th className="py-2.5 px-3 text-left w-2/5">Right Context</th>
                    </tr>
                  </thead>
                  <tbody>
                    {concordanceResults.map((c, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="py-2 px-3 text-right text-muted-foreground text-xs">{c.left}</td>
                        <td className="py-2 px-3 text-center font-bold text-primary text-xs">{c.match}</td>
                        <td className="py-2 px-3 text-muted-foreground text-xs">{c.right}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </motion.div>
            )}
            {concordanceResults.length === 0 && !concordanceMutation.isPending && (
              <div className="empty-state">
                <Search className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Enter a search term to find Key Word In Context matches.</p>
              </div>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="ngrams" className="space-y-4">
          <motion.div className="polished-card p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="section-header">
              <Hash className="w-4 h-4 text-primary" />
              <h3>N-grams</h3>
              <div className="ml-auto flex items-center gap-2">
                <Select value={ngramN} onValueChange={setNgramN}>
                  <SelectTrigger className="w-28 h-8 text-xs" data-testid="select-ngram-n">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">Bigrams</SelectItem>
                    <SelectItem value="3">Trigrams</SelectItem>
                    <SelectItem value="4">4-grams</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={() => ngramsMutation.mutate()}
                  disabled={ngramsMutation.isPending}
                  data-testid="button-extract-ngrams"
                >
                  {ngramsMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Extract
                </Button>
              </div>
            </div>
            {ngramsMutation.isPending && (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
            )}
            {ngrams.length > 0 && (
              <motion.div className="space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div data-testid="chart-ngrams">
                  <EditableChart
                    data={(ngChartExpanded ? ngrams : ngrams.slice(0, 12)).map(ng => ({ label: ng.ngram, value: ng.frequency }))}
                    defaultTitle=""
                    layout="vertical"
                  />
                  {ngrams.length > 12 && (
                    <button
                      type="button"
                      onClick={() => setNgChartExpanded(!ngChartExpanded)}
                      className="flex items-center gap-1 mx-auto mt-2 text-xs font-medium text-primary hover:underline"
                      data-testid="button-expand-ngrams-chart"
                    >
                      {ngChartExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {ngChartExpanded ? "Show top 12" : `Show all ${ngrams.length} n-grams`}
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-muted-foreground font-medium">{ngrams.length} n-grams extracted</span>
                  <TableDownload
                    data={ngrams.map((ng, i) => ({ rank: i + 1, ngram: ng.ngram, frequency: ng.frequency }))}
                    columns={[
                      { header: "#", key: "rank", align: "left" },
                      { header: "N-gram", key: "ngram", align: "left" },
                      { header: "Frequency", key: "frequency", align: "right" },
                    ]}
                    filename="N-grams"
                  />
                </div>
                <div className={`${ngTableExpanded ? "max-h-[600px]" : "max-h-64"} overflow-auto rounded-lg border transition-all duration-300`}>
                  <table className="w-full text-sm polished-table" data-testid="table-ngrams">
                    <thead className="sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3 text-left">#</th>
                        <th className="py-2.5 px-3 text-left">N-gram</th>
                        <th className="py-2.5 px-3 text-right">Frequency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ngrams.map((ng, i) => (
                        <tr key={ng.ngram} className="border-b border-border/30">
                          <td className="py-2 px-3 text-muted-foreground text-xs">{i + 1}</td>
                          <td className="py-2 px-3 font-semibold">{ng.ngram}</td>
                          <td className="py-2 px-3 text-right tabular-nums font-medium">{ng.frequency}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {ngrams.length > 10 && (
                  <button
                    type="button"
                    onClick={() => setNgTableExpanded(!ngTableExpanded)}
                    className="flex items-center gap-1 mx-auto text-xs font-medium text-primary hover:underline"
                    data-testid="button-expand-ngrams-table"
                  >
                    {ngTableExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {ngTableExpanded ? "Compact view" : "Expand table"}
                  </button>
                )}
              </motion.div>
            )}
            {ngrams.length === 0 && !ngramsMutation.isPending && (
              <div className="empty-state">
                <Hash className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Select n-gram size and click extract to analyze word sequences.</p>
              </div>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="wordcloud" className="space-y-4">
          <motion.div className="polished-card p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="section-header">
              <Cloud className="w-4 h-4 text-primary" />
              <h3>Word Cloud</h3>
              {keywords.length === 0 && (
                <div className="ml-auto">
                  <Button
                    size="sm"
                    onClick={() => keywordsMutation.mutate()}
                    disabled={keywordsMutation.isPending}
                    data-testid="button-wordcloud-extract-keywords"
                  >
                    {keywordsMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
                    Extract Keywords First
                  </Button>
                </div>
              )}
            </div>
            {keywordsMutation.isPending && (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
            )}
            {keywords.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <WordCloud
                  words={cloudWords.length > 0 ? cloudWords : keywords.map(kw => ({ text: kw.term, value: kw.frequency }))}
                  width={700}
                  height={420}
                  onWordsChange={setCloudWords}
                />
              </motion.div>
            )}
            {keywords.length === 0 && !keywordsMutation.isPending && (
              <div className="empty-state">
                <Cloud className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Extract keywords first to generate a word cloud visualization.</p>
              </div>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="segments" className="space-y-4">
          <motion.div className="polished-card p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="section-header">
              <Layers className="w-4 h-4 text-primary" />
              <h3>Corpus Segments</h3>
              <div className="ml-auto">
                <Button
                  size="sm"
                  onClick={() => segmentsMutation.mutate()}
                  disabled={segmentsMutation.isPending}
                  data-testid="button-extract-segments"
                >
                  {segmentsMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Layers className="w-4 h-4 mr-2" />}
                  Segment Corpus
                </Button>
              </div>
            </div>
            {segmentsMutation.isPending && (
              <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            )}
            {segments.length > 0 && (
              <motion.div className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className="text-sm text-muted-foreground" data-testid="text-segment-count">{segments.length} segments found</p>
                <div className="max-h-[500px] overflow-auto rounded-lg border">
                  <table className="w-full text-sm polished-table" data-testid="table-segments">
                    <thead className="sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3 text-left w-16">#</th>
                        <th className="py-2.5 px-3 text-left">Preview</th>
                        <th className="py-2.5 px-3 text-right w-24">Words</th>
                        <th className="py-2.5 px-3 text-right w-24">Chars</th>
                      </tr>
                    </thead>
                    <tbody>
                      {segments.map((seg) => (
                        <tr key={seg.index} className="border-b border-border/30" data-testid={`row-segment-${seg.index}`}>
                          <td className="py-2 px-3 text-muted-foreground text-xs">{seg.index + 1}</td>
                          <td className="py-2 px-3 text-xs leading-relaxed">{seg.preview}</td>
                          <td className="py-2 px-3 text-right tabular-nums font-medium">{seg.wordCount}</td>
                          <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">{seg.charCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
            {segments.length === 0 && !segmentsMutation.isPending && (
              <div className="empty-state">
                <Layers className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Click "Segment Corpus" to split your corpus into paragraph-level segments.</p>
              </div>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <AIAnalysisPanel corpusId={corpusId!} theme={{ gradient: "from-indigo-500 to-blue-600", accent: "text-indigo-500", text: "text-indigo-600 dark:text-indigo-400" }} />
        </TabsContent>

        <TabsContent value="terms" className="space-y-4">
          <motion.div className="polished-card p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="section-header">
              <BookText className="w-4 h-4 text-primary" />
              <h3>AI Terminology Extraction</h3>
            </div>
            <Button
              onClick={() => termsMutation.mutate()}
              disabled={termsMutation.isPending}
              data-testid="button-extract-terms"
            >
              {termsMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BookText className="w-4 h-4 mr-2" />}
              Extract Terminology
            </Button>
            {termsMutation.isPending && (
              <div className="mt-4 space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-4 w-full" />)}</div>
            )}
            {termsResult && (
              <motion.div
                className="mt-5 p-5 rounded-lg border bg-gradient-to-br from-muted/30 to-transparent"
                data-testid="text-terms-result"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AIResultDisplay content={termsResult} onContentChange={setTermsResult} downloadFilename="AI_Terminology" />
              </motion.div>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <motion.div className="polished-card p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="section-header">
              <Download className="w-4 h-4 text-primary" />
              <h3>Export Data</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Download your analysis results in various formats.</p>
            <div className="flex gap-3 flex-wrap">
              <Button
                variant="secondary"
                onClick={async () => {
                  const res = await apiRequest("POST", "/api/export/report", {
                    corpusId,
                    aiSummary: aiResult || undefined,
                  });
                  const text = await res.text();
                  const blob = new Blob([text], { type: "text/markdown" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = "corpuscape_report.md"; a.click();
                  URL.revokeObjectURL(url);
                }}
                data-testid="button-export-report"
              >
                <Download className="w-4 h-4 mr-2" />Research Report (MD)
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  if (keywords.length === 0) return;
                  const csv = "Term,Frequency\n" + keywords.map((kw) => `"${kw.term}",${kw.frequency}`).join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = "keywords.csv"; a.click();
                  URL.revokeObjectURL(url);
                }}
                disabled={keywords.length === 0}
                data-testid="button-export-keywords"
              >
                <Download className="w-4 h-4 mr-2" />Keywords (CSV)
              </Button>
              <ReportGenerator
                title="Monolingual Corpus Report"
                stats={stats}
                keywords={keywords}
                collocations={collocations}
                ngrams={ngrams}
                aiResults={{
                  ...(aiResult ? { "AI Summary": aiResult } : {}),
                  ...(termsResult ? { "Terminology": termsResult } : {}),
                }}
              />
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
