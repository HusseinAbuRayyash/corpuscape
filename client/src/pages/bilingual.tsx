import { useState, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SaveToLibrary } from "@/components/save-to-library";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUpload } from "@/components/file-upload";
import { MarkdownRender } from "@/components/markdown-render";
import { AIResultDisplay } from "@/components/ai-result-display";
import { AIAnalysisPanel } from "@/components/ai-analysis-panel";
import { TableDownload } from "@/components/table-download";
import { ReportGenerator } from "@/components/report-generator";
import { BilingualFilter } from "@/components/corpus-filter";
import { DatasetViewer } from "@/components/dataset-viewer";
import { SampleOnlyBanner } from "@/components/sample-only-banner";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Download, Globe, FileText, Brain, BarChart3, SplitSquareHorizontal, FileStack, AlertCircle, ArrowLeftRight, Search, BookOpen, MessageSquare, Table2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AlignedPair, LibraryLoadResponse, ColumnMeta } from "@shared/schema";

export default function Bilingual() {
  const { toast } = useToast();
  const [corpusId, setCorpusId] = useState<string | null>(null);
  const [columns, setColumns] = useState<ColumnMeta | null>(null);
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
  const [backTranslateResults, setBackTranslateResults] = useState<any[]>([]);
  const [concordanceQuery, setConcordanceQuery] = useState("");
  const [concordanceResults, setConcordanceResults] = useState<any[]>([]);
  const [glossaryResults, setGlossaryResults] = useState<any[]>([]);
  const [annotations, setAnnotations] = useState<Record<number, string>>({});
  const [originalCorpusId, setOriginalCorpusId] = useState<string | null>(null);
  const [originalPairs, setOriginalPairs] = useState<AlignedPair[]>([]);
  const [isFiltered, setIsFiltered] = useState(false);
  const [colHeaders, setColHeaders] = useState<string[] | null>(null);
  const [colPreview, setColPreview] = useState<string[][] | null>(null);
  const [sourceColIdx, setSourceColIdx] = useState(0);
  const [targetColIdx, setTargetColIdx] = useState(1);
  const [isInspecting, setIsInspecting] = useState(false);
  const [sampleOnly, setSampleOnly] = useState(false);
  const [sampleCount, setSampleCount] = useState(0);
  const [externalUrl, setExternalUrl] = useState<string | undefined>();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const libraryId = params.get("libraryId");
    if (!libraryId) return;
    fetch(`/api/library/${libraryId}/load`)
      .then(r => r.json())
      .then((data: LibraryLoadResponse) => {
        if (data.type === "bilingual") {
          setCorpusId(data.corpusId);
          setPairs(data.pairs);
          if (data.columns) setColumns(data.columns);
          if (data.sampleOnly) { setSampleOnly(true); setSampleCount(data.sampleCount ?? 0); setExternalUrl(data.externalUrl); }
          const totalSim = data.pairs.reduce((s, p) => s + (p.similarity || 0), 0);
          setMetrics({
            alignedPairs: data.pairs.length,
            avgSimilarity: data.pairs.length > 0 ? totalSim / data.pairs.length : 0,
            strategiesLabeled: data.pairs.filter(p => p.strategy).length,
            lengthRatio: 1,
          });
          toast({ title: `"${data.name}" loaded from Library`, description: `${data.pairs.length} pairs ready for analysis` });
        }
      })
      .catch(() => {});
  }, []);

  const clearAnalysisResults = () => {
    setUniversalsResult("");
    setStrategiesResult("");
    setBackTranslateResults([]);
    setConcordanceResults([]);
    setGlossaryResults([]);
    setAnnotations({});
  };

  const inspectAlignedFile = useCallback((file: File) => {
    const ext = file.name.toLowerCase().split(".").pop() || "";
    if (ext !== "xlsx" && ext !== "xls" && ext !== "csv") {
      setColHeaders(null);
      setColPreview(null);
      return;
    }
    setIsInspecting(true);
    const fd = new FormData();
    fd.append("file", file);
    fetch("/api/bilingual/preview-aligned", { method: "POST", body: fd })
      .then(r => r.json())
      .then((data) => {
        if (data.headers && data.headers.length > 0) {
          setColHeaders(data.headers);
          setColPreview(data.previewRows || []);
          const hdrs: string[] = data.headers;
          const findBest = (patterns: RegExp[]) => {
            for (const p of patterns) {
              const idx = hdrs.findIndex(h => p.test(h.trim()));
              if (idx >= 0) return idx;
            }
            return -1;
          };
          const srcIdx = findBest([
            /arabic.*body|arabic body/i,
            /^source.?text|^source$|^src$/i,
            /^arabic/i,
            /^original/i,
          ]);
          const tgtIdx = findBest([
            /english.*body|english body/i,
            /^target.?text|^target$|^tgt$/i,
            /^english/i,
            /^translation/i,
          ]);
          if (srcIdx >= 0) setSourceColIdx(srcIdx);
          if (tgtIdx >= 0 && tgtIdx !== srcIdx) setTargetColIdx(tgtIdx);
          else if (srcIdx === 0) setTargetColIdx(1);
        } else {
          setColHeaders(null);
          setColPreview(null);
        }
      })
      .catch(() => { setColHeaders(null); setColPreview(null); })
      .finally(() => setIsInspecting(false));
  }, []);

  const handleAlignedFilesSelected = useCallback((files: File[]) => {
    setAlignedFiles(files);
    if (files.length === 0) {
      setColHeaders(null);
      setColPreview(null);
      setSourceColIdx(0);
      setTargetColIdx(1);
      return;
    }
    inspectAlignedFile(files[files.length - 1]);
  }, [inspectAlignedFile]);

  const recalcMetrics = (p: AlignedPair[]) => {
    const totalSim = p.reduce((sum, pair) => sum + (pair.similarity || 0), 0);
    const avgSimilarity = p.length > 0 ? totalSim / p.length : 0;
    const totalLenRatio = p.reduce((sum, pair) => {
      const sLen = (pair.source || "").length || 1;
      const tLen = (pair.target || "").length;
      return sum + tLen / sLen;
    }, 0);
    const lengthRatio = p.length > 0 ? totalLenRatio / p.length : 0;
    const strategiesLabeled = p.filter(pair => pair.strategy).length;
    return { alignedPairs: p.length, avgSimilarity, lengthRatio, strategiesLabeled };
  };

  const handleFilterApplied = (filteredCorpusId: string, filteredPairs: AlignedPair[]) => {
    if (!originalCorpusId) setOriginalCorpusId(corpusId);
    if (originalPairs.length === 0) setOriginalPairs(pairs);
    setCorpusId(filteredCorpusId);
    setPairs(filteredPairs);
    setMetrics(recalcMetrics(filteredPairs));
    setIsFiltered(true);
    clearAnalysisResults();
  };

  const handleFilterCleared = () => {
    if (originalCorpusId) setCorpusId(originalCorpusId);
    if (originalPairs.length > 0) {
      setPairs(originalPairs);
      setMetrics(recalcMetrics(originalPairs));
    }
    setOriginalCorpusId(null);
    setOriginalPairs([]);
    setIsFiltered(false);
    clearAnalysisResults();
  };

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
        formData.append("sourceColIdx", String(sourceColIdx));
        formData.append("targetColIdx", String(targetColIdx));
        const res = await fetch("/api/bilingual/upload-aligned", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Processing failed");
        return res.json();
      }
    },
    onSuccess: (data) => {
      setCorpusId(data.corpusId);
      setPairs(data.pairs);
      setMetrics(data.metrics);
      if (uploadMode === "separate") {
        toast({ title: "Alignment complete", description: `${data.pairs.length} pairs aligned` });
      } else {
        toast({ title: "File loaded", description: `${data.pairs.length} pairs read from file` });
      }
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

  const backTranslateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bilingual/back-translate", { corpusId, srcLang, tgtLang });
      return res.json();
    },
    onSuccess: (data) => setBackTranslateResults(data.results || []),
    onError: () => toast({ title: "Back-translation failed", variant: "destructive" }),
  });

  const concordanceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bilingual/concordance", { corpusId, query: concordanceQuery });
      return res.json();
    },
    onSuccess: (data) => setConcordanceResults(data.results || []),
    onError: () => toast({ title: "Concordance search failed", variant: "destructive" }),
  });

  const glossaryMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bilingual/glossary", { corpusId });
      return res.json();
    },
    onSuccess: (data) => setGlossaryResults(data.glossary || []),
    onError: () => toast({ title: "Glossary generation failed", variant: "destructive" }),
  });

  const exportAnnotations = () => {
    const annotatedPairs = pairs.map((p, i) => ({
      index: i + 1,
      source: p.source,
      target: p.target,
      similarity: p.similarity || 0,
      strategy: p.strategy || "",
      annotation: annotations[i] || "",
    })).filter(p => p.annotation);
    const csv = "Index,Source,Target,Similarity,Strategy,Annotation\n" + annotatedPairs.map((p) =>
      `${p.index},"${(p.source || "").replace(/"/g, '""')}","${(p.target || "").replace(/"/g, '""')}",${p.similarity},"${p.strategy}","${(p.annotation).replace(/"/g, '""')}"`
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "annotated_pairs.csv"; a.click();
    URL.revokeObjectURL(url);
  };

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
        className="flex items-center gap-4 mb-2"
      >
        <div className="page-header-icon bg-gradient-to-br from-teal-500 to-emerald-600">
          <Globe className="w-5 h-5 text-white relative z-10" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold italic tracking-tight text-teal-600 dark:text-teal-400" style={{ fontFamily: "'Playfair Display', serif" }} data-testid="text-page-title">Bilingual Track</h1>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5 font-medium tracking-wide">Parallel alignment, strategies & translation analysis</p>
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
                    onFilesSelected={handleAlignedFilesSelected}
                    label="Upload pre-aligned file(s)"
                    description="TMX · XLIFF · CSV · TSV · Excel · DOCX · TXT and more"
                  />
                </div>

                <AnimatePresence>
                  {isInspecting && (
                    <motion.div key="inspecting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-2 text-[11px] text-teal-600 dark:text-teal-400 mt-2 ml-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Reading file structure…
                    </motion.div>
                  )}

                  {!isInspecting && colHeaders && colHeaders.length > 0 && (
                    <motion.div key="col-picker"
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      className="mt-3 rounded-xl border border-teal-200 dark:border-teal-800/40 bg-teal-50/60 dark:bg-teal-950/20 p-3.5 space-y-3"
                    >
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-teal-700 dark:text-teal-400">
                        <Table2 className="w-3.5 h-3.5" />
                        {colHeaders.length > 2
                          ? `${colHeaders.length} columns detected — select which to use:`
                          : "Column mapping — confirm source and target:"}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Source column</label>
                          <Select value={String(sourceColIdx)} onValueChange={(v) => setSourceColIdx(Number(v))}>
                            <SelectTrigger className="h-8 text-xs" data-testid="select-source-col">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {colHeaders.map((h, i) => (
                                <SelectItem key={i} value={String(i)} className="text-xs">
                                  {h || `Column ${i + 1}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Target column</label>
                          <Select value={String(targetColIdx)} onValueChange={(v) => setTargetColIdx(Number(v))}>
                            <SelectTrigger className="h-8 text-xs" data-testid="select-target-col">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {colHeaders.map((h, i) => (
                                <SelectItem key={i} value={String(i)} className="text-xs">
                                  {h || `Column ${i + 1}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {colPreview && colPreview.length > 0 && (
                        <div className="overflow-x-auto rounded-lg border border-teal-200/60 dark:border-teal-800/30">
                          <table className="w-full text-[10px]">
                            <thead>
                              <tr className="bg-teal-100/60 dark:bg-teal-900/30">
                                {colHeaders.map((h, i) => (
                                  <th key={i} className={`px-2 py-1 text-left font-bold border-r last:border-r-0 border-teal-200/50 dark:border-teal-800/30 truncate max-w-[120px] ${i === sourceColIdx ? "text-teal-700 dark:text-teal-400 bg-teal-200/50 dark:bg-teal-800/20" : i === targetColIdx ? "text-emerald-700 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/20" : "text-muted-foreground/70"}`}>
                                    {i === sourceColIdx ? "▶ " : i === targetColIdx ? "▶ " : ""}{h || `Col ${i + 1}`}
                                    {i === sourceColIdx ? " (src)" : i === targetColIdx ? " (tgt)" : ""}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {colPreview.slice(0, 2).map((row, ri) => (
                                <tr key={ri} className="border-t border-teal-200/40 dark:border-teal-800/20">
                                  {colHeaders.map((_, ci) => (
                                    <td key={ci} className={`px-2 py-1 border-r last:border-r-0 border-teal-200/40 dark:border-teal-800/20 truncate max-w-[120px] ${ci === sourceColIdx ? "bg-teal-50 dark:bg-teal-900/10 font-medium" : ci === targetColIdx ? "bg-emerald-50 dark:bg-emerald-900/10 font-medium" : "text-muted-foreground/50"}`}>
                                      {(row[ci] || "").slice(0, 40)}{(row[ci] || "").length > 40 ? "…" : ""}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="text-[11px] text-muted-foreground/60 mt-2.5 ml-1 space-y-1">
                  <p className="font-medium text-muted-foreground/80">Supported formats — pairs are loaded exactly as-is, no AI re-alignment:</p>
                  <ul className="list-disc ml-4 space-y-0.5">
                    <li><span className="font-medium">TMX / XLIFF:</span> Translation Memory Exchange and localization files — source/target pairs extracted automatically</li>
                    <li><span className="font-medium">Excel (.xlsx/.xls):</span> Any layout — columns are auto-detected; use the picker above to choose source and target if needed</li>
                    <li><span className="font-medium">CSV / TSV (.csv/.tsv):</span> Auto-detects delimiter; optional header row</li>
                    <li><span className="font-medium">Tab-separated (.txt/.tsv):</span> source{"\t"}target on each line</li>
                    <li><span className="font-medium">Alternating lines (.txt/.docx/.md/.rtf):</span> source on odd lines, target on even lines</li>
                    <li><span className="font-medium">PO / Gettext (.po/.pot):</span> msgid / msgstr pairs extracted as source / target</li>
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {uploadMode === "separate" && (srcFiles.length > 0 || tgtFiles.length > 0) && (srcFiles.length === 0 || tgtFiles.length === 0) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-3 flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 text-xs font-medium"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {srcFiles.length === 0
                ? "Upload source file(s) on the left to enable alignment."
                : "Upload target file(s) on the right to enable alignment."}
            </motion.div>
          )}

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
          <div className="flex justify-end">
            <SaveToLibrary
              type="bilingual"
              sourceTrack="bilingual"
              samplePairs={pairs.slice(0, 50).map(p => ({ source: p.source, target: p.target, similarity: p.similarity, strategy: p.strategy }))}
              sizeLabel={`${metrics.alignedPairs} pairs`}
              defaultName={srcFiles.length > 0 ? `${srcFiles.map(f => f.name.replace(/\.[^.]+$/, "")).join(", ")} ↔ ${tgtFiles.map(f => f.name.replace(/\.[^.]+$/, "")).join(", ")}` : "Bilingual Corpus"}
              accentClass="from-teal-500 to-emerald-600"
              showLanguagePairInput
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Aligned Pairs" value={metrics.alignedPairs} index={0} />
            <MetricCard label="Avg Similarity" value={metrics.avgSimilarity?.toFixed(3) || "0"} index={1} />
            <MetricCard label="Strategies Labeled" value={metrics.strategiesLabeled} index={2} />
            <MetricCard label="Length Ratio (T/S)" value={metrics.lengthRatio?.toFixed(2) || "0"} index={3} />
          </div>

          {corpusId && (
            <BilingualFilter
              corpusId={originalCorpusId || corpusId}
              totalPairs={originalPairs.length || pairs.length}
              strategies={(isFiltered && originalPairs.length > 0 ? originalPairs : pairs).map(p => p.strategy || "")}
              isFiltered={isFiltered}
              filteredPairCount={isFiltered ? pairs.length : undefined}
              onFilterApplied={handleFilterApplied}
              onFilterCleared={handleFilterCleared}
            />
          )}

          {sampleOnly && corpusId && (
            <SampleOnlyBanner sampleCount={sampleCount} externalUrl={externalUrl} />
          )}

          <Tabs defaultValue="pairs" className="space-y-5">
            <TabsList className="w-full justify-start overflow-x-auto scrollbar-hide flex-nowrap" data-testid="tabs-bilingual">
              <TabsTrigger value="dataset" disabled={!columns} className="shrink-0" data-testid="tab-dataset"><Table2 className="w-3.5 h-3.5 mr-1.5" />Dataset</TabsTrigger>
              <TabsTrigger value="pairs" className="shrink-0" data-testid="tab-pairs"><BarChart3 className="w-3.5 h-3.5 mr-1.5" />Pairs</TabsTrigger>
              <TabsTrigger value="concordance" className="shrink-0" data-testid="tab-concordance"><Search className="w-3.5 h-3.5 mr-1.5" />Concordance</TabsTrigger>
              <TabsTrigger value="quality" className="shrink-0" data-testid="tab-quality"><ArrowLeftRight className="w-3.5 h-3.5 mr-1.5" />Quality</TabsTrigger>
              <TabsTrigger value="theory" className="shrink-0" data-testid="tab-theory"><Brain className="w-3.5 h-3.5 mr-1.5" />Theory</TabsTrigger>
              <TabsTrigger value="export" className="shrink-0" data-testid="tab-export"><Download className="w-3.5 h-3.5 mr-1.5" />Export</TabsTrigger>
              <TabsTrigger value="ai" className="shrink-0" data-testid="tab-ai-insights"><Brain className="w-3.5 h-3.5 mr-1.5" />AI Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="dataset" className="space-y-5">
              {corpusId && columns && (
                <DatasetViewer
                  corpusId={corpusId}
                  theme={{ gradient: "from-teal-500 to-emerald-600", accent: "text-teal-500", text: "text-teal-600 dark:text-teal-400" }}
                />
              )}
            </TabsContent>

            <TabsContent value="pairs" className="space-y-5">
              <motion.div className="polished-card p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                  <div className="section-header mb-0">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <h3>Aligned Pairs</h3>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {Object.keys(annotations).length > 0 && (
                      <Button variant="secondary" size="sm" onClick={exportAnnotations} data-testid="button-export-annotations">
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        Export Annotations ({Object.values(annotations).filter(Boolean).length})
                      </Button>
                    )}
                    <TableDownload
                      data={pairs.map((p, i) => ({ rank: i + 1, source: p.source, target: p.target, similarity: (p.similarity || 0).toFixed(3), strategy: p.strategy || "", annotation: annotations[i] || "" }))}
                      columns={[
                        { header: "#", key: "rank", align: "left" },
                        { header: "Source", key: "source", align: "left" },
                        { header: "Target", key: "target", align: "left" },
                        { header: "Similarity", key: "similarity", align: "right" },
                        { header: "Strategy", key: "strategy", align: "left" },
                        { header: "Annotation", key: "annotation", align: "left" },
                      ]}
                      filename="Aligned_Pairs"
                    />
                  </div>
                </div>
                <div className="max-h-[500px] overflow-auto rounded-lg border">
                  <table className="w-full text-sm polished-table" data-testid="table-aligned-pairs">
                    <thead className="sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3 text-left">#</th>
                        <th className="py-2.5 px-3 text-left">Source</th>
                        <th className="py-2.5 px-3 text-left">Target</th>
                        <th className="py-2.5 px-3 text-right">Sim</th>
                        <th className="py-2.5 px-3 text-left">Strategy</th>
                        <th className="py-2.5 px-3 text-left min-w-[160px]">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            Annotation
                          </span>
                        </th>
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
                          <td className="py-1 px-2">
                            <input
                              type="text"
                              className="w-full text-xs px-2 py-1 rounded-md border border-border/50 bg-transparent focus:outline-none focus:ring-1 focus:ring-teal-500/50 placeholder:text-muted-foreground/40"
                              placeholder="Add note..."
                              value={annotations[i] || ""}
                              onChange={(e) => setAnnotations(prev => ({ ...prev, [i]: e.target.value }))}
                              data-testid={`input-annotation-${i}`}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="concordance" className="space-y-5">
              <motion.div className="polished-card p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="section-header">
                  <Search className="w-4 h-4 text-teal-500" />
                  <h3>Bilingual Concordance</h3>
                </div>
                <div className="flex gap-2 items-center mb-3 flex-wrap">
                  <Input
                    value={concordanceQuery}
                    onChange={(e) => setConcordanceQuery(e.target.value)}
                    placeholder="Search source text..."
                    className="max-w-xs"
                    onKeyDown={(e) => { if (e.key === "Enter" && concordanceQuery.trim()) concordanceMutation.mutate(); }}
                    data-testid="input-concordance-query"
                  />
                  <Button
                    size="sm"
                    onClick={() => concordanceMutation.mutate()}
                    disabled={!concordanceQuery.trim() || concordanceMutation.isPending}
                    data-testid="button-concordance-search"
                  >
                    {concordanceMutation.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Search className="w-4 h-4 mr-1.5" />}
                    Search
                  </Button>
                </div>
                {concordanceMutation.isPending && <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-4 w-full" />)}</div>}
                {concordanceResults.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <p className="text-xs text-muted-foreground mb-2">{concordanceResults.length} match{concordanceResults.length !== 1 ? "es" : ""} found</p>
                    <div className="max-h-80 overflow-auto rounded-lg border">
                      <table className="w-full text-sm polished-table" data-testid="table-concordance-results">
                        <thead className="sticky top-0 z-10">
                          <tr>
                            <th className="py-2.5 px-3 text-right">Left Context</th>
                            <th className="py-2.5 px-3 text-center">Match</th>
                            <th className="py-2.5 px-3 text-left">Right Context</th>
                            <th className="py-2.5 px-3 text-left">Target</th>
                          </tr>
                        </thead>
                        <tbody>
                          {concordanceResults.map((r: any, i: number) => (
                            <tr key={i} className="border-b border-border/30">
                              <td className="py-2 px-3 text-xs text-right text-muted-foreground">{r.left}</td>
                              <td className="py-2 px-3 text-xs text-center font-bold text-teal-600 dark:text-teal-400">{r.match}</td>
                              <td className="py-2 px-3 text-xs text-muted-foreground">{r.right}</td>
                              <td className="py-2 px-3 text-xs max-w-[250px] truncate">{r.target}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
                {concordanceResults.length === 0 && !concordanceMutation.isPending && (
                  <div className="text-center py-8">
                    <Search className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Enter a search term to find bilingual concordances</p>
                  </div>
                )}
              </motion.div>
            </TabsContent>

            <TabsContent value="quality" className="space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <motion.div className="polished-card p-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="section-header">
                    <ArrowLeftRight className="w-4 h-4 text-amber-500" />
                    <h3>Back-Translation Check</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">AI back-translates target text to source language and flags semantic drift.</p>
                  <Button
                    size="sm"
                    onClick={() => backTranslateMutation.mutate()}
                    disabled={backTranslateMutation.isPending}
                    data-testid="button-back-translate"
                  >
                    {backTranslateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowLeftRight className="w-4 h-4 mr-2" />}
                    Run Back-Translation
                  </Button>
                  {backTranslateMutation.isPending && <div className="mt-3 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-4 w-full" />)}</div>}
                  {backTranslateResults.length > 0 && (
                    <motion.div className="mt-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <div className="flex justify-end mb-1">
                        <TableDownload
                          data={backTranslateResults.map((r: any, i: number) => ({ rank: i + 1, source: r.source, backTranslation: r.backTranslation, drift: r.driftNotes || "" }))}
                          columns={[
                            { header: "#", key: "rank", align: "left" },
                            { header: "Original Source", key: "source", align: "left" },
                            { header: "Back-Translation", key: "backTranslation", align: "left" },
                            { header: "Semantic Drift", key: "drift", align: "left" },
                          ]}
                          filename="Back_Translation"
                        />
                      </div>
                      <div className="max-h-72 overflow-auto rounded-lg border">
                        <table className="w-full text-sm polished-table" data-testid="table-back-translate">
                          <thead className="sticky top-0 z-10">
                            <tr>
                              <th className="py-2 px-3 text-left">#</th>
                              <th className="py-2 px-3 text-left">Source</th>
                              <th className="py-2 px-3 text-left">Back-Translation</th>
                              <th className="py-2 px-3 text-left">Drift</th>
                            </tr>
                          </thead>
                          <tbody>
                            {backTranslateResults.map((r: any, i: number) => (
                              <tr key={i} className="border-b border-border/30">
                                <td className="py-2 px-3 text-muted-foreground text-xs">{i + 1}</td>
                                <td className="py-2 px-3 text-xs max-w-[180px] truncate">{r.source}</td>
                                <td className="py-2 px-3 text-xs max-w-[180px] truncate">{r.backTranslation}</td>
                                <td className="py-2 px-3 text-xs max-w-[160px]">
                                  {r.driftNotes && (
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                      r.driftNotes.toLowerCase().includes("none") || r.driftNotes.toLowerCase().includes("minimal")
                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                    }`}>
                                      {r.driftNotes}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </motion.div>

                <motion.div className="polished-card p-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                  <div className="section-header">
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                    <h3>AI Glossary Builder</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Extracts bilingual glossary with definitions and usage examples.</p>
                  <Button
                    size="sm"
                    onClick={() => glossaryMutation.mutate()}
                    disabled={glossaryMutation.isPending}
                    data-testid="button-glossary"
                  >
                    {glossaryMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BookOpen className="w-4 h-4 mr-2" />}
                    Generate Glossary
                  </Button>
                  {glossaryMutation.isPending && <div className="mt-3 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-4 w-full" />)}</div>}
                  {glossaryResults.length > 0 && (
                    <motion.div className="mt-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <div className="flex justify-end mb-1">
                        <TableDownload
                          data={glossaryResults.map((g: any, i: number) => ({ rank: i + 1, sourceTerm: g.sourceTerm, targetTerm: g.targetTerm, definition: g.definition || "", example: g.example || "" }))}
                          columns={[
                            { header: "#", key: "rank", align: "left" },
                            { header: "Source Term", key: "sourceTerm", align: "left" },
                            { header: "Target Term", key: "targetTerm", align: "left" },
                            { header: "Definition", key: "definition", align: "left" },
                            { header: "Example", key: "example", align: "left" },
                          ]}
                          filename="Bilingual_Glossary"
                        />
                      </div>
                      <div className="max-h-72 overflow-auto rounded-lg border">
                        <table className="w-full text-sm polished-table" data-testid="table-glossary">
                          <thead className="sticky top-0 z-10">
                            <tr>
                              <th className="py-2 px-3 text-left">Source Term</th>
                              <th className="py-2 px-3 text-left">Target Term</th>
                              <th className="py-2 px-3 text-left">Definition</th>
                              <th className="py-2 px-3 text-left">Example</th>
                            </tr>
                          </thead>
                          <tbody>
                            {glossaryResults.map((g: any, i: number) => (
                              <tr key={i} className="border-b border-border/30">
                                <td className="py-2 px-3 text-xs font-medium">{g.sourceTerm}</td>
                                <td className="py-2 px-3 text-xs font-medium">{g.targetTerm}</td>
                                <td className="py-2 px-3 text-xs text-muted-foreground max-w-[200px]">{g.definition}</td>
                                <td className="py-2 px-3 text-xs text-muted-foreground/80 max-w-[200px] italic">{g.example}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </div>
            </TabsContent>

            <TabsContent value="theory" className="space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <motion.div className="polished-card p-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
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
                      <AIResultDisplay content={universalsResult} onContentChange={setUniversalsResult} downloadFilename="Translation_Universals" />
                    </motion.div>
                  )}
                </motion.div>

                <motion.div className="polished-card p-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
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
                      <AIResultDisplay content={strategiesResult} onContentChange={setStrategiesResult} downloadFilename="Strategy_Analysis" />
                    </motion.div>
                  )}
                </motion.div>
              </div>
            </TabsContent>

            <TabsContent value="export" className="space-y-5">
              <motion.div className="polished-card p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
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
                  <ReportGenerator
                    title="Bilingual Analysis Report"
                    pairs={pairs}
                    aiResults={{
                      ...(universalsResult ? { "Translation Universals": universalsResult } : {}),
                      ...(strategiesResult ? { "Strategy Analysis": strategiesResult } : {}),
                    }}
                  />
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="ai" className="space-y-5">
              {corpusId && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
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
            </TabsContent>
          </Tabs>
        </motion.div>
      )}

    </div>
  );
}
