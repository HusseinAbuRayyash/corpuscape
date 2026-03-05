import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileUpload } from "@/components/file-upload";
import { EditableChart } from "@/components/editable-chart";
import { TableDownload } from "@/components/table-download";
import { MarkdownRender } from "@/components/markdown-render";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Scale, Upload, Loader2, BarChart3, Brain, ArrowLeftRight } from "lucide-react";
import type { CorpusStats, KeywordResult } from "@shared/schema";

interface CompareResult {
  statsA: CorpusStats;
  statsB: CorpusStats;
  keywordsA: KeywordResult[];
  keywordsB: KeywordResult[];
  shared: { term: string; freqA: number; freqB: number }[];
  uniqueA: KeywordResult[];
  uniqueB: KeywordResult[];
}

export default function Compare() {
  const { toast } = useToast();
  const [filesA, setFilesA] = useState<File[]>([]);
  const [filesB, setFilesB] = useState<File[]>([]);
  const [corpusIdA, setCorpusIdA] = useState<string | null>(null);
  const [corpusIdB, setCorpusIdB] = useState<string | null>(null);
  const [statsA, setStatsA] = useState<CorpusStats | null>(null);
  const [statsB, setStatsB] = useState<CorpusStats | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [aiComparison, setAiComparison] = useState("");

  const uploadA = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      const res = await fetch("/api/corpus/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: (data) => {
      setCorpusIdA(data.corpusId);
      setStatsA(data.stats);
      toast({ title: "Corpus A loaded", description: `${data.stats.words.toLocaleString()} words` });
    },
    onError: () => toast({ title: "Upload A failed", variant: "destructive" }),
  });

  const uploadB = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      const res = await fetch("/api/corpus/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: (data) => {
      setCorpusIdB(data.corpusId);
      setStatsB(data.stats);
      toast({ title: "Corpus B loaded", description: `${data.stats.words.toLocaleString()} words` });
    },
    onError: () => toast({ title: "Upload B failed", variant: "destructive" }),
  });

  const compareMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/corpus/compare", { corpusIdA, corpusIdB });
      return res.json();
    },
    onSuccess: (data) => setCompareResult(data),
    onError: () => toast({ title: "Comparison failed", variant: "destructive" }),
  });

  const aiComparisonMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/corpus/compare-ai", { corpusIdA, corpusIdB });
      return res.json();
    },
    onSuccess: (data) => setAiComparison(data.result),
    onError: () => toast({ title: "AI comparison failed", variant: "destructive" }),
  });

  const handleUploadA = useCallback(() => {
    if (filesA.length > 0) uploadA.mutate(filesA);
  }, [filesA]);

  const handleUploadB = useCallback(() => {
    if (filesB.length > 0) uploadB.mutate(filesB);
  }, [filesB]);

  const handleCompare = () => {
    if (corpusIdA && corpusIdB) {
      compareMutation.mutate();
    }
  };

  const StatRow = ({ label, valA, valB }: { label: string; valA: string | number; valB: string | number }) => (
    <tr className="border-b border-border/30">
      <td className="py-2.5 px-4 font-medium text-sm">{label}</td>
      <td className="py-2.5 px-4 text-right tabular-nums text-sm font-semibold text-indigo-600 dark:text-indigo-400">{typeof valA === "number" ? valA.toLocaleString() : valA}</td>
      <td className="py-2.5 px-4 text-right tabular-nums text-sm font-semibold text-amber-600 dark:text-amber-400">{typeof valB === "number" ? valB.toLocaleString() : valB}</td>
    </tr>
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-3.5 mb-2"
      >
        <div className="page-header-icon bg-gradient-to-br from-violet-500 to-purple-600">
          <Scale className="w-5 h-5 text-white relative z-10" />
        </div>
        <div>
          <h1 className="text-3xl font-bold italic tracking-tight text-violet-600 dark:text-violet-400" style={{ fontFamily: "'Playfair Display', serif" }} data-testid="text-page-title">Corpus Comparison</h1>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-5">
        <motion.div
          className="polished-card overflow-hidden"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="h-1 bg-gradient-to-r from-indigo-500 to-blue-500" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">A</span>
              </div>
              <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Corpus A</h3>
              {statsA && <span className="text-[11px] text-muted-foreground ml-auto">{statsA.words.toLocaleString()} words</span>}
            </div>
            <FileUpload onFilesSelected={setFilesA} />
            <Button
              onClick={handleUploadA}
              disabled={filesA.length === 0 || uploadA.isPending}
              className="mt-3 bg-gradient-to-r from-indigo-500 to-blue-600 text-white w-full"
              size="sm"
              data-testid="button-upload-a"
            >
              {uploadA.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload Corpus A
            </Button>
          </div>
        </motion.div>

        <motion.div
          className="polished-card overflow-hidden"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">B</span>
              </div>
              <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400">Corpus B</h3>
              {statsB && <span className="text-[11px] text-muted-foreground ml-auto">{statsB.words.toLocaleString()} words</span>}
            </div>
            <FileUpload onFilesSelected={setFilesB} />
            <Button
              onClick={handleUploadB}
              disabled={filesB.length === 0 || uploadB.isPending}
              className="mt-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white w-full"
              size="sm"
              data-testid="button-upload-b"
            >
              {uploadB.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload Corpus B
            </Button>
          </div>
        </motion.div>
      </div>

      {corpusIdA && corpusIdB && !compareResult && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center">
          <Button
            onClick={handleCompare}
            disabled={compareMutation.isPending}
            className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-8"
            data-testid="button-compare"
          >
            {compareMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowLeftRight className="w-4 h-4 mr-2" />}
            Compare Corpora
          </Button>
        </motion.div>
      )}

      {compareMutation.isPending && (
        <div className="polished-card p-6">
          <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
        </div>
      )}

      {compareResult && (
        <motion.div className="space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="polished-card p-6">
            <div className="section-header">
              <BarChart3 className="w-4 h-4 text-violet-500" />
              <h3>Statistics Comparison</h3>
            </div>
            <div className="overflow-auto rounded-lg border">
              <table className="w-full text-sm polished-table" data-testid="table-stats-comparison">
                <thead className="sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4 text-left">Metric</th>
                    <th className="py-2.5 px-4 text-right text-indigo-600 dark:text-indigo-400">Corpus A</th>
                    <th className="py-2.5 px-4 text-right text-amber-600 dark:text-amber-400">Corpus B</th>
                  </tr>
                </thead>
                <tbody>
                  <StatRow label="Characters" valA={compareResult.statsA.characters} valB={compareResult.statsB.characters} />
                  <StatRow label="Words" valA={compareResult.statsA.words} valB={compareResult.statsB.words} />
                  <StatRow label="Unique Words" valA={compareResult.statsA.uniqueWords} valB={compareResult.statsB.uniqueWords} />
                  <StatRow label="Sentences" valA={compareResult.statsA.sentences} valB={compareResult.statsB.sentences} />
                  <StatRow label="Type-Token Ratio" valA={compareResult.statsA.typeTokenRatio.toFixed(4)} valB={compareResult.statsB.typeTokenRatio.toFixed(4)} />
                  <StatRow label="Avg Words/Sentence" valA={compareResult.statsA.avgWordsPerSentence} valB={compareResult.statsB.avgWordsPerSentence} />
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="polished-card p-5">
              <div className="section-header">
                <BarChart3 className="w-4 h-4 text-indigo-500" />
                <h3>Corpus A — Top Keywords</h3>
              </div>
              <EditableChart
                data={compareResult.keywordsA.slice(0, 10).map(k => ({ label: k.term, value: k.frequency }))}
                defaultTitle=""
                defaultColors={["#4338ca", "#4f46e5", "#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe", "#312e81", "#3730a3", "#1e1b4b", "#e0e7ff"]}
              />
            </div>
            <div className="polished-card p-5">
              <div className="section-header">
                <BarChart3 className="w-4 h-4 text-amber-500" />
                <h3>Corpus B — Top Keywords</h3>
              </div>
              <EditableChart
                data={compareResult.keywordsB.slice(0, 10).map(k => ({ label: k.term, value: k.frequency }))}
                defaultTitle=""
                defaultColors={["#b45309", "#d97706", "#f59e0b", "#fbbf24", "#fcd34d", "#fde68a", "#92400e", "#78350f", "#451a03", "#fef3c7"]}
              />
            </div>
          </div>

          {compareResult.shared.length > 0 && (
            <div className="polished-card p-6">
              <div className="section-header">
                <ArrowLeftRight className="w-4 h-4 text-violet-500" />
                <h3>Shared Keywords ({compareResult.shared.length})</h3>
                <div className="ml-auto">
                  <TableDownload
                    data={compareResult.shared.map(s => ({ term: s.term, freqA: s.freqA, freqB: s.freqB }))}
                    columns={[
                      { header: "Term", key: "term", align: "left" },
                      { header: "Freq (A)", key: "freqA", align: "right" },
                      { header: "Freq (B)", key: "freqB", align: "right" },
                    ]}
                    filename="Shared_Keywords"
                  />
                </div>
              </div>
              <div className="max-h-64 overflow-auto rounded-lg border">
                <table className="w-full text-sm polished-table" data-testid="table-shared-keywords">
                  <thead className="sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Term</th>
                      <th className="py-2.5 px-3 text-right text-indigo-600 dark:text-indigo-400">Freq (A)</th>
                      <th className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400">Freq (B)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compareResult.shared.map((s) => (
                      <tr key={s.term} className="border-b border-border/30">
                        <td className="py-2 px-3 font-semibold">{s.term}</td>
                        <td className="py-2 px-3 text-right tabular-nums">{s.freqA}</td>
                        <td className="py-2 px-3 text-right tabular-nums">{s.freqB}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-5">
            <div className="polished-card p-5">
              <div className="section-header">
                <BarChart3 className="w-4 h-4 text-indigo-500" />
                <h3>Unique to A ({compareResult.uniqueA.length})</h3>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-auto">
                {compareResult.uniqueA.map((k) => (
                  <span key={k.term} className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium">
                    {k.term} ({k.frequency})
                  </span>
                ))}
              </div>
            </div>
            <div className="polished-card p-5">
              <div className="section-header">
                <BarChart3 className="w-4 h-4 text-amber-500" />
                <h3>Unique to B ({compareResult.uniqueB.length})</h3>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-auto">
                {compareResult.uniqueB.map((k) => (
                  <span key={k.term} className="px-2 py-0.5 text-xs rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">
                    {k.term} ({k.frequency})
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="polished-card p-6">
            <div className="section-header">
              <Brain className="w-4 h-4 text-violet-500" />
              <h3>AI Comparative Analysis</h3>
            </div>
            <Button
              onClick={() => aiComparisonMutation.mutate()}
              disabled={aiComparisonMutation.isPending}
              data-testid="button-ai-compare"
            >
              {aiComparisonMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
              Generate AI Comparison
            </Button>
            {aiComparisonMutation.isPending && <div className="mt-4 space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-4 w-full" />)}</div>}
            {aiComparison && (
              <motion.div
                className="mt-5 p-5 rounded-lg border bg-gradient-to-br from-muted/30 to-transparent"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                data-testid="text-ai-comparison"
              >
                <MarkdownRender content={aiComparison} downloadFilename="AI_Corpus_Comparison" />
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
