import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FileUpload } from "@/components/file-upload";
import { MarkdownRender } from "@/components/markdown-render";
import { AIAnalysisPanel } from "@/components/ai-analysis-panel";
import { TableDownload } from "@/components/table-download";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Download, Globe, FileText, Brain, BarChart3, SplitSquareHorizontal, FileStack } from "lucide-react";
import type { AlignedPair } from "@shared/schema";

export default function Bilingual() {
  const { toast } = useToast();
  const [corpusId, setCorpusId] = useState<string | null>(null);
  const [pairs, setPairs] = useState<AlignedPair[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [srcFiles, setSrcFiles] = useState<File[]>([]);
  const [tgtFiles, setTgtFiles] = useState<File[]>([]);
  const [alignedFiles, setAlignedFiles] = useState<File[]>([]);
  const [uploadMode, setUploadMode] = useState<"separate" | "prealigned">("separate");
  const [srcLang, setSrcLang] = useState("en");
  const [tgtLang, setTgtLang] = useState("ar");
  const [universalsResult, setUniversalsResult] = useState("");
  const [strategiesResult, setStrategiesResult] = useState("");

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      if (uploadMode === "separate") {
        srcFiles.forEach((f) => formData.append("sourceFiles", f));
        tgtFiles.forEach((f) => formData.append("targetFiles", f));
        const res = await fetch("/api/bilingual/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Processing failed");
        return res.json();
      } else {
        alignedFiles.forEach((f) => formData.append("files", f));
        const res = await fetch("/api/bilingual/upload-aligned", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Processing failed");
        return res.json();
      }
    },
    onSuccess: (data) => {
      setCorpusId(data.corpusId);
      setPairs(data.pairs);
      setMetrics(data.metrics);
      toast({ title: "Alignment complete", description: `${data.pairs.length} pairs aligned` });
    },
    onError: () => toast({ title: "Processing failed", variant: "destructive" }),
  });

  const universalsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bilingual/universals", { corpusId });
      return res.json();
    },
    onSuccess: (data) => setUniversalsResult(data.result),
  });

  const strategiesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bilingual/strategies", { corpusId });
      return res.json();
    },
    onSuccess: (data) => setStrategiesResult(data.result),
  });

  const MetricCard = ({ label, value, index = 0 }: { label: string; value: string | number; index?: number }) => (
    <motion.div
      className="metric-card p-4 text-center"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
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
        className="flex items-center gap-3.5 mb-2"
      >
        <div className="page-header-icon bg-gradient-to-br from-teal-500 to-emerald-600">
          <Globe className="w-5 h-5 text-white relative z-10" />
        </div>
        <div>
          <h1 className="text-3xl font-bold italic tracking-tight text-teal-600 dark:text-teal-400" style={{ fontFamily: "'Playfair Display', serif" }} data-testid="text-page-title">Bilingual Track</h1>
        </div>
      </motion.div>

      <motion.div
        className="polished-card overflow-hidden"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      >
        <div className="h-1 bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-500" />
        <div className="p-6 md:p-7">
          <motion.div
            className="flex items-center gap-3 mb-5"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-md" style={{ boxShadow: "0 4px 12px -2px rgba(20,184,166,0.3)" }}>
              <Globe className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold tracking-tight text-teal-600 dark:text-teal-400" style={{ fontFamily: "'Playfair Display', serif" }}>Parallel Corpus</h3>
          </motion.div>

          <motion.div
            className="flex gap-2 mb-5"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <button
              onClick={() => setUploadMode("separate")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                uploadMode === "separate"
                  ? "bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
              data-testid="button-mode-separate"
            >
              <SplitSquareHorizontal className="w-4 h-4" />
              Separate Files
            </button>
            <button
              onClick={() => setUploadMode("prealigned")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                uploadMode === "prealigned"
                  ? "bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
              data-testid="button-mode-prealigned"
            >
              <FileStack className="w-4 h-4" />
              Pre-Aligned
            </button>
          </motion.div>

          <AnimatePresence mode="wait">
            {uploadMode === "separate" ? (
              <motion.div
                key="separate"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="relative rounded-xl border-2 border-dashed border-teal-200 dark:border-teal-800/40 bg-teal-50/30 dark:bg-teal-950/10 p-4">
                    <span className="absolute -top-2.5 left-3 px-2 bg-white dark:bg-slate-900 text-[10px] font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">Source</span>
                    <FileUpload
                      onFilesSelected={setSrcFiles}
                      label="Upload source files"
                      description="Original language texts"
                    />
                  </div>
                  <div className="relative rounded-xl border-2 border-dashed border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/30 dark:bg-emerald-950/10 p-4">
                    <span className="absolute -top-2.5 left-3 px-2 bg-white dark:bg-slate-900 text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Target</span>
                    <FileUpload
                      onFilesSelected={setTgtFiles}
                      label="Upload target files"
                      description="Translated texts"
                    />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="prealigned"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <div className="relative rounded-xl border-2 border-dashed border-teal-200 dark:border-teal-800/40 bg-gradient-to-br from-teal-50/40 to-emerald-50/40 dark:from-teal-950/10 dark:to-emerald-950/10 p-4">
                  <span className="absolute -top-2.5 left-3 px-2 bg-white dark:bg-slate-900 text-[10px] font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">Pre-Aligned</span>
                  <FileUpload
                    onFilesSelected={setAlignedFiles}
                    label="Upload pre-aligned file(s)"
                    description="Alternating source/target lines"
                  />
                </div>
                <div className="text-[11px] text-muted-foreground/60 mt-2.5 ml-1 space-y-1">
                  <p>Supported formats:</p>
                  <ul className="list-disc ml-4 space-y-0.5">
                    <li>Alternating lines: source sentence, then target sentence, repeating (works for all language pairs including French, Spanish, German, etc.)</li>
                    <li>Tab-separated: source{"\t"}target on each line</li>
                    <li>Mixed-script lines: English text followed by Arabic/Chinese/Cyrillic text on the same line</li>
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            className="mt-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={
                uploadMode === "separate"
                  ? (srcFiles.length === 0 || tgtFiles.length === 0 || uploadMutation.isPending)
                  : (alignedFiles.length === 0 || uploadMutation.isPending)
              }
              className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-md transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
              data-testid="button-align"
            >
              {uploadMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Globe className="w-4 h-4 mr-2" />}
              {uploadMode === "separate" ? "Align & Analyze" : "Process & Analyze"}
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {uploadMutation.isPending && (
        <div className="polished-card p-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      )}

      {metrics && (
        <motion.div className="space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Aligned Pairs" value={metrics.alignedPairs} index={0} />
            <MetricCard label="Avg Similarity" value={metrics.avgSimilarity?.toFixed(3) || "0"} index={1} />
            <MetricCard label="Strategies Labeled" value={metrics.strategiesLabeled} index={2} />
            <MetricCard label="Length Ratio (T/S)" value={metrics.lengthRatio?.toFixed(2) || "0"} index={3} />
          </div>

          <div className="polished-card p-6">
            <div className="section-header">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h3>Aligned Pairs</h3>
            </div>
            <div className="flex justify-end mb-1">
              <TableDownload
                data={pairs.map((p, i) => ({ rank: i + 1, source: p.source, target: p.target, similarity: (p.similarity || 0).toFixed(3), strategy: p.strategy || "" }))}
                columns={[
                  { header: "#", key: "rank", align: "left" },
                  { header: "Source", key: "source", align: "left" },
                  { header: "Target", key: "target", align: "left" },
                  { header: "Similarity", key: "similarity", align: "right" },
                  { header: "Strategy", key: "strategy", align: "left" },
                ]}
                filename="Aligned_Pairs"
              />
            </div>
            <div className="max-h-96 overflow-auto rounded-lg border">
              <table className="w-full text-sm polished-table" data-testid="table-aligned-pairs">
                <thead className="sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3 text-left">#</th>
                    <th className="py-2.5 px-3 text-left">Source</th>
                    <th className="py-2.5 px-3 text-left">Target</th>
                    <th className="py-2.5 px-3 text-right">Sim</th>
                    <th className="py-2.5 px-3 text-left">Strategy</th>
                  </tr>
                </thead>
                <tbody>
                  {pairs.map((p, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="py-2 px-3 text-muted-foreground text-xs">{i + 1}</td>
                      <td className="py-2 px-3 text-xs max-w-[200px] truncate">{p.source}</td>
                      <td className="py-2 px-3 text-xs max-w-[200px] truncate">{p.target}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-xs font-medium">{(p.similarity || 0).toFixed(3)}</td>
                      <td className="py-2 px-3 text-xs">
                        {p.strategy && (
                          <span className="inline-block px-2.5 py-1 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 text-primary text-[10px] font-semibold">
                            {p.strategy}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="polished-card p-6">
            <div className="section-header">
              <Download className="w-4 h-4 text-primary" />
              <h3>Export</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="text-[11px] text-muted-foreground mb-1.5 block font-medium uppercase tracking-wider">Source Language</label>
                <Input value={srcLang} onChange={(e) => setSrcLang(e.target.value)} placeholder="en" data-testid="input-src-lang" />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1.5 block font-medium uppercase tracking-wider">Target Language</label>
                <Input value={tgtLang} onChange={(e) => setTgtLang(e.target.value)} placeholder="ar" data-testid="input-tgt-lang" />
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Button
                variant="secondary"
                onClick={() => {
                  const csv = "Source,Target,Similarity,Strategy\n" + pairs.map((p) =>
                    `"${(p.source || "").replace(/"/g, '""')}","${(p.target || "").replace(/"/g, '""')}",${p.similarity || 0},"${p.strategy || ""}"`
                  ).join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = "aligned_pairs.csv"; a.click();
                  URL.revokeObjectURL(url);
                }}
                data-testid="button-export-csv"
              >
                <Download className="w-4 h-4 mr-2" />CSV
              </Button>
              <Button
                variant="secondary"
                onClick={async () => {
                  const res = await apiRequest("POST", "/api/export/tmx", { corpusId, srcLang, tgtLang });
                  const text = await res.text();
                  const blob = new Blob([text], { type: "application/xml" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = "translation_memory.tmx"; a.click();
                  URL.revokeObjectURL(url);
                }}
                data-testid="button-export-tmx"
              >
                <FileText className="w-4 h-4 mr-2" />TMX (CAT)
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="polished-card p-5">
              <div className="section-header">
                <Brain className="w-4 h-4 text-purple-500" />
                <h3>Translation Universals</h3>
              </div>
              <Button
                size="sm"
                onClick={() => universalsMutation.mutate()}
                disabled={universalsMutation.isPending}
                data-testid="button-universals"
              >
                {universalsMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Analyze Universals
              </Button>
              {universalsMutation.isPending && <div className="mt-3 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-4 w-full" />)}</div>}
              {universalsResult && (
                <motion.div
                  className="mt-4 p-4 rounded-lg border bg-gradient-to-br from-muted/30 to-transparent"
                  data-testid="text-universals-result"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <MarkdownRender content={universalsResult} downloadFilename="Translation_Universals" />
                </motion.div>
              )}
            </div>

            <div className="polished-card p-5">
              <div className="section-header">
                <Brain className="w-4 h-4 text-purple-500" />
                <h3>Strategy Analysis</h3>
              </div>
              <Button
                size="sm"
                onClick={() => strategiesMutation.mutate()}
                disabled={strategiesMutation.isPending}
                data-testid="button-strategies"
              >
                {strategiesMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Analyze Strategies
              </Button>
              {strategiesMutation.isPending && <div className="mt-3 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-4 w-full" />)}</div>}
              {strategiesResult && (
                <motion.div
                  className="mt-4 p-4 rounded-lg border bg-gradient-to-br from-muted/30 to-transparent"
                  data-testid="text-strategies-result"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <MarkdownRender content={strategiesResult} downloadFilename="Strategy_Analysis" />
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {corpusId && metrics && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <AIAnalysisPanel 
            corpusId={corpusId} 
            theme={{ 
              gradient: "from-teal-500 to-emerald-600", 
              accent: "text-teal-500", 
              text: "text-teal-600 dark:text-teal-400" 
            }} 
          />
        </motion.div>
      )}

    </div>
  );
}
