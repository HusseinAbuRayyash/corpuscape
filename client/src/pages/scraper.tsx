import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { AIAnalysisPanel } from "@/components/ai-analysis-panel";
import { CorpusFilter } from "@/components/corpus-filter";
import { EditableChart } from "@/components/editable-chart";
import { TableDownload } from "@/components/table-download";
import { MarkdownRender } from "@/components/markdown-render";
import { WordCloud } from "@/components/word-cloud";
import { ReportGenerator } from "@/components/report-generator";
import {
  Loader2, Newspaper, Globe, Plus, X, Trash2, Edit3, Check, Send,
  FileText, ExternalLink, ChevronDown, ChevronUp, Brain, Download,
  BarChart3, Link2, Search, Hash, BookText, TrendingUp, BookOpen, Upload, Cloud,
} from "lucide-react";
import type { CorpusStats, KeywordResult, NgramResult, CollocationResult, ConcordanceResult } from "@shared/schema";

interface ScrapedArticle {
  url: string;
  title: string;
  content: string;
  wordCount: number;
  scrapedAt: string;
}

export default function Scraper() {
  const { toast } = useToast();
  const [urlInput, setUrlInput] = useState("");
  const [urls, setUrls] = useState<string[]>([]);
  const [articles, setArticles] = useState<ScrapedArticle[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [scraperCorpusId, setScraperCorpusId] = useState<string | null>(null);
  const [corpusStats, setCorpusStats] = useState<CorpusStats | null>(null);

  const [keywords, setKeywords] = useState<KeywordResult[]>([]);
  const [ngrams, setNgrams] = useState<NgramResult[]>([]);
  const [collocations, setCollocations] = useState<CollocationResult[]>([]);
  const [concordanceResults, setConcordanceResults] = useState<ConcordanceResult[]>([]);
  const [concordanceQuery, setConcordanceQuery] = useState("");
  const [ngramN, setNgramN] = useState("2");
  const [aiResult, setAiResult] = useState("");
  const [termsResult, setTermsResult] = useState("");
  const [originalCorpusId, setOriginalCorpusId] = useState<string | null>(null);
  const [originalCorpusStats, setOriginalCorpusStats] = useState<CorpusStats | null>(null);
  const [isFiltered, setIsFiltered] = useState(false);
  const [filteredStats, setFilteredStats] = useState<CorpusStats | null>(null);

  const addUrl = useCallback(() => {
    const trimmed = urlInput.trim();
    if (trimmed && !urls.includes(trimmed)) {
      try {
        new URL(trimmed);
        setUrls((prev) => [...prev, trimmed]);
        setUrlInput("");
      } catch {
        toast({ title: "Invalid URL", description: "Please enter a valid URL starting with http:// or https://", variant: "destructive" });
      }
    }
  }, [urlInput, urls, toast]);

  const removeUrl = (index: number) => setUrls((prev) => prev.filter((_, i) => i !== index));

  const scrapeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/scrape", { urls });
      return res.json();
    },
    onSuccess: (data) => {
      setArticles(data.articles);
      const successCount = data.articles.filter((a: ScrapedArticle) => a.wordCount > 0).length;
      toast({ title: "Scraping complete", description: `${successCount} of ${data.articles.length} articles scraped successfully` });
    },
    onError: () => toast({ title: "Scraping failed", variant: "destructive" }),
  });

  const createCorpusMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/scrape/to-corpus", { text });
      return res.json();
    },
    onSuccess: (data) => {
      setScraperCorpusId(data.corpusId);
      setCorpusStats(data.stats);
      setKeywords([]);
      setNgrams([]);
      setCollocations([]);
      setConcordanceResults([]);
      setAiResult("");
      setTermsResult("");
      toast({ title: "Corpus created", description: `${data.stats.words.toLocaleString()} words ready for analysis` });
    },
    onError: () => toast({ title: "Failed to create corpus", variant: "destructive" }),
  });

  const keywordsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/corpus/keywords", { corpusId: scraperCorpusId, topN: 30 });
      return res.json();
    },
    onSuccess: setKeywords,
  });

  const ngramsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/corpus/ngrams", { corpusId: scraperCorpusId, n: parseInt(ngramN), topN: 25 });
      return res.json();
    },
    onSuccess: setNgrams,
  });

  const collocationsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/corpus/collocations", { corpusId: scraperCorpusId });
      return res.json();
    },
    onSuccess: setCollocations,
  });

  const concordanceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/corpus/concordance", { corpusId: scraperCorpusId, query: concordanceQuery });
      return res.json();
    },
    onSuccess: setConcordanceResults,
  });

  const aiMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/summarize", { corpusId: scraperCorpusId });
      return res.json();
    },
    onSuccess: (data) => setAiResult(data.result),
  });

  const termsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/terminology", { corpusId: scraperCorpusId });
      return res.json();
    },
    onSuccess: (data) => setTermsResult(data.result),
  });

  const buildCorpus = () => {
    const validArticles = articles.filter((a) => a.wordCount > 0);
    if (validArticles.length === 0) {
      toast({ title: "No content", description: "No valid articles to analyze", variant: "destructive" });
      return;
    }
    const merged = validArticles.map((a) => `## ${a.title}\n\n${a.content}`).join("\n\n---\n\n");
    createCorpusMutation.mutate(merged);
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditContent(articles[index].content);
  };

  const saveEdit = (index: number) => {
    setArticles((prev) => prev.map((a, i) => i === index ? { ...a, content: editContent, wordCount: editContent.split(/\s+/).filter((w) => w.length > 0).length } : a));
    setEditingIndex(null);
    setEditContent("");
  };

  const removeArticle = (index: number) => {
    setArticles((prev) => prev.filter((_, i) => i !== index));
    if (expandedIndex === index) setExpandedIndex(null);
    if (editingIndex === index) setEditingIndex(null);
  };

  const downloadArticleText = (article: ScrapedArticle) => {
    const blob = new Blob([`${article.title}\n${"=".repeat(article.title.length)}\nSource: ${article.url}\n\n${article.content}`], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${article.title.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "_").slice(0, 50)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadAllTexts = () => {
    const validArticles = articles.filter((a) => a.wordCount > 0);
    const combined = validArticles.map((a) => `${"=".repeat(60)}\n${a.title}\nSource: ${a.url}\n${"=".repeat(60)}\n\n${a.content}`).join("\n\n\n");
    const blob = new Blob([combined], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `scraped_corpus_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const totalWords = articles.reduce((s, a) => s + a.wordCount, 0);
  const validCount = articles.filter((a) => a.wordCount > 0).length;

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
      >
        <div className="flex items-center gap-3.5 mb-1">
          <div className="page-header-icon bg-gradient-to-br from-amber-500 to-orange-600">
            <Newspaper className="w-5 h-5 text-white relative z-10" />
          </div>
          <div>
            <h1 className="text-3xl font-bold italic tracking-tight text-amber-600 dark:text-amber-400" style={{ fontFamily: "'Playfair Display', serif" }} data-testid="text-page-title">Web Scraper</h1>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="polished-card overflow-hidden"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      >
        <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500" />
        <div className="p-6 md:p-7">
          <motion.div
            className="flex items-center gap-3 mb-5"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md" style={{ boxShadow: "0 4px 12px -2px rgba(245,158,11,0.3)" }}>
              <Globe className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold tracking-tight text-amber-600 dark:text-amber-400" style={{ fontFamily: "'Playfair Display', serif" }}>Add URLs to Scrape</h3>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
          >
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="https://example.com/article..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }}
                className="flex-1 border-amber-200 dark:border-amber-800/30 focus-visible:ring-amber-400/40"
                data-testid="input-url"
              />
              <Button onClick={addUrl} size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm" data-testid="button-add-url">
                <Plus className="w-4 h-4 mr-1" />Add
              </Button>
            </div>
          </motion.div>

          <AnimatePresence>
            {urls.length > 0 && (
              <motion.div
                className="space-y-2 mb-4"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                {urls.map((url, i) => (
                  <motion.div
                    key={url}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-amber-50/60 to-orange-50/40 dark:from-amber-950/20 dark:to-orange-950/10 text-sm group border border-amber-200/50 dark:border-amber-800/20"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    data-testid={`url-item-${i}`}
                  >
                    <Globe className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    <span className="flex-1 truncate font-mono text-xs">{url}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeUrl(i)}
                      data-testid={`button-remove-url-${i}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            <Button
              onClick={() => scrapeMutation.mutate()}
              disabled={urls.length === 0 || scrapeMutation.isPending}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
              data-testid="button-scrape"
            >
              {scrapeMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Newspaper className="w-4 h-4 mr-2" />
              )}
              {scrapeMutation.isPending ? "Scraping..." : `Scrape ${urls.length} URL${urls.length !== 1 ? "s" : ""}`}
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {scrapeMutation.isPending && (
        <div className="polished-card p-6 loading-shine">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      )}

      {articles.length > 0 && (
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <h3 className="font-bold text-sm">Scraped Articles</h3>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">{validCount} valid</span>
                <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{totalWords.toLocaleString()} words</span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadAllTexts}
                disabled={validCount === 0}
                data-testid="button-download-all"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />Download All
              </Button>
              {corpusStats && (
                <ReportGenerator
                  title="Web Scraper Corpus Analysis Report"
                  stats={corpusStats}
                  keywords={keywords}
                  collocations={collocations}
                  ngrams={ngrams}
                  aiResults={{
                    ...(aiResult ? { "AI Summary": aiResult } : {}),
                    ...(termsResult ? { "Terminology Extraction": termsResult } : {}),
                  }}
                />
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setArticles([]); setScraperCorpusId(null); setCorpusStats(null); }}
                data-testid="button-clear-articles"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />Clear All
              </Button>
              <Button
                size="sm"
                onClick={buildCorpus}
                disabled={validCount === 0 || createCorpusMutation.isPending}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                data-testid="button-build-corpus"
              >
                {createCorpusMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                )}
                Build Corpus & Analyze
              </Button>
            </div>
          </div>

          {articles.map((article, i) => (
            <motion.div
              key={`${article.url}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div
                className={`polished-card overflow-hidden ${article.wordCount === 0 ? "border-destructive/30 bg-destructive/5" : ""}`}
                data-testid={`card-article-${i}`}
              >
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${article.wordCount > 0 ? "bg-gradient-to-br from-amber-500/15 to-orange-500/5 text-amber-600" : "bg-destructive/10 text-destructive"}`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate" data-testid={`text-article-title-${i}`}>{article.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="truncate max-w-[200px] font-mono">{article.url}</span>
                      <span>·</span>
                      <span className="font-medium">{article.wordCount.toLocaleString()} words</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-7 h-7"
                      onClick={(e) => { e.stopPropagation(); window.open(article.url, "_blank"); }}
                      data-testid={`button-open-url-${i}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                    {article.wordCount > 0 && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-7 h-7"
                          onClick={(e) => { e.stopPropagation(); downloadArticleText(article); }}
                          data-testid={`button-download-article-${i}`}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-7 h-7"
                          onClick={(e) => { e.stopPropagation(); editingIndex === i ? saveEdit(i) : startEditing(i); }}
                          data-testid={`button-edit-article-${i}`}
                        >
                          {editingIndex === i ? <Check className="w-3.5 h-3.5 text-amber-600" /> : <Edit3 className="w-3.5 h-3.5" />}
                        </Button>
                      </>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-7 h-7 text-destructive"
                      onClick={(e) => { e.stopPropagation(); removeArticle(i); }}
                      data-testid={`button-delete-article-${i}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    {expandedIndex === i ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedIndex === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 border-t">
                        {editingIndex === i ? (
                          <div className="mt-3 space-y-3">
                            <Textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="min-h-[200px] font-mono text-xs resize-y"
                              data-testid={`textarea-edit-${i}`}
                            />
                            <div className="flex gap-2 justify-end">
                              <Button size="sm" variant="secondary" onClick={() => setEditingIndex(null)} data-testid={`button-cancel-edit-${i}`}>Cancel</Button>
                              <Button size="sm" onClick={() => saveEdit(i)} data-testid={`button-save-edit-${i}`}>
                                <Check className="w-3.5 h-3.5 mr-1" />Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 text-sm whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-auto p-4 rounded-lg bg-muted/20 border border-border/30" data-testid={`text-article-content-${i}`}>
                            {article.content}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {corpusStats && scraperCorpusId && (
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="polished-card overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500" />
            <div className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold tracking-tight text-amber-600 dark:text-amber-400" style={{ fontFamily: "'Playfair Display', serif" }}>Corpus Analysis</h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <MetricCard label="Words" value={corpusStats.words} index={0} />
                <MetricCard label="Unique Words" value={corpusStats.uniqueWords} index={1} />
                <MetricCard label="Sentences" value={corpusStats.sentences} index={2} />
                <MetricCard label="Avg Word Length" value={corpusStats.avgWordLength} index={3} />
              </div>

              <div className="mb-6">
                <CorpusFilter
                  corpusId={originalCorpusId || scraperCorpusId}
                  originalStats={originalCorpusStats || corpusStats}
                  isFiltered={isFiltered}
                  filteredStats={isFiltered ? corpusStats : null}
                  theme={{ gradient: "from-amber-500 to-orange-600", accent: "text-amber-500", text: "text-amber-600 dark:text-amber-400" }}
                  onFilterApplied={(filteredCorpusId, newStats) => {
                    if (!originalCorpusId) {
                      setOriginalCorpusId(scraperCorpusId);
                    }
                    if (!originalCorpusStats) {
                      setOriginalCorpusStats(corpusStats);
                    }
                    setScraperCorpusId(filteredCorpusId);
                    setCorpusStats(newStats);
                    setFilteredStats(newStats);
                    setIsFiltered(true);
                    setKeywords([]);
                    setNgrams([]);
                    setCollocations([]);
                    setConcordanceResults([]);
                    setAiResult("");
                    setTermsResult("");
                  }}
                  onFilterCleared={() => {
                    if (originalCorpusId) setScraperCorpusId(originalCorpusId);
                    if (originalCorpusStats) setCorpusStats(originalCorpusStats);
                    setIsFiltered(false);
                    setFilteredStats(null);
                    setOriginalCorpusId(null);
                    setOriginalCorpusStats(null);
                    setKeywords([]);
                    setNgrams([]);
                    setCollocations([]);
                    setConcordanceResults([]);
                    setAiResult("");
                    setTermsResult("");
                  }}
                />
              </div>

              <Tabs defaultValue="keywords" className="w-full">
                <TabsList className="w-full justify-start overflow-x-auto scrollbar-hide flex-nowrap" data-testid="tabs-analysis">
                  <TabsTrigger value="keywords" className="gap-1.5 text-xs" data-testid="tab-keywords">
                    <TrendingUp className="w-3.5 h-3.5" />Keywords
                  </TabsTrigger>
                  <TabsTrigger value="ngrams" className="gap-1.5 text-xs" data-testid="tab-ngrams">
                    <Hash className="w-3.5 h-3.5" />N-Grams
                  </TabsTrigger>
                  <TabsTrigger value="collocations" className="gap-1.5 text-xs" data-testid="tab-collocations">
                    <Link2 className="w-3.5 h-3.5" />Collocations
                  </TabsTrigger>
                  <TabsTrigger value="concordance" className="gap-1.5 text-xs" data-testid="tab-concordance">
                    <Search className="w-3.5 h-3.5" />Concordance
                  </TabsTrigger>
                  <TabsTrigger value="ai" className="gap-1.5 text-xs" data-testid="tab-ai">
                    <Brain className="w-3.5 h-3.5" />AI Summary
                  </TabsTrigger>
                  <TabsTrigger value="terms" className="gap-1.5 text-xs" data-testid="tab-terms">
                    <BookText className="w-3.5 h-3.5" />Terminology
                  </TabsTrigger>
                  <TabsTrigger value="wordcloud" className="gap-1.5 text-xs" data-testid="tab-wordcloud">
                    <Cloud className="w-3.5 h-3.5" />Word Cloud
                  </TabsTrigger>
                  <TabsTrigger value="insights" className="gap-1.5 text-xs" data-testid="tab-insights">
                    <BookOpen className="w-3.5 h-3.5" />AI Insights
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="keywords" className="mt-4 space-y-4">
                  <Button
                    onClick={() => keywordsMutation.mutate()}
                    disabled={keywordsMutation.isPending}
                    size="sm"
                    className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                    data-testid="button-extract-keywords"
                  >
                    {keywordsMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
                    Extract Keywords
                  </Button>
                  {keywords.length > 0 && (
                    <>
                      <TableDownload
                        headers={["Keyword", "Frequency", "Score"]}
                        rows={keywords.map((k) => [k.word, k.frequency, k.score])}
                        filename="scraper_keywords"
                      />
                      <EditableChart
                        data={keywords.slice(0, 20).map((k) => ({ name: k.word, value: k.frequency, score: k.score }))}
                        title="Top Keywords"
                        xKey="name"
                        yKey="value"
                        downloadFilename="scraper_keywords"
                      />
                    </>
                  )}
                </TabsContent>

                <TabsContent value="ngrams" className="mt-4 space-y-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Select value={ngramN} onValueChange={setNgramN}>
                      <SelectTrigger className="w-28" data-testid="select-ngram-n">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">Bigrams</SelectItem>
                        <SelectItem value="3">Trigrams</SelectItem>
                        <SelectItem value="4">4-grams</SelectItem>
                        <SelectItem value="5">5-grams</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => ngramsMutation.mutate()}
                      disabled={ngramsMutation.isPending}
                      size="sm"
                      className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                      data-testid="button-extract-ngrams"
                    >
                      {ngramsMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Hash className="w-4 h-4 mr-2" />}
                      Extract N-Grams
                    </Button>
                  </div>
                  {ngrams.length > 0 && (
                    <>
                      <TableDownload
                        headers={["N-Gram", "Frequency"]}
                        rows={ngrams.map((n) => [n.ngram, n.frequency])}
                        filename="scraper_ngrams"
                      />
                      <EditableChart
                        data={ngrams.slice(0, 20).map((n) => ({ name: n.ngram, value: n.frequency }))}
                        title={`Top ${ngramN === "2" ? "Bigrams" : ngramN === "3" ? "Trigrams" : ngramN + "-grams"}`}
                        xKey="name"
                        yKey="value"
                        downloadFilename="scraper_ngrams"
                      />
                    </>
                  )}
                </TabsContent>

                <TabsContent value="collocations" className="mt-4 space-y-4">
                  <Button
                    onClick={() => collocationsMutation.mutate()}
                    disabled={collocationsMutation.isPending}
                    size="sm"
                    className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                    data-testid="button-extract-collocations"
                  >
                    {collocationsMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
                    Extract Collocations
                  </Button>
                  {collocations.length > 0 && (
                    <>
                      <TableDownload
                        headers={["Collocation", "Frequency", "MI Score"]}
                        rows={collocations.map((c) => [c.collocation, c.frequency, c.miScore])}
                        filename="scraper_collocations"
                      />
                      <EditableChart
                        data={collocations.slice(0, 20).map((c) => ({ name: c.collocation, value: c.miScore, frequency: c.frequency }))}
                        title="Top Collocations (MI Score)"
                        xKey="name"
                        yKey="value"
                        downloadFilename="scraper_collocations"
                      />
                    </>
                  )}
                </TabsContent>

                <TabsContent value="concordance" className="mt-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <Input
                      placeholder="Search word or phrase..."
                      value={concordanceQuery}
                      onChange={(e) => setConcordanceQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") concordanceMutation.mutate(); }}
                      className="flex-1 border-amber-200 dark:border-amber-800/30"
                      data-testid="input-concordance"
                    />
                    <Button
                      onClick={() => concordanceMutation.mutate()}
                      disabled={!concordanceQuery.trim() || concordanceMutation.isPending}
                      size="sm"
                      className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                      data-testid="button-search-concordance"
                    >
                      {concordanceMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                      Search
                    </Button>
                  </div>
                  {concordanceResults.length > 0 && (
                    <>
                      <TableDownload
                        headers={["Left Context", "Keyword", "Right Context"]}
                        rows={concordanceResults.map((c) => [c.left, c.keyword, c.right])}
                        filename="scraper_concordance"
                      />
                      <div className="space-y-1 max-h-[400px] overflow-auto">
                        {concordanceResults.map((c, i) => (
                          <div key={i} className="flex text-xs font-mono py-1.5 px-3 rounded hover:bg-muted/30 transition-colors" data-testid={`concordance-row-${i}`}>
                            <span className="text-right flex-1 text-muted-foreground truncate">{c.left}</span>
                            <span className="mx-2 font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">{c.keyword}</span>
                            <span className="flex-1 text-muted-foreground truncate">{c.right}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="ai" className="mt-4 space-y-4">
                  <Button
                    onClick={() => aiMutation.mutate()}
                    disabled={aiMutation.isPending}
                    size="sm"
                    className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                    data-testid="button-ai-summarize"
                  >
                    {aiMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
                    Generate AI Summary
                  </Button>
                  {aiMutation.isPending && <Skeleton className="h-32 w-full" />}
                  {aiResult && <MarkdownRender content={aiResult} downloadFilename="scraper_ai_summary" />}
                </TabsContent>

                <TabsContent value="terms" className="mt-4 space-y-4">
                  <Button
                    onClick={() => termsMutation.mutate()}
                    disabled={termsMutation.isPending}
                    size="sm"
                    className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                    data-testid="button-extract-terms"
                  >
                    {termsMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BookText className="w-4 h-4 mr-2" />}
                    Extract Terminology
                  </Button>
                  {termsMutation.isPending && <Skeleton className="h-32 w-full" />}
                  {termsResult && <MarkdownRender content={termsResult} downloadFilename="scraper_terminology" />}
                </TabsContent>

                <TabsContent value="wordcloud" className="mt-4 space-y-4">
                  {keywords.length === 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">Extract keywords first to generate a word cloud.</p>
                      <Button
                        onClick={() => keywordsMutation.mutate()}
                        disabled={keywordsMutation.isPending}
                        size="sm"
                        className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                        data-testid="button-wordcloud-extract-keywords"
                      >
                        {keywordsMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
                        Extract Keywords
                      </Button>
                    </div>
                  ) : (
                    <WordCloud
                      words={keywords.map((k) => ({ text: k.term, value: k.frequency }))}
                      defaultColors={["#78350f", "#92400e", "#b45309", "#d97706", "#f59e0b", "#fbbf24", "#fcd34d"]}
                    />
                  )}
                </TabsContent>

                <TabsContent value="insights" className="mt-4">
                  <AIAnalysisPanel
                    corpusId={scraperCorpusId}
                    theme={{
                      gradient: "from-amber-500 to-orange-600",
                      accent: "text-amber-500",
                      text: "text-amber-600 dark:text-amber-400"
                    }}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
