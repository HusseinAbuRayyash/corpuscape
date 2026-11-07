import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Upload,
  Undo2,
  Redo2,
  SlidersHorizontal,
  Table2,
  Plus,
  Trash2,
  Check,
  Loader2,
  Sparkles,
  FileJson,
  X,
  Maximize2,
} from "lucide-react";
import type { View } from "vega";
import Papa from "papaparse";
import { csv } from "./engine";
import { loadSession, saveSession } from "./library";
import { importFile } from "./files";
import { pngFromSvg, wrapLabel } from "./figures";
import {
  buildStudioSpec,
  chartKinds,
  defaultStudio,
  numericFields,
  palettes,
  parseStudioCsv,
  prepareStudioRows,
  studioDatasets,
  studioErrors,
  validateStudioProject,
  saveableStudioSnapshot,
  type ChartKind,
  type DataRow,
  type StudioConfig,
  type StudioInputs,
} from "./studio-model";
import "./figure-studio.css";

type Snapshot = {
  config: StudioConfig;
  source: string;
  text: string;
  manual: DataRow[] | null;
};
const initial: Snapshot = {
  config: defaultStudio,
  source: "frequencies",
  text: "",
  manual: null,
};
const sampleRows: DataRow[] = [
  "English",
  "Español",
  "Français",
  "Русский",
  "中文",
  "日本語",
  "العربية",
  "Deutsch",
  "Português",
  "हिन्दी",
].flatMap((label, i) =>
  ["Corpus A", "Corpus B"].map((series, j) => ({
    label,
    series,
    value: 18 + ((i * 7 + j * 13) % 35),
    x: i + 1,
    lower: 14 + ((i * 7 + j * 13) % 35),
    upper: 22 + ((i * 7 + j * 13) % 35),
  })),
);
function saveFile(
  name: string,
  data: string | Blob,
  type = "application/json",
) {
  const url = URL.createObjectURL(
    data instanceof Blob ? data : new Blob([data], { type }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function ChartGlyph({ kind }: { kind: ChartKind }) {
  return (
    <svg viewBox="0 0 64 40" aria-hidden="true">
      <path d="M5 3V35H60" stroke="currentColor" opacity=".18" fill="none" />
      {kind === "donut" ? (
        <>
          <circle
            cx="32"
            cy="20"
            r="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            opacity=".25"
          />
          <circle
            cx="32"
            cy="20"
            r="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray="55 90"
          />
        </>
      ) : kind === "line" || kind === "area" ? (
        <>
          <path
            d="M8 30L20 21L31 25L43 9L58 15"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="none"
          />
          {kind === "area" && (
            <path
              d="M8 30L20 21L31 25L43 9L58 15V34H8Z"
              fill="currentColor"
              opacity=".15"
            />
          )}
        </>
      ) : kind === "scatter" ? (
        <>
          {[
            [13, 26],
            [20, 18],
            [27, 28],
            [35, 15],
            [42, 20],
            [51, 8],
          ].map(([cx, cy], i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r="3"
              fill="currentColor"
              opacity={0.4 + i * 0.1}
            />
          ))}
        </>
      ) : kind === "heatmap" ? (
        <>
          {Array.from({ length: 15 }, (_, i) => (
            <rect
              key={i}
              x={10 + (i % 5) * 9}
              y={5 + Math.floor(i / 5) * 10}
              width="7"
              height="8"
              rx="1"
              fill="currentColor"
              opacity={0.2 + (i % 4) * 0.22}
            />
          ))}
        </>
      ) : kind === "boxplot" ? (
        <>
          {[18, 43].map((x, i) => (
            <g key={x} stroke="currentColor">
              <path d={`M${x} 5V33M${x - 5} 5h10M${x - 5} 33h10`} />
              <rect
                x={x - 8}
                y={11 + i * 3}
                width="16"
                height="14"
                fill="currentColor"
                opacity=".2"
              />
              <path d={`M${x - 8} 18h16`} />
            </g>
          ))}
        </>
      ) : kind === "bar" || kind === "lollipop" ? (
        <>
          {[40, 27, 18].map((w, i) => (
            <g key={i}>
              {kind === "bar" ? (
                <rect
                  x="10"
                  y={7 + i * 9}
                  width={w}
                  height="5"
                  rx="1"
                  fill="currentColor"
                  opacity={1 - i * 0.2}
                />
              ) : (
                <>
                  <path d={`M10 ${10 + i * 9}h${w}`} stroke="currentColor" />
                  <circle
                    cx={10 + w}
                    cy={10 + i * 9}
                    r="3"
                    fill="currentColor"
                  />
                </>
              )}
            </g>
          ))}
        </>
      ) : (
        <>
          {[15, 28, 21, 33].map((h, i) => (
            <g key={i}>
              <rect
                x={11 + i * 12}
                y={35 - h}
                width={kind === "grouped" ? 5 : 8}
                height={h}
                rx="1"
                fill="currentColor"
                opacity={kind === "stacked" ? 0.35 : 0.8}
              />
              {kind === "grouped" && (
                <rect
                  x={17 + i * 12}
                  y={40 - h}
                  width="4"
                  height={h - 5}
                  fill="currentColor"
                  opacity=".3"
                />
              )}
              {kind === "stacked" && (
                <rect
                  x={11 + i * 12}
                  y={35 - h}
                  width="8"
                  height={h / 2}
                  fill="currentColor"
                />
              )}
            </g>
          ))}
        </>
      )}
    </svg>
  );
}
export function FigureStudio({
  onReports,
  ...input
}: StudioInputs & { onReports: () => void }) {
  const [history, setHistory] = useState<{
    past: Snapshot[];
    present: Snapshot;
    future: Snapshot[];
  }>({ past: [], present: initial, future: [] });
  const { config, source, text, manual } = history.present;
  const [ready, setReady] = useState(false),
    [saveState, setSaveState] = useState("Opening…");
  const [leftTab, setLeftTab] = useState("chart"),
    [mobilePanel, setMobilePanel] = useState("figure"),
    [dataOpen, setDataOpen] = useState(false);
  const [zoom, setZoom] = useState("fit"),
    [availableWidth, setAvailableWidth] = useState(800),
    [bounds, setBounds] = useState({ width: 880, height: 580 });
  const [error, setError] = useState(""),
    [renderError, setRenderError] = useState(""),
    [rendering, setRendering] = useState(false),
    [exporting, setExporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false),
    [exportScale, setExportScale] = useState(3),
    [dataPage, setDataPage] = useState(0),
    [filter, setFilter] = useState("");
  const [workbook, setWorkbook] = useState<{
    file: File;
    sheets: string[];
    sheet: string;
  } | null>(null);
  const [columnName, setColumnName] = useState("");
  const canvas = useRef<HTMLDivElement>(null),
    viewport = useRef<HTMLDivElement>(null),
    fileInput = useRef<HTMLInputElement>(null),
    projectInput = useRef<HTMLInputElement>(null),
    view = useRef<View | null>(null);
  const datasets = useMemo(
    () => [
      ...studioDatasets(input),
      {
        id: "example",
        name: "Multilingual example",
        detail: "Explicit teaching values · 2 series",
        rows: sampleRows,
        value: "value",
        series: "series",
        x: "x",
      },
    ],
    [
      input.analysis,
      input.name,
      input.comparison,
      input.collocates,
      input.collocationContext,
      input.pairs,
    ],
  );
  const parsed = useMemo(() => parseStudioCsv(text), [text]);
  const rawRows =
    manual ??
    (source === "custom"
      ? parsed.rows
      : (datasets.find((data) => data.id === source)?.rows ?? []));
  const fields = Object.keys(rawRows[0] ?? {}),
    numeric = useMemo(() => numericFields(rawRows), [rawRows]);
  const latestRecovery = useRef<Snapshot | null>(null);
  if (ready)
    latestRecovery.current = saveableStudioSnapshot(history.present, rawRows);
  const rows = useMemo(
    () => prepareStudioRows(rawRows, config),
    [rawRows, config],
  );
  const errors = [
    ...(source === "custom" && !manual ? parsed.errors : []),
    ...studioErrors(rawRows, config),
  ];
  const errorsKey = errors.join("\n");
  const spec = useMemo(
    () => (rows.length && !errorsKey ? buildStudioSpec(rows, config) : null),
    [rows, config, errorsKey],
  );
  function change(patch: Partial<Snapshot>) {
    setHistory((old) => ({
      past: [...old.past, old.present],
      present: { ...old.present, ...patch },
      future: [],
    }));
    setError("");
  }
  function setting<K extends keyof StudioConfig>(
    key: K,
    value: StudioConfig[K],
  ) {
    change({ config: { ...config, [key]: value } });
  }
  function selectSource(id: string) {
    const selected = datasets.find((dataset) => dataset.id === id);
    change({
      source: id,
      manual: null,
      text: id === "custom" ? text : "",
      config: {
        ...config,
        category: "label",
        value: selected?.value ?? "value",
        series: selected?.series ?? "",
        x: selected?.x ?? "rank",
        lower: "",
        upper: "",
        title: selected?.name ?? "My research figure",
        sourceNote:
          id === "example"
            ? "Original teaching data · not research results"
            : id === "collocations"
              ? `${input.name} · ${selected?.detail}`
              : `${input.name} · Corpuscape`,
      },
    });
    setDataPage(0);
  }
  useEffect(() => {
    let active = true;
    loadSession<Snapshot>("figure-studio-v2")
      .then((saved) => {
        if (!active) return;
        if (
          saved?.config &&
          chartKinds.some((kind) => kind.id === saved.config.kind)
        )
          setHistory({
            past: [],
            present: {
              ...initial,
              ...saved,
              config: { ...defaultStudio, ...saved.config },
            },
            future: [],
          });
      })
      .catch(() => setSaveState("Export a project to keep a copy"))
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
      if (latestRecovery.current)
        void saveSession("figure-studio-v2", latestRecovery.current).catch(
          () => {},
        );
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    setSaveState("Saving…");
    const timer = setTimeout(() => {
      saveSession(
        "figure-studio-v2",
        saveableStudioSnapshot(history.present, rawRows),
      )
        .then(() => setSaveState("Saved on this device"))
        .catch(() => setSaveState("Storage unavailable · export project"));
    }, 700);
    return () => clearTimeout(timer);
  }, [history.present, ready, rawRows]);
  useEffect(() => {
    if (!viewport.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setAvailableWidth(entry.contentRect.width),
    );
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!canvas.current || !ready) return;
    let cancelled = false;
    let instance: View | null = null;
    view.current = null;
    setRenderError("");
    const host = document.createElement("div");
    canvas.current.replaceChildren(host);
    if (!spec) {
      setRendering(false);
      return;
    }
    setRendering(true);
    const timer = setTimeout(async () => {
      try {
        const { default: embed } = await import("vega-embed");
        if (cancelled) return;
        const result = await embed(host, spec, {
          actions: false,
          renderer: rows.length > 2500 ? "canvas" : "svg",
          tooltip: { theme: config.theme === "dark" ? "dark" : "light" },
        });
        instance = result.view;
        if (cancelled) {
          instance.finalize();
          return;
        }
        view.current = instance;
        const svg = await instance.toSVG();
        const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
        setBounds({
          width:
            Number(doc.documentElement.getAttribute("width")) ||
            config.width + 80,
          height:
            Number(doc.documentElement.getAttribute("height")) ||
            config.height + 100,
        });
        setRendering(false);
      } catch (e) {
        if (!cancelled) {
          setRenderError(e instanceof Error ? e.message : String(e));
          setRendering(false);
        }
      }
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      instance?.finalize();
    };
  }, [spec, ready]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        !(event.ctrlKey || event.metaKey) ||
        event.key.toLowerCase() !== "z" ||
        /INPUT|TEXTAREA|SELECT/.test((event.target as HTMLElement).tagName)
      )
        return;
      event.preventDefault();
      event.shiftKey ? redo() : undo();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [history]);
  function undo() {
    setHistory((old) =>
      old.past.length
        ? {
            past: old.past.slice(0, -1),
            present: old.past.at(-1)!,
            future: [old.present, ...old.future],
          }
        : old,
    );
  }
  function redo() {
    setHistory((old) =>
      old.future.length
        ? {
            past: [...old.past, old.present],
            present: old.future[0],
            future: old.future.slice(1),
          }
        : old,
    );
  }
  async function readData(file: File, sheet?: string) {
    try {
      const imported = await importFile(file, sheet);
      if (!imported.table)
        throw new Error("Choose a CSV, TSV or XLSX table for figure data.");
      const newText = Papa.unparse(imported.table.rows);
      const data = parseStudioCsv(newText);
      if (data.errors.length) throw new Error(data.errors.join(" "));
      const numbers = numericFields(data.rows);
      const value =
        numbers.find((field) =>
          /value|count|frequency|mean|score/i.test(field),
        ) ??
        numbers[0] ??
        data.fields[1];
      change({
        source: "custom",
        text: newText,
        manual: null,
        config: {
          ...config,
          category:
            data.fields.find((field) => !numbers.includes(field)) ??
            data.fields[0],
          value,
          x: numbers.find((field) => field !== value) ?? numbers[0] ?? "",
          series:
            data.fields.find((field) =>
              /series|group|corpus|condition/i.test(field),
            ) ?? "",
          lower:
            data.fields.find((field) => /^(lower|low|ci_low)$/i.test(field)) ??
            "",
          upper:
            data.fields.find((field) =>
              /^(upper|high|ci_high)$/i.test(field),
            ) ?? "",
          title: file.name.replace(/\.[^.]+$/, ""),
          sourceNote: file.name,
        },
      });
      setWorkbook(
        imported.table.sheetNames
          ? {
              file,
              sheets: imported.table.sheetNames,
              sheet: imported.table.sheet!,
            }
          : null,
      );
      setLeftTab("data");
      setDataOpen(true);
      setDataPage(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    if (fileInput.current) fileInput.current.value = "";
  }
  function project() {
    return {
      format: "corpuscape-figure-v1",
      name: config.title,
      config,
      rows: rawRows,
      source,
      createdAt: new Date().toISOString(),
    };
  }
  async function fullSvg() {
    if (!view.current)
      throw new Error("Wait for a valid figure to finish drawing.");
    const svg = new DOMParser().parseFromString(
      await view.current.toSVG(),
      "image/svg+xml",
    ).documentElement as unknown as SVGSVGElement;
    const width = Number(svg.getAttribute("width")),
      height = Number(svg.getAttribute("height"));
    const lines = [config.caption, config.sourceNote]
      .filter(Boolean)
      .flatMap((text) =>
        wrapLabel(text, Math.max(20, Math.floor(width / 6.2))),
      );
    if (lines.length) {
      const footer = lines.length * 17 + 28;
      svg.setAttribute("height", String(height + footer));
      svg.setAttribute("viewBox", `0 0 ${width} ${height + footer}`);
      const background = svg.ownerDocument.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect",
      );
      background.setAttribute("x", "0");
      background.setAttribute("y", String(height));
      background.setAttribute("width", String(width));
      background.setAttribute("height", String(footer));
      background.setAttribute(
        "fill",
        config.theme === "dark" ? "#172235" : "white",
      );
      svg.append(background);
      lines.forEach((line, i) => {
        const node = svg.ownerDocument.createElementNS(
          "http://www.w3.org/2000/svg",
          "text",
        );
        node.setAttribute("x", "24");
        node.setAttribute("y", String(height + 20 + i * 17));
        node.setAttribute("font-family", config.font);
        node.setAttribute("font-size", "11");
        node.setAttribute(
          "fill",
          config.theme === "dark" ? "#aab8ca" : "#687587",
        );
        node.textContent = line;
        svg.append(node);
      });
    }
    return svg;
  }
  async function exportFigure(
    format: "svg" | "png" | "pdf" | "project" | "data" | "spec",
  ) {
    setExporting(true);
    setExportOpen(false);
    setError("");
    try {
      const stem =
        config.title
          .trim()
          .replace(/[^\p{L}\p{N}_.-]+/gu, "-")
          .slice(0, 100) || "corpuscape-figure";
      if (format === "project")
        saveFile(`${stem}.figure.json`, JSON.stringify(project(), null, 2));
      else if (format === "spec")
        saveFile(`${stem}.vl.json`, JSON.stringify(spec, null, 2));
      else if (format === "data")
        saveFile(
          `${stem}.csv`,
          csv([
            fields,
            ...rawRows.map((row) => fields.map((field) => row[field])),
          ]),
          "text/csv;charset=utf-8",
        );
      else {
        const svg = await fullSvg();
        if (format === "svg")
          saveFile(
            `${stem}.svg`,
            new XMLSerializer().serializeToString(svg),
            "image/svg+xml;charset=utf-8",
          );
        else {
          const png = await pngFromSvg(svg, exportScale);
          if (format === "png") saveFile(`${stem}.png`, png, "image/png");
          else {
            const { jsPDF } = await import("jspdf");
            const originalWidth = Number(svg.getAttribute("width")) * 0.75,
              originalHeight = Number(svg.getAttribute("height")) * 0.75;
            const fit = Math.min(
              1,
              14000 / Math.max(originalWidth, originalHeight),
            );
            const width = originalWidth * fit,
              height = originalHeight * fit;
            const pdf = new jsPDF({
              compress: true,
              unit: "pt",
              format: [width, height],
              orientation: width > height ? "landscape" : "portrait",
            });
            pdf.addImage(
              new Uint8Array(await png.arrayBuffer()),
              "PNG",
              0,
              0,
              width,
              height,
              undefined,
              "FAST",
            );
            pdf.save(`${stem}.pdf`);
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  }
  const scale =
    zoom === "fit"
      ? Math.min(1, Math.max(0.1, (availableWidth - 56) / bounds.width))
      : Number(zoom);
  const tableRows = rawRows
    .map((row, index) => ({ row, index }))
    .filter(
      ({ row }) =>
        !filter ||
        Object.values(row).some((value) =>
          String(value ?? "")
            .toLocaleLowerCase()
            .includes(filter.toLocaleLowerCase()),
        ),
    );
  const sourceName =
    manual || source === "custom"
      ? "Custom research data"
      : (datasets.find((data) => data.id === source)?.name ?? "Corpus data");
  const selectField = (
    key: "category" | "value" | "series" | "x" | "lower" | "upper",
    title: string,
    choices = fields,
    optional = false,
  ) => (
    <label>
      {title}
      <select
        value={config[key]}
        onChange={(event) => setting(key, event.target.value)}
      >
        {optional && <option value="">None</option>}
        {!choices.includes(config[key]) && config[key] && (
          <option value={config[key]}>{config[key]} · choose a field</option>
        )}
        {choices.map((field) => (
          <option key={field}>{field}</option>
        ))}
      </select>
    </label>
  );
  return (
    <section className={`studio studio-panel-${mobilePanel}`}>
      <input
        ref={fileInput}
        type="file"
        accept=".csv,.tsv,.xlsx"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void readData(file);
        }}
      />
      <input
        ref={projectInput}
        type="file"
        accept=".json"
        hidden
        onChange={async (event) => {
          try {
            const file = event.target.files?.[0];
            if (!file) return;
            const p = validateStudioProject(JSON.parse(await file.text()));
            change({
              config: p.config,
              manual: p.rows,
              source: "custom",
              text: "",
            });
            setDataPage(0);
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
          } finally {
            event.target.value = "";
          }
        }}
      />
      <header className="studio-header">
        <div>
          <span className="studio-kicker">CORPUSCAPE / VISUAL RESEARCH</span>
          <h1>
            Figure Studio<span className="studio-version">2</span>
          </h1>
          <p>Build a figure worth publishing.</p>
        </div>
        <div className="studio-header-actions">
          <span className="studio-save">
            <Check size={13} />
            {saveState}
          </span>
          <button
            className="studio-button"
            onClick={() => projectInput.current?.click()}
          >
            <FileJson size={15} />
            Open project
          </button>
          <button
            className="studio-button"
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={15} />
            Import data
          </button>
          <div className="studio-export">
            <button
              className="studio-button primary"
              onClick={() => setExportOpen(!exportOpen)}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 size={16} className="spin" />
              ) : (
                <Download size={16} />
              )}
              Export figure
            </button>
            {exportOpen && (
              <div className="studio-export-menu">
                <label>
                  Raster resolution
                  <select
                    value={exportScale}
                    onChange={(e) => setExportScale(Number(e.target.value))}
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n}× · {Math.round(bounds.width * n)} px wide
                      </option>
                    ))}
                  </select>
                </label>
                {(
                  [
                    ["svg", "Editable SVG"],
                    ["png", "High-resolution PNG"],
                    ["pdf", "PDF document"],
                    ["data", "Full data CSV"],
                    ["project", "Complete figure project"],
                    ["spec", "Vega-Lite specification"],
                  ] as const
                ).map(([kind, label]) => (
                  <button
                    key={kind}
                    disabled={
                      !rows.length ||
                      (kind !== "project" &&
                        kind !== "data" &&
                        (!spec || rendering))
                    }
                    onClick={() => void exportFigure(kind)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>
      <nav className="studio-mobile-tabs" aria-label="Figure editor panels">
        {[
          ["figure", "Figure"],
          ["data", "Data & charts"],
          ["style", "Appearance"],
        ].map(([id, title]) => (
          <button
            key={id}
            className={mobilePanel === id ? "active" : ""}
            onClick={() => setMobilePanel(id)}
          >
            {title}
          </button>
        ))}
      </nav>
      {error && (
        <div className="studio-alert" role="alert">
          {error}
          <button
            aria-label="Dismiss figure error"
            onClick={() => setError("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      <div className="studio-workbench">
        <aside className="studio-left">
          <div className="studio-side-tabs">
            <button
              className={leftTab === "chart" ? "active" : ""}
              onClick={() => setLeftTab("chart")}
            >
              Chart library
            </button>
            <button
              className={leftTab === "data" ? "active" : ""}
              onClick={() => setLeftTab("data")}
            >
              Data source
            </button>
          </div>
          {leftTab === "chart" ? (
            <>
              <p className="studio-panel-intro">
                Choose the form that fits your question.
              </p>
              <div className="studio-chart-grid">
                {chartKinds.map((kind) => (
                  <button
                    key={kind.id}
                    aria-label={`Chart type: ${kind.name}`}
                    title={kind.description}
                    aria-pressed={config.kind === kind.id}
                    className={config.kind === kind.id ? "selected" : ""}
                    onClick={() => setting("kind", kind.id)}
                  >
                    <ChartGlyph kind={kind.id} />
                    <span>{kind.name}</span>
                  </button>
                ))}
              </div>
              <div className="studio-tip">
                <Sparkles size={16} />
                <div>
                  <strong>Research starts with a question.</strong>
                  <p>
                    Use bars for comparisons, scatter for relationships, and
                    distributions for repeated observations.
                  </p>
                </div>
              </div>
              <button
                className="studio-text-button"
                onClick={() => selectSource("example")}
              >
                Explore a multilingual example →
              </button>
            </>
          ) : (
            <div className="studio-source-controls">
              <label>
                Dataset
                <select
                  value={source}
                  onChange={(e) => selectSource(e.target.value)}
                >
                  {datasets.map((dataset) => (
                    <option key={dataset.id} value={dataset.id}>
                      {dataset.name} · {dataset.rows.length}
                    </option>
                  ))}
                  <option value="custom">Custom CSV / TSV</option>
                </select>
              </label>
              <p>
                {sourceName} · {rawRows.length.toLocaleString()} rows available.
                There is no fixed row quota.
              </p>
              <button
                className="studio-button full"
                onClick={() => fileInput.current?.click()}
              >
                <Upload size={15} />
                Import CSV, TSV or Excel
              </button>
              {workbook && (
                <label>
                  Worksheet
                  <select
                    value={workbook.sheet}
                    onChange={(e) =>
                      void readData(workbook.file, e.target.value)
                    }
                  >
                    {workbook.sheets.map((sheet) => (
                      <option key={sheet}>{sheet}</option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Paste or edit CSV / TSV
                <textarea
                  aria-label="Figure data CSV"
                  value={
                    manual
                      ? Papa.unparse(manual)
                      : source === "custom"
                        ? text
                        : ""
                  }
                  placeholder={"label,series,value\nEnglish,A,42\nEspañol,A,35"}
                  onChange={(e) => {
                    const parsed = parseStudioCsv(e.target.value);
                    const nums = numericFields(parsed.rows);
                    change({
                      source: "custom",
                      manual: null,
                      text: e.target.value,
                      config: {
                        ...config,
                        category: parsed.fields.includes(config.category)
                          ? config.category
                          : (parsed.fields.find((f) => !nums.includes(f)) ??
                            parsed.fields[0] ??
                            "label"),
                        value: nums.includes(config.value)
                          ? config.value
                          : (nums[0] ?? "value"),
                        series: parsed.fields.includes(config.series)
                          ? config.series
                          : (parsed.fields.find((f) =>
                              /series|group|corpus/i.test(f),
                            ) ?? ""),
                        x: nums.includes(config.x) ? config.x : (nums[0] ?? ""),
                      },
                    });
                  }}
                />
              </label>
              <button
                className="studio-button full"
                onClick={() => setDataOpen(!dataOpen)}
              >
                <Table2 size={15} />
                Open editable data sheet
              </button>
            </div>
          )}
        </aside>
        <div className="studio-center">
          <div className="studio-canvas-toolbar">
            <div className="studio-history">
              <button
                aria-label="Undo figure change"
                disabled={!history.past.length}
                onClick={undo}
              >
                <Undo2 size={16} />
              </button>
              <button
                aria-label="Redo figure change"
                disabled={!history.future.length}
                onClick={redo}
              >
                <Redo2 size={16} />
              </button>
              <span className="studio-divider" />
              <span>{sourceName}</span>
            </div>
            <div>
              <span className="studio-dimension">
                {config.width} × {config.height}
              </span>
              <select
                aria-label="Preview zoom"
                value={zoom}
                onChange={(e) => setZoom(e.target.value)}
              >
                <option value="fit">Fit</option>
                <option value="0.5">50%</option>
                <option value="0.75">75%</option>
                <option value="1">100%</option>
                <option value="1.25">125%</option>
              </select>
              <button
                aria-label="Fit figure to screen"
                onClick={() => setZoom("fit")}
              >
                <Maximize2 size={15} />
              </button>
            </div>
          </div>
          <div className="studio-viewport" ref={viewport}>
            {errors.length > 0 ? (
              <div className="studio-empty">
                <SlidersHorizontal size={32} />
                <h2>Check your data mapping</h2>
                {errors.map((message, i) => (
                  <p key={i}>{message}</p>
                ))}
              </div>
            ) : !rows.length ? (
              <div className="studio-empty">
                <ChartGlyph kind="column" />
                <h2>Your next figure starts here.</h2>
                <p>
                  Choose a corpus dataset, import a table, or explore the
                  clearly labelled example.
                </p>
                <button
                  className="studio-button primary"
                  onClick={() => selectSource("example")}
                >
                  Explore example data
                </button>
                <button
                  className="studio-button"
                  onClick={() => fileInput.current?.click()}
                >
                  Import your data
                </button>
              </div>
            ) : (
              <div
                className={`studio-paper ${config.theme === "dark" ? "dark" : ""}`}
                style={{
                  width: bounds.width * scale,
                  minHeight:
                    (bounds.height +
                      ([config.caption, config.sourceNote]
                        .filter(Boolean)
                        .flatMap((line) =>
                          wrapLabel(
                            line,
                            Math.max(20, Math.floor(bounds.width / 6.2)),
                          ),
                        ).length *
                        18 +
                        28)) *
                    scale,
                }}
              >
                <div
                  className="studio-paper-content"
                  style={{ width: bounds.width, transform: `scale(${scale})` }}
                >
                  <div ref={canvas} aria-label="Research figure preview" />
                  <div
                    className="studio-caption"
                    style={{
                      fontFamily: config.font,
                      color: config.theme === "dark" ? "#aab8ca" : undefined,
                    }}
                  >
                    {config.caption && <p>{config.caption}</p>}
                    {config.sourceNote && <small>{config.sourceNote}</small>}
                  </div>
                </div>
              </div>
            )}
            {rendering && (
              <span className="studio-render-status">
                <Loader2 size={14} className="spin" />
                Drawing figure…
              </span>
            )}
            {renderError && (
              <div className="studio-render-error" role="alert">
                Could not draw this specification: {renderError}
              </div>
            )}
          </div>
          <div className="studio-statusbar">
            <span>
              <i />
              {rows.length.toLocaleString()} plotted rows /{" "}
              {rawRows.length.toLocaleString()} available
            </span>
            <span>
              {config.interactive &&
              ["line", "area", "scatter"].includes(config.kind)
                ? "Drag to zoom · double-click to reset"
                : "Hover marks to inspect exact values"}
            </span>
            <button onClick={() => setDataOpen(!dataOpen)}>
              <Table2 size={14} />
              Data sheet
            </button>
          </div>
          {dataOpen && (
            <div className="studio-data-sheet">
              <div className="studio-data-head">
                <strong>Research data</strong>
                <input
                  aria-label="Filter figure data"
                  placeholder="Filter all rows…"
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    setDataPage(0);
                  }}
                />
                <button
                  className="studio-text-button"
                  onClick={() => {
                    const next: DataRow = {};
                    fields.forEach((field) => (next[field] = null));
                    change({ manual: [...rawRows, next] });
                    setDataPage(Math.floor(rawRows.length / 30));
                  }}
                >
                  <Plus size={14} />
                  Row
                </button>
                <button
                  aria-label="Close data sheet"
                  onClick={() => setDataOpen(false)}
                >
                  <X size={15} />
                </button>
              </div>
              <div className="studio-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      {fields.map((field) => (
                        <th key={field}>{field}</th>
                      ))}
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows
                      .slice(dataPage * 30, dataPage * 30 + 30)
                      .map(({ row, index }) => (
                        <tr key={index}>
                          <th>{index + 1}</th>
                          {fields.map((field) => (
                            <td key={field}>
                              <input
                                dir="auto"
                                aria-label={`Row ${index + 1} ${field}`}
                                value={String(row[field] ?? "")}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  const updated = rawRows.map((old, i) =>
                                    i === index
                                      ? {
                                          ...old,
                                          [field]: !value.trim()
                                            ? null
                                            : /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(
                                                  value,
                                                ) &&
                                                Number.isFinite(Number(value))
                                              ? Number(value)
                                              : value,
                                        }
                                      : old,
                                  );
                                  change({ manual: updated });
                                }}
                              />
                            </td>
                          ))}
                          <td>
                            <button
                              aria-label={`Remove figure row ${index + 1}`}
                              onClick={() =>
                                change({
                                  manual: rawRows.filter((_, i) => i !== index),
                                })
                              }
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="studio-data-footer">
                <label>
                  New column
                  <input
                    value={columnName}
                    onChange={(e) => setColumnName(e.target.value)}
                    placeholder="Column name"
                  />
                </label>
                <button
                  className="studio-button"
                  onClick={() => {
                    const key = columnName.trim();
                    if (
                      !key ||
                      fields.includes(key) ||
                      ["__proto__", "constructor", "prototype"].includes(key)
                    ) {
                      setError("Choose a new, unique column name.");
                      return;
                    }
                    change({
                      manual: rawRows.map((row) => ({ ...row, [key]: null })),
                    });
                    setColumnName("");
                  }}
                >
                  Add column
                </button>
                <div>
                  <button
                    disabled={!dataPage}
                    onClick={() => setDataPage(dataPage - 1)}
                  >
                    Previous
                  </button>
                  <span>
                    {tableRows.length ? dataPage * 30 + 1 : 0}–
                    {Math.min(tableRows.length, (dataPage + 1) * 30)} /{" "}
                    {tableRows.length}
                  </span>
                  <button
                    disabled={(dataPage + 1) * 30 >= tableRows.length}
                    onClick={() => setDataPage(dataPage + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <aside className="studio-inspector">
          <div className="studio-inspector-title">
            <SlidersHorizontal size={16} />
            <strong>Figure properties</strong>
          </div>
          <details open>
            <summary>Data mapping</summary>
            <div>
              {selectField("category", "Category / label")}
              {selectField("value", "Numeric value", numeric)}
              {selectField("series", "Series / group", fields, true)}
              {["line", "area", "scatter"].includes(config.kind) &&
                selectField("x", "X measure", fields)}
              {["column", "grouped"].includes(config.kind) && (
                <div className="studio-two">
                  {selectField("lower", "Lower bound", numeric, true)}
                  {selectField("upper", "Upper bound", numeric, true)}
                </div>
              )}
              <div className="studio-two">
                <label>
                  Order
                  <select
                    value={config.order}
                    onChange={(e) =>
                      setting("order", e.target.value as StudioConfig["order"])
                    }
                  >
                    <option value="source">Source order</option>
                    <option value="descending">High → low</option>
                    <option value="ascending">Low → high</option>
                    <option value="label">Alphabetical</option>
                  </select>
                </label>
                <label>
                  Focus items
                  <select
                    value={config.top}
                    onChange={(e) => setting("top", Number(e.target.value))}
                  >
                    <option value={0}>All items</option>
                    {[10, 20, 30, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        Top {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="studio-help">
                Focus is optional. “All items” includes the full dataset; the
                data export always includes every row.
              </p>
            </div>
          </details>
          <details open>
            <summary>Titles & annotation</summary>
            <div>
              <label>
                Figure title
                <input
                  value={config.title}
                  onChange={(e) => setting("title", e.target.value)}
                />
              </label>
              <label>
                Subtitle
                <input
                  value={config.subtitle}
                  onChange={(e) => setting("subtitle", e.target.value)}
                />
              </label>
              <div className="studio-two">
                <label>
                  X-axis title
                  <input
                    value={config.xTitle}
                    onChange={(e) => setting("xTitle", e.target.value)}
                    placeholder="Automatic"
                  />
                </label>
                <label>
                  Y-axis title
                  <input
                    value={config.yTitle}
                    onChange={(e) => setting("yTitle", e.target.value)}
                    placeholder="Automatic"
                  />
                </label>
              </div>
              <label>
                Figure caption
                <textarea
                  value={config.caption}
                  onChange={(e) => setting("caption", e.target.value)}
                  placeholder="Describe what the reader should notice…"
                />
              </label>
              <label>
                Source / note
                <input
                  value={config.sourceNote}
                  onChange={(e) => setting("sourceNote", e.target.value)}
                />
              </label>
              <button
                className="studio-text-button"
                onClick={async () => {
                  try {
                    await saveSession("figure-report-context", {
                      title: config.title,
                      kind: config.kind,
                      rows,
                      source: sourceName,
                      sourceDetail:
                        datasets.find((data) => data.id === source)?.detail ??
                        "",
                      mapping: {
                        category: config.category,
                        value: config.value,
                        series: config.series,
                        x: config.x,
                        lower: config.lower,
                        upper: config.upper,
                      },
                      axisTitles: { x: config.xTitle, y: config.yTitle },
                      sourceNote: config.sourceNote,
                      availableRows: rawRows.length,
                    });
                    onReports();
                  } catch {
                    setError(
                      "Could not prepare caption evidence. Try exporting a project backup.",
                    );
                  }
                }}
              >
                <Sparkles size={14} />
                Draft a caption with local AI
              </button>
            </div>
          </details>
          <details open>
            <summary>Design</summary>
            <div>
              <div className="studio-themes">
                {(["journal", "presentation", "minimal", "dark"] as const).map(
                  (theme) => (
                    <button
                      aria-pressed={config.theme === theme}
                      key={theme}
                      className={config.theme === theme ? "selected" : ""}
                      onClick={() => setting("theme", theme)}
                    >
                      <i className={`theme-${theme}`} />
                      {theme}
                    </button>
                  ),
                )}
              </div>
              <label>
                Colour palette
                <select
                  value={config.palette}
                  onChange={(e) => setting("palette", e.target.value)}
                >
                  {Object.keys(palettes).map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </label>
              <div className="studio-swatches">
                {(palettes[config.palette] ?? []).map((color) => (
                  <span key={color} style={{ background: color }} />
                ))}
              </div>
              <label>
                Typeface
                <select
                  value={config.font}
                  onChange={(e) => setting("font", e.target.value)}
                >
                  <option value="Inter, system-ui, sans-serif">
                    Inter / modern sans
                  </option>
                  <option value="Georgia, serif">
                    Georgia / editorial serif
                  </option>
                  <option value="Arial, sans-serif">
                    Arial / journal sans
                  </option>
                </select>
              </label>
              <div className="studio-two">
                <label>
                  Text size
                  <input
                    type="number"
                    min="8"
                    value={config.fontSize}
                    onChange={(e) =>
                      setting("fontSize", Number(e.target.value))
                    }
                  />
                </label>
                <label>
                  Label angle
                  <input
                    type="number"
                    value={config.axisAngle}
                    onChange={(e) =>
                      setting("axisAngle", Number(e.target.value))
                    }
                  />
                </label>
              </div>
              {[
                ["grid", "Grid lines"],
                ["legend", "Series legend"],
                ["labels", "Value labels"],
                ["zero", "Zero baseline"],
                ["interactive", "Interactive zoom"],
              ].map(([key, title]) => (
                <label className="studio-switch" key={key}>
                  <span>{title}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(config[key as keyof StudioConfig])}
                    onChange={(e) => setting(key as "grid", e.target.checked)}
                  />
                </label>
              ))}
            </div>
          </details>
          <details>
            <summary>Canvas & export</summary>
            <div>
              <div className="studio-two">
                <label>
                  Width · px
                  <input
                    type="number"
                    min="100"
                    value={config.width}
                    onChange={(e) => setting("width", Number(e.target.value))}
                  />
                </label>
                <label>
                  Height · px
                  <input
                    type="number"
                    min="100"
                    value={config.height}
                    onChange={(e) => setting("height", Number(e.target.value))}
                  />
                </label>
              </div>
              <label>
                Value label decimals
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={config.decimals}
                  onChange={(e) =>
                    setting(
                      "decimals",
                      Math.max(0, Math.min(10, Number(e.target.value))),
                    )
                  }
                />
              </label>
              <p className="studio-help">
                SVG preserves vectors. PNG and PDF use your selected 1–4× raster
                scale, including multilingual fonts and captions. CSV keeps
                unrounded values.
              </p>
            </div>
          </details>
        </aside>
      </div>
    </section>
  );
}
