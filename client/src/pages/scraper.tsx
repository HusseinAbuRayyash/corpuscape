import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Newspaper, Globe, Plus, X, Trash2, Edit3, Check, Send,
  FileText, ExternalLink, ChevronDown, ChevronUp,
} from "lucide-react";

interface ScrapedArticle {
  url: string;
  title: string;
  content: string;
  wordCount: number;
  scrapedAt: string;
}

export default function Scraper() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [urlInput, setUrlInput] = useState("");
  const [urls, setUrls] = useState<string[]>([]);
  const [articles, setArticles] = useState<ScrapedArticle[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

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

  const corpusMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/scrape/to-corpus", { text });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Corpus created", description: `${data.stats.words.toLocaleString()} words ready for analysis` });
      sessionStorage.setItem("scraped_corpus_id", data.corpusId);
      sessionStorage.setItem("scraped_corpus_stats", JSON.stringify(data.stats));
      setLocation("/monolingual");
    },
    onError: () => toast({ title: "Failed to create corpus", variant: "destructive" }),
  });

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

  const mergeAndSend = () => {
    const validArticles = articles.filter((a) => a.wordCount > 0);
    if (validArticles.length === 0) {
      toast({ title: "No content", description: "No valid articles to analyze", variant: "destructive" });
      return;
    }
    const merged = validArticles.map((a) => `## ${a.title}\n\n${a.content}`).join("\n\n---\n\n");
    corpusMutation.mutate(merged);
  };

  const totalWords = articles.reduce((s, a) => s + a.wordCount, 0);
  const validCount = articles.filter((a) => a.wordCount > 0).length;

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
            <h1 className="text-2xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400" data-testid="text-page-title">Web Scraper</h1>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="polished-card p-6">
          <div className="section-header">
            <Globe className="w-4 h-4 text-amber-500" />
            <h3>Add URLs to scrape</h3>
          </div>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="https://example.com/article..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }}
              className="flex-1"
              data-testid="input-url"
            />
            <Button onClick={addUrl} size="sm" variant="secondary" data-testid="button-add-url">
              <Plus className="w-4 h-4 mr-1" />Add
            </Button>
          </div>

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
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-muted/50 to-muted/30 text-sm group border border-border/40"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    data-testid={`url-item-${i}`}
                  >
                    <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
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

          <Button
            onClick={() => scrapeMutation.mutate()}
            disabled={urls.length === 0 || scrapeMutation.isPending}
            className="w-full sm:w-auto"
            data-testid="button-scrape"
          >
            {scrapeMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Newspaper className="w-4 h-4 mr-2" />
            )}
            {scrapeMutation.isPending ? "Scraping..." : `Scrape ${urls.length} URL${urls.length !== 1 ? "s" : ""}`}
          </Button>
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
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{validCount} valid</span>
                <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{totalWords.toLocaleString()} words</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setArticles([])}
                data-testid="button-clear-articles"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />Clear All
              </Button>
              <Button
                size="sm"
                onClick={mergeAndSend}
                disabled={validCount === 0 || corpusMutation.isPending}
                data-testid="button-send-to-analysis"
              >
                {corpusMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                )}
                Send to Monolingual Analysis
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
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${article.wordCount > 0 ? "bg-gradient-to-br from-primary/15 to-primary/5 text-primary" : "bg-destructive/10 text-destructive"}`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate">{article.title}</h4>
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
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-7 h-7"
                        onClick={(e) => { e.stopPropagation(); editingIndex === i ? saveEdit(i) : startEditing(i); }}
                        data-testid={`button-edit-article-${i}`}
                      >
                        {editingIndex === i ? <Check className="w-3.5 h-3.5 text-primary" /> : <Edit3 className="w-3.5 h-3.5" />}
                      </Button>
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
                          <div className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-64 overflow-auto font-mono text-xs p-3 rounded-lg bg-muted/20" data-testid={`text-article-content-${i}`}>
                            {article.content.slice(0, 3000)}
                            {article.content.length > 3000 && (
                              <span className="text-primary font-sans text-xs ml-1">... ({article.content.length - 3000} more characters)</span>
                            )}
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

      {articles.length === 0 && !scrapeMutation.isPending && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="empty-state">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center mb-4">
              <Newspaper className="w-8 h-8 text-amber-500/40" />
            </div>
            <h3 className="font-semibold text-sm mb-1.5">No articles scraped yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Add one or more URLs above and click "Scrape" to extract text content from web pages.
              You can then edit, clean, and send the scraped data to the analysis pipeline.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
