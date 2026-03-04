import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FileUpload } from "@/components/file-upload";
import { MarkdownRender } from "@/components/markdown-render";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Loader2, Download, Globe, FileText } from "lucide-react";
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

  const MetricCard = ({ label, value }: { label: string; value: string | number }) => (
    <Card className="p-4 text-center">
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
        <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center shadow-lg">
          <Globe className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Bilingual Track</h1>
          <p className="text-sm text-muted-foreground">Parallel corpus alignment, translation strategies, universals, TMX export</p>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-teal-500" />
            Source Files
          </h3>
          <FileUpload
            onFilesSelected={setSrcFiles}
            label="Upload source files"
            description="Original language texts"
          />
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-500" />
            Target Files
          </h3>
          <FileUpload
            onFilesSelected={setTgtFiles}
            label="Upload target files"
            description="Translated texts"
          />
        </Card>
      </div>

      <Button
        onClick={() => uploadMutation.mutate()}
        disabled={srcFiles.length === 0 || tgtFiles.length === 0 || uploadMutation.isPending}
        className="w-full md:w-auto"
        data-testid="button-align"
      >
        {uploadMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Globe className="w-4 h-4 mr-2" />}
        Align & Analyze
      </Button>

      {uploadMutation.isPending && (
        <Card className="p-5">
          <div className="space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </Card>
      )}

      {metrics && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Aligned Pairs" value={metrics.alignedPairs} />
            <MetricCard label="Avg Similarity" value={metrics.avgSimilarity?.toFixed(3) || "0"} />
            <MetricCard label="Strategies Labeled" value={metrics.strategiesLabeled} />
            <MetricCard label="Length Ratio (T/S)" value={metrics.lengthRatio?.toFixed(2) || "0"} />
          </div>

          <Card className="p-5">
            <h3 className="font-semibold text-sm mb-4">Aligned Pairs</h3>
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm" data-testid="table-aligned-pairs">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-left">
                    <th className="py-2 px-3 font-medium text-muted-foreground">#</th>
                    <th className="py-2 px-3 font-medium text-muted-foreground">Source</th>
                    <th className="py-2 px-3 font-medium text-muted-foreground">Target</th>
                    <th className="py-2 px-3 font-medium text-muted-foreground text-right">Sim</th>
                    <th className="py-2 px-3 font-medium text-muted-foreground">Strategy</th>
                  </tr>
                </thead>
                <tbody>
                  {pairs.map((p, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-3 text-muted-foreground text-xs">{i + 1}</td>
                      <td className="py-2 px-3 text-xs max-w-[200px] truncate">{p.source}</td>
                      <td className="py-2 px-3 text-xs max-w-[200px] truncate">{p.target}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-xs">{(p.similarity || 0).toFixed(3)}</td>
                      <td className="py-2 px-3 text-xs">
                        {p.strategy && (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                            {p.strategy}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-sm mb-3">Export</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Source Language</label>
                <Input value={srcLang} onChange={(e) => setSrcLang(e.target.value)} placeholder="en" data-testid="input-src-lang" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Target Language</label>
                <Input value={tgtLang} onChange={(e) => setTgtLang(e.target.value)} placeholder="ar" data-testid="input-tgt-lang" />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
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
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="font-semibold text-sm mb-3">Translation Universals (AI)</h3>
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
                <div className="mt-3 p-3 bg-muted/30 rounded-md" data-testid="text-universals-result">
                  <MarkdownRender content={universalsResult} />
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold text-sm mb-3">Strategy Analysis (AI)</h3>
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
                <div className="mt-3 p-3 bg-muted/30 rounded-md" data-testid="text-strategies-result">
                  <MarkdownRender content={strategiesResult} />
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {!metrics && !uploadMutation.isPending && (
        <Card className="p-8 text-center">
          <Globe className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Upload source and target files to begin bilingual analysis.</p>
        </Card>
      )}
    </div>
  );
}
