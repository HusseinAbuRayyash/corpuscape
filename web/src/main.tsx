import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronRight,
  Columns2,
  FileText,
  FlaskConical,
  FolderOpen,
  Globe2,
  Languages,
  LayoutDashboard,
  Library,
  LockKeyhole,
  Menu,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  ScanText,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  alignByLine,
  csv,
  defaultOptions,
  sortConcordance,
  createTextFilter,
  tmx,
  xmlEscape,
  type Analysis,
  type CorpusDocument,
  type Options,
  type Hit,
} from "./engine";
import { importFile, ACCEPT, RequiresOcr, type Imported } from "./files";
import { selectTmxPairs, type TranslationMemory } from "./import-parsers";
import { makeBackup, validateBackup } from "./backup";
import { FigureStudio } from "./figure-studio";
import { ResearchReports } from "./research-reports";
import { TextExtraction } from "./text-extraction";
import { validateWorkspace, type WorkspaceSession } from "./workspace-session";
import { validateStudioProject } from "./studio-model";
import type { LanguageSuggestion } from "./language-detection";
import { FrequencyChart } from "./figure-chart";
import { DocumentManager } from "./document-manager";
import { Modal } from "./modal";
import { exclusiveSave } from "./save-queue";
import { formatPercentage } from "./format";
import {
  listCorpora,
  saveCorpus,
  deleteCorpus,
  loadSession,
  saveSession,
  saveSessions,
  type SavedCorpus,
} from "./library";
import { samples, locales } from "./samples";
import {
  ToolHeading,
  CorpusStart,
  LibraryStart,
  Dashboard,
} from "./product-components";
import "@fontsource-variable/inter";
import "./product.css";
import { Landing } from "./landing";
import { WorkspaceSearch } from "./workspace-search";
import "./workspace-theme.css";
import "./landing.css";

type View =
  | "overview"
  | "workspace"
  | "analysis"
  | "bilingual"
  | "compare"
  | "figures"
  | "reports"
  | "ocr"
  | "library"
  | "methods";
const navigation = [
  ["overview", "Home", Globe2],
  ["workspace", "Workspace", LayoutDashboard],
  ["analysis", "Corpus explorer", FileText],
  ["bilingual", "Parallel workspace", Languages],
  ["compare", "Compare corpora", Columns2],
  ["figures", "Figure studio", BarChart3],
  ["reports", "Research reports", Sparkles],
  ["ocr", "Text extraction", ScanText],
  ["library", "Corpus library", Library],
  ["methods", "Methods & privacy", BookOpen],
] as const;
const fmt = (n: number, maximumFractionDigits = 0) =>
  n.toLocaleString(undefined, { maximumFractionDigits });
function download(
  name: string,
  content: string | Blob,
  type = "text/plain;charset=utf-8",
) {
  const url = URL.createObjectURL(
    content instanceof Blob ? content : new Blob([content], { type }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const exportCsv = (name: string, rows: unknown[][]) =>
  download(name + ".csv", csv(rows), "text/csv;charset=utf-8");
function useEngine() {
  const worker = useRef<Worker>();
  const pending = useRef(
    new Map<
      number,
      { resolve: (value: any) => void; reject: (e: Error) => void }
    >(),
  );
  const id = useRef(0);
  useEffect(() => {
    let restarted = false;
    const start = () => {
      const w = new Worker(new URL("./analysis.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.current = w;
      w.onmessage = ({ data }) => {
        const request = pending.current.get(data.id);
        if (!request) return;
        pending.current.delete(data.id);
        data.error
          ? request.reject(new Error(data.error))
          : request.resolve(data.result);
      };
      w.onerror = () => {
        pending.current.forEach((r) =>
          r.reject(
            new Error(
              "The analysis worker stopped. Try a smaller corpus or refresh the page.",
            ),
          ),
        );
        pending.current.clear();
        w.terminate();
        if (!restarted) {
          restarted = true;
          start();
        } else worker.current = undefined;
      };
    };
    start();
    return () => {
      worker.current?.terminate();
      pending.current.forEach((r) =>
        r.reject(new Error("Analysis cancelled.")),
      );
      pending.current.clear();
    };
  }, []);
  return (action: string, data: Record<string, unknown>) =>
    new Promise<any>((resolve, reject) => {
      const requestId = ++id.current;
      pending.current.set(requestId, { resolve, reject });
      if (!worker.current) {
        pending.current.delete(requestId);
        reject(new Error("Analysis is not ready. Please try again."));
        return;
      }
      worker.current.postMessage({ id: requestId, action, ...data });
    });
}
function LocaleSelect({
  value,
  onChange,
  label = "Text language",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  const [custom, setCustom] = useState(""),
    [customMode, setCustomMode] = useState(
      !locales.some(([id]) => id === value),
    ),
    [localeError, setLocaleError] = useState("");
  useEffect(() => {
    setCustomMode(!locales.some(([id]) => id === value));
    setCustom(value);
    setLocaleError("");
  }, [value]);
  return (
    <div className="locale-select">
      <label>
        <span>{label}</span>
        <select
          aria-label={label}
          value={customMode ? "custom" : value}
          onChange={(e) => {
            if (e.target.value !== "custom") {
              setCustomMode(false);
              onChange(e.target.value);
            } else {
              setCustomMode(true);
              setCustom("");
            }
          }}
        >
          {locales.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
          <option value="custom">Other language / BCP 47 code</option>
        </select>
      </label>
      {customMode && (
        <div className="custom-locale">
          <input
            aria-label="Other language code"
            placeholder="e.g. sw, bn, ta, el"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
          <button
            className="button secondary small"
            onClick={() => {
              try {
                if (!custom.trim()) throw new Error();
                const code = Intl.getCanonicalLocales(custom.trim())[0];
                new Intl.Segmenter(code);
                onChange(code);
                setLocaleError("");
              } catch {
                setLocaleError("Enter a valid BCP 47 language code.");
              }
            }}
          >
            Apply
          </button>
          <small>{localeError || `Applied language: ${value}`}</small>
        </div>
      )}
      <small>
        {value === "und"
          ? "Uses browser ICU defaults, without language detection."
          : `Word segmenter: ${new Intl.Segmenter(value).resolvedOptions().locale}${Intl.Segmenter.supportedLocalesOf([value]).length ? "" : " (browser fallback; inspect boundaries)"}`}
      </small>
    </div>
  );
}
function App() {
  const initial = location.hash.slice(1) as View;
  const [view, setView] = useState<View>(
    navigation.some(([id]) => id === initial) ? initial : "overview",
  );
  const [menu, setMenu] = useState(false),
    [optionsOpen, setOptionsOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null),
    workspaceRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const compact = matchMedia("(max-width: 760px)");
    if (!menu || !compact.matches) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    if (workspaceRef.current) workspaceRef.current.inert = true;
    document.body.style.overflow = "hidden";
    const buttons = () => [
      ...(sidebarRef.current?.querySelectorAll<HTMLElement>(
        "button:not(:disabled),a[href]",
      ) ?? []),
    ];
    buttons()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const nodes = buttons(),
        first = nodes[0],
        last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    const resize = () => {
      if (!compact.matches) setMenu(false);
    };
    document.addEventListener("keydown", trap);
    compact.addEventListener("change", resize);
    return () => {
      document.removeEventListener("keydown", trap);
      compact.removeEventListener("change", resize);
      if (workspaceRef.current) workspaceRef.current.inert = false;
      document.body.style.overflow = previousOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [menu]);
  const [documents, setDocuments] = useState<CorpusDocument[]>([]),
    [name, setName] = useState("Untitled corpus");
  const activeId = useRef<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const corpusEpoch = useRef(0);
  function setActiveId(id: string | null) {
    activeId.current = id;
    setSavedId(id);
    corpusEpoch.current++;
  }
  const saveOnce = useRef(exclusiveSave());
  const [appendImport, setAppendImport] = useState(false);
  const [undoDocuments, setUndoDocuments] = useState<CorpusDocument[] | null>(
    null,
  );
  const [deleteCandidate, setDeleteCandidate] = useState<SavedCorpus | null>(
    null,
  );
  const [tmxImport, setTmxImport] = useState<TranslationMemory | null>(null);
  const [tmxSource, setTmxSource] = useState("en"),
    [tmxTarget, setTmxTarget] = useState("es");
  const [options, setOptions] = useState<Options>(defaultOptions),
    [stopText, setStopText] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null),
    [busy, setBusy] = useState(false),
    [importing, setImporting] = useState(false);
  const [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const [paste, setPaste] = useState(""),
    [inputTab, setInputTab] = useState<"upload" | "paste">("upload");
  const [tableImport, setTableImport] = useState<
    | (Imported & {
        name: string;
        destination: "main" | "reference" | "pairs";
        append: boolean;
        file: File;
      })
    | null
  >(null);
  const [column, setColumn] = useState(0),
    [targetColumn, setTargetColumn] = useState(1),
    [noteColumn, setNoteColumn] = useState(-1),
    [header, setHeader] = useState(false);
  const [tab, setTab] = useState("frequencies"),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("");
  const [contextSize, setContextSize] = useState(55),
    [kwicSort, setKwicSort] = useState("position"),
    [queryDocument, setQueryDocument] = useState("all");
  const [ngram, setNgram] = useState(2),
    [windowSize, setWindowSize] = useState(5),
    [minimum, setMinimum] = useState(2);
  const [hits, setHits] = useState<{ hits: Hit[]; total: number }>({
    hits: [],
    total: 0,
  });
  const [collocates, setCollocates] = useState<
    { term: string; count: number; pmi: number; dice: number }[]
  >([]);
  const [queryError, setQueryError] = useState("");
  const [queryBusy, setQueryBusy] = useState(false),
    [page, setPage] = useState(0);
  const [saved, setSaved] = useState<SavedCorpus[]>([]),
    [libraryReady, setLibraryReady] = useState(false);
  const [reference, setReference] = useState<CorpusDocument[]>([]),
    [referencePaste, setReferencePaste] = useState("");
  const [compareError, setCompareError] = useState("");
  const [comparison, setComparison] = useState<{
    a: Analysis;
    b: Analysis;
    rows: {
      term: string;
      a: number;
      b: number;
      aPerMillion: number;
      bPerMillion: number;
      logRatio: number;
      g2: number;
      pValue: number;
      qValue: number;
      log10P: number;
    }[];
  } | null>(null);
  const [sourceText, setSourceText] = useState(""),
    [targetText, setTargetText] = useState("");
  const [sourceLocale, setSourceLocale] = useState("en"),
    [targetLocale, setTargetLocale] = useState("es");
  const [pairs, setPairs] = useState<
      { source: string; target: string; note: string }[]
    >([]),
    [pairFilter, setPairFilter] = useState("");
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [sessionReady, setSessionReady] = useState(false),
    [autoSave, setAutoSave] = useState(true),
    [sessionStatus, setSessionStatus] = useState("Opening workspace…");
  const [languageSuggestions, setLanguageSuggestions] = useState<
      LanguageSuggestion[]
    >([]),
    [detecting, setDetecting] = useState(false);
  function applyWorkspace(value: WorkspaceSession) {
    setDocuments(value.documents);
    setName(value.name);
    setOptions(value.options);
    setStopText(value.options.stopWords.join("\n"));
    setReference(value.reference);
    setSourceText(value.sourceText);
    setTargetText(value.targetText);
    setSourceLocale(value.sourceLocale);
    setTargetLocale(value.targetLocale);
    setPairs(value.pairs);
    setActiveId(value.activeId);
    setUndoDocuments(null);
    setQueryDocument("all");
  }
  useEffect(() => {
    let active = true;
    Promise.all([
      loadSession<WorkspaceSession>("workspace-v1"),
      loadSession<{ autoSave: boolean }>("workspace-preferences-v1"),
    ])
      .then(([data, preferences]) => {
        if (!active) return;
        if (data) applyWorkspace(validateWorkspace(data));
        if (typeof preferences?.autoSave === "boolean")
          setAutoSave(preferences.autoSave);
      })
      .catch(() =>
        setSessionStatus("Workspace recovery unavailable · use a backup"),
      )
      .finally(() => {
        if (active) setSessionReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!sessionReady || !autoSave) return;
    setSessionStatus("Saving workspace…");
    const value: WorkspaceSession = {
      name,
      documents,
      options,
      reference,
      sourceText,
      targetText,
      sourceLocale,
      targetLocale,
      pairs,
      activeId: savedId,
    };
    const timer = setTimeout(() => {
      saveSession("workspace-v1", value)
        .then(() => setSessionStatus("Workspace saved on this device"))
        .catch(() =>
          setSessionStatus("Storage unavailable · download a workspace backup"),
        );
    }, 700);
    return () => clearTimeout(timer);
  }, [
    sessionReady,
    autoSave,
    name,
    documents,
    options,
    reference,
    sourceText,
    targetText,
    sourceLocale,
    targetLocale,
    pairs,
    savedId,
  ]);
  async function exportWorkspace() {
    try {
      const [figure, reports] = await Promise.all([
        loadSession("figure-studio-v2"),
        loadSession("research-reports-v1"),
      ]);
      download(
        "corpuscape-workspace.json",
        JSON.stringify(
          {
            format: "corpuscape-workspace-v1",
            workspace: {
              name,
              documents,
              options,
              reference,
              sourceText,
              targetText,
              sourceLocale,
              targetLocale,
              pairs,
              activeId: savedId,
            },
            figure,
            reports,
            exportedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
        "application/json",
      );
    } catch (e) {
      fail(e);
    }
  }
  const uploadRef = useRef<HTMLInputElement>(null),
    refUpload = useRef<HTMLInputElement>(null),
    pairUpload = useRef<HTMLInputElement>(null);
  const analysisVersion = useRef(0),
    queryVersion = useRef(0),
    compareVersion = useRef(0);
  const run = useEngine();
  const notify = (text: string) => {
    setMessage(text);
    setError("");
  };
  const fail = (e: unknown) => {
    setError(e instanceof Error ? e.message : String(e));
    setMessage("");
  };
  function navigate(next: View) {
    setView(next);
    location.hash = next;
    setMenu(false);
    setFilter("");
    setPage(0);
  }
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  useEffect(() => {
    const handler = () => {
      const next = location.hash.slice(1) as View;
      if (navigation.some(([id]) => id === next)) setView(next);
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 6000);
    return () => clearTimeout(t);
  }, [message]);
  useEffect(() => {
    const version = ++analysisVersion.current;
    if (!documents.length) {
      setAnalysis(null);
      setBusy(false);
      return;
    }
    setBusy(true);
    setAnalysis(null);
    run("analyze", { documents, options })
      .then((result) => {
        if (version === analysisVersion.current) {
          setAnalysis(result);
          setBusy(false);
        }
      })
      .catch((e) => {
        if (version === analysisVersion.current) {
          fail(e);
          setBusy(false);
        }
      });
  }, [documents, options]);
  useEffect(() => {
    const version = ++queryVersion.current;
    setPage(0);
    setHits({ hits: [], total: 0 });
    setCollocates([]);
    setQueryError("");
    if (
      !query.trim() ||
      !documents.length ||
      !["concordance", "collocations"].includes(tab)
    ) {
      setQueryBusy(false);
      return;
    }
    setQueryBusy(true);
    const timer = setTimeout(
      () =>
        run(tab, {
          documents:
            queryDocument === "all"
              ? documents
              : documents.filter((_, i) => String(i) === queryDocument),
          options,
          query,
          window: windowSize,
          minimum,
          context: contextSize,
        })
          .then((result) => {
            if (version !== queryVersion.current) return;
            if (tab === "concordance") setHits(result);
            else setCollocates(result);
            setQueryBusy(false);
          })
          .catch((e) => {
            if (version === queryVersion.current) {
              setQueryError(e instanceof Error ? e.message : String(e));
              setQueryBusy(false);
            }
          }),
      300,
    );
    return () => clearTimeout(timer);
  }, [
    documents,
    options,
    query,
    tab,
    windowSize,
    minimum,
    contextSize,
    queryDocument,
  ]);
  useEffect(() => {
    setPage(0);
  }, [filter, ngram, tab, pairFilter, pairs.length]);
  useEffect(() => {
    const version = ++compareVersion.current;
    setComparison(null);
    setCompareError("");
    if (!documents.length || !reference.length) return;
    run("compare", { documents, reference, options })
      .then((result) => {
        if (version === compareVersion.current) setComparison(result);
      })
      .catch((e) => {
        if (version === compareVersion.current)
          setCompareError(e instanceof Error ? e.message : String(e));
      });
  }, [documents, reference, options]);
  async function refreshLibrary() {
    try {
      setSaved(await listCorpora());
      setLibraryReady(true);
    } catch (e) {
      fail(e);
    }
  }
  useEffect(() => {
    if (view === "library") refreshLibrary();
  }, [view]);
  function checkSize(docs: CorpusDocument[]) {
    if (docs.some((doc) => typeof doc.text !== "string"))
      throw new Error("Every document needs text.");
  }
  async function filesSelected(
    files: FileList | File[],
    destination: "main" | "reference" | "pairs" = "main",
  ) {
    if (!files.length) return;
    setImporting(true);
    setError("");
    try {
      const results: Imported[] = [];
      for (const file of Array.from(files))
        results.push(await importFile(file));
      if (results.some((r) => r.table)) {
        if (results.length !== 1)
          throw new Error(
            "Import tables one at a time so you can choose the text column.",
          );
        setColumn(0);
        setTargetColumn(1);
        setNoteColumn(-1);
        setHeader(false);
        setTableImport({
          ...results[0],
          name: files[0].name,
          destination,
          append: appendImport,
          file: files[0],
        });
        return;
      }
      if (destination === "pairs") {
        if (results[0].translationMemory) {
          setTmxImport(results[0].translationMemory);
          setTmxSource(results[0].translationMemory.sourceLocale);
          setTmxTarget(results[0].translationMemory.targetLocale);
          return;
        }
        if (!results[0].pairs)
          throw new Error(
            "Import a two-column CSV, TSV, XLSX or TMX file here. You can also paste source and target texts below.",
          );
        checkSize([
          {
            name: "",
            text: results[0].pairs.map((p) => p.source + p.target).join(""),
          },
        ]);
        setPairs(results[0].pairs);
        notify(
          "Translation pairs imported. Check the language tags before exporting TMX.",
        );
      } else {
        const docs = results.flatMap((r) => r.documents);
        checkSize(docs);
        if (destination === "reference") setReference(docs);
        else {
          const next = appendImport ? [...documents, ...docs] : docs;
          checkSize(next);
          setDocuments(next);
          setQueryDocument("all");
          setUndoDocuments(null);
          if (!appendImport) setActiveId(null);
          if (!appendImport)
            setName(
              files.length === 1
                ? files[0].name.replace(/\.[^.]+$/, "")
                : `${files.length} document corpus`,
            );
          navigate("analysis");
        }
        notify(
          `${docs.length} document${docs.length === 1 ? "" : "s"} imported on this device.`,
        );
      }
    } catch (e) {
      if (e instanceof RequiresOcr) {
        setOcrFile(e.file);
        navigate("ocr");
        notify(
          "Choose OCR languages to extract this scanned document. The active corpus is preserved until you use the result.",
        );
      } else fail(e);
    } finally {
      setImporting(false);
      setAppendImport(false);
      [uploadRef, refUpload, pairUpload].forEach((ref) => {
        if (ref.current) ref.current.value = "";
      });
    }
  }
  function confirmTable() {
    if (!tableImport?.table) return;
    try {
      const rows = tableImport.table.rows.slice(header ? 1 : 0);
      if (!rows.length)
        throw new Error("No data rows remain after removing the header.");
      if (tableImport.destination === "pairs") {
        if (column === targetColumn)
          throw new Error("Choose different source and target columns.");
        const importedPairs = rows
          .map((row) => ({
            source: row[column] ?? "",
            target: row[targetColumn] ?? "",
            note: noteColumn < 0 ? "" : (row[noteColumn] ?? ""),
          }))
          .filter((p) => p.source || p.target);
        if (!importedPairs.length)
          throw new Error("The selected columns have no translation text.");
        checkSize([
          {
            name: "",
            text: importedPairs.map((p) => p.source + p.target).join(""),
          },
        ]);
        setPairs(importedPairs);
      } else {
        const docs = [
          {
            name: tableImport.name,
            text: rows.map((row) => row[column] ?? "").join("\n"),
          },
        ];
        checkSize(docs);
        if (!docs[0].text.trim())
          throw new Error("The selected column has no text.");
        if (tableImport.destination === "reference") setReference(docs);
        else {
          const next = tableImport.append ? [...documents, ...docs] : docs;
          checkSize(next);
          setDocuments(next);
          setQueryDocument("all");
          setUndoDocuments(null);
          if (!tableImport.append) setActiveId(null);
          if (!tableImport.append) setName(tableImport.name);
          navigate("analysis");
        }
      }
      setTableImport(null);
      notify("Table imported.");
    } catch (e) {
      fail(e);
    }
  }
  function loadSample(index: number) {
    setDocuments(samples[index].documents);
    setActiveId(null);
    setQueryDocument("all");
    setUndoDocuments(null);
    setName(samples[index].name);
    setOptions({
      ...defaultOptions,
      locale: samples[index].locale,
      stopWords: [],
    });
    setStopText("");
    navigate("analysis");
    notify("Original teaching sample loaded.");
  }
  function usePaste() {
    try {
      if (!paste.trim()) throw new Error("Paste some text first.");
      const docs = [{ name: "Pasted text", text: paste }];
      checkSize(docs);
      setDocuments(docs);
      setQueryDocument("all");
      setUndoDocuments(null);
      setActiveId(null);
      setName("Pasted corpus");
      navigate("analysis");
    } catch (e) {
      fail(e);
    }
  }
  async function save() {
    if (!documents.length) return;
    try {
      await saveOnce.current(async () => {
        const epoch = corpusEpoch.current;
        const id = activeId.current ?? crypto.randomUUID();
        await saveCorpus({
          id,
          name: name.trim() || "Untitled corpus",
          locale: options.locale,
          savedAt: new Date().toISOString(),
          documents,
          options,
        });
        if (corpusEpoch.current === epoch) setActiveId(id);
        notify(
          "Saved in this browser. Export a backup to keep a copy outside this device.",
        );
        refreshLibrary();
      });
    } catch (e) {
      fail(e);
    }
  }
  const termFilter = useMemo(
    () =>
      createTextFilter(filter, [
        options.locale,
        ...documents.map((doc) => doc.locale ?? options.locale),
      ]),
    [filter, options.locale, documents],
  );
  const frequencies = useMemo(
    () => (analysis?.frequencies ?? []).filter((row) => termFilter(row.term)),
    [analysis, termFilter],
  );
  const gramRows = (analysis?.ngrams[ngram] ?? []).filter((row) =>
    termFilter(row.term),
  );
  const pairMatches = useMemo(
    () => createTextFilter(pairFilter, [sourceLocale, targetLocale]),
    [pairFilter, sourceLocale, targetLocale],
  );
  const pairRows = pairs
    .map((p, i) => ({ ...p, index: i }))
    .filter((p) => pairMatches([p.source, p.target, p.note].join("\n")));
  const kwicHits = useMemo(
    () => sortConcordance(hits.hits, kwicSort, options.locale),
    [hits, kwicSort, options.locale],
  );
  function exportReport() {
    if (!analysis) return;
    const escape = xmlEscape;
    download(
      "corpuscape-report.html",
      `<!doctype html><html><meta charset="UTF-8"><title>${escape(name)} — Corpuscape</title><style>body{font:16px system-ui;max-width:900px;margin:50px auto;padding:20px;color:#173f35}table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #ccc;text-align:start}@media print{body{margin:0}}</style><h1>${escape(name)}</h1><p>Corpuscape · ${escape(new Date().toISOString())}</p><p>${fmt(analysis.words)} word tokens · ${fmt(analysis.types)} types · ${fmt(analysis.sentences)} sentences · TTR ${formatPercentage(analysis.ttr)}</p><h2>Method</h2><p>Unicode NFC, Intl.Segmenter (${escape(options.locale)}), case ${options.caseSensitive ? "preserved" : "folded"}. Stop list: ${escape(options.stopWords.join(", ") || "none")}. Deterministic descriptive frequency analysis. Optional local-model research drafts are available separately. Counts include numbers. TTR is sensitive to corpus size. Boundaries depend on browser ICU data; document language overrides apply. Export the complete JSON backup to preserve the source texts and settings.</p><h2>Documents</h2><ul>${analysis.documentStats.map((d) => `<li>${escape(d.name)} [${escape(d.locale)}; resolved ${escape(new Intl.Segmenter(d.locale === "und" ? undefined : d.locale).resolvedOptions().locale)}]: ${d.words} tokens, ${d.types} types, ${d.hapax} hapax</li>`).join("")}</ul><h2>Full frequency table</h2><table><tr><th>Term</th><th>Count</th><th>Per million</th><th>Documents</th></tr>${analysis.frequencies
        .map(
          (r) =>
            `<tr><td dir="auto">${escape(r.term)}</td><td>${r.count}</td><td>${fmt(r.perMillion, 2)}</td><td>${r.documents}</td></tr>`,
        )
        .join(
          "",
        )}</table><p>Use your browser's Print → Save as PDF to create a PDF copy.</p></html>`,
      "text/html;charset=utf-8",
    );
  }
  const InputPanel = (
    <section className="panel import-panel">
      <div className="panel-head">
        <div>
          <span className="eyebrow">IMPORT DATA</span>
          <h2>Add your texts</h2>
        </div>
        <span className="tag">LOCAL</span>
      </div>
      <div className="segmented">
        <button
          className={inputTab === "upload" ? "selected" : ""}
          onClick={() => setInputTab("upload")}
        >
          <Upload size={15} />
          Upload files
        </button>
        <button
          className={inputTab === "paste" ? "selected" : ""}
          onClick={() => setInputTab("paste")}
        >
          <FileText size={15} />
          Paste text
        </button>
      </div>
      {inputTab === "upload" ? (
        <button
          className="dropzone"
          disabled={importing}
          onClick={() => uploadRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            filesSelected(e.dataTransfer.files);
          }}
        >
          <span className="upload-symbol">
            <Upload size={24} />
          </span>
          <strong>
            {importing
              ? "Reading files on your device…"
              : "Drop files to import"}
          </strong>
          <span className="browse-action">
            Choose files <ArrowUpRight size={13} />
          </span>
          <small>
            TXT, DOCX, PDF, CSV, XLSX & more
            <br />
            No fixed file or project quota · uses device memory
          </small>
        </button>
      ) : (
        <>
          <label className="sr-only" htmlFor="paste-corpus">
            Corpus text
          </label>
          <textarea
            id="paste-corpus"
            dir="auto"
            className="paste-input"
            placeholder="Paste text in any language…"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
          />
          <button className="button primary full" onClick={usePaste}>
            Analyze text <ArrowRight size={16} />
          </button>
        </>
      )}
      <LocaleSelect
        value={options.locale}
        onChange={(locale) => setOptions({ ...options, locale })}
      />
      <div className="local-note">
        <LockKeyhole size={14} />
        Your texts stay on this device.
      </div>
    </section>
  );
  const Metrics = analysis && (
    <div className="metrics">
      {[
        [fmt(analysis.words), "Word tokens"],
        [fmt(analysis.types), "Unique types"],
        [fmt(analysis.sentences), "Sentences"],
        [formatPercentage(analysis.ttr), "Type–token ratio"],
      ].map(([value, label], index) => (
        <div key={label} className={`metric-card metric-${index}`}>
          <span className="metric-symbol">
            {index === 0 ? (
              <FileText size={20} />
            ) : index === 1 ? (
              <Languages size={20} />
            ) : index === 2 ? (
              <Columns2 size={20} />
            ) : (
              <BarChart3 size={20} />
            )}
          </span>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
  const Empty = (
    <CorpusStart
      onUpload={() => uploadRef.current?.click()}
      onSample={loadSample}
    />
  );

  return (
    <div className={`app workspace-view-${view}`}>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <aside
        ref={sidebarRef}
        id="workspace-navigation"
        className={menu ? "sidebar open" : "sidebar"}
        role={menu ? "dialog" : undefined}
        aria-modal={menu || undefined}
        aria-label="Workspace navigation"
      >
        <button
          className="icon-button mobile-navigation-close"
          aria-label="Close workspace navigation"
          onClick={() => setMenu(false)}
        >
          <X size={20} />
        </button>
        <a
          href="#overview"
          className="brand"
          onClick={() => navigate("overview")}
        >
          <span className="brand-mark">
            <i />
            <i />
            <i />
          </span>
          <span className="brand-name">
            corpuscape<span className="brand-dot">.</span>
            <small>CORPUS RESEARCH WORKSPACE</small>
          </span>
        </a>
        <button
          className="sidebar-create"
          onClick={() => {
            setMenu(false);
            setAppendImport(false);
            uploadRef.current?.click();
          }}
        >
          <Plus size={16} />
          New corpus
        </button>
        <div className="sidebar-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map(([id, label, Icon]) => (
            <button
              key={id}
              className={view === id ? "nav-item active" : "nav-item"}
              aria-current={view === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={18} />
              <span className="nav-label">{label}</span>
              {view === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-privacy">
            <ShieldCheck size={17} />
            <div>
              <strong>Local by default</strong>
              <span>Your texts stay on this device.</span>
            </div>
          </div>
          <a
            className="maker"
            href="https://github.com/HusseinAbuRayyash/corpuscape"
            target="_blank"
            rel="noreferrer"
          >
            <span>HA</span>
            <div>
              Hussein Abu-Rayyash<small>PROJECT ON GITHUB</small>
            </div>
            <ArrowUpRight size={14} />
          </a>
        </div>
      </aside>
      {menu && (
        <button
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="workspace" ref={workspaceRef}>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button menu-button"
              aria-label="Toggle navigation"
              aria-expanded={menu}
              aria-controls="workspace-navigation"
              onClick={() => setMenu(!menu)}
            >
              <Menu size={21} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{navigation.find(([id]) => id === view)?.[1]}</strong>
          </div>
          <div className="header-actions">
            <WorkspaceSearch onNavigate={navigate} />
            <div className="header-status">
              <span className="status-dot" />
              All analysis runs locally
              <span className="header-divider" />
              <Globe2 size={15} />
              <span>Multilingual</span>
            </div>
          </div>
        </header>
        <main id="main">
          <input
            ref={uploadRef}
            type="file"
            multiple
            accept={ACCEPT}
            hidden
            onChange={(e) => e.target.files && filesSelected(e.target.files)}
          />
          <input
            ref={refUpload}
            type="file"
            multiple
            accept={ACCEPT}
            hidden
            onChange={(e) =>
              e.target.files && filesSelected(e.target.files, "reference")
            }
          />
          <input
            ref={pairUpload}
            type="file"
            accept=".csv,.tsv,.xlsx,.tmx"
            hidden
            onChange={(e) =>
              e.target.files && filesSelected(e.target.files, "pairs")
            }
          />
          {error && (
            <div role="alert" className="notice error">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={17} />
              </button>
            </div>
          )}
          {!documents.length && undoDocuments && (
            <button
              className="button secondary"
              onClick={() => {
                setDocuments(undoDocuments);
                setUndoDocuments(null);
              }}
            >
              Undo document removal
            </button>
          )}
          {message && (
            <div role="status" className="notice success">
              <Check size={17} />
              {message}
              <button
                aria-label="Dismiss notification"
                onClick={() => setMessage("")}
              >
                <X size={17} />
              </button>
            </div>
          )}
          {view === "overview" && (
            <Landing onNavigate={navigate} onSample={loadSample} />
          )}
          {view === "workspace" && (
            <Dashboard
              input={InputPanel}
              onNavigate={navigate}
              onSample={loadSample}
              activeName={name}
              documents={documents.length}
              tokens={analysis?.words}
            />
          )}

          {view === "analysis" && (
            <>
              <PageTitle
                eyebrow="MONOLINGUAL LAB"
                title="Corpus explorer"
                description="Move from individual words to patterns in context."
              />
              {!documents.length ? (
                Empty
              ) : (
                <>
                  <CorpusToolbar
                    name={name}
                    setName={setName}
                    busy={busy}
                    documents={documents}
                    onImport={() => {
                      setAppendImport(false);
                      uploadRef.current?.click();
                    }}
                    onSave={save}
                    onSettings={() => setOptionsOpen(!optionsOpen)}
                    onExport={exportReport}
                  />
                  {optionsOpen && (
                    <section className="panel settings">
                      <LocaleSelect
                        value={options.locale}
                        onChange={(locale) =>
                          setOptions({ ...options, locale })
                        }
                      />
                      <label className="check-label">
                        <input
                          type="checkbox"
                          checked={options.caseSensitive}
                          onChange={(e) =>
                            setOptions({
                              ...options,
                              caseSensitive: e.target.checked,
                            })
                          }
                        />
                        Case-sensitive counts
                      </label>
                      <label>
                        Stop list · one word per line
                        <textarea
                          value={stopText}
                          onChange={(e) => setStopText(e.target.value)}
                          placeholder="Optional: enter words to exclude from result tables"
                        />
                      </label>
                      <button
                        className="button secondary"
                        onClick={() =>
                          setOptions({
                            ...options,
                            stopWords: stopText.split(/\s+/).filter(Boolean),
                          })
                        }
                      >
                        Apply stop list
                      </button>
                      <p className="fine">
                        Stop words affect frequency tables, n-grams and
                        collocates. Token totals and type–token ratio use the
                        complete corpus. N-grams never bridge excluded words.
                      </p>
                    </section>
                  )}
                  {busy ? (
                    <div className="loading" role="status">
                      Analyzing on your device…
                    </div>
                  ) : (
                    analysis && (
                      <>
                        {Metrics}
                        <section className="panel results-panel">
                          <div
                            className="tabs"
                            role="tablist"
                            aria-label="Corpus analyses"
                          >
                            {[
                              ["frequencies", "Word frequencies"],
                              ["concordance", "Concordance"],
                              ["ngrams", "N-grams"],
                              ["collocations", "Collocations"],
                              ["documents", "Documents"],
                            ].map(([id, label]) => (
                              <button
                                role="tab"
                                aria-selected={tab === id}
                                key={id}
                                className={tab === id ? "active" : ""}
                                onClick={() => {
                                  setTab(id);
                                  setPage(0);
                                }}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          {tab === "frequencies" && (
                            <>
                              <div className="results-toolbar">
                                <SearchField
                                  value={filter}
                                  onChange={setFilter}
                                  placeholder="Filter words…"
                                />

                                <span className="fine">
                                  {fmt(frequencies.length)} terms
                                </span>
                                <button
                                  className="button secondary small"
                                  onClick={() =>
                                    exportCsv("word-frequencies", [
                                      [
                                        "Term",
                                        "Frequency",
                                        "Per million",
                                        "Documents",
                                      ],
                                      ...frequencies.map((r) => [
                                        r.term,
                                        r.count,
                                        r.perMillion,
                                        r.documents,
                                      ]),
                                    ])
                                  }
                                >
                                  <ArrowDownToLine size={15} />
                                  Export CSV
                                </button>
                              </div>
                              <div className="analysis-grid">
                                <div>
                                  <DataTable
                                    headers={[
                                      "Term",
                                      "Frequency",
                                      "Per million",
                                      "Docs",
                                    ]}
                                    rows={frequencies
                                      .slice(page * 50, page * 50 + 50)
                                      .map((r) => [
                                        <button
                                          dir="auto"
                                          className="term-link"
                                          onClick={() => {
                                            setQuery(r.term);
                                            setTab("concordance");
                                          }}
                                        >
                                          {r.term}
                                        </button>,
                                        fmt(r.count),
                                        fmt(r.perMillion, 1),
                                        r.documents,
                                      ])}
                                  />
                                  <Pagination
                                    page={page}
                                    count={frequencies.length}
                                    onChange={setPage}
                                  />
                                </div>
                                <div className="chart-aside">
                                  <span className="eyebrow">
                                    MOST FREQUENT WORDS
                                  </span>
                                  <FrequencyChart
                                    rows={frequencies.slice(0, 12).map((r) => ({
                                      label: r.term,
                                      value: r.count,
                                    }))}
                                    title="Word frequencies"
                                    color="#4f46e5"
                                    type="bar"
                                  />
                                  <button
                                    className="text-button"
                                    onClick={() => navigate("figures")}
                                  >
                                    Open in Figure studio{" "}
                                    <ArrowUpRight size={15} />
                                  </button>
                                </div>
                              </div>
                              <p className="result-note">
                                These are observed word frequencies, rather than
                                statistically identified keywords. Click a word
                                to read it in context.
                              </p>
                            </>
                          )}
                          {tab === "ngrams" && (
                            <>
                              <div className="results-toolbar">
                                <label>
                                  N-gram size{" "}
                                  <select
                                    value={ngram}
                                    onChange={(e) =>
                                      setNgram(Number(e.target.value))
                                    }
                                  >
                                    {[2, 3, 4].map((n) => (
                                      <option key={n} value={n}>
                                        {n} words
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <SearchField
                                  value={filter}
                                  onChange={setFilter}
                                  placeholder="Filter sequences…"
                                />
                                <button
                                  className="button secondary small"
                                  onClick={() =>
                                    exportCsv("ngrams", [
                                      ["Sequence", "Frequency"],
                                      ...gramRows.map((r) => [r.term, r.count]),
                                    ])
                                  }
                                >
                                  <ArrowDownToLine size={15} />
                                  Export CSV
                                </button>
                              </div>
                              <DataTable
                                headers={["Sequence", "Frequency"]}
                                rows={gramRows
                                  .slice(page * 50, page * 50 + 50)
                                  .map((r) => [
                                    <span dir="auto">{r.term}</span>,
                                    r.count,
                                  ])}
                              />
                              <Pagination
                                page={page}
                                count={gramRows.length}
                                onChange={setPage}
                              />
                              <p className="result-note">
                                All contiguous sequences per size; sentence and
                                document boundaries are respected. Word
                                segmentation is language-dependent.
                              </p>
                            </>
                          )}
                          {(tab === "concordance" ||
                            tab === "collocations") && (
                            <>
                              <div className="results-toolbar">
                                <SearchField
                                  value={query}
                                  onChange={setQuery}
                                  placeholder={
                                    tab === "concordance"
                                      ? "Search a word or phrase…"
                                      : "Enter one node word…"
                                  }
                                />
                                <label>
                                  Search documents
                                  <select
                                    aria-label="Search documents"
                                    value={queryDocument}
                                    onChange={(e) =>
                                      setQueryDocument(e.target.value)
                                    }
                                  >
                                    <option value="all">All documents</option>
                                    {documents.map((doc, i) => (
                                      <option key={i} value={i}>
                                        {doc.name}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                {tab === "concordance" && (
                                  <>
                                    <label>
                                      Context
                                      <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={contextSize}
                                        onChange={(e) =>
                                          setContextSize(Number(e.target.value))
                                        }
                                      />
                                    </label>
                                    <label>
                                      Sort concordance
                                      <select
                                        value={kwicSort}
                                        onChange={(e) => {
                                          setKwicSort(e.target.value);
                                          setPage(0);
                                        }}
                                      >
                                        <option value="position">
                                          Corpus order
                                        </option>
                                        <option value="left">
                                          Left context (nearest first)
                                        </option>
                                        <option value="right">
                                          Right context
                                        </option>
                                        <option value="document">
                                          Document
                                        </option>
                                      </select>
                                    </label>
                                  </>
                                )}
                                {tab === "collocations" && (
                                  <>
                                    <label>
                                      Window{" "}
                                      <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={windowSize}
                                        onChange={(e) =>
                                          setWindowSize(Number(e.target.value))
                                        }
                                      />
                                    </label>
                                    <label>
                                      Min. count{" "}
                                      <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={minimum}
                                        onChange={(e) =>
                                          setMinimum(Number(e.target.value))
                                        }
                                      />
                                    </label>
                                  </>
                                )}
                                <button
                                  className="button secondary small"
                                  onClick={() =>
                                    tab === "concordance"
                                      ? exportCsv("concordance", [
                                          [
                                            "Left",
                                            "Match",
                                            "Right",
                                            "Document",
                                            "Character position",
                                          ],
                                          ...kwicHits.map((h) => [
                                            h.left,
                                            h.match,
                                            h.right,
                                            h.document,
                                            h.position,
                                          ]),
                                        ])
                                      : exportCsv("collocations", [
                                          [
                                            "Collocate",
                                            "Window count",
                                            "PMI",
                                            "Dice",
                                          ],
                                          ...collocates.map((r) => [
                                            r.term,
                                            r.count,
                                            r.pmi,
                                            r.dice,
                                          ]),
                                        ])
                                  }
                                >
                                  <ArrowDownToLine size={15} />
                                  Export CSV
                                </button>
                              </div>
                              {queryError && (
                                <p className="notice error" role="alert">
                                  {queryError}
                                </p>
                              )}
                              {queryBusy ? (
                                <div className="loading">
                                  Searching your corpus…
                                </div>
                              ) : !query.trim() ? (
                                <div className="empty-inline">
                                  <Search size={28} />
                                  <p>
                                    {tab === "concordance"
                                      ? "Enter a word or phrase to see its context."
                                      : "Enter a single segmented word to see its neighbours."}
                                  </p>
                                </div>
                              ) : tab === "concordance" ? (
                                <>
                                  <p className="table-description">
                                    {fmt(hits.total)} matches · showing up to
                                    all matches across pages · whole segmented
                                    words
                                  </p>
                                  <DataTable
                                    headers={[
                                      "Left context",
                                      "Match",
                                      "Right context",
                                      "Document",
                                    ]}
                                    rows={kwicHits
                                      .slice(page * 50, page * 50 + 50)
                                      .map((h) => [
                                        <span dir="auto" className="kwic-left">
                                          {h.left}
                                        </span>,
                                        <mark dir="auto">{h.match}</mark>,
                                        <span dir="auto">{h.right}</span>,
                                        h.document,
                                      ])}
                                  />
                                  <Pagination
                                    page={page}
                                    count={hits.hits.length}
                                    onChange={setPage}
                                  />
                                </>
                              ) : (
                                <>
                                  <DataTable
                                    headers={[
                                      "Collocate",
                                      "Window count",
                                      "PMI",
                                      "Dice",
                                    ]}
                                    rows={collocates
                                      .slice(page * 50, page * 50 + 50)
                                      .map((r) => [
                                        <span dir="auto">{r.term}</span>,
                                        r.count,
                                        fmt(r.pmi, 3),
                                        fmt(r.dice, 4),
                                      ])}
                                  />
                                  <Pagination
                                    page={page}
                                    count={collocates.length}
                                    onChange={setPage}
                                  />
                                  <p className="result-note">
                                    Symmetric token windows within sentences.
                                    Counts are directed co-occurrence events.
                                    PMI and Dice use window-slot marginals. Rare
                                    pairs can have high PMI; inspect frequencies
                                    and context.
                                  </p>
                                </>
                              )}
                            </>
                          )}
                          {tab === "documents" && (
                            <>
                              <div className="action-row">
                                <button
                                  className="button secondary small"
                                  onClick={() =>
                                    download(
                                      "corpuscape-backup.json",
                                      JSON.stringify(
                                        makeBackup(name, documents, options),
                                        null,
                                        2,
                                      ),
                                      "application/json",
                                    )
                                  }
                                >
                                  Export complete backup
                                </button>
                                <button
                                  className="button secondary small"
                                  onClick={() =>
                                    exportCsv("document-statistics", [
                                      [
                                        "Document",
                                        "Language",
                                        "Tokens",
                                        "Types",
                                        "Hapax",
                                        "Type/token ratio",
                                      ],
                                      ...analysis.documentStats.map((d) => [
                                        d.name,
                                        d.locale,
                                        d.words,
                                        d.types,
                                        d.hapax,
                                        d.words ? d.types / d.words : 0,
                                      ]),
                                    ])
                                  }
                                >
                                  Export document statistics
                                </button>
                                <button
                                  className="button secondary small"
                                  onClick={() => {
                                    setAppendImport(true);
                                    uploadRef.current?.click();
                                  }}
                                >
                                  Append files
                                </button>
                                {undoDocuments && (
                                  <button
                                    className="button secondary small"
                                    onClick={() => {
                                      setDocuments(undoDocuments);
                                      setUndoDocuments(null);
                                    }}
                                  >
                                    Undo document change
                                  </button>
                                )}
                              </div>
                              <DataTable
                                headers={[
                                  "Document",
                                  "Language",
                                  "Word tokens",
                                  "Unique types",
                                  "Hapax (once)",
                                ]}
                                rows={analysis.documentStats.map((d) => [
                                  d.name,
                                  d.locale,
                                  fmt(d.words),
                                  fmt(d.types),
                                  fmt(d.hapax),
                                ])}
                              />
                              <div className="action-row">
                                <button
                                  className="button secondary small"
                                  disabled={detecting}
                                  onClick={async () => {
                                    setDetecting(true);
                                    try {
                                      setLanguageSuggestions(
                                        await run("detect", { documents }),
                                      );
                                    } catch (e) {
                                      fail(e);
                                    } finally {
                                      setDetecting(false);
                                    }
                                  }}
                                >
                                  {detecting
                                    ? "Detecting…"
                                    : "Suggest document languages"}
                                </button>
                              </div>
                              {languageSuggestions.length > 0 && (
                                <div className="language-suggestions">
                                  <h3>Review language suggestions</h3>
                                  <p className="fine">
                                    Local trigram detection gives candidates,
                                    not certainty. Short or mixed-language texts
                                    may need manual tags.
                                  </p>
                                  {languageSuggestions.map(
                                    (suggestion, index) => (
                                      <div
                                        className="language-suggestion-row"
                                        key={index}
                                      >
                                        <span>{documents[index]?.name}</span>
                                        <div>
                                          <strong>
                                            {suggestion.name} · {suggestion.tag}
                                          </strong>
                                          <small>
                                            {" "}
                                            {suggestion.alternatives
                                              .map((item) => item.name)
                                              .join(" / ")}
                                          </small>
                                        </div>
                                      </div>
                                    ),
                                  )}
                                  <div>
                                    <button
                                      className="button secondary small"
                                      onClick={() => setLanguageSuggestions([])}
                                    >
                                      Keep current tags
                                    </button>
                                    <button
                                      className="button primary small"
                                      onClick={() => {
                                        setUndoDocuments(documents);
                                        setDocuments(
                                          documents.map((doc, index) =>
                                            languageSuggestions[index]?.tag &&
                                            languageSuggestions[index].tag !==
                                              "und"
                                              ? {
                                                  ...doc,
                                                  locale:
                                                    languageSuggestions[index]
                                                      .tag,
                                                }
                                              : doc,
                                          ),
                                        );
                                        setLanguageSuggestions([]);
                                      }}
                                    >
                                      Apply suggested tags
                                    </button>
                                  </div>
                                </div>
                              )}
                              <DocumentManager
                                documents={documents}
                                onChange={(next) => {
                                  try {
                                    checkSize(next);
                                    if (next.some((doc) => !doc.text.trim()))
                                      throw new Error(
                                        "Documents need readable text.",
                                      );
                                    setUndoDocuments(documents);
                                    setDocuments(next);
                                    setQueryDocument("all");
                                  } catch (e) {
                                    fail(e);
                                  }
                                }}
                              />
                              <p className="result-note">
                                {documents.length} documents ·{" "}
                                {fmt(analysis.characters)} Unicode code points.
                                {autoSave
                                  ? "Workspace recovery is saved on this device."
                                  : "Autosave is off. Save or export to keep this corpus."}
                              </p>
                            </>
                          )}
                        </section>
                        <div className="method-strip">
                          <BookOpen size={17} />
                          <span>
                            Transparent by design: Unicode segmentation ·
                            language-aware counts · optional local AI reports
                          </span>
                          <button onClick={() => navigate("methods")}>
                            Read the methods <ArrowUpRight size={14} />
                          </button>
                        </div>
                      </>
                    )
                  )}
                </>
              )}
            </>
          )}

          {view === "bilingual" && (
            <>
              <PageTitle
                eyebrow="BILINGUAL LAB"
                title="Parallel workspace"
                description="Review pre-aligned translations, annotate pairs, and build a translation memory."
              />
              <div className="notice neutral">
                <BookOpen size={18} />
                Line pairing preserves your order. It does not infer translation
                equivalence or evaluate translation quality.
              </div>
              <div className="pair-inputs">
                <section className="panel source-panel">
                  <div className="editor-heading">
                    <span className="editor-number">A</span>
                    <div>
                      <span className="eyebrow">SOURCE</span>
                      <h2>Source text</h2>
                    </div>
                    <FileText size={20} />
                  </div>
                  <LocaleSelect
                    value={sourceLocale}
                    onChange={setSourceLocale}
                    label="Source language tag"
                  />
                  <textarea
                    aria-label="Source segments"
                    dir="auto"
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    placeholder="One source segment per line…"
                  />
                </section>
                <section className="panel target-panel">
                  <div className="editor-heading">
                    <span className="editor-number">B</span>
                    <div>
                      <span className="eyebrow">TARGET</span>
                      <h2>Target text</h2>
                    </div>
                    <Languages size={20} />
                  </div>
                  <LocaleSelect
                    value={targetLocale}
                    onChange={setTargetLocale}
                    label="Target language tag"
                  />
                  <textarea
                    aria-label="Target segments"
                    dir="auto"
                    value={targetText}
                    onChange={(e) => setTargetText(e.target.value)}
                    placeholder="One target segment per line…"
                  />
                </section>
              </div>
              <div className="action-row">
                <button
                  className="button primary"
                  onClick={() => {
                    try {
                      if (!sourceText.trim() && !targetText.trim())
                        throw new Error(
                          "Paste source and target segments first.",
                        );
                      checkSize([{ name: "", text: sourceText + targetText }]);
                      const p = alignByLine(sourceText, targetText);
                      setPairs(p);
                      setPage(0);
                      notify(
                        "Lines paired in order. Review missing or mismatched segments.",
                      );
                    } catch (e) {
                      fail(e);
                    }
                  }}
                >
                  Pair lines <ArrowRight size={16} />
                </button>
                <button
                  className="button secondary"
                  disabled={importing}
                  onClick={() => pairUpload.current?.click()}
                >
                  <Upload size={16} />
                  Import CSV / XLSX / TMX
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    const source =
                      "Language connects people.\nEvery text holds patterns.\nResearch begins with a question.";
                    const target =
                      "El lenguaje conecta a las personas.\nCada texto contiene patrones.\nLa investigación comienza con una pregunta.";
                    setSourceText(source);
                    setTargetText(target);
                    setSourceLocale("en");
                    setTargetLocale("es");
                    setPairs(alignByLine(source, target));
                    setPage(0);
                    setPairFilter("");
                  }}
                >
                  Try a parallel sample
                </button>
              </div>
              {pairs.length > 0 && (
                <section className="panel results-panel">
                  <p className="fine">
                    Review checks:{" "}
                    {
                      pairs.filter((p) => !p.source.trim() || !p.target.trim())
                        .length
                    }{" "}
                    incomplete ·{" "}
                    {
                      pairs.filter(
                        (p) =>
                          p.source.trim() &&
                          p.source.trim() === p.target.trim(),
                      ).length
                    }{" "}
                    identical source/target ·{" "}
                    {pairs.length -
                      new Set(
                        pairs.map((p) => JSON.stringify([p.source, p.target])),
                      ).size}{" "}
                    duplicate pairs. These flags require human review and are
                    not translation quality scores.
                  </p>
                  <div className="results-toolbar">
                    <strong>{fmt(pairs.length)} pairs</strong>
                    <SearchField
                      value={pairFilter}
                      onChange={setPairFilter}
                      placeholder="Search both languages…"
                    />
                    <button
                      className="button secondary small"
                      onClick={() =>
                        exportCsv("parallel-corpus", [
                          ["Source", "Target", "Note"],
                          ...pairs.map((p) => [p.source, p.target, p.note]),
                        ])
                      }
                    >
                      CSV <ArrowDownToLine size={14} />
                    </button>
                    <button
                      className="button primary small"
                      onClick={() => {
                        try {
                          download(
                            "corpuscape.tmx",
                            tmx(pairs, sourceLocale, targetLocale),
                            "application/xml",
                          );
                        } catch (e) {
                          fail(e);
                        }
                      }}
                    >
                      Export TMX <ArrowDownToLine size={14} />
                    </button>
                  </div>
                  {pairs.some((p) => !p.source || !p.target) && (
                    <div className="notice neutral">
                      Some rows have an empty source or target. Review these
                      before using the translation memory.
                    </div>
                  )}
                  <DataTable
                    headers={["#", "Source", "Target", "Research note"]}
                    rows={pairRows
                      .slice(page * 50, page * 50 + 50)
                      .map((p) => [
                        p.index + 1,
                        <textarea
                          className="cell-input"
                          aria-label={`Source ${p.index + 1}`}
                          dir="auto"
                          value={p.source}
                          onChange={(e) =>
                            setPairs(
                              pairs.map((r, i) =>
                                i === p.index
                                  ? { ...r, source: e.target.value }
                                  : r,
                              ),
                            )
                          }
                        />,
                        <textarea
                          className="cell-input"
                          aria-label={`Target ${p.index + 1}`}
                          dir="auto"
                          value={p.target}
                          onChange={(e) =>
                            setPairs(
                              pairs.map((r, i) =>
                                i === p.index
                                  ? { ...r, target: e.target.value }
                                  : r,
                              ),
                            )
                          }
                        />,
                        <input
                          className="cell-input"
                          aria-label={`Note ${p.index + 1}`}
                          value={p.note}
                          onChange={(e) =>
                            setPairs(
                              pairs.map((r, i) =>
                                i === p.index
                                  ? { ...r, note: e.target.value }
                                  : r,
                              ),
                            )
                          }
                        />,
                      ])}
                  />
                  <Pagination
                    page={page}
                    count={pairRows.length}
                    onChange={setPage}
                  />
                  <p className="result-note">
                    Edits remain in this session. Export CSV or TMX to keep
                    them. TMX pairs are selected by language tags; Corpuscape
                    preserves notes in a custom TMX property.
                  </p>
                </section>
              )}
            </>
          )}

          {view === "compare" && (
            <>
              <PageTitle
                eyebrow="CORPUS COMPARISON"
                title="Compare corpora"
                description="Compare word distributions with normalized counts and transparent statistics."
              />
              {(!documents.length || !reference.length) && (
                <div className="comparison-intro">
                  <div>
                    <strong>See a comparison in action.</strong>
                    <span>
                      Explore two original teaching texts, then bring your own
                      corpora.
                    </span>
                  </div>
                  <button
                    className="button secondary"
                    onClick={() => {
                      setDocuments([samples[0].documents[0]]);
                      setActiveId(null);
                      setStopText("");
                      setName("Teaching sample · Translation practice");
                      setReference([samples[0].documents[1]]);
                      setOptions({
                        ...defaultOptions,
                        locale: "en",
                        stopWords: [],
                      });
                      notify(
                        "Two original English teaching samples loaded for comparison.",
                      );
                    }}
                  >
                    Try a working comparison <ArrowRight size={15} />
                  </button>
                </div>
              )}
              <div className="comparison-inputs">
                <section className="panel comparison-a">
                  <span className="eyebrow">CORPUS A · ACTIVE CORPUS</span>
                  <h2>
                    {documents.length ? name : "Choose your first corpus"}
                  </h2>
                  <p>
                    {documents.length
                      ? `${documents.length} ${documents.length === 1 ? "document" : "documents"} · ${analysis ? fmt(analysis.words) : "…"} word tokens`
                      : "Load a corpus in the Monolingual lab first."}
                  </p>
                  <button
                    className="button secondary"
                    onClick={() =>
                      navigate(documents.length ? "analysis" : "workspace")
                    }
                  >
                    Open corpus A <ArrowUpRight size={15} />
                  </button>
                </section>
                <section className="panel comparison-b">
                  <span className="eyebrow">CORPUS B · REFERENCE</span>
                  <h2>
                    {reference.length
                      ? reference.map((d) => d.name).join(", ")
                      : "Add a reference corpus"}
                  </h2>
                  <textarea
                    aria-label="Reference corpus text"
                    dir="auto"
                    value={referencePaste}
                    onChange={(e) => setReferencePaste(e.target.value)}
                    placeholder="Paste reference text…"
                  />
                  <div className="action-row">
                    <button
                      className="button primary small"
                      onClick={() => {
                        try {
                          if (!referencePaste.trim())
                            throw new Error("Paste reference text first.");
                          const docs = [
                            { name: "Reference text", text: referencePaste },
                          ];
                          checkSize(docs);
                          setReference(docs);
                        } catch (e) {
                          fail(e);
                        }
                      }}
                    >
                      Use reference text
                    </button>
                    <button
                      className="button secondary small"
                      onClick={() => refUpload.current?.click()}
                      disabled={importing}
                    >
                      <Upload size={14} />
                      Import
                    </button>
                  </div>
                </section>
              </div>
              <LocaleSelect
                value={options.locale}
                onChange={(locale) => setOptions({ ...options, locale })}
                label="Default segmentation language (document tags take precedence)"
              />
              {compareError && (
                <p role="alert" className="notice error">
                  {compareError}
                </p>
              )}
              {documents.length > 0 &&
                reference.length > 0 &&
                !comparison &&
                !compareError && (
                  <p role="status" className="loading">
                    Comparing on your device…
                  </p>
                )}
              {comparison && (
                <>
                  <div className="metrics">
                    <div>
                      <span>Corpus A tokens</span>
                      <strong>{fmt(comparison.a.words)}</strong>
                    </div>
                    <div>
                      <span>Corpus B tokens</span>
                      <strong>{fmt(comparison.b.words)}</strong>
                    </div>
                    <div>
                      <span>Corpus A types</span>
                      <strong>{fmt(comparison.a.types)}</strong>
                    </div>
                    <div>
                      <span>Corpus B types</span>
                      <strong>{fmt(comparison.b.types)}</strong>
                    </div>
                  </div>
                  <section className="panel results-panel">
                    <div className="results-toolbar">
                      <strong>Distinctive distributions</strong>
                      <button
                        className="button secondary small"
                        onClick={() =>
                          exportCsv("corpus-comparison", [
                            [
                              "Term",
                              "A count",
                              "B count",
                              "A per million",
                              "B per million",
                              "Log2 ratio",
                              "G2",
                              "Approx p (chi-square df1)",
                              "BH q-value",
                              "Log10 p",
                            ],
                            ...comparison.rows.map((r) => [
                              r.term,
                              r.a,
                              r.b,
                              r.aPerMillion,
                              r.bPerMillion,
                              r.logRatio,
                              r.g2,
                              r.pValue,
                              r.qValue,
                              r.log10P,
                            ]),
                          ])
                        }
                      >
                        <ArrowDownToLine size={15} />
                        Export CSV
                      </button>
                    </div>
                    <DataTable
                      headers={[
                        "Term",
                        "A count",
                        "B count",
                        "A / million",
                        "B / million",
                        "Log₂ ratio",
                        "G²",
                        "Approx. p",
                        "BH q",
                      ]}
                      rows={comparison.rows
                        .slice(page * 50, page * 50 + 50)
                        .map((r) => [
                          <span dir="auto">{r.term}</span>,
                          r.a,
                          r.b,
                          fmt(r.aPerMillion, 1),
                          fmt(r.bPerMillion, 1),
                          <span
                            className={r.logRatio > 0 ? "positive" : "negative"}
                          >
                            {fmt(r.logRatio, 2)}
                          </span>,
                          fmt(r.g2, 2),
                          r.pValue === 0
                            ? "Underflow; see log10 p"
                            : r.pValue.toPrecision(3),
                          r.qValue === 0
                            ? "Underflow"
                            : r.qValue.toPrecision(3),
                        ])}
                    />
                    <Pagination
                      page={page}
                      count={comparison.rows.length}
                      onChange={setPage}
                    />
                    <p className="result-note">
                      Ranked by two-corpus log-likelihood G², using word counts
                      and corpus totals. Log₂ ratio uses a 0.5 count/total
                      correction; positive favours A. All terms are available.
                      Approximate p-values use chi-square df=1; BH q-values
                      adjust across all tested terms. These exploratory
                      statistics are most useful for comparable corpora in the
                      same language. Chi-square approximations assume
                      independent observations and adequate expected counts;
                      sparse terms and repeated text can violate these
                      assumptions. No semantic inference is applied.
                    </p>
                  </section>
                </>
              )}
            </>
          )}

          {view === "figures" && (
            <FigureStudio
              name={name}
              analysis={analysis}
              documents={documents}
              comparison={comparison}
              collocates={collocates}
              pairs={pairs}
              onReports={() => navigate("reports")}
            />
          )}
          {view === "reports" && (
            <ResearchReports
              name={name}
              analysis={analysis}
              documents={documents}
              options={options}
              comparison={comparison}
              pairs={pairs}
            />
          )}
          {view === "ocr" && (
            <TextExtraction
              initialFile={ocrFile}
              onUse={(docs) => {
                setDocuments(docs);
                setName(ocrFile?.name ?? "Extracted corpus");
                setActiveId(null);
                navigate("analysis");
                notify(
                  "Extracted text loaded. Review document language tags before analysis.",
                );
              }}
            />
          )}

          {view === "library" && (
            <>
              <PageTitle
                eyebrow="YOUR LOCAL LIBRARY"
                title="Corpus library"
                description="Corpora you choose to save are stored only in this browser, on this device."
              />
              <div className="notice neutral">
                <LockKeyhole size={18} />
                Browser data can be cleared or evicted. Export JSON backups for
                corpora you want to keep.
              </div>
              <div className="action-row">
                <button
                  className="button secondary"
                  onClick={() => void exportWorkspace()}
                >
                  Download whole workspace
                </button>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={autoSave}
                    onChange={(e) => {
                      setAutoSave(e.target.checked);
                      void saveSession("workspace-preferences-v1", {
                        autoSave: e.target.checked,
                      }).catch(() =>
                        setSessionStatus("Could not save autosave preference."),
                      );
                    }}
                  />
                  Autosave workspace on this device
                </label>
                <span className="fine">
                  {autoSave ? sessionStatus : "Workspace autosave paused"}
                </span>
                <button
                  className="button primary"
                  disabled={!documents.length}
                  onClick={save}
                >
                  <Plus size={16} />
                  Save active corpus
                </button>
                <label className="button secondary">
                  <Upload size={16} />
                  Restore JSON backup
                  <input
                    type="file"
                    accept=".json"
                    hidden
                    onChange={async (e) => {
                      try {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const raw = JSON.parse(await file.text());
                        if (raw?.format === "corpuscape-workspace-v1") {
                          const workspace = validateWorkspace(raw.workspace);
                          const entries: Record<string, unknown> = {
                            "workspace-v1": workspace,
                          };
                          if (raw.figure) {
                            const checked = validateStudioProject({
                              format: "corpuscape-figure-v1",
                              config: raw.figure.config,
                              rows: raw.figure.manual ?? [],
                              name: "Restored figure",
                            });
                            entries["figure-studio-v2"] = {
                              ...raw.figure,
                              config: checked.config,
                              manual: raw.figure.manual ? checked.rows : null,
                            };
                          }
                          if (raw.reports) {
                            const { validateReportSession } =
                              await import("./report-model");
                            entries["research-reports-v1"] =
                              validateReportSession(raw.reports);
                          }
                          await saveSessions(entries);
                          applyWorkspace(workspace);
                          navigate("analysis");
                          notify(
                            "Whole workspace restored, including parallel notes, figure settings and report drafts.",
                          );
                          return;
                        }
                        const data = validateBackup(raw);
                        checkSize(data.documents);
                        setDocuments(data.documents);
                        setName(data.name);
                        setOptions(data.options);
                        setStopText(data.options.stopWords.join("\n"));
                        setActiveId(null);
                        setUndoDocuments(null);
                        setQueryDocument("all");
                        navigate("analysis");
                        notify(
                          "Backup restored into the workspace. Save it to add it to this browser’s library.",
                        );
                      } catch (e) {
                        fail(e);
                      } finally {
                        e.target.value = "";
                      }
                    }}
                  />
                </label>
                <button className="button secondary" onClick={refreshLibrary}>
                  Refresh library
                </button>
              </div>
              {!libraryReady ? (
                <p>Opening your local library…</p>
              ) : !saved.length ? (
                <LibraryStart
                  onStart={() =>
                    navigate(documents.length ? "analysis" : "workspace")
                  }
                />
              ) : (
                <div className="library-grid">
                  {[...saved]
                    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
                    .map((c) => (
                      <section className="panel library-card" key={c.id}>
                        <FolderOpen size={26} />
                        <h2>{c.name}</h2>
                        <p>
                          {c.documents.length} documents · {c.locale}
                        </p>
                        <small>
                          Saved {new Date(c.savedAt).toLocaleDateString()}
                        </small>
                        <div className="action-row">
                          <button
                            className="button primary small"
                            onClick={() => {
                              try {
                                const restored = validateBackup({
                                  format: "corpuscape-v3",
                                  ...c,
                                });
                                setDocuments(restored.documents);
                                setName(restored.name);
                                setOptions(restored.options);
                                setStopText(
                                  restored.options.stopWords.join("\n"),
                                );
                                setUndoDocuments(null);
                                setQueryDocument("all");
                                setActiveId(c.id);
                                navigate("analysis");
                              } catch (e) {
                                fail(e);
                              }
                            }}
                          >
                            Open <ArrowRight size={14} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Export ${c.name}`}
                            onClick={() =>
                              download(
                                "corpuscape-backup.json",
                                JSON.stringify(
                                  makeBackup(
                                    c.name,
                                    c.documents,
                                    c.options ?? {
                                      ...defaultOptions,
                                      locale: c.locale,
                                    },
                                  ),
                                  null,
                                  2,
                                ),
                                "application/json",
                              )
                            }
                          >
                            <ArrowDownToLine size={17} />
                          </button>
                          <button
                            className="icon-button danger"
                            aria-label={`Delete ${c.name}`}
                            onClick={() => setDeleteCandidate(c)}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </section>
                    ))}
                </div>
              )}
            </>
          )}

          {view === "methods" && (
            <>
              <PageTitle
                eyebrow="METHODS & PRIVACY"
                title="Methods & privacy"
                description="A free, multilingual research workspace with methods you can inspect."
              />
              <div className="methods-grid">
                <section className="panel prose">
                  <h2>A tool for every language</h2>
                  <p>
                    Corpuscape accepts Unicode text in any language. Word and
                    sentence boundaries come from your browser’s{" "}
                    <code>Intl.Segmenter</code> implementation. Select a
                    language for locale-specific segmentation, especially for
                    Chinese, Japanese, Thai and other languages without spaces
                    between words. Automatic mode uses your browser’s default
                    locale. The Documents tab can suggest languages locally;
                    review and apply those suggestions before language-specific
                    analysis.
                  </p>
                  <p>
                    The language menu includes common languages, plus a custom
                    BCP 47 code for others. Support and exact boundaries depend
                    on the browser’s ICU data. Mixed-language corpora are
                    supported, but separate language-specific runs are
                    preferable when comparing word counts. Scripts, accents and
                    diacritics are preserved with Unicode NFC normalization.
                    Case folding follows the selected locale.
                  </p>
                  <h2>What is counted</h2>
                  <p>
                    Word tokens are segments marked as word-like, including
                    numbers. Types are distinct normalized tokens. Sentences are
                    sentence segments containing a word token. Characters are
                    Unicode code points, rather than visual grapheme clusters.
                    Type–token ratio is types ÷ tokens and is sensitive to
                    corpus length. It is descriptive, not a standalone measure
                    of writing quality.
                  </p>
                  <p>
                    Frequencies show raw counts, counts per million tokens, and
                    document dispersion. Stop lists filter result tables; total
                    corpus sizes remain unchanged. N-grams are contiguous 2-, 3-
                    or 4-token sequences contained within a sentence and
                    document. They never jump across a removed stop word.
                  </p>
                  <h2>Concordance and collocations</h2>
                  <p>
                    Concordance matches complete segmented words or token
                    sequences, with the selected case setting, and displays
                    original text around each hit. Context length counts
                    grapheme clusters. Sorting applies to retained hits.
                    Punctuation is not part of matching. All matches are
                    available across pages and in exports.
                  </p>
                  <p>
                    Collocations count directed neighbour pairs in a symmetric
                    window within each sentence. Let f be the observed
                    node–collocate pair count, S the total directed window
                    slots, N the slots starting at the node, and C the slots
                    ending at the collocate. PMI = log₂(fS ÷ NC); Dice = 2f ÷
                    (N+C). These are window-event statistics, not semantic
                    relationships.
                  </p>
                  <h2>Comparing corpora</h2>
                  <p>
                    G² = 2Σ O ln(O/E) for each term’s counts in A and B, with
                    expected counts proportional to total corpus tokens. Zero
                    observed cells contribute zero. Effect size is
                    log₂(((A+0.5)/(total A+0.5)) ÷ ((B+0.5)/(total B+0.5))).
                    Both corpora use the active case setting and stop list.
                    Document language tags override the default segmentation
                    language. Approximate p-values use a chi-square distribution
                    with one degree of freedom. Benjamini–Hochberg q-values
                    adjust across all tested terms; model assumptions and corpus
                    design still matter.
                  </p>
                </section>
                <div>
                  <section className="panel prose privacy-card">
                    <ShieldCheck size={30} />
                    <h2>Your research stays yours.</h2>
                    <p>
                      Text import, parsing, analysis, charts and exports happen
                      in your browser. There is no corpus upload endpoint,
                      account system, analytics tracker or remote inference
                      endpoint. Optional Qwen3 and SmolLM2 models run in a
                      dedicated browser worker.
                    </p>
                    <p>
                      The active workspace autosaves locally by default,
                      including corpus settings, reference data and parallel
                      notes. Figure projects and report drafts also save
                      locally. You can pause workspace autosave in the library.
                      Library data is specific to this site’s address, browser
                      profile and device. Export a JSON backup before moving
                      devices or domains. Deleting a library record does not
                      erase an already open workspace copy.
                    </p>
                    <p>
                      The host still receives normal page and asset requests,
                      including your IP address. Fonts and application code are
                      bundled. Local AI downloads public model weights from
                      Hugging Face; OCR downloads selected language data. These
                      downloads do not send your corpus or prompts to an
                      inference service.
                    </p>
                  </section>
                  <section className="panel prose">
                    <h2>Capacity and optional capabilities</h2>
                    <p>
                      There are no fixed document, file-size, character, pair or
                      result-count quotas. Large analyses run in a worker;
                      results remain paginated for a usable interface. Device
                      memory and processing power still affect performance.
                    </p>
                    <p>
                      Selectable PDF text, DOCX, XLSX, CSV, TSV, plain text,
                      Markdown, saved HTML, subtitle text and two-variant TMX
                      imports are supported. Text extraction provides local OCR
                      for scanned PDFs and images. XLSX lets you choose the
                      worksheet. Tables let you choose columns and whether the
                      first row is a header.
                    </p>
                    <p>
                      Research Reports connects to real open language models
                      without API keys. It can draft results, methods, figure
                      captions, linguistic observations and translation-review
                      suggestions from explicitly selected evidence. Model
                      output is editable and needs human review; counts and
                      statistics continue to come from the deterministic
                      analysis engine. Browser memory, model context windows and
                      the quality of the underlying text remain real
                      constraints. Language identification and OCR provide
                      suggestions and extracted text, not certified linguistic
                      truth.
                    </p>
                  </section>
                  <section className="panel prose">
                    <h2>Made for language research</h2>
                    <p>
                      Created by Hussein Abu-Rayyash. Corpuscape brings corpus
                      exploration and translation research into an accessible
                      workspace.
                    </p>
                    <a
                      href="https://github.com/HusseinAbuRayyash/corpuscape"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Explore the source on GitHub <ArrowUpRight size={14} />
                    </a>
                  </section>
                </div>
              </div>
            </>
          )}
          {view !== "overview" && (
            <footer>
              <span>
                corpuscape<span className="brand-dot">.</span>{" "}
                <span>Corpus research workspace.</span>
              </span>
              <span>Local processing · No account required</span>
            </footer>
          )}
        </main>
      </div>
      {tableImport?.table && (
        <div className="modal-backdrop">
          <Modal labelledBy="table-title" onClose={() => setTableImport(null)}>
            <div className="panel-head">
              <h2 id="table-title">Choose your text columns</h2>
              <button
                className="icon-button"
                aria-label="Cancel table import"
                onClick={() => setTableImport(null)}
              >
                <X size={20} />
              </button>
            </div>
            <p>
              {tableImport.name} · {fmt(tableImport.table.rows.length)} rows
            </p>
            {tableImport.table.sheetNames && (
              <label>
                Worksheet
                <select
                  disabled={importing}
                  value={tableImport.table.sheet}
                  onChange={async (e) => {
                    const selected = e.target.value;
                    const current = tableImport;
                    setImporting(true);
                    try {
                      const result = await importFile(current.file, selected);
                      setTableImport((open) =>
                        open === current ? { ...current, ...result } : open,
                      );
                      setHeader(false);
                      setColumn(0);
                      setTargetColumn(1);
                      setNoteColumn(-1);
                    } catch (e) {
                      fail(e);
                    } finally {
                      setImporting(false);
                    }
                  }}
                >
                  {tableImport.table.sheetNames.map((sheet) => (
                    <option key={sheet}>{sheet}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="check-label">
              <input
                type="checkbox"
                checked={header}
                onChange={(e) => setHeader(e.target.checked)}
              />
              First row contains column headings
            </label>
            <label>
              {tableImport.destination === "pairs"
                ? "Source column"
                : "Text column"}
              <select
                value={column}
                onChange={(e) => setColumn(Number(e.target.value))}
              >
                {tableImport.table.headers.map((h, i) => (
                  <option key={i} value={i}>
                    {header ? tableImport.table!.rows[0][i] || h : h}
                  </option>
                ))}
              </select>
            </label>
            {tableImport.destination === "pairs" && (
              <>
                <label>
                  Target column
                  <select
                    value={targetColumn}
                    onChange={(e) => setTargetColumn(Number(e.target.value))}
                  >
                    {tableImport.table.headers.map((h, i) => (
                      <option key={i} value={i}>
                        {header ? tableImport.table!.rows[0][i] || h : h}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Research note column (optional)
                  <select
                    value={noteColumn}
                    onChange={(e) => setNoteColumn(Number(e.target.value))}
                  >
                    <option value={-1}>No note column</option>
                    {tableImport.table.headers.map((h, i) => (
                      <option key={i} value={i}>
                        {header ? tableImport.table!.rows[0][i] || h : h}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <DataTable
              headers={
                tableImport.destination === "pairs"
                  ? ["Source preview", "Target preview", "Note preview"]
                  : ["Preview text"]
              }
              rows={tableImport.table.rows
                .slice(header ? 1 : 0, header ? 5 : 4)
                .map((row) =>
                  tableImport.destination === "pairs"
                    ? [
                        <span dir="auto">{row[column]}</span>,
                        <span dir="auto">{row[targetColumn]}</span>,
                        <span dir="auto">
                          {noteColumn < 0 ? "" : row[noteColumn]}
                        </span>,
                      ]
                    : [<span dir="auto">{row[column]}</span>],
                )}
            />
            <button
              className="button primary full"
              disabled={importing}
              onClick={confirmTable}
            >
              Import selected text <ArrowRight size={16} />
            </button>
          </Modal>
        </div>
      )}
      {deleteCandidate && (
        <div className="modal-backdrop">
          <Modal
            labelledBy="delete-title"
            onClose={() => setDeleteCandidate(null)}
          >
            <h2 id="delete-title">Remove saved corpus?</h2>
            <p>
              This removes “{deleteCandidate.name}” from this browser’s library.
              Export a backup first if you need a copy. The active workspace
              stays open.
            </p>
            <div className="action-row">
              <button
                className="button secondary"
                onClick={() =>
                  download(
                    "corpuscape-backup.json",
                    JSON.stringify(
                      makeBackup(
                        deleteCandidate.name,
                        deleteCandidate.documents,
                        deleteCandidate.options ?? {
                          ...defaultOptions,
                          locale: deleteCandidate.locale,
                        },
                      ),
                      null,
                      2,
                    ),
                    "application/json",
                  )
                }
              >
                Export backup
              </button>
              <button
                className="button secondary"
                onClick={() => setDeleteCandidate(null)}
              >
                Keep corpus
              </button>
              <button
                className="button primary"
                onClick={async () => {
                  try {
                    await deleteCorpus(deleteCandidate.id);
                    if (activeId.current === deleteCandidate.id)
                      setActiveId(null);
                    setDeleteCandidate(null);
                    await refreshLibrary();
                    notify(
                      "Saved copy removed. Active workspace remains available.",
                    );
                  } catch (e) {
                    fail(e);
                  }
                }}
              >
                Remove saved copy
              </button>
            </div>
          </Modal>
        </div>
      )}
      {tmxImport && (
        <div className="modal-backdrop">
          <Modal labelledBy="tmx-title" onClose={() => setTmxImport(null)}>
            <div className="panel-head">
              <h2 id="tmx-title">Choose TMX language pair</h2>
              <button
                className="icon-button"
                aria-label="Cancel TMX import"
                onClick={() => setTmxImport(null)}
              >
                <X size={20} />
              </button>
            </div>
            <p>
              {tmxImport.languages.length} tagged languages ·{" "}
              {tmxImport.units.length} translation units. Units missing one
              chosen language are kept with an empty segment.
            </p>
            <label>
              TMX source language
              <select
                value={tmxSource}
                onChange={(e) => setTmxSource(e.target.value)}
              >
                {tmxImport.languages.map((tag) => (
                  <option key={tag}>{tag}</option>
                ))}
              </select>
            </label>
            <label>
              TMX target language
              <select
                value={tmxTarget}
                onChange={(e) => setTmxTarget(e.target.value)}
              >
                {tmxImport.languages.map((tag) => (
                  <option key={tag}>{tag}</option>
                ))}
              </select>
            </label>
            <button
              className="button primary full"
              onClick={() => {
                try {
                  const next = selectTmxPairs(tmxImport, tmxSource, tmxTarget);
                  checkSize([
                    {
                      name: "TMX pairs",
                      text: next
                        .map((p) => p.source + p.target + p.note)
                        .join(""),
                    },
                  ]);
                  setPairs(next);
                  setSourceLocale(tmxSource);
                  setTargetLocale(tmxTarget);
                  setPage(0);
                  setTmxImport(null);
                  notify(
                    "Tagged translation pairs imported. Review missing segments before export.",
                  );
                } catch (e) {
                  fail(e);
                }
              }}
            >
              Import selected language pair
            </button>
          </Modal>
        </div>
      )}
    </div>
  );
}
const PageTitle = ToolHeading;
function CorpusToolbar({
  name,
  setName,
  busy,
  documents,
  onImport,
  onSave,
  onSettings,
  onExport,
}: {
  name: string;
  setName: (v: string) => void;
  busy: boolean;
  documents: CorpusDocument[];
  onImport: () => void;
  onSave: () => void;
  onSettings: () => void;
  onExport: () => void;
}) {
  return (
    <div className="corpus-toolbar">
      <div>
        <label className="sr-only" htmlFor="corpus-name">
          Corpus name
        </label>
        <input
          id="corpus-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <small>
          {documents.length} {documents.length === 1 ? "document" : "documents"}{" "}
          · {busy ? "Analyzing…" : "Local workspace"}
        </small>
      </div>
      <button className="button secondary small" onClick={onImport}>
        <Upload size={15} />
        Replace corpus
      </button>
      <button className="button secondary small" onClick={onSettings}>
        <Settings2 size={15} />
        Settings
      </button>
      <button className="button secondary small" onClick={onSave}>
        <Library size={15} />
        Save to library
      </button>
      <button
        className="button primary small"
        disabled={busy}
        onClick={onExport}
      >
        <ArrowDownToLine size={15} />
        Report
      </button>
    </div>
  );
}
function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="search-field">
      <Search size={16} />
      <input
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button aria-label="Clear search" onClick={() => onChange("")}>
          <X size={14} />
        </button>
      )}
    </label>
  );
}
function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={headers.length} className="table-empty">
                No results to show.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function Pagination({
  page,
  count,
  onChange,
}: {
  page: number;
  count: number;
  onChange: (n: number) => void;
}) {
  const total = Math.max(1, Math.ceil(count / 50));
  useEffect(() => {
    if (page >= total) onChange(total - 1);
  }, [page, total]);
  return (
    <div className="pagination">
      <span>
        {count
          ? `${fmt(page * 50 + 1)}–${fmt(Math.min(count, (page + 1) * 50))} of ${fmt(count)}`
          : "0 results"}
      </span>
      <div>
        <button disabled={page === 0} onClick={() => onChange(page - 1)}>
          Previous
        </button>
        <span>
          {page + 1} / {total}
        </span>
        <button disabled={page >= total - 1} onClick={() => onChange(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div style={{ padding: 50, fontFamily: "system-ui" }}>
        <h1>Corpuscape could not open this workspace.</h1>
        <p>Use a current browser with Intl.Segmenter and Web Worker support.</p>
        <button onClick={() => location.reload()}>Reload workspace</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
const root =
  (import.meta.hot?.data.root as ReturnType<typeof createRoot> | undefined) ??
  createRoot(document.getElementById("root")!);
if (import.meta.hot) import.meta.hot.data.root = root;
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
