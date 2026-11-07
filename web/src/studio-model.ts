import Papa from "papaparse";
import type { TopLevelSpec } from "vega-lite";
import type { Analysis, CorpusDocument } from "./engine";
export type DataRow = Record<string, string | number | null>;
export type ChartKind =
  | "bar"
  | "column"
  | "grouped"
  | "stacked"
  | "line"
  | "area"
  | "scatter"
  | "lollipop"
  | "heatmap"
  | "donut"
  | "histogram"
  | "boxplot";
export interface StudioConfig {
  kind: ChartKind;
  title: string;
  subtitle: string;
  caption: string;
  sourceNote: string;
  category: string;
  value: string;
  series: string;
  x: string;
  lower: string;
  upper: string;
  xTitle: string;
  yTitle: string;
  width: number;
  height: number;
  palette: string;
  theme: "journal" | "presentation" | "dark" | "minimal";
  font: string;
  fontSize: number;
  grid: boolean;
  labels: boolean;
  legend: boolean;
  zero: boolean;
  order: "source" | "descending" | "ascending" | "label";
  top: number;
  axisAngle: number;
  interactive: boolean;
  decimals: number;
}
export const defaultStudio: StudioConfig = {
  kind: "bar",
  title: "Word frequency",
  subtitle: "",
  caption: "",
  sourceNote: "Corpuscape · local corpus analysis",
  category: "label",
  value: "count",
  series: "",
  x: "rank",
  lower: "",
  upper: "",
  xTitle: "",
  yTitle: "",
  width: 800,
  height: 480,
  palette: "cobalt",
  theme: "journal",
  font: "Inter, system-ui, sans-serif",
  fontSize: 12,
  grid: true,
  labels: false,
  legend: true,
  zero: true,
  order: "descending",
  top: 20,
  axisAngle: 0,
  interactive: true,
  decimals: 2,
};
export const palettes: Record<string, string[]> = {
  cobalt: [
    "#245bff",
    "#5fc3e4",
    "#a7b9fb",
    "#152853",
    "#efb04d",
    "#d97ea7",
    "#16756b",
    "#8b583c",
    "#815ad1",
    "#c94e5a",
  ],
  accessible: [
    "#0072B2",
    "#E69F00",
    "#009E73",
    "#CC79A7",
    "#56B4E9",
    "#D55E00",
  ],
  forest: ["#176b58", "#64a489", "#b4cfad", "#364e45", "#e2b65d", "#a2c8cd"],
  monochrome: ["#202936", "#536176", "#8793a6", "#b4bdca", "#dce1e9"],
  warm: ["#b4473d", "#df8d5d", "#f1be6c", "#8176a1", "#596f91", "#8cabb1"],
};
export const chartKinds: {
  id: ChartKind;
  name: string;
  description: string;
}[] = [
  {
    id: "bar",
    name: "Horizontal bars",
    description: "Rank and compare categories",
  },
  {
    id: "column",
    name: "Columns",
    description: "Compare categories vertically",
  },
  {
    id: "grouped",
    name: "Grouped columns",
    description: "Compare corpora or series",
  },
  {
    id: "stacked",
    name: "Stacked bars",
    description: "Show category composition",
  },
  { id: "line", name: "Line", description: "Track an ordered sequence" },
  { id: "area", name: "Area", description: "Show trends and magnitude" },
  {
    id: "scatter",
    name: "Scatter",
    description: "Explore two numeric measures",
  },
  {
    id: "lollipop",
    name: "Lollipop",
    description: "A restrained ranked comparison",
  },
  {
    id: "heatmap",
    name: "Heatmap",
    description: "Compare category × series values",
  },
  { id: "donut", name: "Donut", description: "Non-negative parts of a whole" },
  {
    id: "histogram",
    name: "Histogram",
    description: "Inspect a numeric distribution",
  },
  {
    id: "boxplot",
    name: "Box plot",
    description: "Median, quartiles and outliers",
  },
];
export interface Dataset {
  id: string;
  name: string;
  detail: string;
  rows: DataRow[];
  category?: string;
  value?: string;
  series?: string;
  x?: string;
}
export interface StudioInputs {
  name: string;
  analysis: Analysis | null;
  documents: CorpusDocument[];
  comparison?: {
    rows: {
      term: string;
      a: number;
      b: number;
      aPerMillion: number;
      bPerMillion: number;
      logRatio: number;
      g2: number;
    }[];
  } | null;
  collocates?: { term: string; count: number; pmi: number; dice: number }[];
  collocationContext?: string;
  pairs?: { source: string; target: string; note: string }[];
}
/** Query results are transient in the workspace. Recover their figure as editable frozen data. */
export function saveableStudioSnapshot<
  T extends { source: string; manual: DataRow[] | null; text: string },
>(snapshot: T, rows: DataRow[]): T {
  return snapshot.source === "collocations"
    ? {
        ...snapshot,
        source: "custom",
        manual: structuredClone(rows),
        text: Papa.unparse(rows),
      }
    : snapshot;
}
export function studioDatasets(input: StudioInputs): Dataset[] {
  const a = input.analysis;
  const result: Dataset[] = [
    {
      id: "frequencies",
      name: "Word frequencies",
      detail: input.name,
      rows:
        a?.frequencies.map((r, i) => ({
          label: r.term,
          rank: i + 1,
          count: r.count,
          perMillion: r.perMillion,
          documents: r.documents,
        })) ?? [],
      value: "count",
    },
    ...[2, 3, 4].map((n) => ({
      id: `ngrams-${n}`,
      name: `${n}-word sequences`,
      detail: input.name,
      rows:
        a?.ngrams[n]?.map((r, i) => ({
          label: r.term,
          count: r.count,
          rank: i + 1,
        })) ?? [],
      value: "count",
    })),
    {
      id: "documents",
      name: "Document statistics",
      detail: "Tokens, types and hapax",
      rows:
        a?.documentStats.map((r, i) => ({
          label: r.name,
          language: r.locale,
          words: r.words,
          types: r.types,
          hapax: r.hapax,
          ttr: r.words ? r.types / r.words : 0,
          rank: i + 1,
        })) ?? [],
      value: "words",
      series: "language",
    },
    {
      id: "comparison",
      name: "Corpus A / Corpus B",
      detail: "Side-by-side distributions",
      rows:
        input.comparison?.rows.flatMap((r, i) => [
          {
            label: r.term,
            series: "Corpus A",
            count: r.a,
            perMillion: r.aPerMillion,
            logRatio: r.logRatio,
            g2: r.g2,
            rank: i + 1,
          },
          {
            label: r.term,
            series: "Corpus B",
            count: r.b,
            perMillion: r.bPerMillion,
            logRatio: r.logRatio,
            g2: r.g2,
            rank: i + 1,
          },
        ]) ?? [],
      value: "perMillion",
      series: "series",
    },
    {
      id: "collocations",
      name: "Collocations",
      detail: input.collocationContext ?? "Count, PMI and Dice",
      rows:
        input.collocates?.map((r, i) => ({
          label: r.term,
          count: r.count,
          pmi: r.pmi,
          dice: r.dice,
          rank: i + 1,
        })) ?? [],
      value: "count",
    },
    {
      id: "parallel",
      name: "Parallel segment lengths",
      detail: "Source and target characters",
      rows:
        input.pairs?.map((r, i) => ({
          label: `Pair ${i + 1}`,
          source: Array.from(r.source).length,
          target: Array.from(r.target).length,
          note: r.note,
          rank: i + 1,
        })) ?? [],
      value: "target",
      x: "source",
    },
  ];
  return result;
}
export function parseStudioCsv(text: string): {
  rows: DataRow[];
  fields: string[];
  errors: string[];
} {
  if (!text.trim()) return { rows: [], fields: [], errors: [] };
  const parsed = Papa.parse<string[]>(text, {
    delimiter: text.includes("\t") ? "\t" : ",",
    skipEmptyLines: "greedy",
  });
  const errors = parsed.errors.map(
    (e) => `Row ${(e.row ?? 0) + 1}: ${e.message}`,
  );
  const first = parsed.data[0];
  if (!first || first.length < 2)
    return {
      rows: [],
      fields: [],
      errors: [...errors, "Use CSV or TSV with at least two columns."],
    };
  const hasHeader =
    first.every((cell) => cell.trim() && !isNumeric(cell)) &&
    parsed.data.length > 1;
  const fields = hasHeader
    ? first.map((field) => field.trim())
    : first.map((_, i) =>
        i === 0 ? "label" : i === 1 ? "value" : `column${i + 1}`,
      );
  if (new Set(fields).size !== fields.length)
    errors.push("Column headings must be unique.");
  if (
    fields.some((field) =>
      ["__proto__", "constructor", "prototype"].includes(field),
    )
  )
    errors.push("Rename reserved column headings.");
  const rows = parsed.data.slice(hasHeader ? 1 : 0).map((cells, i) => {
    if (cells.length !== fields.length)
      errors.push(
        `Row ${i + (hasHeader ? 2 : 1)} has ${cells.length} cells; expected ${fields.length}.`,
      );
    const row: DataRow = {};
    fields.forEach((field, j) => {
      const raw = cells[j]?.trim() ?? "";
      row[field] = raw === "" ? null : isNumeric(raw) ? Number(raw) : raw;
    });
    return row;
  });
  return { rows, fields, errors };
}
function isNumeric(value: string) {
  return (
    /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim()) &&
    Number.isFinite(Number(value))
  );
}
export function numericFields(rows: DataRow[]) {
  const fields = Object.keys(rows[0] ?? {});
  return fields.filter(
    (field) =>
      rows.some((row) => typeof row[field] === "number") &&
      rows.every(
        (row) => row[field] === null || typeof row[field] === "number",
      ),
  );
}
export function prepareStudioRows(
  rows: DataRow[],
  config: StudioConfig,
): DataRow[] {
  const result = [...rows];
  if (config.order === "descending")
    result.sort((a, b) => Number(b[config.value]) - Number(a[config.value]));
  if (config.order === "ascending")
    result.sort((a, b) => Number(a[config.value]) - Number(b[config.value]));
  if (config.order === "label")
    result.sort((a, b) =>
      String(a[config.category] ?? "").localeCompare(
        String(b[config.category] ?? ""),
      ),
    );
  if (!config.top) return result;
  if (config.series && config.category) {
    const selected = new Set<string>();
    for (const row of result) {
      const key = String(row[config.category]);
      if (selected.size < config.top) selected.add(key);
    }
    return result.filter((row) => selected.has(String(row[config.category])));
  }
  return result.slice(0, config.top);
}
export function studioErrors(rows: DataRow[], config: StudioConfig): string[] {
  if (!rows.length) return [];
  const errors: string[] = [];
  if (
    !Number.isFinite(config.fontSize) ||
    config.fontSize < 1 ||
    !Number.isFinite(config.axisAngle)
  )
    errors.push("Use a positive text size and a finite label angle.");
  if (
    !Number.isSafeInteger(config.decimals) ||
    config.decimals < 0 ||
    config.decimals > 100
  )
    errors.push("Value precision must be a whole number from 0 to 100.");
  if (config.kind === "heatmap" && !config.series)
    errors.push("Heatmaps need a second category in Series / group.");
  if (
    config.kind === "scatter" &&
    rows.some((row) => typeof row[config.x] !== "number")
  )
    errors.push("Scatter X values must be numeric and complete.");
  if (
    !Number.isFinite(config.width) ||
    config.width < 100 ||
    !Number.isFinite(config.height) ||
    config.height < 100
  )
    errors.push("Figure width and height must be at least 100 pixels.");
  if (!numericFields(rows).includes(config.value))
    errors.push("Choose a numeric value column with no text cells.");
  if (rows.some((row) => row[config.value] === null))
    errors.push(
      "The selected value column has empty cells. Fill or remove these rows.",
    );
  if (config.kind === "scatter" && !numericFields(rows).includes(config.x))
    errors.push("Scatter plots need numeric X and Y columns.");
  if (
    config.kind === "donut" &&
    (rows.some((r) => Number(r[config.value]) < 0) ||
      rows.reduce((sum, r) => sum + Number(r[config.value]), 0) <= 0)
  )
    errors.push("Donut charts need non-negative values with a positive total.");
  if ((config.lower && !config.upper) || (!config.lower && config.upper))
    errors.push("Select both lower and upper interval columns.");
  if (
    config.lower &&
    config.upper &&
    rows.some(
      (row) =>
        typeof row[config.lower] !== "number" ||
        typeof row[config.upper] !== "number" ||
        Number(row[config.lower]) > Number(row[config.upper]),
    )
  )
    errors.push("Interval bounds must be numeric and lower ≤ upper.");
  return errors;
}
export function buildStudioSpec(
  rows: DataRow[],
  c: StudioConfig,
): TopLevelSpec {
  const numeric = numericFields(rows);
  const categorySeries = new Map<string, Set<string>>();
  if (c.series)
    for (const row of rows) {
      const category = String(row[c.category] ?? "");
      const series = categorySeries.get(category) ?? new Set<string>();
      series.add(String(row[c.series] ?? ""));
      categorySeries.set(category, series);
    }
  // A single observation per category should occupy the full band, even when colored by language.
  const offsetSeries =
    !!c.series &&
    [...categorySeries.values()].some((series) => series.size > 1);
  const dark = c.theme === "dark",
    foreground = dark ? "#e5eaf3" : "#273342",
    muted = dark ? "#9daec6" : "#687587";
  const range = palettes[c.palette] ?? palettes.cobalt;
  const label = {
    field: c.category,
    type: "nominal",
    sort: null,
    title: c.xTitle || null,
    axis: { labelAngle: c.axisAngle, labelLimit: 0, labelOverlap: true },
  };
  const value = {
    field: c.value,
    type: "quantitative",
    title: c.yTitle || c.value,
    scale: { zero: c.zero },
  };
  const color = c.series
    ? {
        field: c.series,
        type: "nominal",
        scale: { range },
        legend: c.legend ? { title: null, orient: "top" } : null,
      }
    : { value: range[0] };
  const tooltip = Object.keys(rows[0] ?? {}).map((field) => ({
    field,
    type: numeric.includes(field) ? "quantitative" : "nominal",
  }));
  const spec: Record<string, unknown> = {
    $schema: "https://vega.github.io/schema/vega-lite/v6.json",
    data: { values: rows },
    width: c.width,
    height: c.height,
    background: dark ? "#172235" : "#ffffff",
    padding: { left: 20, right: 28, top: 22, bottom: 20 },
    title: {
      text: wrap(
        c.title,
        Math.max(20, Math.floor(c.width / (c.fontSize * 0.58))),
      ),
      subtitle: c.subtitle
        ? wrap(
            c.subtitle,
            Math.max(24, Math.floor(c.width / (c.fontSize * 0.5))),
          )
        : [],
      anchor: "start",
      fontSize: c.theme === "presentation" ? 26 : 21,
      color: foreground,
      subtitleColor: muted,
      subtitlePadding: 10,
      offset: 24,
    },
    config: {
      font: c.font,
      view: { stroke: null },
      axis: {
        grid: c.grid && c.theme !== "minimal",
        gridColor: dark ? "#2a3a50" : "#e7ebf2",
        domain: false,
        ticks: false,
        labelColor: muted,
        titleColor: foreground,
        labelFontSize: c.fontSize,
        titleFontSize: c.fontSize,
        labelPadding: 10,
        titlePadding: 16,
      },
      legend: {
        labelColor: muted,
        labelFontSize: c.fontSize,
        symbolType: "circle",
        padding: 12,
      },
      text: { font: c.font, fontSize: c.fontSize, color: foreground },
      mark: { tooltip: true, aria: true, color: range[0] },
      range: { category: range },
    },
  };
  const base = { color, tooltip };
  if (c.kind === "bar" || c.kind === "lollipop") {
    const enc = {
      ...base,
      y: {
        ...label,
        title: c.yTitle || null,
        axis: { labelLimit: 0, labelOverlap: true },
      },
      x: { ...value, stack: null, title: c.xTitle || c.value },
      ...(offsetSeries ? { yOffset: { field: c.series } } : {}),
    };
    spec.layer =
      c.kind === "lollipop"
        ? [
            {
              mark: { type: "rule", strokeWidth: 2 },
              encoding: { ...enc, x2: { datum: 0 } },
            },
            { mark: { type: "circle", size: 85, opacity: 1 }, encoding: enc },
          ]
        : [{ mark: { type: "bar", cornerRadiusEnd: 3 }, encoding: enc }];
    if (c.labels)
      (spec.layer as unknown[]).push({
        mark: { type: "text", align: "left", dx: 7, color: foreground },
        encoding: {
          ...enc,
          text: {
            field: c.value,
            type: "quantitative",
            format: `,.${c.decimals}~f`,
          },
        },
      });
  } else if (["column", "grouped", "stacked"].includes(c.kind)) {
    const enc: Record<string, unknown> = {
      ...base,
      x: label,
      y: { ...value, stack: c.kind === "stacked" ? "zero" : null },
    };
    if (c.kind === "grouped" && offsetSeries) enc.xOffset = { field: c.series };
    spec.layer = [
      {
        mark: { type: "bar", cornerRadiusTopLeft: 3, cornerRadiusTopRight: 3 },
        encoding: enc,
      },
    ];
    if (c.lower && c.upper && c.kind !== "stacked")
      (spec.layer as unknown[]).push({
        mark: { type: "errorbar", ticks: true },
        encoding: {
          x: label,
          y: { field: c.lower, type: "quantitative" },
          y2: { field: c.upper },
          ...(c.kind === "grouped" && offsetSeries
            ? { xOffset: { field: c.series } }
            : {}),
        },
      });
    if (c.labels && c.kind !== "stacked")
      (spec.layer as unknown[]).push({
        mark: { type: "text", dy: -8, color: foreground },
        encoding: {
          ...enc,
          text: {
            field: c.value,
            type: "quantitative",
            format: `,.${c.decimals}~f`,
          },
        },
      });
  } else if (c.kind === "line" || c.kind === "area") {
    const x = numeric.includes(c.x)
      ? { field: c.x, type: "quantitative", title: c.xTitle || c.x }
      : label;
    spec.mark = {
      type: c.kind,
      point: c.kind === "line" ? { size: 45 } : false,
      line: c.kind === "area",
      opacity: c.kind === "area" ? 0.35 : 1,
      strokeWidth: 2.5,
    };
    spec.encoding = { ...base, x, y: value };
  } else if (c.kind === "scatter") {
    spec.mark = {
      type: "circle",
      size: 90,
      opacity: 0.75,
      stroke: dark ? "#172235" : "#fff",
      strokeWidth: 1,
    };
    spec.encoding = {
      ...base,
      x: {
        field: c.x,
        type: "quantitative",
        title: c.xTitle || c.x,
        scale: { zero: c.zero },
      },
      y: value,
    };
  } else if (c.kind === "heatmap") {
    spec.mark = {
      type: "rect",
      cornerRadius: 2,
      stroke: dark ? "#172235" : "#fff",
      strokeWidth: 2,
    };
    spec.encoding = {
      x: label,
      y: {
        field: c.series || c.category,
        type: "nominal",
        title: c.yTitle || null,
        axis: { labelLimit: 0 },
      },
      color: {
        field: c.value,
        type: "quantitative",
        scale: { scheme: c.palette === "warm" ? "orangered" : "blues" },
        legend: c.legend ? { title: c.value } : null,
      },
      tooltip,
    };
  } else if (c.kind === "donut") {
    spec.mark = {
      type: "arc",
      innerRadius: Math.min(c.width, c.height) * 0.27,
      outerRadius: Math.min(c.width, c.height) * 0.43,
      cornerRadius: 3,
      padAngle: 0.015,
    };
    spec.encoding = {
      theta: { field: c.value, type: "quantitative" },
      color: {
        field: c.category,
        type: "nominal",
        scale: { range },
        legend: c.legend
          ? { title: null, orient: "right", labelLimit: 0 }
          : null,
      },
      tooltip,
    };
  } else if (c.kind === "histogram") {
    spec.mark = {
      type: "bar",
      cornerRadiusTopLeft: 2,
      cornerRadiusTopRight: 2,
    };
    spec.encoding = {
      x: {
        field: c.value,
        type: "quantitative",
        bin: true,
        title: c.xTitle || c.value,
      },
      y: {
        aggregate: "count",
        type: "quantitative",
        title: c.yTitle || "Observations",
      },
      color,
      tooltip: [
        { aggregate: "count", type: "quantitative", title: "Observations" },
      ],
    };
  } else if (c.kind === "boxplot") {
    spec.mark = {
      type: "boxplot",
      extent: 1.5,
      size: 36,
      outliers: { size: 30 },
      median: { color: dark ? "#fff" : "#172235" },
    };
    spec.encoding = {
      ...(c.series
        ? { x: { field: c.series, type: "nominal", title: c.xTitle || null } }
        : {}),
      y: value,
      color,
    };
  }
  if (c.interactive && ["scatter", "line", "area"].includes(c.kind))
    spec.params = [{ name: "zoom", select: "interval", bind: "scales" }];
  // Vega uses dots/brackets as field-path syntax. CSV headings are literal keys.
  const escapeFields = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(escapeFields);
      return;
    }
    if (!node || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      if (key === "data") continue;
      if (key === "field" && typeof value === "string")
        (node as Record<string, unknown>)[key] = value.replace(
          /([.\[\]\\])/g,
          "\\$1",
        );
      else escapeFields(value);
    }
  };
  escapeFields(spec);
  return spec as unknown as TopLevelSpec;
}
function wrap(text: string, size: number) {
  const chars = [
    ...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text),
  ].map((part) => part.segment);
  const lines: string[] = [];
  for (let i = 0; i < chars.length; i += size)
    lines.push(chars.slice(i, i + size).join(""));
  return lines;
}
export function validateStudioProject(value: unknown): {
  config: StudioConfig;
  rows: DataRow[];
  name: string;
} {
  if (!value || typeof value !== "object")
    throw new Error("Choose a Corpuscape figure project JSON file.");
  const p = value as Record<string, unknown>;
  if (
    p.format !== "corpuscape-figure-v1" ||
    !p.config ||
    typeof p.config !== "object" ||
    !Array.isArray(p.rows)
  )
    throw new Error("This is not a Corpuscape figure project.");
  const raw = p.config as Record<string, unknown>;
  const config = { ...defaultStudio };
  for (const key of Object.keys(defaultStudio) as (keyof StudioConfig)[])
    if (typeof raw[key] === typeof defaultStudio[key])
      (config as unknown as Record<string, unknown>)[key] = raw[key];
  if (
    !chartKinds.some((kind) => kind.id === config.kind) ||
    !palettes[config.palette] ||
    !["journal", "presentation", "dark", "minimal"].includes(config.theme)
  )
    throw new Error("The figure project contains unsupported settings.");
  const rows = p.rows.map((row: unknown) => {
    if (!row || typeof row !== "object" || Array.isArray(row))
      throw new Error("Invalid data row in figure project.");
    const result: DataRow = {};
    for (const [key, value] of Object.entries(row)) {
      if (
        ["__proto__", "constructor", "prototype"].includes(key) ||
        !(
          value === null ||
          typeof value === "string" ||
          (typeof value === "number" && Number.isFinite(value))
        )
      )
        throw new Error("Invalid cell in figure project.");
      result[key] = value;
    }
    return result;
  });
  return {
    config,
    rows,
    name: typeof p.name === "string" ? p.name : "Imported figure",
  };
}
