import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  BookMarked, Globe, BookOpen, Scale, Newspaper, ExternalLink,
  Loader2, ChevronDown, ChevronUp, Trash2, BookText, BarChart3,
  Library, Database, Users, Search, AreaChart, Maximize2,
} from "lucide-react";
import type { LibraryCorpus, SamplePair } from "@shared/schema";
import type { LucideIcon } from "lucide-react";

interface GroupedCorpora {
  user: LibraryCorpus[];
  builtin: LibraryCorpus[];
  external: LibraryCorpus[];
}

const TRACK_ICONS: Record<string, LucideIcon> = {
  monolingual: BookOpen,
  bilingual: Globe,
  scraper: Newspaper,
  compare: Scale,
};

const TRACK_COLORS: Record<string, string> = {
  monolingual: "from-indigo-500 to-blue-600",
  bilingual: "from-teal-500 to-emerald-600",
  scraper: "from-amber-500 to-orange-600",
  compare: "from-violet-500 to-purple-600",
};

const TRACK_TEXT: Record<string, string> = {
  monolingual: "text-indigo-600 dark:text-indigo-400",
  bilingual: "text-teal-600 dark:text-teal-400",
  scraper: "text-amber-600 dark:text-amber-400",
  compare: "text-violet-600 dark:text-violet-400",
};

const TYPE_COLORS: Record<string, string> = {
  monolingual: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300",
  bilingual: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300",
  multilingual: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300",
  external: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
};

const LANG_FLAGS: Record<string, string> = {
  en: "🇬🇧", ar: "🇸🇦", de: "🇩🇪", fr: "🇫🇷", es: "🇪🇸",
  zh: "🇨🇳", ru: "🇷🇺", ja: "🇯🇵", ko: "🇰🇷", pt: "🇵🇹",
  it: "🇮🇹", nl: "🇳🇱", tr: "🇹🇷", pl: "🇵🇱", sv: "🇸🇪",
};

function langFlags(pair: string): string {
  const parts = pair.replace(/↔|→|←/g, "↔").split("↔").map(s => s.trim());
  return parts.map(p => LANG_FLAGS[p] || "🌐").join(" ↔ ");
}

function AnalyzePanel({
  corpus,
  onClose,
}: {
  corpus: LibraryCorpus;
  onClose: () => void;
}) {
  const [, navigate] = useLocation();
  const trackOptions = (() => {
    const t = corpus.type;
    if (t === "monolingual") return [
      { key: "monolingual", label: "Monolingual Track", path: "/monolingual", icon: BookOpen, color: "from-indigo-500 to-blue-600" },
      { key: "compare", label: "Compare (as Corpus A)", path: "/compare", icon: Scale, color: "from-violet-500 to-purple-600" },
      { key: "figures", label: "Figure Maker", path: "/figures", icon: AreaChart, color: "from-rose-500 to-pink-600" },
    ];
    if (t === "bilingual") return [
      { key: "bilingual", label: "Bilingual Track", path: "/bilingual", icon: Globe, color: "from-teal-500 to-emerald-600" },
      { key: "figures", label: "Figure Maker", path: "/figures", icon: AreaChart, color: "from-rose-500 to-pink-600" },
    ];
    return [
      { key: "bilingual", label: "Bilingual Track", path: "/bilingual", icon: Globe, color: "from-teal-500 to-emerald-600" },
      { key: "monolingual", label: "Monolingual Track (source only)", path: "/monolingual", icon: BookOpen, color: "from-indigo-500 to-blue-600" },
      { key: "figures", label: "Figure Maker", path: "/figures", icon: AreaChart, color: "from-rose-500 to-pink-600" },
    ];
  })();

  function handleTrack(path: string) {
    navigate(`${path}?libraryId=${corpus.id}`);
    onClose();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.15 }}
      className="mt-3 border-t border-border/40 pt-3 space-y-2"
    >
      <p className="text-[11px] text-muted-foreground font-medium">Analyze in track:</p>
      <div className="grid grid-cols-1 gap-2">
        {trackOptions.map((opt) => (
          <Button
            key={opt.key}
            size="sm"
            className={`w-full justify-start gap-2 bg-gradient-to-r ${opt.color} text-white hover:opacity-90 transition-opacity`}
            onClick={() => handleTrack(opt.path)}
            data-testid={`button-analyze-${opt.key}`}
          >
            <opt.icon className="w-3.5 h-3.5" />
            {opt.label}
          </Button>
        ))}
      </div>
    </motion.div>
  );
}

function CorpusCard({
  corpus,
  showDelete,
}: {
  corpus: LibraryCorpus;
  showDelete?: boolean;
}) {
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/library/${corpus.id}`);
    },
    onSuccess: () => {
      toast({ title: "Corpus deleted from library" });
      qc.invalidateQueries({ queryKey: ["/api/library"] });
    },
    onError: (err: Error) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });

  const pairs = corpus.samplePairs as SamplePair[] | null;
  const trackColor = TRACK_COLORS[corpus.sourceTrack || corpus.type] || "from-slate-500 to-slate-600";
  const typeColor = TYPE_COLORS[corpus.type] || TYPE_COLORS.external;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="polished-card p-4 space-y-3"
      data-testid={`card-corpus-${corpus.id}`}
    >
      <div className={`h-0.5 rounded-full bg-gradient-to-r ${trackColor} -mt-4 -mx-4 mb-3`} />

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm truncate" data-testid={`text-corpus-name-${corpus.id}`}>{corpus.name}</h3>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide ${typeColor}`}>
              {corpus.type}
            </span>
            {corpus.languagePair && (
              <span className="text-[11px] text-muted-foreground font-medium">
                {langFlags(corpus.languagePair)} {corpus.languagePair}
              </span>
            )}
            {corpus.domain && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                {corpus.domain}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {corpus.externalUrl && (
            <a
              href={corpus.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              data-testid={`link-external-${corpus.id}`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {showDelete && (
            <button
              onClick={() => deleteMutation.mutate()}
              className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
              data-testid={`button-delete-corpus-${corpus.id}`}
            >
              {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        {corpus.sizeLabel && <span className="font-medium">{corpus.sizeLabel}</span>}
        {corpus.license && (
          <span className="px-1.5 py-0.5 rounded bg-muted/60 font-mono">{corpus.license}</span>
        )}
        {corpus.createdAt && corpus.origin === "user" && (
          <span>{new Date(corpus.createdAt).toLocaleDateString()}</span>
        )}
      </div>

      {pairs && pairs.length > 0 && (
        <>
          <button
            onClick={() => setPreviewModalOpen(true)}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors font-medium"
            data-testid={`button-preview-${corpus.id}`}
          >
            <Maximize2 className="w-3 h-3" />
            Preview sample ({pairs.length} entries)
          </button>

          <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
            <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col p-0 gap-0">
              <DialogHeader className="px-6 py-4 border-b border-border/40 shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`h-1 w-6 rounded-full bg-gradient-to-r ${trackColor}`} />
                  <DialogTitle className="text-base font-bold">{corpus.name}</DialogTitle>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide ${typeColor}`}>
                    {corpus.type}
                  </span>
                  {corpus.languagePair && (
                    <span className="text-xs text-muted-foreground">{langFlags(corpus.languagePair)} {corpus.languagePair}</span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground font-medium">{pairs.length} entries</span>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 pl-9">
                  {corpus.domain ?? "Corpus preview — all rows and columns"}
                </DialogDescription>
              </DialogHeader>

              <div className="overflow-auto flex-1">
                {(() => {
                  const firstRow = pairs[0] as Record<string, unknown>;
                  const isGenericTable = firstRow && !("source" in firstRow);
                  const isBilingual = !isGenericTable && corpus.type === "bilingual";

                  if (isGenericTable) {
                    const columns = Object.keys(firstRow);
                    return (
                      <table className="text-xs border-collapse min-w-full">
                        <thead className="sticky top-0 z-10 bg-background">
                          <tr className="text-left text-[10px] text-muted-foreground uppercase tracking-wide">
                            <th className="py-2 px-3 font-semibold border-b border-border/50 w-8 text-right">#</th>
                            {columns.map(col => (
                              <th key={col} className="py-2 px-3 font-semibold border-b border-border/50 whitespace-nowrap">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(pairs as Record<string, unknown>[]).map((row, i) => (
                            <tr key={i} className={`align-top ${i % 2 === 0 ? "bg-muted/20" : ""} hover:bg-muted/40 transition-colors`}>
                              <td className="py-1.5 px-3 text-muted-foreground/50 tabular-nums text-right border-r border-border/20">{i + 1}</td>
                              {columns.map(col => (
                                <td key={col} className="py-1.5 px-3 text-foreground/80 border-r border-border/10 max-w-[220px]">
                                  <span className="block truncate" title={String(row[col] ?? "")}>
                                    {String(row[col] ?? "—")}
                                  </span>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  }

                  if (isBilingual) {
                    return (
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="text-left text-xs text-muted-foreground uppercase tracking-wide border-b border-border/40">
                            <th className="py-2 px-3 font-semibold w-[40%]">Source</th>
                            <th className="py-2 px-3 font-semibold w-[40%]">Target</th>
                            <th className="py-2 px-3 font-semibold w-[12%]">Strategy</th>
                            <th className="py-2 px-3 font-semibold w-8 text-right">#</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pairs.map((p, i) => (
                            <tr key={i} className={`align-top ${i > 0 ? "border-t border-border/20" : ""}`}>
                              <td className="py-2.5 px-3 text-foreground/85 leading-relaxed">{p.source}</td>
                              <td className="py-2.5 px-3 text-muted-foreground leading-relaxed">{p.target ?? "—"}</td>
                              <td className="py-2.5 px-3">
                                {p.strategy && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{p.strategy}</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-xs text-muted-foreground/60 text-right tabular-nums">{i + 1}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  }

                  return (
                    <ol className="space-y-2 px-6 py-4">
                      {pairs.map((p, i) => (
                        <li key={i} className="flex gap-3 text-sm leading-relaxed">
                          <span className="shrink-0 text-xs text-muted-foreground/60 tabular-nums pt-0.5 w-6 text-right">{i + 1}.</span>
                          <span className="text-foreground/85">{p.source}</span>
                        </li>
                      ))}
                    </ol>
                  );
                })()}
              </div>

              <div className="px-6 py-3 border-t border-border/40 shrink-0 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {corpus.sizeLabel && <span className="font-medium">{corpus.sizeLabel}</span>}
                  {corpus.license && <span className="ml-2 px-1.5 py-0.5 rounded bg-muted/60 font-mono">{corpus.license}</span>}
                </span>
                <span>{pairs.length} rows shown</span>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      <div className="flex items-center justify-between pt-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setAnalyzeOpen(!analyzeOpen)}
          className="gap-1.5 text-xs h-8"
          data-testid={`button-analyze-open-${corpus.id}`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Analyze →
          {analyzeOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>
      </div>

      <AnimatePresence>
        {analyzeOpen && (
          <AnalyzePanel corpus={corpus} onClose={() => setAnalyzeOpen(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  count,
  gradient,
  description,
}: {
  icon: LucideIcon;
  title: string;
  count: number;
  gradient: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md`}>
        <Icon className="w-4.5 h-4.5 text-white" />
      </div>
      <div>
        <h2 className="text-base font-bold tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
          {title}
          <span className="ml-2 text-xs font-normal text-muted-foreground">({count})</span>
        </h2>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "monolingual" | "bilingual">("all");

  const { data, isLoading, isError } = useQuery<GroupedCorpora>({
    queryKey: ["/api/library"],
  });

  const filterCorpora = (list: LibraryCorpus[]) => {
    let result = list;
    if (activeFilter !== "all") result = result.filter(c => c.type === activeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.languagePair || "").toLowerCase().includes(q) ||
        (c.domain || "").toLowerCase().includes(q)
      );
    }
    return result;
  };

  const userCorpora = filterCorpora(data?.user || []);
  const builtinCorpora = filterCorpora(data?.builtin || []);
  const externalCorpora = filterCorpora(data?.external || []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-4 mb-2"
      >
        <div className="page-header-icon bg-gradient-to-br from-cyan-500 to-blue-600">
          <Library className="w-5 h-5 text-white relative z-10" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold italic tracking-tight text-cyan-600 dark:text-cyan-400" style={{ fontFamily: "'Playfair Display', serif" }} data-testid="text-page-title">
            Corpus Library
          </h1>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5 font-medium tracking-wide">
            Browse, preview & instantly analyze corpora from your sessions or public repositories
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center gap-3"
      >
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, language, domain…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 h-9 text-sm rounded-lg border border-border/60 bg-background focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60 transition"
            data-testid="input-library-search"
          />
        </div>

        <div className="flex gap-1.5">
          {(["all", "monolingual", "bilingual"] as const).map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeFilter === f
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
              data-testid={`filter-${f}`}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </motion.div>

      {isLoading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="polished-card p-4 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-8 w-28" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="polished-card p-8 text-center">
          <p className="text-muted-foreground">Failed to load library. Please refresh.</p>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="space-y-10">
          <section data-testid="section-my-corpora">
            <SectionHeader
              icon={Users}
              title="My Corpora"
              count={userCorpora.length}
              gradient="from-cyan-500 to-blue-600"
              description="Corpora you've saved from your analysis sessions"
            />
            {userCorpora.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border/50 p-8 text-center">
                <BookMarked className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground font-medium">No saved corpora yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  After uploading and analyzing a corpus in any track, click "Save to Library" to store it here.
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {userCorpora.map(c => (
                    <CorpusCard key={c.id} corpus={c} showDelete />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>

          {builtinCorpora.length > 0 && (
            <section data-testid="section-sample-corpora">
              <SectionHeader
                icon={BookText}
                title="Sample Corpora"
                count={builtinCorpora.length}
                gradient="from-emerald-500 to-teal-600"
                description="Curated built-in corpora ready to analyze immediately"
              />
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {builtinCorpora.map(c => (
                  <CorpusCard key={c.id} corpus={c} />
                ))}
              </div>
            </section>
          )}

          <section data-testid="section-public-datasets">
            <SectionHeader
              icon={Database}
              title="Public Datasets"
              count={externalCorpora.length}
              gradient="from-violet-500 to-purple-600"
              description="Real publicly available corpora — preview samples and jump straight to analysis"
            />
            {externalCorpora.length === 0 && !isLoading && (
              <div className="rounded-xl border border-dashed border-border/50 p-6 text-center">
                <p className="text-sm text-muted-foreground">No external datasets match your search.</p>
              </div>
            )}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {externalCorpora.map(c => (
                <CorpusCard key={c.id} corpus={c} />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
