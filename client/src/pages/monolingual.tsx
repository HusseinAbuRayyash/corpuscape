import { useState, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FileUpload } from "@/components/file-upload";
import { MarkdownRender } from "@/components/markdown-render";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Upload, BarChart3, Link2, Search, Hash, Brain, BookText, Download,
  Loader2, FileText, TrendingUp, BookOpen,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import type { CorpusStats, KeywordResult, NgramResult, CollocationResult, ConcordanceResult } from "@shared/schema";

const CHART_COLORS = ["#0d9488", "#14b8a6", "#2dd4bf", "#5eead4", "#99f6e4", "#0891b2", "#06b6d4", "#22d3ee"];

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

  useEffect(() => {
    const scrapedId = sessionStorage.getItem("scraped_corpus_id");
    const scrapedStats = sessionStorage.getItem("scraped_corpus_stats");
    if (scrapedId && scrapedStats) {
      setCorpusId(scrapedId);
      setStats(JSON.parse(scrapedStats));
      sessionStorage.removeItem("scraped_corpus_id");
      sessionStorage.removeItem("scraped_corpus_stats");
      toast({ title: "Scraped corpus loaded", description: "Ready for analysis" });
    }
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
      toast({ title: "Corpus loaded", description: `${data.stats.words.toLocaleString()} words ready for analysis` });
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
      const res = await apiRequest("POST", "/api/corpus/keywords", { corpusId, topN: 30 });
      return res.json();
    },
    onSuccess: setKeywords,
  });

  const ngramsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/corpus/ngrams", { corpusId, n: parseInt(ngramN), topN: 25 });
      return res.json();
    },
    onSuccess: setNgrams,
  });

  const collocationsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/corpus/collocations", { corpusId });
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

  const handleUpload = useCallback(() => {
    if (selectedFiles.length > 0) uploadMutation.mutate(selectedFiles);
  }, [selectedFiles]);

  const MetricCard = ({ label, value }: { label: string; value: string | number }) => (
    <Card className="p-4 text-center" data-testid={`metric-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <p className="text-2xl font-bold tabular-nums">{typeof value === "number" ? value.toLocaleString() : value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </Card>
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-3 mb-2"
      >
        <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Monolingual Track</h1>
          <p className="text-sm text-muted-foreground">Corpus statistics, keywords, collocations, concordance, and AI-powered analysis</p>
        </div>
      </motion.div>

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList className="flex-wrap" data-testid="tabs-monolingual">
          <TabsTrigger value="upload" data-testid="tab-upload"><Upload className="w-3.5 h-3.5 mr-1.5" />Upload</TabsTrigger>
          <TabsTrigger value="stats" disabled={!corpusId} data-testid="tab-stats"><BarChart3 className="w-3.5 h-3.5 mr-1.5" />Stats</TabsTrigger>
          <TabsTrigger value="collocations" disabled={!corpusId} data-testid="tab-collocations"><Link2 className="w-3.5 h-3.5 mr-1.5" />Collocations</TabsTrigger>
          <TabsTrigger value="concordance" disabled={!corpusId} data-testid="tab-concordance"><Search className="w-3.5 h-3.5 mr-1.5" />Concordance</TabsTrigger>
          <TabsTrigger value="ngrams" disabled={!corpusId} data-testid="tab-ngrams"><Hash className="w-3.5 h-3.5 mr-1.5" />N-grams</TabsTrigger>
          <TabsTrigger value="ai" disabled={!corpusId} data-testid="tab-ai"><Brain className="w-3.5 h-3.5 mr-1.5" />AI Analysis</TabsTrigger>
          <TabsTrigger value="terms" disabled={!corpusId} data-testid="tab-terms"><BookText className="w-3.5 h-3.5 mr-1.5" />Terminology</TabsTrigger>
          <TabsTrigger value="export" disabled={!corpusId} data-testid="tab-export"><Download className="w-3.5 h-3.5 mr-1.5" />Export</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold text-sm mb-3">Add your corpus</h3>
            <p className="text-xs text-muted-foreground mb-4">Upload one or more files - they will be merged into a single corpus for analysis.</p>
            <FileUpload onFilesSelected={setSelectedFiles} />
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <Button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || uploadMutation.isPending}
                data-testid="button-upload"
              >
                {uploadMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Upload & Process
              </Button>
              <span className="text-xs text-muted-foreground">or</span>
              <Button
                variant="secondary"
                onClick={() => sampleMutation.mutate()}
                disabled={sampleMutation.isPending}
                data-testid="button-sample"
              >
                {sampleMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Use Sample Corpus
              </Button>
            </div>
          </Card>
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="stats-overview">
              <MetricCard label="Words" value={stats.words} />
              <MetricCard label="Unique" value={stats.uniqueWords} />
              <MetricCard label="Sentences" value={stats.sentences} />
              <MetricCard label="TTR" value={stats.typeTokenRatio.toFixed(3)} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          {stats && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard label="Characters" value={stats.characters} />
                <MetricCard label="Words" value={stats.words} />
                <MetricCard label="Unique Words" value={stats.uniqueWords} />
                <MetricCard label="Sentences" value={stats.sentences} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="Type-Token Ratio" value={stats.typeTokenRatio.toFixed(4)} />
                <MetricCard label="Avg Words/Sentence" value={stats.avgWordsPerSentence} />
              </div>
              <Card className="p-5">
                <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                  <h3 className="font-semibold text-sm">Keywords</h3>
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
                {keywordsMutation.isPending && (
                  <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
                )}
                {keywords.length > 0 && (
                  <div className="space-y-4">
                    <div className="h-64" data-testid="chart-keywords">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={keywords.slice(0, 15)}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="term" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="frequency" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="max-h-64 overflow-auto">
                      <table className="w-full text-sm" data-testid="table-keywords">
                        <thead className="sticky top-0 bg-card">
                          <tr className="border-b text-left">
                            <th className="py-2 px-3 font-medium text-muted-foreground">#</th>
                            <th className="py-2 px-3 font-medium text-muted-foreground">Term</th>
                            <th className="py-2 px-3 font-medium text-muted-foreground text-right">Frequency</th>
                          </tr>
                        </thead>
                        <tbody>
                          {keywords.map((kw, i) => (
                            <tr key={kw.term} className="border-b border-border/50 hover:bg-muted/30">
                              <td className="py-1.5 px-3 text-muted-foreground text-xs">{i + 1}</td>
                              <td className="py-1.5 px-3 font-medium">{kw.term}</td>
                              <td className="py-1.5 px-3 text-right tabular-nums">{kw.frequency}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="collocations" className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
              <h3 className="font-semibold text-sm">Collocations</h3>
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
            {collocationsMutation.isPending && (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
            )}
            {collocations.length > 0 && (
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-sm" data-testid="table-collocations">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b text-left">
                      <th className="py-2 px-3 font-medium text-muted-foreground">Collocate</th>
                      <th className="py-2 px-3 font-medium text-muted-foreground text-right">Freq</th>
                      <th className="py-2 px-3 font-medium text-muted-foreground text-right">MI</th>
                      <th className="py-2 px-3 font-medium text-muted-foreground text-right">Dice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collocations.map((c, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-1.5 px-3 font-medium">{c.collocate}</td>
                        <td className="py-1.5 px-3 text-right tabular-nums">{c.frequency}</td>
                        <td className="py-1.5 px-3 text-right tabular-nums">{c.mi.toFixed(2)}</td>
                        <td className="py-1.5 px-3 text-right tabular-nums">{c.dice.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {collocations.length === 0 && !collocationsMutation.isPending && (
              <p className="text-sm text-muted-foreground text-center py-8">Click "Extract Collocations" to analyze word co-occurrence patterns.</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="concordance" className="space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold text-sm mb-3">KWIC Concordance</h3>
            <div className="flex gap-2 mb-4 flex-wrap">
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
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-sm font-mono" data-testid="table-concordance">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b text-left">
                      <th className="py-2 px-3 font-medium text-muted-foreground text-right w-2/5">Left Context</th>
                      <th className="py-2 px-3 font-medium text-center">Match</th>
                      <th className="py-2 px-3 font-medium text-muted-foreground w-2/5">Right Context</th>
                    </tr>
                  </thead>
                  <tbody>
                    {concordanceResults.map((c, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-1.5 px-3 text-right text-muted-foreground text-xs">{c.left}</td>
                        <td className="py-1.5 px-3 text-center font-bold text-primary text-xs">{c.match}</td>
                        <td className="py-1.5 px-3 text-muted-foreground text-xs">{c.right}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {concordanceResults.length === 0 && !concordanceMutation.isPending && (
              <p className="text-sm text-muted-foreground text-center py-8">Enter a search term to find Key Word In Context matches.</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="ngrams" className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-sm">N-grams</h3>
                <Select value={ngramN} onValueChange={setNgramN}>
                  <SelectTrigger className="w-24" data-testid="select-ngram-n">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">Bigrams</SelectItem>
                    <SelectItem value="3">Trigrams</SelectItem>
                    <SelectItem value="4">4-grams</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                onClick={() => ngramsMutation.mutate()}
                disabled={ngramsMutation.isPending}
                data-testid="button-extract-ngrams"
              >
                {ngramsMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Extract N-grams
              </Button>
            </div>
            {ngramsMutation.isPending && (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
            )}
            {ngrams.length > 0 && (
              <div className="space-y-4">
                <div className="h-64" data-testid="chart-ngrams">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ngrams.slice(0, 12)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="ngram" type="category" width={150} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="frequency" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-sm" data-testid="table-ngrams">
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b text-left">
                        <th className="py-2 px-3 font-medium text-muted-foreground">#</th>
                        <th className="py-2 px-3 font-medium text-muted-foreground">N-gram</th>
                        <th className="py-2 px-3 font-medium text-muted-foreground text-right">Frequency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ngrams.map((ng, i) => (
                        <tr key={ng.ngram} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-1.5 px-3 text-muted-foreground text-xs">{i + 1}</td>
                          <td className="py-1.5 px-3 font-medium">{ng.ngram}</td>
                          <td className="py-1.5 px-3 text-right tabular-nums">{ng.frequency}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {ngrams.length === 0 && !ngramsMutation.isPending && (
              <p className="text-sm text-muted-foreground text-center py-8">Select n-gram size and click extract to analyze word sequences.</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold text-sm mb-3">AI Corpus Summary</h3>
            <Button
              onClick={() => aiMutation.mutate("summary")}
              disabled={aiMutation.isPending}
              data-testid="button-ai-summarize"
            >
              {aiMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
              Generate Summary
            </Button>
            {aiMutation.isPending && (
              <div className="mt-4 space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-4 w-full" />)}</div>
            )}
            {aiResult && (
              <div className="mt-4 p-4 bg-muted/30 rounded-md" data-testid="text-ai-result">
                <MarkdownRender content={aiResult} />
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="terms" className="space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold text-sm mb-3">AI Terminology Extraction</h3>
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
              <div className="mt-4 p-4 bg-muted/30 rounded-md" data-testid="text-terms-result">
                <MarkdownRender content={termsResult} />
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold text-sm mb-3">Export</h3>
            <p className="text-xs text-muted-foreground mb-4">Generate an academic-ready research report for papers, dissertations, or methodology sections.</p>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="secondary"
                onClick={async () => {
                  const res = await apiRequest("POST", "/api/export/report", { corpusId, aiSummary: aiResult });
                  const text = await res.text();
                  const blob = new Blob([text], { type: "text/markdown" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "transcorpus_report.md";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                data-testid="button-export-report"
              >
                <FileText className="w-4 h-4 mr-2" />
                Download Report (MD)
              </Button>
              {keywords.length > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    const csv = "Term,Frequency\n" + keywords.map((k) => `${k.term},${k.frequency}`).join("\n");
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "keywords.csv";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  data-testid="button-export-keywords-csv"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Keywords CSV
                </Button>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
