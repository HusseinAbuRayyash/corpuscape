import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FileUpload } from "@/components/file-upload";
import { MarkdownRender } from "@/components/markdown-render";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Loader2, Download, Globe, FileText, Brain, BarChart3 } from "lucide-react";
import type { AlignedPair } from "@shared/schema";

export default function Bilingual() {
  const { toast } = useToast();
  const [corpusId, setCorpusId] = useState<string | null>(null);
  const [pairs, setPairs] = useState<AlignedPair[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [srcFiles, setSrcFiles] = useState<File[]>([]);
  const [tgtFiles, setTgtFiles] = useState<File[]>([]);
  const [srcLang, setSrcLang] = useState("en");
  const [tgtLang, setTgtLang] = useState("ar");
  const [universalsResult, setUniversalsResult] = useState("");
  const [strategiesResult, setStrategiesResult] = useState("");

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      srcFiles.forEach((f) => formData.append("sourceFiles", f));
      tgtFiles.forEach((f) => formData.append("targetFiles", f));
      const res = await fetch("/api/bilingual/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Processing failed");
      return res.json();
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
        className="grid md:grid-cols-2 gap-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="polished-card p-5">
          <div className="section-header">
            <Globe className="w-4 h-4 text-teal-500" />
            <h3>Source Files</h3>
          </div>
          <FileUpload
            onFilesSelected={setSrcFiles}
            label="Upload source files"
            description="Original language texts"
          />
        </div>
        <div className="polished-card p-5">
          <div className="section-header">
            <Globe className="w-4 h-4 text-indigo-500" />
            <h3>Target Files</h3>
          </div>
          <FileUpload
            onFilesSelected={setTgtFiles}
            label="Upload target files"
            description="Translated texts"
          />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Button
          onClick={() => uploadMutation.mutate()}
          disabled={srcFiles.length === 0 || tgtFiles.length === 0 || uploadMutation.isPending}
          className="w-full md:w-auto"
          data-testid="button-align"
        >
          {uploadMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Globe className="w-4 h-4 mr-2" />}
          Align & Analyze
        </Button>
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
                  <MarkdownRender content={universalsResult} />
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
                  <MarkdownRender content={strategiesResult} />
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {!metrics && !uploadMutation.isPending && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="empty-state">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500/10 to-emerald-500/10 flex items-center justify-center mb-4">
              <Globe className="w-8 h-8 text-teal-500/40" />
            </div>
            <p className="text-sm text-muted-foreground">Upload source and target files to begin bilingual analysis.</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
