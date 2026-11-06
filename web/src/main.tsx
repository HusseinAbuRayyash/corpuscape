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
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  alignByLine,
  csv,
  defaultOptions,
  tmx,
  xmlEscape,
  type Analysis,
  type CorpusDocument,
  type Options,
  type Hit,
} from "./engine";
import { importFile, ACCEPT, MAX_CHARACTERS, type Imported } from "./files";
import {
  listCorpora,
  saveCorpus,
  deleteCorpus,
  type SavedCorpus,
} from "./library";
import { samples, locales } from "./samples";
import {
  ToolHeading,
  CorpusStart,
  LibraryStart,
  FigureSource,
  ChartStyles,
  ColorPalette,
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
  | "library"
  | "methods";
const navigation = [
  ["overview", "Home", Globe2],
  ["workspace", "Workspace", LayoutDashboard],
  ["analysis", "Corpus explorer", FileText],
  ["bilingual", "Parallel workspace", Languages],
  ["compare", "Compare corpora", Columns2],
  ["figures", "Figure studio", BarChart3],
  ["library", "Corpus library", Library],
  ["methods", "Methods & privacy", BookOpen],
] as const;
const fmt = (n: number, maximumFractionDigits = 0) =>
  n.toLocaleString(undefined, { maximumFractionDigits });
function download(
  name: string,
  content: string,
  type = "text/plain;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
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
    };
    return () => {
      w.terminate();
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
  const [documents, setDocuments] = useState<CorpusDocument[]>([]),
    [name, setName] = useState("Untitled corpus");
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
    | (Imported & { name: string; destination: "main" | "reference" | "pairs" })
    | null
  >(null);
  const [column, setColumn] = useState(0),
    [targetColumn, setTargetColumn] = useState(1),
    [header, setHeader] = useState(false);
  const [tab, setTab] = useState("frequencies"),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("");
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
  const [queryBusy, setQueryBusy] = useState(false),
    [page, setPage] = useState(0);
  const [saved, setSaved] = useState<SavedCorpus[]>([]),
    [libraryReady, setLibraryReady] = useState(false);
  const [reference, setReference] = useState<CorpusDocument[]>([]),
    [referencePaste, setReferencePaste] = useState("");
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
  const [figureTitle, setFigureTitle] = useState("Word frequency"),
    [figureType, setFigureType] = useState("bar"),
    [figureColor, setFigureColor] = useState("#4f46e5"),
    [figureData, setFigureData] = useState(""),
    [figureLimit, setFigureLimit] = useState(12);
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
        run(tab, { documents, options, query, window: windowSize, minimum })
          .then((result) => {
            if (version !== queryVersion.current) return;
            if (tab === "concordance") setHits(result);
            else setCollocates(result);
            setQueryBusy(false);
          })
          .catch((e) => {
            if (version === queryVersion.current) {
              fail(e);
              setQueryBusy(false);
            }
          }),
      300,
    );
    return () => clearTimeout(timer);
  }, [documents, options, query, tab, windowSize, minimum]);
  useEffect(() => {
    setPage(0);
  }, [filter, ngram, tab]);
  useEffect(() => {
    const version = ++compareVersion.current;
    setComparison(null);
    if (!documents.length || !reference.length) return;
    run("compare", { documents, reference, options })
      .then((result) => {
        if (version === compareVersion.current) setComparison(result);
      })
      .catch(fail);
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
    if (docs.reduce((sum, d) => sum + d.text.length, 0) > MAX_CHARACTERS)
      throw new Error(
        "Workspace limit: 2 million characters. Split large corpora into smaller projects.",
      );
    if (docs.length > 100) throw new Error("Workspace limit: 100 documents.");
  }
  async function filesSelected(
    files: FileList | File[],
    destination: "main" | "reference" | "pairs" = "main",
  ) {
    if (!files.length) return;
    if (files.length > 100) {
      fail(new Error("Import up to 100 files at a time."));
      return;
    }
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
        setHeader(false);
        setTableImport({ ...results[0], name: files[0].name, destination });
        return;
      }
      if (destination === "pairs") {
        if (!results[0].pairs)
          throw new Error(
            "Import a two-column CSV, TSV, XLSX or TMX file here. You can also paste source and target texts below.",
          );
        if (results[0].pairs.length > 10000)
          throw new Error("Import at most 10,000 translation pairs.");
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
          setDocuments(docs);
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
      fail(e);
    } finally {
      setImporting(false);
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
        if (rows.length > 10000)
          throw new Error("Import at most 10,000 translation pairs.");
        const importedPairs = rows
          .map((row) => ({
            source: row[column] ?? "",
            target: row[targetColumn] ?? "",
            note: "",
          }))
          .filter((p) => p.source || p.target);
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
          setDocuments(docs);
          setName(tableImport.name);
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
    setName(samples[index].name);
    setOptions({ ...options, locale: samples[index].locale });
    navigate("analysis");
    notify("Original teaching sample loaded.");
  }
  function usePaste() {
    try {
      if (!paste.trim()) throw new Error("Paste some text first.");
      const docs = [{ name: "Pasted text", text: paste }];
      checkSize(docs);
      setDocuments(docs);
      setName("Pasted corpus");
      navigate("analysis");
    } catch (e) {
      fail(e);
    }
  }
  async function save() {
    if (!documents.length) return;
    try {
      await saveCorpus({
        id: crypto.randomUUID(),
        name: name.trim() || "Untitled corpus",
        locale: options.locale,
        savedAt: new Date().toISOString(),
        documents,
      });
      notify(
        "Saved in this browser. Export a backup to keep a copy outside this device.",
      );
      refreshLibrary();
    } catch (e) {
      fail(e);
    }
  }
  const frequencies = useMemo(
    () =>
      (analysis?.frequencies ?? []).filter((r) =>
        r.term.toLocaleLowerCase().includes(filter.toLocaleLowerCase()),
      ),
    [analysis, filter],
  );
  const gramRows = (analysis?.ngrams[ngram] ?? []).filter((r) =>
    r.term.toLocaleLowerCase().includes(filter.toLocaleLowerCase()),
  );
  const pairRows = pairs
    .map((p, i) => ({ ...p, index: i }))
    .filter((p) =>
      (p.source + p.target + p.note)
        .toLocaleLowerCase()
        .includes(pairFilter.toLocaleLowerCase()),
    );
  const figureRows = useMemo(() => {
    if (!figureData.trim())
      return (analysis?.frequencies ?? [])
        .slice(0, figureLimit)
        .map((r) => ({ label: r.term, value: r.count }));
    return figureData
      .trim()
      .split("\n")
      .map((line) => {
        const parts = line.split("\t");
        return {
          label: parts.slice(0, -1).join(" "),
          value: Number(parts.at(-1)),
        };
      })
      .filter((p) => p.label.trim() && Number.isFinite(p.value) && p.value >= 0)
      .slice(0, figureLimit);
  }, [figureData, analysis, figureLimit]);
  function exportReport() {
    if (!analysis) return;
    const escape = xmlEscape;
    download(
      "corpuscape-report.html",
      `<!doctype html><html><meta charset="UTF-8"><title>${escape(name)} — Corpuscape</title><style>body{font:16px system-ui;max-width:900px;margin:50px auto;padding:20px;color:#173f35}table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #ccc;text-align:start}@media print{body{margin:0}}</style><h1>${escape(name)}</h1><p>Corpuscape · ${escape(new Date().toISOString())}</p><p>${fmt(analysis.words)} word tokens · ${fmt(analysis.types)} types · ${fmt(analysis.sentences)} sentences · TTR ${fmt(analysis.ttr * 100, 2)}%</p><h2>Method</h2><p>Unicode NFC, Intl.Segmenter (${escape(options.locale)}), case ${options.caseSensitive ? "preserved" : "folded"}. Stop list: ${escape(options.stopWords.join(", ") || "none")}. Descriptive frequency analysis; no semantic or AI inference. Counts include numbers. TTR is sensitive to corpus size.</p><h2>Documents</h2><ul>${analysis.documentStats.map((d) => `<li>${escape(d.name)}: ${d.words} tokens, ${d.types} types</li>`).join("")}</ul><h2>Top 100 frequencies</h2><table><tr><th>Term</th><th>Count</th><th>Per million</th><th>Documents</th></tr>${analysis.frequencies
        .slice(0, 100)
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
            Up to 100 files · 25 MB each · 2M characters total
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
            maxLength={MAX_CHARACTERS}
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
        [fmt(analysis.ttr * 100, 1) + "%", "Type–token ratio"],
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
      <aside className={menu ? "sidebar open" : "sidebar"}>
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
          onClick={() => uploadRef.current?.click()}
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
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button menu-button"
              aria-label="Toggle navigation"
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
                    onImport={() => uploadRef.current?.click()}
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
                                Up to 500 contiguous sequences per size;
                                sentence and document boundaries are respected.
                                Word segmentation is language-dependent.
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
                                {tab === "collocations" && (
                                  <>
                                    <label>
                                      Window{" "}
                                      <select
                                        value={windowSize}
                                        onChange={(e) =>
                                          setWindowSize(Number(e.target.value))
                                        }
                                      >
                                        {[1, 2, 3, 5, 10].map((n) => (
                                          <option key={n} value={n}>
                                            ±{n} words
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                    <label>
                                      Min. count{" "}
                                      <select
                                        value={minimum}
                                        onChange={(e) =>
                                          setMinimum(Number(e.target.value))
                                        }
                                      >
                                        {[1, 2, 3, 5, 10].map((n) => (
                                          <option key={n}>{n}</option>
                                        ))}
                                      </select>
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
                                          ...hits.hits.map((h) => [
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
                                    the first 1,000 · whole segmented words
                                  </p>
                                  <DataTable
                                    headers={[
                                      "Left context",
                                      "Match",
                                      "Right context",
                                      "Document",
                                    ]}
                                    rows={hits.hits
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
                              <DataTable
                                headers={[
                                  "Document",
                                  "Word tokens",
                                  "Unique types",
                                ]}
                                rows={analysis.documentStats.map((d) => [
                                  d.name,
                                  fmt(d.words),
                                  fmt(d.types),
                                ])}
                              />
                              <p className="result-note">
                                {documents.length} documents ·{" "}
                                {fmt(analysis.characters)} Unicode code points.
                                Corpus text is held in memory until you
                                explicitly save it.
                              </p>
                            </>
                          )}
                        </section>
                        <div className="method-strip">
                          <BookOpen size={17} />
                          <span>
                            Transparent by design: Unicode segmentation ·
                            language-aware counts · no AI inference
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
                    dir="auto"
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    placeholder="One source segment per line…"
                    maxLength={MAX_CHARACTERS}
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
                    dir="auto"
                    value={targetText}
                    onChange={(e) => setTargetText(e.target.value)}
                    placeholder="One target segment per line…"
                    maxLength={MAX_CHARACTERS}
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
                      if (p.length > 10000)
                        throw new Error("Pair up to 10,000 lines at a time.");
                      setPairs(p);
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
                    setSourceText(
                      "Language connects people.\nEvery text holds patterns.\nResearch begins with a question.",
                    );
                    setTargetText(
                      "El lenguaje conecta a las personas.\nCada texto contiene patrones.\nLa investigación comienza con una pregunta.",
                    );
                  }}
                >
                  Try a parallel sample
                </button>
              </div>
              {pairs.length > 0 && (
                <section className="panel results-panel">
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
                      onClick={() =>
                        download(
                          "corpuscape.tmx",
                          tmx(pairs, sourceLocale, targetLocale),
                          "application/xml",
                        )
                      }
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
                    Edits remain in this session. Export CSV to preserve notes;
                    TMX exports source and target segments only. TMX import
                    reads the first two language variants in each translation
                    unit.
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
                      setName("Teaching sample · Translation practice");
                      setReference([samples[0].documents[1]]);
                      setOptions({ ...options, locale: "en" });
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
                    maxLength={MAX_CHARACTERS}
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
                label="Segmentation language for both corpora"
              />
              {documents.length > 0 && reference.length > 0 && !comparison && (
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
                            ],
                            ...comparison.rows.map((r) => [
                              r.term,
                              r.a,
                              r.b,
                              r.aPerMillion,
                              r.bPerMillion,
                              r.logRatio,
                              r.g2,
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
                      correction; positive favours A. Up to 1,000 terms. These
                      exploratory statistics are most useful for comparable
                      corpora in the same language; no multiple-testing
                      correction or semantic inference is applied.
                    </p>
                  </section>
                </>
              )}
            </>
          )}

          {view === "figures" && (
            <>
              <PageTitle
                eyebrow="FIGURE STUDIO"
                title="Figure studio"
                description="Create publication-friendly figures from corpus frequencies or your own data."
              />
              <div className="figure-layout">
                <section className="panel figure-settings">
                  <h2>Figure settings</h2>
                  <label>
                    Figure title
                    <input
                      value={figureTitle}
                      onChange={(e) => setFigureTitle(e.target.value)}
                    />
                  </label>
                  <ChartStyles value={figureType} onChange={setFigureType} />
                  <label>
                    Accent colour
                    <input
                      type="color"
                      value={figureColor}
                      onChange={(e) => setFigureColor(e.target.value)}
                    />
                  </label>
                  <ColorPalette value={figureColor} onChange={setFigureColor} />
                  <label>
                    Number of items
                    <select
                      value={figureLimit}
                      onChange={(e) => setFigureLimit(Number(e.target.value))}
                    >
                      {[5, 10, 12, 20, 30].map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Custom data · label [TAB] value
                    <textarea
                      dir="auto"
                      value={figureData}
                      onChange={(e) => setFigureData(e.target.value)}
                      placeholder={
                        "translation\t24\nlanguage\t18\nresearch\t12"
                      }
                    />
                  </label>
                  <p className="fine">
                    Leave custom data empty to use the active corpus. Use one
                    label and one non-negative number per line, separated by a
                    tab. Invalid rows are excluded.
                  </p>
                  <button
                    className="text-button"
                    onClick={() =>
                      setFigureData(
                        "Translation\t24\nLanguage\t18\nResearch\t12\nContext\t9\nCulture\t7",
                      )
                    }
                  >
                    Use example data
                  </button>
                </section>
                <section className="panel figure-canvas">
                  <div className="panel-head">
                    <span className="eyebrow">LIVE PREVIEW</span>
                    <button
                      className="button secondary small"
                      disabled={!figureRows.length}
                      onClick={() => {
                        const svg = document.querySelector(
                          "#figure-preview svg",
                        );
                        if (svg)
                          download(
                            "corpuscape-figure.svg",
                            new XMLSerializer().serializeToString(svg),
                            "image/svg+xml",
                          );
                      }}
                    >
                      <ArrowDownToLine size={15} />
                      Download SVG
                    </button>
                  </div>
                  <FigureSource
                    name={
                      figureRows.length
                        ? name
                        : "Example preview · teaching values"
                    }
                    count={figureRows.length || 5}
                    custom={figureRows.length > 0 && !!figureData.trim()}
                  />
                  <div id="figure-preview">
                    <FrequencyChart
                      rows={
                        figureRows.length
                          ? figureRows
                          : [
                              { label: "Translation", value: 24 },
                              { label: "Language", value: 18 },
                              { label: "Research", value: 12 },
                              { label: "Context", value: 9 },
                              { label: "Culture", value: 7 },
                            ]
                      }
                      title={
                        figureRows.length
                          ? figureTitle
                          : "Example: word frequency"
                      }
                      color={figureColor}
                      type={figureType}
                    />
                  </div>
                  {!figureRows.length && (
                    <div className="figure-demo-note">
                      <span className="status-dot" />
                      <span>
                        Example preview. Choose a corpus or use the example data
                        to start editing and exporting.
                      </span>
                    </div>
                  )}
                  <p className="fine">
                    SVG is a scalable, editable vector format. Download the
                    underlying values as CSV for further work.
                  </p>
                  <button
                    className="text-button"
                    disabled={!figureRows.length}
                    onClick={() =>
                      exportCsv("figure-data", [
                        ["Label", "Value"],
                        ...figureRows.map((r) => [r.label, r.value]),
                      ])
                    }
                  >
                    Export figure data <ArrowDownToLine size={15} />
                  </button>
                </section>
              </div>
            </>
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
                        if (file.size > 25 * 1024 * 1024)
                          throw new Error("Backup is too large.");
                        const data = JSON.parse(await file.text());
                        if (
                          data.format !== "corpuscape-v2" ||
                          !Array.isArray(data.documents) ||
                          !data.documents.every(
                            (d: any) =>
                              typeof d.name === "string" &&
                              typeof d.text === "string",
                          )
                        )
                          throw new Error(
                            "This is not a valid Corpuscape backup.",
                          );
                        checkSize(data.documents);
                        const locale =
                          typeof data.locale === "string" ? data.locale : "und";
                        new Intl.Segmenter(locale);
                        setDocuments(data.documents);
                        setName(String(data.name ?? "Restored corpus"));
                        setOptions({ ...options, locale });
                        navigate("analysis");
                        notify(
                          "Backup restored into the workspace. Save it to add it to this browser’s library.",
                        );
                      } catch (e) {
                        fail(e);
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
                  {saved
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
                              setDocuments(c.documents);
                              setName(c.name);
                              setOptions({ ...options, locale: c.locale });
                              navigate("analysis");
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
                                  { format: "corpuscape-v2", ...c },
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
                            onClick={async () => {
                              try {
                                await deleteCorpus(c.id);
                                refreshLibrary();
                                notify(
                                  "Removed from this browser library. An open workspace copy remains available.",
                                );
                              } catch (e) {
                                fail(e);
                              }
                            }}
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
                    locale; it does not detect each text’s language.
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
                    original text around each hit. Punctuation is not part of
                    matching. Up to 1,000 hits are retained for display and
                    export; the total match count is reported separately.
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
                    Both corpora use the active segmentation and stop list.
                    Results are exploratory and are not corrected for multiple
                    testing.
                  </p>
                </section>
                <div>
                  <section className="panel prose privacy-card">
                    <ShieldCheck size={30} />
                    <h2>Your research stays yours.</h2>
                    <p>
                      Text import, parsing, analysis, charts and exports happen
                      in your browser. There is no corpus upload endpoint,
                      account system, analytics tracker, database server or LLM
                      service in this edition.
                    </p>
                    <p>
                      Texts live in session memory. Only{" "}
                      <strong>Save to library</strong> persists a copy in this
                      browser’s IndexedDB. Library data is specific to this
                      site’s address, browser profile and device. Export a JSON
                      backup before moving devices or domains. Deleting a
                      library record does not erase an already open workspace
                      copy.
                    </p>
                    <p>
                      The host still receives normal page and asset requests,
                      including your IP address. No third-party fonts or scripts
                      are loaded. PDF parsing code is bundled and loaded on
                      demand from this site.
                    </p>
                  </section>
                  <section className="panel prose">
                    <h2>Clear limits, useful tools</h2>
                    <p>
                      Up to 100 documents, 25 MB per file, 2 million extracted
                      characters per corpus and 10,000 parallel rows. Large
                      analyses run in a worker to keep the interface responsive.
                      Device memory and processing power still affect
                      performance.
                    </p>
                    <p>
                      Selectable PDF text, DOCX, XLSX, CSV, TSV, plain text,
                      Markdown, saved HTML, subtitle text and two-variant TMX
                      imports are supported. Scanned PDFs require separate OCR.
                      XLSX reads the first worksheet. Tables let you choose
                      columns and whether the first row is a header.
                    </p>
                    <p>
                      Paid-model features from the earlier edition are retired:
                      generated interpretations, corpus chat, machine
                      translation, semantic alignment and cloud audio
                      transcription. They are not silently replaced with
                      simulated answers. Parallel text review works with your
                      existing translations. Website collection works by
                      importing saved HTML; there is no remote scraper or audio
                      upload.
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
          <section
            className="modal panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="table-title"
          >
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
            )}
            <DataTable
              headers={["Preview text"]}
              rows={tableImport.table.rows
                .slice(header ? 1 : 0, header ? 5 : 4)
                .map((row) => [<span dir="auto">{row[column]}</span>])}
            />
            <button className="button primary full" onClick={confirmTable}>
              Import selected text <ArrowRight size={16} />
            </button>
          </section>
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
function FrequencyChart({
  rows,
  title,
  color,
  type,
}: {
  rows: { label: string; value: number }[];
  title: string;
  color: string;
  type: string;
}) {
  if (!rows.length) return null;
  const max = Math.max(...rows.map((r) => r.value), 1),
    vertical = type === "column",
    height = vertical ? 430 : Math.max(260, rows.length * 30 + 110),
    width = 700;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={title}
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      <rect width={width} height={height} fill="#ffffff" />
      <text
        x="30"
        y="35"
        fontFamily="system-ui,sans-serif"
        fontSize="19"
        fontWeight="600"
        fill="#303744"
      >
        {title}
      </text>
      <text
        x="30"
        y="57"
        fontFamily="system-ui,sans-serif"
        fontSize="11"
        fill="#9ca3af"
      >
        Observed values · Corpuscape
      </text>
      {rows.map((r, i) => {
        const y = 85 + i * 30,
          bar = (r.value / max) * 400,
          x = 55 + i * (600 / rows.length),
          bw = Math.max(4, 600 / rows.length - 14),
          bh = (r.value / max) * 235;
        return vertical ? (
          <g key={i}>
            <rect
              x={x}
              y={320 - bh}
              width={bw}
              height={bh}
              fill={color}
              rx="3"
            />
            <text
              x={x + bw / 2}
              y={310 - bh}
              textAnchor="middle"
              fontFamily="system-ui,sans-serif"
              fontSize="11"
              fill="#303744"
            >
              {fmt(r.value, 2)}
            </text>
            <text
              x={x + bw / 2}
              y="338"
              transform={`rotate(35,${x + bw / 2},338)`}
              fontFamily="system-ui,sans-serif"
              fontSize="11"
              fill="#6b7280"
            >
              {r.label.slice(0, 20)}
            </text>
          </g>
        ) : (
          <g key={i}>
            <text
              x="165"
              y={y + 13}
              textAnchor="end"
              fontFamily="system-ui,sans-serif"
              fontSize="13"
              fill="#303744"
            >
              {r.label.length > 20 ? r.label.slice(0, 18) + "…" : r.label}
            </text>
            {type === "lollipop" ? (
              <>
                <line
                  x1="180"
                  x2={180 + bar}
                  y1={y + 8}
                  y2={y + 8}
                  stroke={color}
                  strokeWidth="2"
                />
                <circle cx={180 + bar} cy={y + 8} r="6" fill={color} />
              </>
            ) : (
              <rect x="180" y={y} width={bar} height="18" fill={color} rx="3" />
            )}
            <text
              x={192 + bar}
              y={y + 13}
              fontFamily="system-ui,sans-serif"
              fontSize="12"
              fill="#6b7280"
            >
              {fmt(r.value, 2)}
            </text>
          </g>
        );
      })}
      <text
        x="30"
        y={height - 16}
        fontFamily="system-ui,sans-serif"
        fontSize="10"
        fill="#9ca3af"
      >
        Descriptive visualization · corpuscape
      </text>
    </svg>
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
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
