import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SaveToLibrary } from "@/components/save-to-library";
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
import { AIResultDisplay } from "@/components/ai-result-display";
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
  const [cloudWords, setCloudWords] = useState<{text: string; value: number}[]>([]);
  const [kwChartExpanded, setKwChartExpanded] = useState(false);
  const [kwTableExpanded, setKwTableExpanded] = useState(false);
  const [ngChartExpanded, setNgChartExpanded] = useState(false);
  const [ngTableExpanded, setNgTableExpanded] = useState(false);
  const [colTableExpanded, setColTableExpanded] = useState(false);

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
      const res = await apiRequest("POST", "/api/corpus/keywords", { corpusId: scraperCorpusId, topN: 100 });
      return res.json();
    },
    onSuccess: (data) => {
      setKeywords(data);
      setCloudWords(data.map((kw: any) => ({ text: kw.term, value: kw.frequency })));
    },
  });

  const ngramsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/corpus/ngrams", { corpusId: scraperCorpusId, n: parseInt(ngramN), topN: 50 });
      return res.json();
    },
    onSuccess: setNgrams,
  });

  const collocationsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/corpus/collocations", { corpusId: scraperCorpusId, topN: 50 });
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
        <div className="flex items-center gap-4 mb-1">
          <div className="page-header-icon bg-gradient-to-br from-amber-500 to-orange-600">
            <Newspaper className="w-5 h-5 text-white relative z-10" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold italic tracking-tight text-amber-600 dark:text-amber-400" style={{ fontFamily: "'Playfair Display', serif" }} data-testid="text-page-title">Web Scraper</h1>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5 font-medium tracking-wide">Scrape, clean & analyze web content</p>
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
          <div className="flex justify-end">
            <SaveToLibrary
              type="monolingual"
              sourceTrack="scraper"
              sizeLabel={`${corpusStats.words.toLocaleString()} words`}
              samplePairs={articles.slice(0, 20).map(a => ({ source: a.title + "\n\n" + a.content.slice(0, 200) }))}
              defaultName={`Web Corpus (${articles.length} articles)`}
              accentClass="from-amber-500 to-orange-600"
            />
          </div>
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
                <MetricCard label="Avg Words/Sentence" value={corpusStats.avgWordsPerSentence} index={3} />
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

                <TabsContent value="keywords" className="mt-4">
                  <motion.div className="polished-card p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="section-header">
                      <TrendingUp className="w-4 h-4 text-amber-500" />
                      <h3>Keywords</h3>
                      <div className="ml-auto">
                        <Button
                          onClick={() => keywordsMutation.mutate()}
                          disabled={keywordsMutation.isPending}
                          size="sm"
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
                            filename="Scraper_Keywords"
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
                        <p className="text-sm text-muted-foreground">Click "Extract Keywords" to discover the most frequent terms.</p>
                      </div>
                    )}
                  </motion.div>
                </TabsContent>

                <TabsContent value="ngrams" className="mt-4">
                  <motion.div className="polished-card p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="section-header">
                      <Hash className="w-4 h-4 text-amber-500" />
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
                            <SelectItem value="5">5-grams</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={() => ngramsMutation.mutate()}
                          disabled={ngramsMutation.isPending}
                          size="sm"
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
                            filename="Scraper_Ngrams"
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
                                  <td className="py-2 px-3 font-semibold text-sm">{ng.ngram}</td>
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
                        <p className="text-sm text-muted-foreground">Select an n-gram size and click "Extract" to find recurring phrases.</p>
                      </div>
                    )}
                  </motion.div>
                </TabsContent>

                <TabsContent value="collocations" className="mt-4">
                  <motion.div className="polished-card p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="section-header">
                      <Link2 className="w-4 h-4 text-amber-500" />
                      <h3>Collocations</h3>
                      <div className="ml-auto">
                        <Button
                          onClick={() => collocationsMutation.mutate()}
                          disabled={collocationsMutation.isPending}
                          size="sm"
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
                            filename="Scraper_Collocations"
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

                <TabsContent value="concordance" className="mt-4">
                  <motion.div className="polished-card p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="section-header">
                      <Search className="w-4 h-4 text-amber-500" />
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
                        data-testid="button-search-concordance"
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
                            filename="Scraper_Concordance"
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
                                  <td className="py-2 px-3 text-center font-bold text-amber-600 dark:text-amber-400 text-xs">{c.match}</td>
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

                <TabsContent value="ai" className="mt-4">
                  <motion.div className="polished-card p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="section-header">
                      <Brain className="w-4 h-4 text-amber-500" />
                      <h3>AI Summary</h3>
                      <div className="ml-auto">
                        <Button
                          onClick={() => aiMutation.mutate()}
                          disabled={aiMutation.isPending}
                          size="sm"
                          data-testid="button-ai-summarize"
                        >
                          {aiMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
                          Generate AI Summary
                        </Button>
                      </div>
                    </div>
                    {aiMutation.isPending && <Skeleton className="h-32 w-full" />}
                    {aiResult && <AIResultDisplay content={aiResult} onContentChange={setAiResult} downloadFilename="Scraper_AI_Summary" />}
                    {!aiResult && !aiMutation.isPending && (
                      <div className="empty-state">
                        <Brain className="w-10 h-10 text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">Click "Generate AI Summary" to get an automated overview of the corpus.</p>
                      </div>
                    )}
                  </motion.div>
                </TabsContent>

                <TabsContent value="terms" className="mt-4">
                  <motion.div className="polished-card p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="section-header">
                      <BookText className="w-4 h-4 text-amber-500" />
                      <h3>Terminology Extraction</h3>
                      <div className="ml-auto">
                        <Button
                          onClick={() => termsMutation.mutate()}
                          disabled={termsMutation.isPending}
                          size="sm"
                          data-testid="button-extract-terms"
                        >
                          {termsMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BookText className="w-4 h-4 mr-2" />}
                          Extract Terminology
                        </Button>
                      </div>
                    </div>
                    {termsMutation.isPending && <Skeleton className="h-32 w-full" />}
                    {termsResult && <AIResultDisplay content={termsResult} onContentChange={setTermsResult} downloadFilename="Scraper_Terminology" />}
                    {!termsResult && !termsMutation.isPending && (
                      <div className="empty-state">
                        <BookText className="w-10 h-10 text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">Click "Extract Terminology" to identify domain-specific terms.</p>
                      </div>
                    )}
                  </motion.div>
                </TabsContent>

                <TabsContent value="wordcloud" className="mt-4">
                  <motion.div className="polished-card p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="section-header">
                      <Cloud className="w-4 h-4 text-amber-500" />
                      <h3>Word Cloud</h3>
                    </div>
                    {keywords.length === 0 ? (
                      <div className="empty-state">
                        <Cloud className="w-10 h-10 text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground mb-3">Extract keywords first to generate a word cloud.</p>
                        <Button
                          onClick={() => keywordsMutation.mutate()}
                          disabled={keywordsMutation.isPending}
                          size="sm"
                          data-testid="button-wordcloud-extract-keywords"
                        >
                          {keywordsMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
                          Extract Keywords
                        </Button>
                      </div>
                    ) : (
                      <WordCloud
                        words={cloudWords.length > 0 ? cloudWords : keywords.map((k) => ({ text: k.term, value: k.frequency }))}
                        defaultColors={["#78350f", "#92400e", "#b45309", "#d97706", "#f59e0b", "#fbbf24", "#fcd34d"]}
                        onWordsChange={setCloudWords}
                      />
                    )}
                  </motion.div>
                </TabsContent>

                <TabsContent value="insights" className="mt-4">
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <AIAnalysisPanel
                      corpusId={scraperCorpusId}
                      theme={{
                        gradient: "from-amber-500 to-orange-600",
                        accent: "text-amber-500",
                        text: "text-amber-600 dark:text-amber-400"
                      }}
                    />
                  </motion.div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
