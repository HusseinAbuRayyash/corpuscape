import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Label,
  LineChart, Line, AreaChart, Area, PieChart, Pie, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter, ZAxis, Legend,
  Treemap, FunnelChart, Funnel, LabelList, ComposedChart, ReferenceLine, ErrorBar,
} from "recharts";
import {
  Download, Pencil, Plus, Trash2, Check, Palette, Type, Tag,
  BarChart3, BarChartHorizontal, LineChart as LineChartIcon, AreaChart as AreaChartIcon,
  PieChart as PieChartIcon, Radar as RadarIcon, ScatterChart as ScatterIcon,
  ChevronDown, Upload, ClipboardPaste, Image, FileText, Settings2,
  Loader2, LayoutGrid, Sparkles, Triangle, TreePine, Layers,
  Grid3x3, Circle, Activity, AlignJustify, Hash, Copy, Code2,
  Undo2, Redo2, BookOpen, Paintbrush2, Wand2, SlidersHorizontal,
  Minus, BarChart2, Columns,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const FIGURE_MAKER_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Fira+Code:wght@300..700&family=Geist+Mono:wght@100..900&family=Geist:wght@100..900&family=IBM+Plex+Mono:ital,wght@0,100;0,700;1,100;1,700&family=IBM+Plex+Sans:ital,wght@0,100..700;1,100..700&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400..700;1,400..700&family=Merriweather:ital,opsz,wght@0,18..144,300..900;1,18..144,300..900&family=Montserrat:ital,wght@0,100..900;1,100..900&family=Open+Sans:ital,wght@0,300..800;1,300..800&family=Outfit:wght@100..900&family=Oxanium:wght@200..800&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&family=Poppins:ital,wght@0,100;0,400;0,700;1,100;1,400;1,700&family=Roboto+Mono:ital,wght@0,100..700;1,100..700&family=Roboto:ital,wght@0,100..900;1,100..900&family=Source+Code+Pro:ital,wght@0,200..900;1,200..900&family=Source+Serif+4:ital,opsz,wght@0,8..60,200..900;1,8..60,200..900&family=Space+Grotesk:wght@300..700&family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap";

interface ChartDataItem { label: string; value: number }
interface BoxPlotItem { label: string; min: number; q1: number; median: number; q3: number; max: number }
interface HeatCell { row: string; col: string; value: number }
interface MultiPoint { label: string; [key: string]: string | number }

type ChartType =
  | "bar" | "barHorizontal" | "stackedBar" | "groupedBar"
  | "line" | "area"
  | "pie" | "donut" | "halfDonut"
  | "radar" | "scatter" | "funnel" | "treemap"
  | "lollipop" | "errorBar" | "boxPlot" | "heatmap" | "wordBubble";

type LabelMode = "none" | "values" | "percentages" | "both";
type FontFamily = "system" | "playfair" | "times" | "arial" | "georgia" | "roboto" | "lato"
  | "sourceSerif" | "ibmPlex" | "merriweather" | "montserrat" | "outfit" | "spaceGrotesk" | "openSans";
type FormatPreset = "default" | "apa" | "ieee" | "chicago" | "presentation" | "poster" | "nature" | "thesis" | "accessible";
type ExportResolution = "1x" | "2x" | "3x" | "4x";
type ExportCodeLang = "python" | "r";

const CHART_TYPES: { type: ChartType; label: string; icon: any; group?: string }[] = [
  { type: "bar", label: "Bar", icon: BarChart3, group: "Basic" },
  { type: "barHorizontal", label: "Horizontal", icon: BarChartHorizontal, group: "Basic" },
  { type: "stackedBar", label: "Stacked Bar", icon: Layers, group: "Basic" },
  { type: "groupedBar", label: "Grouped Bar", icon: Columns, group: "Basic" },
  { type: "line", label: "Line", icon: LineChartIcon, group: "Basic" },
  { type: "area", label: "Area", icon: AreaChartIcon, group: "Basic" },
  { type: "pie", label: "Pie", icon: PieChartIcon, group: "Circular" },
  { type: "donut", label: "Donut", icon: PieChartIcon, group: "Circular" },
  { type: "halfDonut", label: "Half Donut", icon: PieChartIcon, group: "Circular" },
  { type: "radar", label: "Radar", icon: RadarIcon, group: "Circular" },
  { type: "scatter", label: "Scatter", icon: ScatterIcon, group: "Distribution" },
  { type: "lollipop", label: "Lollipop", icon: Circle, group: "Distribution" },
  { type: "errorBar", label: "Error Bar", icon: Activity, group: "Distribution" },
  { type: "boxPlot", label: "Box Plot", icon: AlignJustify, group: "Distribution" },
  { type: "heatmap", label: "Heatmap", icon: Grid3x3, group: "Matrix" },
  { type: "wordBubble", label: "Word Bubble", icon: Hash, group: "Other" },
  { type: "funnel", label: "Funnel", icon: Triangle, group: "Other" },
  { type: "treemap", label: "Treemap", icon: TreePine, group: "Other" },
];

const PRESET_PALETTES = [
  { name: "Black", colors: ["#000000", "#0a0a0a", "#141414", "#1e1e1e", "#282828", "#323232", "#3c3c3c", "#464646", "#505050", "#5a5a5a"] },
  { name: "White", colors: ["#ffffff", "#f5f5f5", "#ebebeb", "#e0e0e0", "#d6d6d6", "#cccccc", "#c2c2c2", "#b8b8b8", "#adadad", "#a3a3a3"] },
  { name: "B&W", colors: ["#000000", "#1a1a1a", "#333333", "#4d4d4d", "#666666", "#808080", "#999999", "#b3b3b3", "#cccccc", "#e6e6e6"] },
  { name: "Slate", colors: ["#0f172a", "#1e293b", "#334155", "#475569", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0", "#f1f5f9", "#f8fafc"] },
  { name: "Academic", colors: ["#1e3a5f", "#2a5078", "#366891", "#4280aa", "#5098c3", "#1a4731", "#24603f", "#2e794d", "#3a925b", "#48ab6a"] },
  { name: "APA Blue", colors: ["#003f5c", "#2f4b7c", "#665191", "#a05195", "#d45087", "#f95d6a", "#ff7c43", "#ffa600", "#7a5195", "#ef5675"] },
  { name: "Nature", colors: ["#e64b35", "#4dbbd5", "#00a087", "#3c5488", "#f39b7f", "#8491b4", "#91d1c2", "#dc0000", "#7e6148", "#b09c85"] },
  { name: "Science", colors: ["#3b4992", "#ee0000", "#008b45", "#631879", "#008280", "#bb0021", "#5f559b", "#a20056", "#808180", "#1b1919"] },
  { name: "Lancet", colors: ["#00468b", "#ed0000", "#42b540", "#0099b4", "#925e9f", "#fdaf91", "#ad002a", "#adb6b6", "#1b1919", "#767676"] },
  { name: "JAMA", colors: ["#374e55", "#df8f44", "#00a1d5", "#b24745", "#79af97", "#6a6599", "#80796b", "#ccc591", "#374e55", "#df8f44"] },
  { name: "NEJM", colors: ["#bc3c29", "#0072b5", "#e18727", "#20854e", "#7876b1", "#6f99ad", "#ee4c97", "#ffdc91", "#8c564b", "#c49c94"] },
  { name: "D3", colors: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"] },
  { name: "Tableau", colors: ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f", "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac"] },
  { name: "Teal", colors: ["#134e4a", "#115e59", "#0f766e", "#0d9488", "#14b8a6", "#2dd4bf", "#5eead4", "#99f6e4", "#b2f5ea", "#ccfbf1"] },
  { name: "Blue", colors: ["#1e3a8a", "#1e40af", "#1d4ed8", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe", "#eff6ff"] },
  { name: "Indigo", colors: ["#312e81", "#3730a3", "#4338ca", "#4f46e5", "#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe", "#e0e7ff", "#eef2ff"] },
  { name: "Purple", colors: ["#581c87", "#6b21a8", "#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe", "#f5f3ff", "#d8b4fe"] },
  { name: "Rose", colors: ["#881337", "#9f1239", "#be123c", "#e11d48", "#f43f5e", "#fb7185", "#fda4af", "#fecdd3", "#ffe4e6", "#fff1f2"] },
  { name: "Amber", colors: ["#78350f", "#92400e", "#b45309", "#d97706", "#f59e0b", "#fbbf24", "#fcd34d", "#fde68a", "#fef3c7", "#fffbeb"] },
  { name: "Cyan", colors: ["#164e63", "#155e75", "#0e7490", "#0891b2", "#06b6d4", "#22d3ee", "#67e8f9", "#a5f3fc", "#cffafe", "#ecfeff"] },
  { name: "Green", colors: ["#14532d", "#166534", "#15803d", "#16a34a", "#22c55e", "#4ade80", "#86efac", "#bbf7d0", "#dcfce7", "#f0fdf4"] },
  { name: "Emerald", colors: ["#064e3b", "#065f46", "#047857", "#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5", "#ecfdf5"] },
  { name: "Red", colors: ["#7f1d1d", "#991b1b", "#b91c1c", "#dc2626", "#ef4444", "#f87171", "#fca5a5", "#fecaca", "#fee2e2", "#fef2f2"] },
  { name: "Orange", colors: ["#7c2d12", "#9a3412", "#c2410c", "#ea580c", "#f97316", "#fb923c", "#fdba74", "#fed7aa", "#ffedd5", "#fff7ed"] },
  { name: "Pink", colors: ["#831843", "#9d174d", "#be185d", "#db2777", "#ec4899", "#f472b6", "#f9a8d4", "#fbcfe8", "#fce7f3", "#fdf2f8"] },
  { name: "Sky", colors: ["#0c4a6e", "#075985", "#0369a1", "#0284c7", "#0ea5e9", "#38bdf8", "#7dd3fc", "#bae6fd", "#e0f2fe", "#f0f9ff"] },
  { name: "Pastel", colors: ["#fca5a5", "#fdba74", "#fde68a", "#bef264", "#86efac", "#67e8f9", "#a5b4fc", "#d8b4fe", "#f9a8d4", "#fecdd3"] },
  { name: "Rainbow", colors: ["#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e"] },
  { name: "Earth", colors: ["#451a03", "#78350f", "#92400e", "#a16207", "#854d0e", "#713f12", "#65a30d", "#4d7c0f", "#3f6212", "#365314"] },
  { name: "Navy", colors: ["#0c1445", "#111b5e", "#162277", "#1b2990", "#2030a9", "#2b3dc2", "#3a4ed5", "#4f63e0", "#6b7ce8", "#8d9af0"] },
  { name: "Viridis", colors: ["#440154", "#482777", "#3f4a8a", "#31678e", "#26838f", "#1f9d8a", "#6cce5a", "#b6de2b", "#fee825", "#aadc32"] },
  { name: "Plasma", colors: ["#0d0887", "#46039f", "#7201a8", "#9c179e", "#bd3786", "#d8576b", "#ed7953", "#fb9f3a", "#fdca26", "#f0f921"] },
  { name: "Inferno", colors: ["#000004", "#160b39", "#420a68", "#6a176e", "#932667", "#bc3754", "#dd513a", "#f37819", "#fca50a", "#f0f921"] },
  { name: "Magma", colors: ["#000004", "#140e36", "#3b0f70", "#641a80", "#8c2981", "#b73779", "#de4968", "#f7705c", "#feb078", "#fcfdbf"] },
  { name: "Warm", colors: ["#9b2226", "#ae2012", "#bb3e03", "#ca6702", "#ee9b00", "#e9d8a6", "#94d2bd", "#0a9396", "#005f73", "#001219"] },
  { name: "Cool", colors: ["#caf0f8", "#90e0ef", "#00b4d8", "#0077b6", "#03045e", "#023e8a", "#0096c7", "#48cae4", "#ade8f4", "#caf0f8"] },
  { name: "Sunset", colors: ["#ff6b6b", "#ee5a24", "#f0932b", "#ffbe76", "#ffeaa7", "#dfe6e9", "#74b9ff", "#a29bfe", "#6c5ce7", "#2d3436"] },
  { name: "Ocean", colors: ["#001233", "#001845", "#002855", "#023e7d", "#0353a4", "#0466c8", "#0582ca", "#0096c7", "#00b4d8", "#48cae4"] },
  { name: "Forest", colors: ["#1b4332", "#2d6a4f", "#40916c", "#52b788", "#74c69d", "#95d5b2", "#b7e4c7", "#d8f3dc", "#e9f5db", "#f1faee"] },
  { name: "Retro", colors: ["#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51", "#606c38", "#283618", "#dda15e", "#bc6c25", "#432818"] },
  { name: "Neon", colors: ["#00ff87", "#60efff", "#ff00e4", "#ff6b00", "#ffe100", "#00e5ff", "#7b2ff7", "#ff2d55", "#01ff89", "#f72585"] },
  { name: "Muted", colors: ["#6c757d", "#adb5bd", "#868e96", "#495057", "#343a40", "#ced4da", "#dee2e6", "#e9ecef", "#f1f3f5", "#f8f9fa"] },
  { name: "CB Safe 1", colors: ["#0173b2", "#de8f05", "#029e73", "#d55e00", "#cc78bc", "#ca9161", "#fbafe4", "#949494", "#ece133", "#56b4e9"] },
  { name: "CB Safe 2", colors: ["#332288", "#117733", "#44aa99", "#88ccee", "#ddcc77", "#cc6677", "#aa4499", "#882255", "#6699cc", "#999933"] },
  { name: "CB Okabe", colors: ["#e69f00", "#56b4e9", "#009e73", "#f0e442", "#0072b2", "#d55e00", "#cc79a7", "#000000", "#999999", "#88ccee"] },
  { name: "High Contrast", colors: ["#000000", "#ffffff", "#ff0000", "#0000ff", "#00aa00", "#ff9900", "#9900ff", "#00cccc", "#ff69b4", "#8b4513"] },
  { name: "Grayscale", colors: ["#111111", "#222222", "#444444", "#555555", "#777777", "#888888", "#aaaaaa", "#bbbbbb", "#dddddd", "#eeeeee"] },
];

const FONT_OPTIONS: { value: FontFamily; label: string; css: string }[] = [
  { value: "system", label: "System Default", css: "system-ui, -apple-system, sans-serif" },
  { value: "playfair", label: "Playfair Display", css: "'Playfair Display', serif" },
  { value: "times", label: "Times New Roman", css: "'Times New Roman', Times, serif" },
  { value: "arial", label: "Arial / Helvetica", css: "Arial, Helvetica, sans-serif" },
  { value: "georgia", label: "Georgia", css: "Georgia, serif" },
  { value: "roboto", label: "Roboto", css: "'Roboto', sans-serif" },
  { value: "lato", label: "Lato", css: "'Lato', sans-serif" },
  { value: "sourceSerif", label: "Source Serif 4", css: "'Source Serif 4', serif" },
  { value: "ibmPlex", label: "IBM Plex Sans", css: "'IBM Plex Sans', sans-serif" },
  { value: "merriweather", label: "Merriweather", css: "'Merriweather', serif" },
  { value: "montserrat", label: "Montserrat", css: "'Montserrat', sans-serif" },
  { value: "outfit", label: "Outfit", css: "'Outfit', sans-serif" },
  { value: "spaceGrotesk", label: "Space Grotesk", css: "'Space Grotesk', sans-serif" },
  { value: "openSans", label: "Open Sans", css: "'Open Sans', sans-serif" },
];

const FORMAT_PRESETS: { value: FormatPreset; label: string; description: string }[] = [
  { value: "default", label: "Default", description: "Standard web-ready figure" },
  { value: "apa", label: "APA 7th", description: "Academic — sans-serif, numbered, italic caption" },
  { value: "ieee", label: "IEEE", description: "Technical — serif, compact, bold caption" },
  { value: "chicago", label: "Chicago/MLA", description: "Humanities — serif, descriptive caption" },
  { value: "nature", label: "Nature / Science", description: "Journal — minimal, clean, no grid background" },
  { value: "thesis", label: "Thesis / Dissertation", description: "Full serif, numbered, formal caption" },
  { value: "accessible", label: "Accessible (WCAG)", description: "High contrast, large text, CB-safe colors" },
  { value: "presentation", label: "Presentation", description: "Large fonts, high contrast for slides" },
  { value: "poster", label: "Poster / Print", description: "Extra large text, thick lines, high-res" },
];

interface FigureTemplate {
  id: string; name: string; description: string; icon: string;
  chartType: ChartType; data: ChartDataItem[]; title: string;
  xLabel?: string; yLabel?: string; formatPreset?: FormatPreset;
}

const FIGURE_TEMPLATES: FigureTemplate[] = [
  {
    id: "translation-strategies",
    name: "Translation Strategies",
    description: "Distribution of translation strategies in a parallel corpus",
    icon: "📊",
    chartType: "bar",
    title: "Distribution of Translation Strategies",
    xLabel: "Strategy",
    yLabel: "Frequency (n)",
    data: [
      { label: "Foreignization", value: 212 },
      { label: "Domestication", value: 178 },
      { label: "Paraphrase", value: 143 },
      { label: "Borrowing", value: 98 },
      { label: "Calque", value: 76 },
      { label: "Omission", value: 54 },
      { label: "Addition", value: 39 },
    ],
  },
  {
    id: "keyword-rank",
    name: "Keyword Frequency",
    description: "Top 10 keywords by frequency per million words",
    icon: "🔤",
    chartType: "barHorizontal",
    title: "Top 10 Keywords by Normalized Frequency",
    xLabel: "Frequency per Million Words",
    data: [
      { label: "translation", value: 4820 },
      { label: "equivalence", value: 3541 },
      { label: "target text", value: 2998 },
      { label: "source text", value: 2754 },
      { label: "strategy", value: 2310 },
      { label: "corpus", value: 1987 },
      { label: "discourse", value: 1645 },
      { label: "pragmatic", value: 1422 },
      { label: "lexical", value: 1188 },
      { label: "register", value: 976 },
    ],
  },
  {
    id: "universals",
    name: "Translation Universals",
    description: "Radar showing six translation universals across two corpora",
    icon: "🕸️",
    chartType: "radar",
    title: "Translation Universals — Parallel Corpus",
    data: [
      { label: "Simplification", value: 78 },
      { label: "Explicitation", value: 65 },
      { label: "Normalization", value: 72 },
      { label: "Levelling Out", value: 54 },
      { label: "Interference", value: 43 },
      { label: "Unique Items", value: 38 },
    ],
    formatPreset: "apa",
  },
  {
    id: "pre-post-shift",
    name: "Pre/Post Translation",
    description: "Line chart comparing pre/post linguistic features",
    icon: "📈",
    chartType: "line",
    title: "Lexical Density Across Text Segments",
    xLabel: "Segment",
    yLabel: "Lexical Density (%)",
    data: Array.from({ length: 8 }, (_, i) => ({
      label: `Seg. ${i + 1}`,
      value: Math.round(42 + Math.sin(i * 0.9) * 12 + Math.random() * 6),
    })),
  },
  {
    id: "lang-pairs",
    name: "Language Pair Distribution",
    description: "Donut chart of corpus language pair breakdown",
    icon: "🌍",
    chartType: "donut",
    title: "Corpus Composition by Language Pair",
    data: [
      { label: "Arabic → English", value: 38 },
      { label: "French → English", value: 24 },
      { label: "Spanish → English", value: 18 },
      { label: "German → English", value: 12 },
      { label: "Chinese → English", value: 8 },
    ],
    formatPreset: "apa",
  },
];

const TOOLTIP_STYLE = { borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: "12px" };

const hasAxes = (t: ChartType) => !["pie", "donut", "halfDonut", "radar", "funnel", "treemap", "wordBubble", "heatmap"].includes(t);
const isSpecialRender = (t: ChartType) => ["boxPlot", "heatmap", "wordBubble"].includes(t);
const needsMultiData = (t: ChartType) => t === "groupedBar";

function parseHex(hex: string): [number, number, number] {
  const c = hex.replace("#", "");
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}

function interpolateColor(hex1: string, hex2: string, t: number): string {
  try {
    const [r1, g1, b1] = parseHex(hex1 || "#e0f2fe");
    const [r2, g2, b2] = parseHex(hex2 || "#0369a1");
    return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
  } catch { return "#e0f2fe"; }
}

function generatePythonCode(
  data: ChartDataItem[], chartType: ChartType, colors: string[],
  title: string, xLabel: string, yLabel: string, caption: string, figureNumber: string
): string {
  const labels = data.map(d => `'${d.label.replace(/'/g, "\\'")}'`).join(", ");
  const values = data.map(d => d.value).join(", ");
  const cols = colors.slice(0, data.length).map(c => `'${c}'`).join(", ");
  let code = `import matplotlib.pyplot as plt\nimport numpy as np\n\nlabels = [${labels}]\nvalues = [${values}]\ncolors = [${cols}]\n\nfig, ax = plt.subplots(figsize=(8, 5), dpi=300)\n`;
  if (chartType === "bar") code += `ax.bar(labels, values, color=colors, edgecolor='white')\nax.set_xticklabels(labels, rotation=45, ha='right', fontsize=10)\n`;
  else if (chartType === "barHorizontal") code += `ax.barh(labels, values, color=colors)\n`;
  else if (chartType === "line") code += `ax.plot(labels, values, color=colors[0], marker='o', linewidth=2.5, markersize=6)\nax.set_xticklabels(labels, rotation=45, ha='right', fontsize=10)\n`;
  else if (chartType === "area") code += `ax.fill_between(range(len(labels)), values, alpha=0.4, color=colors[0])\nax.plot(range(len(labels)), values, color=colors[0], linewidth=2)\nax.set_xticks(range(len(labels)))\nax.set_xticklabels(labels, rotation=45, ha='right', fontsize=10)\n`;
  else if (chartType === "pie") code += `ax.pie(values, labels=labels, colors=colors, autopct='%1.1f%%', startangle=90)\nax.axis('equal')\n`;
  else if (chartType === "donut") code += `wedges, _ = ax.pie(values, labels=None, colors=colors, startangle=90, wedgeprops=dict(width=0.5))\nax.legend(wedges, labels, loc='center left', bbox_to_anchor=(1, 0, 0.5, 1))\nax.axis('equal')\n`;
  else if (chartType === "scatter") code += `ax.scatter(range(len(values)), values, c=colors[:len(values)] if len(colors) >= len(values) else colors[0], s=80, edgecolors='white')\nax.set_xticks(range(len(labels)))\nax.set_xticklabels(labels, rotation=45, ha='right', fontsize=10)\n`;
  else code += `ax.bar(labels, values, color=colors, edgecolor='white')\nax.set_xticklabels(labels, rotation=45, ha='right', fontsize=10)\n`;
  if (title) code += `ax.set_title('${title.replace(/'/g, "\\'")}', fontsize=13, fontweight='bold', pad=10)\n`;
  if (xLabel) code += `ax.set_xlabel('${xLabel.replace(/'/g, "\\'")}', fontsize=11)\n`;
  if (yLabel) code += `ax.set_ylabel('${yLabel.replace(/'/g, "\\'")}', fontsize=11)\n`;
  code += `ax.spines['top'].set_visible(False)\nax.spines['right'].set_visible(False)\nplt.tight_layout()\n`;
  if (caption) code += `# Figure ${figureNumber}. ${caption}\n`;
  code += `plt.savefig('figure_${figureNumber}.png', dpi=300, bbox_inches='tight')\nplt.show()\n`;
  return code;
}

function generateRCode(
  data: ChartDataItem[], chartType: ChartType, colors: string[],
  title: string, xLabel: string, yLabel: string, caption: string, figureNumber: string
): string {
  const labels = data.map(d => `"${d.label.replace(/"/g, '\\"')}"`).join(", ");
  const values = data.map(d => d.value).join(", ");
  const cols = colors.slice(0, data.length).map(c => `"${c}"`).join(", ");
  let code = `library(ggplot2)\n\ndata <- data.frame(\n  label = factor(c(${labels}), levels = c(${labels})),\n  value = c(${values})\n)\n\np <- ggplot(data, aes(x = label, y = value`;
  if (["bar", "barHorizontal", "scatter"].includes(chartType)) code += `, fill = label`;
  code += `)) +\n`;
  if (chartType === "bar") code += `  geom_bar(stat = "identity", color = "white") +\n  theme(axis.text.x = element_text(angle = 45, hjust = 1)) +\n`;
  else if (chartType === "barHorizontal") code += `  geom_bar(stat = "identity", color = "white") +\n  coord_flip() +\n`;
  else if (chartType === "line") code += `  geom_line(aes(group = 1), color = "${colors[0]}", linewidth = 1.5) +\n  geom_point(color = "${colors[0]}", size = 3) +\n  theme(axis.text.x = element_text(angle = 45, hjust = 1)) +\n`;
  else if (chartType === "area") code += `  geom_area(aes(group = 1), fill = "${colors[0]}", alpha = 0.4) +\n  geom_line(aes(group = 1), color = "${colors[0]}", linewidth = 1.5) +\n`;
  else if (chartType === "pie") code += `  geom_bar(stat = "identity", width = 1, color = "white") +\n  coord_polar("y", start = 0) +\n  theme_void() +\n`;
  else if (chartType === "scatter") code += `  geom_point(size = 4, alpha = 0.8, color = "white", stroke = 1) +\n  theme(axis.text.x = element_text(angle = 45, hjust = 1)) +\n`;
  else code += `  geom_bar(stat = "identity", color = "white") +\n  theme(axis.text.x = element_text(angle = 45, hjust = 1)) +\n`;
  code += `  scale_fill_manual(values = c(${cols}), guide = "none") +\n`;
  code += `  labs(`;
  const labs: string[] = [];
  if (title) labs.push(`title = "${title.replace(/"/g, '\\"')}"`);
  if (xLabel) labs.push(`x = "${xLabel.replace(/"/g, '\\"')}"`);
  if (yLabel) labs.push(`y = "${yLabel.replace(/"/g, '\\"')}"`);
  code += labs.join(", ") + `) +\n`;
  code += `  theme_minimal(base_size = 12) +\n  theme(panel.grid.major.x = element_blank())\n\nprint(p)\nggsave("figure_${figureNumber}.png", p, dpi = 300, width = 8, height = 5, bg = "white")\n`;
  if (caption) code += `# Figure ${figureNumber}. ${caption}\n`;
  return code;
}

export default function FigureMaker() {
  useEffect(() => {
    const id = "figure-maker-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id; link.rel = "stylesheet"; link.href = FIGURE_MAKER_FONTS_URL;
    document.head.appendChild(link);
  }, []);

  const { toast } = useToast();

  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [multiData, setMultiData] = useState<MultiPoint[]>([]);
  const [seriesNames, setSeriesNames] = useState<string[]>([]);
  const [boxData, setBoxData] = useState<BoxPlotItem[]>([]);
  const [heatData, setHeatData] = useState<HeatCell[]>([]);

  const [historyStack, setHistoryStack] = useState<ChartDataItem[][]>([[]]);
  const [historyPtr, setHistoryPtr] = useState(0);

  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [figureNumber, setFigureNumber] = useState("1");
  const [xLabel, setXLabel] = useState("");
  const [yLabel, setYLabel] = useState("");
  const [colors, setColors] = useState<string[]>(PRESET_PALETTES[0].colors);
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [labelMode, setLabelMode] = useState<LabelMode>("values");
  const [fontFamily, setFontFamily] = useState<FontFamily>("system");
  const [formatPreset, setFormatPreset] = useState<FormatPreset>("default");
  const [resolution, setResolution] = useState<ExportResolution>("3x");
  const [showLegend, setShowLegend] = useState(false);

  const [showGrid, setShowGrid] = useState(true);
  const [gridOpacity, setGridOpacity] = useState(0.2);
  const [barRadius, setBarRadius] = useState(4);
  const [lineThickness, setLineThickness] = useState(2.5);
  const [figBg, setFigBg] = useState<string>("transparent");
  const [aspectRatio, setAspectRatio] = useState<string>("auto");
  const [errorPct, setErrorPct] = useState(12);

  const [showRefLine, setShowRefLine] = useState(false);
  const [refLineType, setRefLineType] = useState<"mean" | "median" | "custom">("mean");
  const [refLineCustom, setRefLineCustom] = useState("");
  const [refLineLabel, setRefLineLabel] = useState("Mean");
  const [refLineColor, setRefLineColor] = useState("#ef4444");

  const [editingTitle, setEditingTitle] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [pasteData, setPasteData] = useState("");
  const [dataInputMode, setDataInputMode] = useState<"paste" | "upload">("paste");
  const [exporting, setExporting] = useState(false);
  const [codeLang, setCodeLang] = useState<ExportCodeLang>("python");

  const [aiCaptionResult, setAiCaptionResult] = useState("");
  const [aiResultsResult, setAiResultsResult] = useState("");
  const [aiRecommendResult, setAiRecommendResult] = useState<{ chartType: string; reason: string } | null>(null);
  const [aiContext, setAiContext] = useState("");

  const [openPanel, setOpenPanel] = useState<string | null>(null);

  const chartContainerRef = useRef<HTMLDivElement>(null);

  const getFontCSS = useCallback(() => FONT_OPTIONS.find(f => f.value === fontFamily)?.css || "system-ui, sans-serif", [fontFamily]);

  const applyFormatPreset = useCallback((preset: FormatPreset) => {
    setFormatPreset(preset);
    switch (preset) {
      case "apa": setFontFamily("arial"); setLabelMode("values"); setShowLegend(false); break;
      case "ieee": setFontFamily("times"); setLabelMode("values"); setShowLegend(true); break;
      case "chicago": setFontFamily("georgia"); setLabelMode("none"); setShowLegend(true); break;
      case "nature": setFontFamily("arial"); setLabelMode("values"); setShowGrid(false); setShowLegend(true); break;
      case "thesis": setFontFamily("times"); setLabelMode("values"); setShowLegend(true); break;
      case "accessible": setFontFamily("arial"); setColors(PRESET_PALETTES.find(p => p.name === "CB Safe 1")!.colors); setLabelMode("both"); setShowLegend(true); break;
      case "presentation": setFontFamily("arial"); setLabelMode("values"); setShowLegend(true); setResolution("2x"); break;
      case "poster": setFontFamily("arial"); setLabelMode("both"); setShowLegend(true); setResolution("4x"); break;
    }
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem("library_load");
    if (!raw || !window.location.search.includes("libraryId")) return;
    try {
      const data = JSON.parse(raw);
      sessionStorage.removeItem("library_load");
      if (data.type === "bilingual" && data.pairs?.length > 0) {
        const stratCounts: Record<string, number> = {};
        data.pairs.forEach((p: any) => {
          const s = p.strategy || "unlabeled";
          stratCounts[s] = (stratCounts[s] || 0) + 1;
        });
        const chartItems = Object.entries(stratCounts).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
        if (chartItems.length > 0) {
          setChartData(chartItems);
          setTitle(`Translation Strategies — ${data.name}`);
          setXLabel("Strategy");
          setYLabel("Count");
          toast({ title: `"${data.name}" loaded`, description: "Strategy distribution ready for visualization" });
        }
      } else if (data.type === "monolingual" && data.corpusId) {
        fetch("/api/corpus/keywords", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ corpusId: data.corpusId, topN: 20, stopWords: [] }),
        }).then(r => r.json()).then(kw => {
          if (kw?.keywords?.length > 0) {
            const chartItems = kw.keywords.slice(0, 20).map((k: any) => ({ label: k.term, value: k.frequency }));
            setChartData(chartItems);
            setTitle(`Keyword Frequency — ${data.name}`);
            setXLabel("Term");
            setYLabel("Frequency");
            toast({ title: `"${data.name}" loaded`, description: "Top 20 keywords ready for visualization" });
          }
        }).catch(() => {});
      }
    } catch {}
  }, []);

  const pushHistory = useCallback((newData: ChartDataItem[]) => {
    setHistoryStack(prev => {
      const trimmed = prev.slice(0, historyPtr + 1);
      return [...trimmed, newData].slice(-25);
    });
    setHistoryPtr(prev => Math.min(prev + 1, 24));
  }, [historyPtr]);

  const undo = useCallback(() => {
    if (historyPtr > 0) {
      const newPtr = historyPtr - 1;
      setHistoryPtr(newPtr);
      setChartData(historyStack[newPtr] || []);
    }
  }, [historyStack, historyPtr]);

  const redo = useCallback(() => {
    if (historyPtr < historyStack.length - 1) {
      const newPtr = historyPtr + 1;
      setHistoryPtr(newPtr);
      setChartData(historyStack[newPtr] || []);
    }
  }, [historyStack, historyPtr]);

  const tryLocalParse = useCallback((input: string): ChartDataItem[] => {
    const lines = input.trim().split("\n").filter(l => l.trim());
    const parsed: ChartDataItem[] = [];
    const isHeaderLine = (l: string) => /^["']?(label|name|category|item|key|word)\b/i.test(l.trim());
    const startIdx = lines.length > 1 && isHeaderLine(lines[0]) ? 1 : 0;
    for (let li = startIdx; li < lines.length; li++) {
      const line = lines[li];
      const parts = line.split(/[\t,;|]/).map(p => p.trim());
      if (parts.length >= 2) {
        const label = parts[0].replace(/^["']|["']$/g, "").trim();
        const rawLast = parts[parts.length - 1];
        const value = parseFloat(rawLast);
        if (label && !isNaN(value)) parsed.push({ label, value });
      }
    }
    return parsed;
  }, []);

  const tryParseMultiSeries = useCallback((input: string): { data: MultiPoint[]; series: string[] } | null => {
    const lines = input.trim().split("\n").filter(l => l.trim());
    if (lines.length < 2) return null;
    const header = lines[0].split(/[\t,;]/).map(s => s.trim().replace(/^["']|["']$/g, ""));
    if (header.length < 3) return null;
    const data: MultiPoint[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(/[\t,;]/).map(s => s.trim().replace(/^["']|["']$/g, ""));
      if (parts.length < header.length) continue;
      const row: MultiPoint = { label: parts[0] };
      let ok = true;
      for (let j = 1; j < header.length; j++) {
        const val = parseFloat(parts[j]);
        if (isNaN(val)) { ok = false; break; }
        row[header[j]] = val;
      }
      if (ok) data.push(row);
    }
    if (data.length === 0) return null;
    return { data, series: header.slice(1) };
  }, []);

  const tryParseBoxPlot = useCallback((input: string): BoxPlotItem[] | null => {
    const lines = input.trim().split("\n").filter(l => l.trim());
    const isHeader = (l: string) => /label|min|q1|median|q3|max/i.test(l);
    const startIdx = lines.length > 1 && isHeader(lines[0]) ? 1 : 0;
    const result: BoxPlotItem[] = [];
    for (let i = startIdx; i < lines.length; i++) {
      const parts = lines[i].split(/[\t,;]/).map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
      const label = lines[i].split(/[\t,;]/)[0].trim().replace(/^["']|["']$/g, "");
      if (parts.length >= 5) {
        result.push({ label, min: parts[0] || 0, q1: parts[1] || 0, median: parts[2] || 0, q3: parts[3] || 0, max: parts[4] || 0 });
      }
    }
    return result.length > 0 ? result : null;
  }, []);

  const tryParseHeatmap = useCallback((input: string): HeatCell[] | null => {
    const lines = input.trim().split("\n").filter(l => l.trim());
    if (lines.length < 2) return null;
    const headerParts = lines[0].split(/[\t,;]/).map(s => s.trim().replace(/^["']|["']$/g, ""));
    const cols = headerParts.slice(1).filter(Boolean);
    if (cols.length === 0) return null;
    const cells: HeatCell[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(/[\t,;]/).map(s => s.trim().replace(/^["']|["']$/g, ""));
      const row = parts[0];
      if (!row) continue;
      for (let j = 0; j < cols.length; j++) {
        const val = parseFloat(parts[j + 1]);
        if (!isNaN(val)) cells.push({ row, col: cols[j], value: val });
      }
    }
    return cells.length > 0 ? cells : null;
  }, []);

  const aiParseMutation = useMutation({
    mutationFn: async (text: string) => { const res = await apiRequest("POST", "/api/ai/parse-chart-data", { text }); return res.json(); },
    onSuccess: (data) => {
      if (data.data?.length > 0) {
        setChartData(data.data);
        pushHistory(data.data);
        toast({ title: "AI parsed your data", description: `${data.data.length} data points extracted` });
      } else toast({ title: "No data found", variant: "destructive" });
    },
    onError: () => {
      const local = tryLocalParse(pasteData);
      if (local.length > 0) { setChartData(local); pushHistory(local); toast({ title: "Data loaded", description: `${local.length} data points` }); }
      else toast({ title: "Could not parse data", description: "Try a clearer format", variant: "destructive" });
    },
  });

  const aiCaptionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/figure-caption", { chartType, data: chartData, formatPreset, title });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.caption) { setAiCaptionResult(data.caption); }
      else toast({ title: "AI caption failed", variant: "destructive" });
    },
    onError: () => toast({ title: "AI caption failed", variant: "destructive" }),
  });

  const aiRecommendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/chart-recommend", { data: chartData, context: aiContext });
      return res.json();
    },
    onSuccess: (data) => { setAiRecommendResult(data); },
    onError: () => toast({ title: "AI recommendation failed", variant: "destructive" }),
  });

  const aiResultsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/results-paragraph", { chartType, data: chartData, title, caption, figureNumber });
      return res.json();
    },
    onSuccess: (data) => { if (data.paragraph) setAiResultsResult(data.paragraph); },
    onError: () => toast({ title: "AI failed", variant: "destructive" }),
  });

  const parsePastedData = useCallback(() => {
    if (!pasteData.trim()) return;

    if (chartType === "groupedBar" || needsMultiData(chartType)) {
      const multi = tryParseMultiSeries(pasteData);
      if (multi) {
        setMultiData(multi.data);
        setSeriesNames(multi.series);
        toast({ title: "Multi-series data loaded", description: `${multi.data.length} groups, ${multi.series.length} series` });
        return;
      }
    }
    if (chartType === "boxPlot") {
      const box = tryParseBoxPlot(pasteData);
      if (box) { setBoxData(box); toast({ title: "Box plot data loaded", description: `${box.length} groups` }); return; }
    }
    if (chartType === "heatmap") {
      const heat = tryParseHeatmap(pasteData);
      if (heat) { setHeatData(heat); toast({ title: "Heatmap data loaded", description: `${heat.length} cells` }); return; }
    }
    const multi = tryParseMultiSeries(pasteData);
    if (multi && chartType !== "groupedBar") {
      const flat = multi.data.map(d => ({ label: String(d.label), value: Number(d[multi.series[0]]) || 0 }));
      setChartData(flat); pushHistory(flat);
      toast({ title: "Data loaded", description: `${flat.length} data points (first series)` });
      return;
    }
    const local = tryLocalParse(pasteData);
    if (local.length > 0) { setChartData(local); pushHistory(local); toast({ title: "Data loaded", description: `${local.length} data points` }); return; }
    aiParseMutation.mutate(pasteData);
  }, [pasteData, chartType, tryParseMultiSeries, tryParseBoxPlot, tryParseHeatmap, tryLocalParse, pushHistory]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;
      const local = tryLocalParse(text);
      if (local.length > 0) { setChartData(local); pushHistory(local); toast({ title: "File loaded", description: `${local.length} data points from ${file.name}` }); }
      else aiParseMutation.mutate(text);
    };
    reader.readAsText(file);
    e.target.value = "";
  }, [toast, tryLocalParse, pushHistory]);

  const updateLabel = useCallback((i: number, v: string) => setChartData(prev => prev.map((d, idx) => idx === i ? { ...d, label: v } : d)), []);
  const updateValue = useCallback((i: number, v: number) => setChartData(prev => prev.map((d, idx) => idx === i ? { ...d, value: v } : d)), []);
  const removeItem = useCallback((i: number) => { const next = chartData.filter((_, idx) => idx !== i); setChartData(next); pushHistory(next); }, [chartData, pushHistory]);
  const addItem = useCallback(() => {
    if (!newLabel.trim()) return;
    const next = [...chartData, { label: newLabel.trim(), value: Number(newValue) || 0 }];
    setChartData(next); pushHistory(next); setNewLabel(""); setNewValue("");
  }, [chartData, newLabel, newValue, pushHistory]);

  const applyTemplate = useCallback((tpl: FigureTemplate) => {
    setChartData(tpl.data);
    pushHistory(tpl.data);
    setChartType(tpl.chartType);
    setTitle(tpl.title);
    setXLabel(tpl.xLabel || "");
    setYLabel(tpl.yLabel || "");
    if (tpl.formatPreset) applyFormatPreset(tpl.formatPreset);
    setOpenPanel(null);
    toast({ title: `Template applied`, description: tpl.name });
  }, [pushHistory, applyFormatPreset]);

  const getExportElement = useCallback(() => {
    const container = chartContainerRef.current;
    if (!container) return null;
    return container.querySelector("[data-export-area]") as HTMLElement | null;
  }, []);

  const downloadPNG = useCallback(async () => {
    const exportEl = getExportElement();
    if (!exportEl) return;
    setExporting(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const scale = parseInt(resolution.replace("x", ""));
      const bg = figBg === "transparent" ? "#ffffff" : figBg;
      exportEl.style.background = bg;
      exportEl.style.padding = "32px";
      exportEl.style.borderRadius = "0";
      const canvas = await html2canvas(exportEl, { scale, backgroundColor: bg, useCORS: true, logging: false });
      exportEl.style.background = "";
      exportEl.style.padding = "";
      exportEl.style.borderRadius = "";
      const link = document.createElement("a");
      link.download = `${title || "figure"}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();
      toast({ title: "PNG exported", description: `${canvas.width}×${canvas.height}px` });
    } catch { toast({ title: "Export failed", variant: "destructive" }); }
    finally { setExporting(false); }
  }, [title, resolution, figBg, getExportElement, toast]);

  const downloadPDF = useCallback(async () => {
    const exportEl = getExportElement();
    if (!exportEl) return;
    setExporting(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { jsPDF } = await import("jspdf");
      const scale = parseInt(resolution.replace("x", ""));
      const bg = figBg === "transparent" ? "#ffffff" : figBg;
      exportEl.style.background = bg; exportEl.style.padding = "32px"; exportEl.style.borderRadius = "0";
      const canvas = await html2canvas(exportEl, { scale, backgroundColor: bg, useCORS: true, logging: false });
      exportEl.style.background = ""; exportEl.style.padding = ""; exportEl.style.borderRadius = "";
      const imgData = canvas.toDataURL("image/png", 1.0);
      const isLandscape = canvas.width > canvas.height * 1.2;
      const pdf = new jsPDF({ orientation: isLandscape ? "landscape" : "portrait", unit: "pt", format: "a4" });
      const pw = pdf.internal.pageSize.getWidth(); const ph = pdf.internal.pageSize.getHeight();
      const margin = 40; const maxW = pw - margin * 2; const maxH = ph - margin * 2;
      const ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
      const w = canvas.width * ratio; const h = canvas.height * ratio;
      pdf.addImage(imgData, "PNG", (pw - w) / 2, (ph - h) / 2, w, h);
      pdf.save(`${title || "figure"}.pdf`);
      toast({ title: "PDF exported" });
    } catch { toast({ title: "PDF export failed", variant: "destructive" }); }
    finally { setExporting(false); }
  }, [title, resolution, figBg, getExportElement, toast]);

  const downloadDOCX = useCallback(async () => {
    const exportEl = getExportElement();
    if (!exportEl) return;
    setExporting(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const docx = await import("docx");
      const scale = parseInt(resolution.replace("x", ""));
      const bg = figBg === "transparent" ? "#ffffff" : figBg;
      exportEl.style.background = bg; exportEl.style.padding = "32px"; exportEl.style.borderRadius = "0";
      const canvas = await html2canvas(exportEl, { scale, backgroundColor: bg, useCORS: true, logging: false });
      exportEl.style.background = ""; exportEl.style.padding = ""; exportEl.style.borderRadius = "";
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png", 1.0));
      const arrayBuffer = await blob.arrayBuffer();
      const imgWidth = 600; const imgHeight = Math.round((canvas.height / canvas.width) * imgWidth);
      const fontName = getFontCSS().split(",")[0].replace(/'/g, "").trim();
      const doc = new docx.Document({ sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } }, children: [
        ...(title ? [new docx.Paragraph({ children: [new docx.TextRun({ text: `Figure ${figureNumber}`, bold: true, font: fontName, size: 24 })], spacing: { after: 120 } })] : []),
        new docx.Paragraph({ children: [new docx.ImageRun({ data: arrayBuffer, transformation: { width: imgWidth, height: imgHeight }, type: "png" })], spacing: { after: 120 } }),
        ...(caption ? [new docx.Paragraph({ children: [new docx.TextRun({ text: `Figure ${figureNumber}. `, bold: true, italics: formatPreset === "apa", font: fontName, size: 20 }), new docx.TextRun({ text: caption, italics: formatPreset === "apa", font: fontName, size: 20 })], spacing: { before: 120 } })] : []),
      ] }] });
      const docBlob = await docx.Packer.toBlob(doc);
      const url = URL.createObjectURL(docBlob);
      const a = document.createElement("a"); a.href = url; a.download = `${title || "figure"}.docx`; a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Word document exported" });
    } catch { toast({ title: "DOCX export failed", variant: "destructive" }); }
    finally { setExporting(false); }
  }, [title, caption, figureNumber, resolution, formatPreset, figBg, getExportElement, getFontCSS, toast]);

  const downloadSVG = useCallback(() => {
    const container = chartContainerRef.current;
    if (!container) return;
    const svg = container.querySelector("[data-export-area] svg");
    if (!svg) { toast({ title: "No SVG found", description: "SVG export works for recharts-based chart types", variant: "destructive" }); return; }
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(clone);
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${title || "figure"}.svg`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "SVG exported" });
  }, [title, toast]);

  const copyToClipboard = useCallback(async () => {
    const exportEl = getExportElement();
    if (!exportEl) return;
    setExporting(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const bg = figBg === "transparent" ? "#ffffff" : figBg;
      exportEl.style.background = bg; exportEl.style.padding = "24px"; exportEl.style.borderRadius = "0";
      const canvas = await html2canvas(exportEl, { scale: 2, backgroundColor: bg, useCORS: true, logging: false });
      exportEl.style.background = ""; exportEl.style.padding = ""; exportEl.style.borderRadius = "";
      canvas.toBlob(async (blob) => {
        if (!blob) { toast({ title: "Copy failed", variant: "destructive" }); return; }
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          toast({ title: "Copied to clipboard", description: "Figure copied as PNG" });
        } catch { toast({ title: "Copy failed", description: "Use PNG export instead", variant: "destructive" }); }
      });
    } catch { toast({ title: "Copy failed", variant: "destructive" }); }
    finally { setExporting(false); }
  }, [figBg, getExportElement, toast]);

  const downloadCode = useCallback(() => {
    const code = codeLang === "python"
      ? generatePythonCode(chartData, chartType, colors, title, xLabel, yLabel, caption, figureNumber)
      : generateRCode(chartData, chartType, colors, title, xLabel, yLabel, caption, figureNumber);
    const ext = codeLang === "python" ? "py" : "R";
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `figure_${figureNumber}.${ext}`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: `${codeLang === "python" ? "Python" : "R"} code exported`, description: `figure_${figureNumber}.${ext}` });
  }, [chartData, chartType, colors, title, xLabel, yLabel, caption, figureNumber, codeLang, toast]);

  const getRefLineValue = useCallback((): number | null => {
    if (!showRefLine || chartData.length === 0) return null;
    if (refLineType === "custom") return parseFloat(refLineCustom) || null;
    const vals = chartData.map(d => d.value);
    if (refLineType === "mean") return vals.reduce((a, b) => a + b, 0) / vals.length;
    const sorted = [...vals].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }, [showRefLine, refLineType, refLineCustom, chartData]);

  const currentTypeInfo = CHART_TYPES.find(t => t.type === chartType) || CHART_TYPES[0];
  const CurrentIcon = currentTypeInfo.icon;
  const totalValue = chartData.reduce((sum, d) => sum + d.value, 0);
  const isPresentation = formatPreset === "presentation" || formatPreset === "poster";
  const tickFontSize = isPresentation ? 13 : 10;
  const labelFontSize = isPresentation ? 14 : 11;
  const xAxisHeight = xLabel ? 110 : 100;
  const refVal = getRefLineValue();

  const xAxisLabel = xLabel ? (<Label value={xLabel} position="insideBottom" offset={-5} style={{ fontSize: labelFontSize, fontWeight: 600, fill: "#6b7280", fontFamily: getFontCSS() }} />) : undefined;
  const yAxisLabel = yLabel ? (<Label value={yLabel} angle={-90} position="insideLeft" offset={10} style={{ fontSize: labelFontSize, fontWeight: 600, fill: "#6b7280", textAnchor: "middle", fontFamily: getFontCSS() }} />) : undefined;

  const formatSingleLabel = (val: number) => {
    if (labelMode === "none") return "";
    const pct = totalValue > 0 ? ((val / totalValue) * 100).toFixed(1) + "%" : "0%";
    if (labelMode === "values") return String(val);
    if (labelMode === "percentages") return pct;
    return `${val} (${pct})`;
  };

  const renderCustomBarLabel = (props: any) => {
    if (labelMode === "none") return null;
    const { x, y, width, height, value, index } = props;
    const fs = isPresentation ? 11 : 8;
    if (chartType === "barHorizontal") {
      if (labelMode === "both") return (
        <g>
          <text x={x + width / 2} y={y + height / 2} dy={4} textAnchor="middle" fontSize={fs} fill="#ffffff" fontWeight={700} fontFamily={getFontCSS()}>{value}</text>
          <text x={x + width + 4} y={y + height / 2} dy={4} fontSize={fs} fill="#6b7280" fontFamily={getFontCSS()}>{totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) + "%" : ""}</text>
        </g>
      );
      return <text x={x + width + 4} y={y + height / 2} dy={4} fontSize={fs + 1} fill="#6b7280" fontFamily={getFontCSS()}>{formatSingleLabel(value)}</text>;
    }
    if (labelMode === "both") return (
      <g>
        <text x={x + width / 2} y={y + height / 2} dy={4} textAnchor="middle" fontSize={fs} fill="#ffffff" fontWeight={700} fontFamily={getFontCSS()}>{value}</text>
        <text x={x + width / 2} y={y - 5} textAnchor="middle" fontSize={fs} fill="#6b7280" fontFamily={getFontCSS()}>{totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) + "%" : ""}</text>
      </g>
    );
    return <text x={x + width / 2} y={y - 5} textAnchor="middle" fontSize={fs + 1} fill="#6b7280" fontFamily={getFontCSS()}>{formatSingleLabel(value)}</text>;
  };

  const pieLabel = labelMode === "none" ? false : ({ label, value, percent }: any) => {
    if (labelMode === "values") return `${label}: ${value}`;
    if (labelMode === "percentages") return `${label} (${(percent * 100).toFixed(1)}%)`;
    return `${label}: ${value} (${(percent * 100).toFixed(1)}%)`;
  };

  const getChartHeight = () => {
    if (aspectRatio === "square") return 450;
    if (aspectRatio === "wide") return 337;
    if (aspectRatio === "narrow") return 550;
    if (aspectRatio === "double") return 380;
    return chartType === "barHorizontal" ? Math.max(250, chartData.length * 32 + 60)
      : ["pie", "donut", "halfDonut", "radar"].includes(chartType) ? 380
      : chartType === "funnel" ? Math.max(300, chartData.length * 40 + 60)
      : chartType === "treemap" ? 380
      : isPresentation ? 400 : 340;
  };

  const gridProps = showGrid
    ? { strokeDasharray: "3 3", strokeOpacity: gridOpacity }
    : { strokeDasharray: "0 0", strokeOpacity: 0 };

  const renderBoxPlot = () => {
    if (boxData.length === 0) return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm text-center p-4">
        <div>
          <AlignJustify className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Paste box plot data:<br />
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded mt-1 inline-block">Label, Min, Q1, Median, Q3, Max</code>
        </div>
      </div>
    );
    const allVals = boxData.flatMap(d => [d.min, d.max]);
    const minY = Math.min(...allVals); const maxY = Math.max(...allVals);
    const range = maxY - minY || 1;
    const PAD = { t: 30, r: 30, b: 50, l: 55 };
    const W = 560; const H = 320;
    const pw = W - PAD.l - PAD.r; const ph = H - PAD.t - PAD.b;
    const sy = (v: number) => PAD.t + ph - ((v - minY) / range) * ph;
    const bw = Math.min(44, pw / (boxData.length * 2));
    const yTicks = 5;
    return (
      <div className="overflow-x-auto">
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ fontFamily: getFontCSS() }}>
          {Array.from({ length: yTicks }, (_, i) => {
            const v = minY + (range / (yTicks - 1)) * i;
            const ys = sy(v);
            return (
              <g key={i}>
                {showGrid && <line x1={PAD.l} y1={ys} x2={PAD.l + pw} y2={ys} stroke="#ccc" strokeWidth={0.5} strokeDasharray="3 3" />}
                <text x={PAD.l - 6} y={ys} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="#888">{v.toFixed(1)}</text>
              </g>
            );
          })}
          <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + ph} stroke="#999" strokeWidth={1} />
          <line x1={PAD.l} y1={PAD.t + ph} x2={PAD.l + pw} y2={PAD.t + ph} stroke="#999" strokeWidth={1} />
          {boxData.map((d, i) => {
            const cx = PAD.l + (i + 0.5) * (pw / boxData.length);
            const yMin = sy(d.min); const yMax = sy(d.max);
            const yQ1 = sy(d.q1); const yQ3 = sy(d.q3); const yMed = sy(d.median);
            const col = colors[i % colors.length];
            return (
              <g key={i}>
                <line x1={cx} y1={yMax} x2={cx} y2={yMin} stroke={col} strokeWidth={1.5} strokeDasharray="3 2" />
                <line x1={cx - bw * 0.3} y1={yMin} x2={cx + bw * 0.3} y2={yMin} stroke={col} strokeWidth={2} />
                <line x1={cx - bw * 0.3} y1={yMax} x2={cx + bw * 0.3} y2={yMax} stroke={col} strokeWidth={2} />
                <rect x={cx - bw / 2} y={yQ3} width={bw} height={Math.abs(yQ1 - yQ3)} fill={col} fillOpacity={0.25} stroke={col} strokeWidth={1.5} rx={2} />
                <line x1={cx - bw / 2} y1={yMed} x2={cx + bw / 2} y2={yMed} stroke={col} strokeWidth={2.5} />
                <text x={cx} y={PAD.t + ph + 14} textAnchor="middle" fontSize={10} fill="#666">{d.label}</text>
              </g>
            );
          })}
          {refVal !== null && (
            <g>
              <line x1={PAD.l} y1={sy(refVal)} x2={PAD.l + pw} y2={sy(refVal)} stroke={refLineColor} strokeWidth={1.5} strokeDasharray="5 3" />
              <text x={PAD.l + pw + 2} y={sy(refVal)} fontSize={9} fill={refLineColor} dominantBaseline="middle">{refLineLabel}</text>
            </g>
          )}
        </svg>
      </div>
    );
  };

  const renderHeatmap = () => {
    if (heatData.length === 0) return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm text-center p-4">
        <div>
          <Grid3x3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Paste matrix data — first row is column headers, first column is row names.
        </div>
      </div>
    );
    const rows = [...new Set(heatData.map(d => d.row))];
    const cols = [...new Set(heatData.map(d => d.col))];
    const vals = heatData.map(d => d.value);
    const minV = Math.min(...vals); const maxV = Math.max(...vals);
    const low = colors[colors.length - 1] || "#f0f9ff"; const high = colors[0] || "#0369a1";
    return (
      <div className="overflow-auto max-h-96">
        <table style={{ borderCollapse: "collapse", fontSize: 11, fontFamily: getFontCSS() }}>
          <thead>
            <tr>
              <th className="p-2 text-right text-muted-foreground text-xs font-normal"></th>
              {cols.map(col => <th key={col} className="p-2 text-center text-xs font-semibold" style={{ whiteSpace: "nowrap" }}>{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row}>
                <td className="p-2 pr-3 text-right text-xs font-semibold" style={{ whiteSpace: "nowrap" }}>{row}</td>
                {cols.map(col => {
                  const cell = heatData.find(d => d.row === row && d.col === col);
                  const t = cell && maxV > minV ? (cell.value - minV) / (maxV - minV) : 0;
                  const bg = cell ? interpolateColor(low, high, t) : "#f5f5f5";
                  const textColor = t > 0.55 ? "#ffffff" : "#111111";
                  return (
                    <td key={col} className="p-2 text-center text-xs" style={{ backgroundColor: bg, color: textColor, minWidth: 56, border: "1px solid rgba(255,255,255,0.3)" }}>
                      {cell ? cell.value : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderWordBubble = () => {
    if (chartData.length === 0) return null;
    const maxV = Math.max(...chartData.map(d => d.value));
    const minV = Math.min(...chartData.map(d => d.value));
    const getSize = (v: number) => Math.round(14 + ((maxV > minV ? (v - minV) / (maxV - minV) : 0.5)) * 56);
    return (
      <div className="flex flex-wrap gap-2.5 items-center justify-center p-6 min-h-[220px]">
        {[...chartData].sort((a, b) => b.value - a.value).map((d, i) => {
          const sz = getSize(d.value);
          const pad = Math.round(sz * 0.45);
          return (
            <div key={i} className="flex flex-col items-center gap-1 cursor-default select-none transition-transform hover:scale-105" style={{ maxWidth: 150 }}>
              <div className="rounded-full flex items-center justify-center font-semibold text-white text-center leading-tight" style={{
                backgroundColor: colors[i % colors.length],
                minWidth: sz * 1.9, minHeight: sz * 1.9,
                paddingLeft: pad, paddingRight: pad,
                paddingTop: Math.round(pad * 0.5), paddingBottom: Math.round(pad * 0.5),
                fontSize: sz * 0.52,
                fontFamily: getFontCSS(),
                boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
              }}>
                {d.label}
              </div>
              {labelMode !== "none" && (
                <span className="text-[10px] text-muted-foreground font-medium" style={{ fontFamily: getFontCSS() }}>
                  {labelMode === "percentages" ? (totalValue > 0 ? ((d.value / totalValue) * 100).toFixed(1) + "%" : "") : d.value}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderChart = () => {
    if (isSpecialRender(chartType)) {
      if (chartType === "boxPlot") return renderBoxPlot();
      if (chartType === "heatmap") return renderHeatmap();
      if (chartType === "wordBubble") return renderWordBubble();
      return null;
    }

    const activeData = chartData.length > 0 ? chartData : null;
    if (!activeData && !multiData.length) return null;

    const height = getChartHeight();

    if (chartType === "groupedBar") {
      if (multiData.length === 0) return (
        <div className="flex items-center justify-center h-56 text-muted-foreground text-sm text-center p-4">
          <div><Columns className="w-8 h-8 mx-auto mb-2 opacity-30" />Paste multi-column data for grouped bar:<br />
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded mt-1 inline-block">Category↹Series1↹Series2↹Series3</code>
          </div>
        </div>
      );
      return (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={multiData} margin={{ bottom: xLabel ? 20 : 5 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" angle={-45} textAnchor="end" height={xAxisHeight} interval={0} tick={{ fontSize: tickFontSize, fontFamily: getFontCSS() }}>{xAxisLabel}</XAxis>
              <YAxis tick={{ fontSize: tickFontSize, fontFamily: getFontCSS() }}>{yAxisLabel}</YAxis>
              <Tooltip contentStyle={{ ...TOOLTIP_STYLE, fontFamily: getFontCSS() }} />
              {showLegend && <Legend wrapperStyle={{ fontFamily: getFontCSS(), fontSize: tickFontSize }} />}
              {seriesNames.map((name, i) => (
                <Bar key={name} dataKey={name} fill={colors[i % colors.length]} radius={[barRadius, barRadius, 0, 0]} />
              ))}
              {refVal !== null && <ReferenceLine y={refVal} stroke={refLineColor} strokeDasharray="4 4" label={{ value: refLineLabel, fill: refLineColor, fontSize: 10, fontFamily: getFontCSS() }} />}
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (!activeData) return null;

    return (
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {(() => {
            switch (chartType) {
              case "bar":
                return (
                  <BarChart data={activeData} margin={{ bottom: xLabel ? 20 : 5 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="label" angle={-45} textAnchor="end" height={xAxisHeight} interval={0} tick={{ fontSize: tickFontSize, fontFamily: getFontCSS() }}>{xAxisLabel}</XAxis>
                    <YAxis tick={{ fontSize: tickFontSize, fontFamily: getFontCSS() }}>{yAxisLabel}</YAxis>
                    <Tooltip contentStyle={{ ...TOOLTIP_STYLE, fontFamily: getFontCSS() }} />
                    {showLegend && <Legend wrapperStyle={{ fontFamily: getFontCSS(), fontSize: tickFontSize }} />}
                    <Bar dataKey="value" radius={[barRadius, barRadius, 0, 0]} label={labelMode !== "none" ? renderCustomBarLabel : false}>
                      {activeData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                    </Bar>
                    {refVal !== null && <ReferenceLine y={refVal} stroke={refLineColor} strokeDasharray="4 4" label={{ value: refLineLabel, fill: refLineColor, fontSize: 10, fontFamily: getFontCSS() }} />}
                  </BarChart>
                );
              case "barHorizontal":
                return (
                  <BarChart data={activeData} layout="vertical" margin={{ bottom: xLabel ? 20 : 5, right: labelMode !== "none" ? 60 : 5 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis type="number" tick={{ fontSize: tickFontSize, fontFamily: getFontCSS() }}>{yLabel ? <Label value={yLabel} position="insideBottom" offset={-5} style={{ fontSize: labelFontSize, fontWeight: 600, fill: "#6b7280", fontFamily: getFontCSS() }} /> : undefined}</XAxis>
                    <YAxis dataKey="label" type="category" width={140} tick={{ fontSize: tickFontSize, fontFamily: getFontCSS() }}>{xLabel ? <Label value={xLabel} angle={-90} position="insideLeft" offset={15} style={{ fontSize: labelFontSize, fontWeight: 600, fill: "#6b7280", textAnchor: "middle", fontFamily: getFontCSS() }} /> : undefined}</YAxis>
                    <Tooltip contentStyle={{ ...TOOLTIP_STYLE, fontFamily: getFontCSS() }} />
                    {showLegend && <Legend wrapperStyle={{ fontFamily: getFontCSS(), fontSize: tickFontSize }} />}
                    <Bar dataKey="value" radius={[0, barRadius, barRadius, 0]} label={labelMode !== "none" ? renderCustomBarLabel : false}>
                      {activeData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                    </Bar>
                    {refVal !== null && <ReferenceLine x={refVal} stroke={refLineColor} strokeDasharray="4 4" label={{ value: refLineLabel, fill: refLineColor, fontSize: 10, fontFamily: getFontCSS() }} />}
                  </BarChart>
                );
              case "stackedBar": {
                const stackedData = [activeData.reduce((acc, d) => ({ ...acc, [d.label]: d.value }), { name: "Total" } as Record<string, any>)];
                return (
                  <BarChart data={stackedData} margin={{ bottom: xLabel ? 20 : 5 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="name" tick={{ fontSize: tickFontSize, fontFamily: getFontCSS() }} />
                    <YAxis tick={{ fontSize: tickFontSize, fontFamily: getFontCSS() }}>{yAxisLabel}</YAxis>
                    <Tooltip contentStyle={{ ...TOOLTIP_STYLE, fontFamily: getFontCSS() }} formatter={(value: number, name: string) => [`${value} (${(totalValue > 0 ? (value / totalValue) * 100 : 0).toFixed(1)}%)`, name]} />
                    {showLegend && <Legend wrapperStyle={{ fontFamily: getFontCSS(), fontSize: tickFontSize }} />}
                    {activeData.map((d, i) => (
                      <Bar key={d.label} dataKey={d.label} stackId="stack" fill={colors[i % colors.length]} radius={i === activeData.length - 1 ? [barRadius, barRadius, 0, 0] : [0, 0, 0, 0]} />
                    ))}
                  </BarChart>
                );
              }
              case "lollipop": {
                const LollipopDot = (props: any) => {
                  if (!props || props.x === undefined) return null;
                  const { x, y, width, index } = props;
                  const cx = x + (width || 2) / 2;
                  return <circle cx={cx} cy={y} r={7} fill={colors[(index || 0) % colors.length]} stroke="#fff" strokeWidth={1.5} />;
                };
                return (
                  <BarChart data={activeData} margin={{ bottom: xLabel ? 20 : 5 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="label" angle={-45} textAnchor="end" height={xAxisHeight} interval={0} tick={{ fontSize: tickFontSize, fontFamily: getFontCSS() }}>{xAxisLabel}</XAxis>
                    <YAxis tick={{ fontSize: tickFontSize, fontFamily: getFontCSS() }}>{yAxisLabel}</YAxis>
                    <Tooltip contentStyle={{ ...TOOLTIP_STYLE, fontFamily: getFontCSS() }} />
                    <Bar dataKey="value" barSize={2} radius={0} fill={colors[0]} label={<LollipopDot />}>
                      {activeData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                    </Bar>
                    {refVal !== null && <ReferenceLine y={refVal} stroke={refLineColor} strokeDasharray="4 4" label={{ value: refLineLabel, fill: refLineColor, fontSize: 10, fontFamily: getFontCSS() }} />}
                  </BarChart>
                );
              }
              case "errorBar": {
                const errData = activeData.map(d => ({ ...d, errorVals: [d.value * (errorPct / 100), d.value * (errorPct / 100)] }));
                return (
                  <BarChart data={errData} margin={{ bottom: xLabel ? 20 : 5 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="label" angle={-45} textAnchor="end" height={xAxisHeight} interval={0} tick={{ fontSize: tickFontSize, fontFamily: getFontCSS() }}>{xAxisLabel}</XAxis>
                    <YAxis tick={{ fontSize: tickFontSize, fontFamily: getFontCSS() }}>{yAxisLabel}</YAxis>
                    <Tooltip contentStyle={{ ...TOOLTIP_STYLE, fontFamily: getFontCSS() }} />
                    {showLegend && <Legend wrapperStyle={{ fontFamily: getFontCSS(), fontSize: tickFontSize }} />}
                    <Bar dataKey="value" radius={[barRadius, barRadius, 0, 0]}>
                      {errData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                      <ErrorBar dataKey="errorVals" width={4} strokeWidth={1.5} stroke="#444" />
                    </Bar>
                    {refVal !== null && <ReferenceLine y={refVal} stroke={refLineColor} strokeDasharray="4 4" label={{ value: refLineLabel, fill: refLineColor, fontSize: 10, fontFamily: getFontCSS() }} />}
                  </BarChart>
                );
              }
              case "line":
                return (
                  <LineChart data={activeData} margin={{ bottom: xLabel ? 20 : 5 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="label" angle={-45} textAnchor="end" height={xAxisHeight} interval={0} tick={{ fontSize: tickFontSize, fontFamily: getFontCSS() }}>{xAxisLabel}</XAxis>
                    <YAxis tick={{ fontSize: tickFontSize, fontFamily: getFontCSS() }}>{yAxisLabel}</YAxis>
                    <Tooltip contentStyle={{ ...TOOLTIP_STYLE, fontFamily: getFontCSS() }} />
                    {showLegend && <Legend wrapperStyle={{ fontFamily: getFontCSS(), fontSize: tickFontSize }} />}
                    <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={lineThickness} dot={{ fill: colors[0], r: isPresentation ? 5 : 4 }} activeDot={{ r: 6, fill: colors[1] || colors[0] }}
                      label={labelMode !== "none" ? ({ x, y, value }: any) => <text x={x} y={y - 10} textAnchor="middle" fontSize={isPresentation ? 11 : 9} fill="#6b7280" fontFamily={getFontCSS()}>{formatSingleLabel(value)}</text> : false}
                    />
                    {refVal !== null && <ReferenceLine y={refVal} stroke={refLineColor} strokeDasharray="4 4" label={{ value: refLineLabel, fill: refLineColor, fontSize: 10, fontFamily: getFontCSS() }} />}
                  </LineChart>
                );
              case "area":
                return (
                  <AreaChart data={activeData} margin={{ bottom: xLabel ? 20 : 5 }}>
                    <defs>
                      <linearGradient id="fmAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors[0]} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={colors[0]} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="label" angle={-45} textAnchor="end" height={xAxisHeight} interval={0} tick={{ fontSize: tickFontSize, fontFamily: getFontCSS() }}>{xAxisLabel}</XAxis>
                    <YAxis tick={{ fontSize: tickFontSize, fontFamily: getFontCSS() }}>{yAxisLabel}</YAxis>
                    <Tooltip contentStyle={{ ...TOOLTIP_STYLE, fontFamily: getFontCSS() }} />
                    {showLegend && <Legend wrapperStyle={{ fontFamily: getFontCSS(), fontSize: tickFontSize }} />}
                    <Area type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={lineThickness} fill="url(#fmAreaGrad)"
                      label={labelMode !== "none" ? ({ x, y, value }: any) => <text x={x} y={y - 10} textAnchor="middle" fontSize={isPresentation ? 11 : 9} fill="#6b7280" fontFamily={getFontCSS()}>{formatSingleLabel(value)}</text> : false}
                    />
                    {refVal !== null && <ReferenceLine y={refVal} stroke={refLineColor} strokeDasharray="4 4" label={{ value: refLineLabel, fill: refLineColor, fontSize: 10, fontFamily: getFontCSS() }} />}
                  </AreaChart>
                );
              case "pie":
              case "donut":
                return (
                  <PieChart>
                    <Pie data={activeData} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={chartType === "donut" ? 120 : 130} innerRadius={chartType === "donut" ? 60 : 0} paddingAngle={2} label={pieLabel} labelLine={labelMode !== "none" ? { strokeWidth: 1 } : false}>
                      {activeData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ ...TOOLTIP_STYLE, fontFamily: getFontCSS() }} />
                    {showLegend && <Legend wrapperStyle={{ fontFamily: getFontCSS(), fontSize: tickFontSize }} />}
                  </PieChart>
                );
              case "halfDonut":
                return (
                  <PieChart>
                    <Pie data={activeData} dataKey="value" nameKey="label" cx="50%" cy="70%" startAngle={180} endAngle={0} outerRadius={140} innerRadius={70} paddingAngle={2} label={pieLabel} labelLine={labelMode !== "none" ? { strokeWidth: 1 } : false}>
                      {activeData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ ...TOOLTIP_STYLE, fontFamily: getFontCSS() }} />
                    {showLegend && <Legend wrapperStyle={{ fontFamily: getFontCSS(), fontSize: tickFontSize }} />}
                  </PieChart>
                );
              case "radar":
                return (
                  <RadarChart data={activeData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid strokeDasharray="3 3" strokeOpacity={showGrid ? 0.3 : 0} />
                    <PolarAngleAxis dataKey="label" tick={{ fontSize: tickFontSize, fontFamily: getFontCSS() }} />
                    <PolarRadiusAxis tick={{ fontSize: tickFontSize - 1 }} />
                    <Tooltip contentStyle={{ ...TOOLTIP_STYLE, fontFamily: getFontCSS() }} />
                    {showLegend && <Legend wrapperStyle={{ fontFamily: getFontCSS(), fontSize: tickFontSize }} />}
                    <Radar dataKey="value" stroke={colors[0]} fill={colors[0]} fillOpacity={0.3} strokeWidth={lineThickness} />
                  </RadarChart>
                );
              case "scatter":
                return (
                  <ScatterChart margin={{ bottom: xLabel ? 20 : 5 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="label" name="Item" angle={-45} textAnchor="end" height={xAxisHeight} interval={0} tick={{ fontSize: tickFontSize, fontFamily: getFontCSS() }}>{xAxisLabel}</XAxis>
                    <YAxis dataKey="value" name="Value" tick={{ fontSize: tickFontSize, fontFamily: getFontCSS() }}>{yAxisLabel}</YAxis>
                    <ZAxis range={[60, 300]} />
                    <Tooltip contentStyle={{ ...TOOLTIP_STYLE, fontFamily: getFontCSS() }} cursor={{ strokeDasharray: "3 3" }} />
                    {showLegend && <Legend wrapperStyle={{ fontFamily: getFontCSS(), fontSize: tickFontSize }} />}
                    <Scatter data={activeData} fill={colors[0]}>
                      {activeData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                    </Scatter>
                    {refVal !== null && <ReferenceLine y={refVal} stroke={refLineColor} strokeDasharray="4 4" />}
                  </ScatterChart>
                );
              case "funnel": {
                const sortedData = [...activeData].sort((a, b) => b.value - a.value).map((d, i) => ({ ...d, fill: colors[i % colors.length] }));
                return (
                  <FunnelChart>
                    <Tooltip contentStyle={{ ...TOOLTIP_STYLE, fontFamily: getFontCSS() }} />
                    {showLegend && <Legend wrapperStyle={{ fontFamily: getFontCSS(), fontSize: tickFontSize }} />}
                    <Funnel dataKey="value" nameKey="label" data={sortedData} isAnimationActive>
                      <LabelList position="right" fill="#6b7280" stroke="none" dataKey="label" fontSize={tickFontSize} fontFamily={getFontCSS()} />
                      <LabelList position="center" fill="#fff" stroke="none" dataKey="value" fontSize={tickFontSize} fontFamily={getFontCSS()} fontWeight={600} />
                    </Funnel>
                  </FunnelChart>
                );
              }
              case "treemap": {
                const treemapData = activeData.map((d, i) => ({ name: d.label, size: d.value, fill: colors[i % colors.length] }));
                const TC = ({ x, y, width, height, name, size, fill }: any) => {
                  if (width < 30 || height < 20) return null;
                  return (
                    <g>
                      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#fff" strokeWidth={2} rx={4} />
                      {width > 50 && height > 30 && (
                        <>
                          <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle" fill="#fff" fontSize={tickFontSize} fontFamily={getFontCSS()} fontWeight={600}>{name}</text>
                          <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={tickFontSize - 1} fontFamily={getFontCSS()}>{size}</text>
                        </>
                      )}
                    </g>
                  );
                };
                return (
                  <Treemap data={treemapData} dataKey="size" nameKey="name" aspectRatio={4 / 3} stroke="#fff" content={<TC />}>
                    <Tooltip contentStyle={{ ...TOOLTIP_STYLE, fontFamily: getFontCSS() }} />
                  </Treemap>
                );
              }
              default:
                return (
                  <BarChart data={activeData}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="label" angle={-45} textAnchor="end" height={100} interval={0} tick={{ fontSize: tickFontSize }} />
                    <YAxis tick={{ fontSize: tickFontSize }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="value" radius={[barRadius, barRadius, 0, 0]}>
                      {activeData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                    </Bar>
                  </BarChart>
                );
            }
          })()}
        </ResponsiveContainer>
      </div>
    );
  };

  const getCaptionFormatted = () => {
    if (!caption) return null;
    const prefix = `Figure ${figureNumber}. `;
    switch (formatPreset) {
      case "apa": return <p className="text-sm mt-3 italic" style={{ fontFamily: getFontCSS() }}><span className="font-bold not-italic">{prefix}</span>{caption}</p>;
      case "ieee": return <p className="text-xs mt-2 text-center" style={{ fontFamily: getFontCSS() }}><span className="font-bold">Fig. {figureNumber}.</span> {caption}</p>;
      case "chicago": return <p className="text-sm mt-3" style={{ fontFamily: getFontCSS() }}><span className="font-semibold">{prefix}</span>{caption}</p>;
      case "nature": return <p className="text-xs mt-2" style={{ fontFamily: getFontCSS() }}><span className="font-bold">{prefix}</span>{caption}</p>;
      case "thesis": return <p className="text-sm mt-3" style={{ fontFamily: getFontCSS() }}><span className="font-bold">{prefix}</span><span className="italic">{caption}</span></p>;
      default: return <p className="text-xs text-muted-foreground mt-2" style={{ fontFamily: getFontCSS() }}><span className="font-semibold text-foreground">{prefix}</span>{caption}</p>;
    }
  };

  const hasData = chartData.length > 0 || multiData.length > 0 || boxData.length > 0 || heatData.length > 0;

  const togglePanel = useCallback((panel: string) => {
    setOpenPanel(prev => prev === panel ? null : panel);
  }, []);

  const chartGroups = ["Basic", "Circular", "Distribution", "Matrix", "Other"];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex items-center gap-4 mb-2">
        <div className="page-header-icon bg-gradient-to-br from-rose-500 to-pink-600">
          <Image className="w-5 h-5 text-white relative z-10" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold italic tracking-tight text-rose-600 dark:text-rose-400" style={{ fontFamily: "'Playfair Display', serif" }} data-testid="text-page-title">Figure Maker</h1>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5 font-medium tracking-wide">Create publication-ready charts & figures</p>
        </div>
      </motion.div>

      <motion.div className="polished-card overflow-hidden" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}>
        <div className="h-1 bg-gradient-to-r from-rose-500 via-pink-400 to-rose-500" />
        <div className="p-6 md:p-7">
          <motion.div className="flex items-center gap-3 mb-5" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-md" style={{ boxShadow: "0 4px 12px -2px rgba(244,63,94,0.3)" }}>
              <LayoutGrid className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold tracking-tight text-rose-600 dark:text-rose-400" style={{ fontFamily: "'Playfair Display', serif" }}>Input Your Data</h3>
          </motion.div>

          {chartType === "groupedBar" && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 text-[11px] text-blue-700 dark:text-blue-300 font-medium">
              Grouped Bar mode: paste tab-separated data with a header row (first column = group labels, remaining columns = series names).
            </div>
          )}
          {chartType === "boxPlot" && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 text-[11px] text-amber-700 dark:text-amber-300 font-medium">
              Box Plot mode: paste data as columns — <code>Label, Min, Q1, Median, Q3, Max</code>
            </div>
          )}
          {chartType === "heatmap" && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
              Heatmap mode: paste a matrix — first row = column headers, first column = row labels.
            </div>
          )}

          <Tabs value={dataInputMode} onValueChange={(v) => setDataInputMode(v as "paste" | "upload")} className="space-y-4">
            <TabsList data-testid="tabs-data-input">
              <TabsTrigger value="paste" className="gap-1.5" data-testid="tab-paste"><ClipboardPaste className="w-3.5 h-3.5" />Paste / Type</TabsTrigger>
              <TabsTrigger value="upload" className="gap-1.5" data-testid="tab-upload"><Upload className="w-3.5 h-3.5" />Upload CSV</TabsTrigger>
            </TabsList>
            <TabsContent value="paste" className="space-y-3">
              <Textarea
                placeholder={"Paste your data in any format — AI will extract it automatically.\n\nExamples:\n• Arabic, 28\n• The study found 45% explicitation and 30% simplification\n• English has 5000 words, French has 3200\n• Any table, paragraph, or list with numbers\n\nFor grouped bar: paste a table with column headers\nFor heatmap: paste a matrix (rows × columns)"}
                value={pasteData} onChange={(e) => setPasteData(e.target.value)}
                className="min-h-[140px] font-mono text-xs resize-y border-rose-200 dark:border-rose-800/30 focus-visible:ring-rose-400/40"
                data-testid="textarea-paste-data"
              />
              <div className="flex gap-2 flex-wrap items-center">
                <Button size="sm" onClick={parsePastedData} disabled={!pasteData.trim() || aiParseMutation.isPending}
                  className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white" data-testid="button-parse-data">
                  {aiParseMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                  {aiParseMutation.isPending ? "AI Parsing..." : "Load Data"}
                </Button>
                {aiParseMutation.isPending && <span className="text-[11px] text-muted-foreground animate-pulse">AI is extracting your data...</span>}
              </div>
            </TabsContent>
            <TabsContent value="upload" className="space-y-3">
              <div className="relative rounded-xl border-2 border-dashed border-rose-200 dark:border-rose-800/40 bg-rose-50/30 dark:bg-rose-950/10 p-6 text-center">
                <Upload className="w-8 h-8 text-rose-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-rose-600 dark:text-rose-400 mb-1">Upload a data file</p>
                <p className="text-[11px] text-muted-foreground mb-3">CSV, TSV, or text files — AI will extract the data automatically</p>
                <input type="file" accept=".csv,.tsv,.txt" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" data-testid="input-file-upload" />
                <Button size="sm" variant="outline" className="pointer-events-none"><Upload className="w-3.5 h-3.5 mr-1.5" />Choose File</Button>
              </div>
            </TabsContent>
          </Tabs>

          {hasData && (
            <motion.div className="mt-4 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/30 text-xs text-rose-600 dark:text-rose-400 font-medium" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
              {chartType === "groupedBar" && multiData.length > 0 ? `${multiData.length} groups, ${seriesNames.length} series loaded` :
                chartType === "boxPlot" && boxData.length > 0 ? `${boxData.length} box plot groups loaded` :
                  chartType === "heatmap" && heatData.length > 0 ? `${heatData.length} heatmap cells loaded` :
                    `${chartData.length} data points loaded`} — customize your figure below
            </motion.div>
          )}
        </div>
      </motion.div>

      {hasData && (
        <motion.div className="space-y-4" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="polished-card p-6" ref={chartContainerRef}>
            <div className="overflow-x-auto scrollbar-hide mb-2">
              <div className="flex items-center gap-1.5 min-w-max">
                {editingTitle ? (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chart title..." className="h-7 text-xs w-36" data-testid="input-chart-title" autoFocus onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)} />
                    <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => setEditingTitle(false)} data-testid="button-save-title"><Check className="w-3 h-3" /></Button>
                  </div>
                ) : (
                  <button onClick={() => setEditingTitle(true)} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors group flex-shrink-0 border rounded-md px-2 h-6" data-testid="button-edit-title">
                    <Type className="w-3 h-3" />
                    {title ? <span className="font-medium text-foreground">{title}</span> : <span className="italic">Title</span>}
                  </button>
                )}

                <div className="w-px h-4 bg-border flex-shrink-0" />

                <Button size="sm" variant={openPanel === "types" ? "default" : "outline"} className="h-6 text-[11px] px-2 gap-1 flex-shrink-0" onClick={() => togglePanel("types")} data-testid="button-toggle-chart-type">
                  <CurrentIcon className="w-3 h-3" />{currentTypeInfo.label}<ChevronDown className="w-2.5 h-2.5" />
                </Button>
                <Button size="sm" variant={openPanel === "palettes" ? "default" : "outline"} className="h-6 text-[11px] px-2 gap-1 flex-shrink-0" onClick={() => togglePanel("palettes")} data-testid="button-toggle-palette">
                  <Palette className="w-3 h-3" />Colors
                </Button>
                {hasAxes(chartType) && (
                  <Button size="sm" variant={openPanel === "axes" ? "default" : "outline"} className="h-6 text-[11px] px-2 gap-1 flex-shrink-0" onClick={() => togglePanel("axes")} data-testid="button-toggle-axes-inline">
                    <Type className="w-3 h-3" />Axes
                  </Button>
                )}
                <Button size="sm" variant={openPanel === "labels" ? "default" : "outline"} className="h-6 text-[11px] px-2 gap-1 flex-shrink-0" onClick={() => togglePanel("labels")} data-testid="button-toggle-labels">
                  <Tag className="w-3 h-3" />Labels
                </Button>
                <Button size="sm" variant={openPanel === "style" ? "default" : "outline"} className="h-6 text-[11px] px-2 gap-1 flex-shrink-0" onClick={() => togglePanel("style")} data-testid="button-toggle-style">
                  <Paintbrush2 className="w-3 h-3" />Style
                </Button>
                <Button size="sm" variant={openPanel === "annotate" ? "default" : "outline"} className="h-6 text-[11px] px-2 gap-1 flex-shrink-0" onClick={() => togglePanel("annotate")} data-testid="button-toggle-annotate">
                  <Minus className="w-3 h-3" />Annotate
                </Button>
                <Button size="sm" variant={openPanel === "edit" ? "default" : "outline"} className="h-6 text-[11px] px-2 gap-1 flex-shrink-0" onClick={() => togglePanel("edit")} data-testid="button-toggle-edit">
                  <Pencil className="w-3 h-3" />{openPanel === "edit" ? "Done" : "Edit"}
                </Button>

                <div className="w-px h-4 bg-border flex-shrink-0" />

                <Button size="icon" variant="ghost" className="w-6 h-6 flex-shrink-0" onClick={undo} disabled={historyPtr <= 0} title="Undo" data-testid="button-undo"><Undo2 className="w-3 h-3" /></Button>
                <Button size="icon" variant="ghost" className="w-6 h-6 flex-shrink-0" onClick={redo} disabled={historyPtr >= historyStack.length - 1} title="Redo" data-testid="button-redo"><Redo2 className="w-3 h-3" /></Button>

                <div className="w-px h-4 bg-border flex-shrink-0" />

                <Button size="sm" variant={openPanel === "templates" ? "default" : "outline"} className="h-6 text-[11px] px-2 gap-1 flex-shrink-0" onClick={() => togglePanel("templates")} data-testid="button-toggle-templates">
                  <BookOpen className="w-3 h-3" />Templates
                </Button>
                <Button size="sm" variant={openPanel === "ai" ? "default" : "outline"} className="h-6 text-[11px] px-2 gap-1 flex-shrink-0" onClick={() => togglePanel("ai")} data-testid="button-toggle-ai">
                  <Wand2 className="w-3 h-3" />AI
                </Button>

                <div className="w-px h-4 bg-border flex-shrink-0" />

                <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 gap-1 flex-shrink-0" onClick={downloadPNG} disabled={exporting} data-testid="button-export-png">
                  {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}PNG
                </Button>
                <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 gap-1 flex-shrink-0" onClick={downloadPDF} disabled={exporting} data-testid="button-export-pdf">
                  <FileText className="w-3 h-3" />PDF
                </Button>
                <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 gap-1 flex-shrink-0" onClick={downloadDOCX} disabled={exporting} data-testid="button-export-docx">
                  <FileText className="w-3 h-3" />Word
                </Button>
                <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 gap-1 flex-shrink-0" onClick={downloadSVG} data-testid="button-export-svg">
                  <BarChart2 className="w-3 h-3" />SVG
                </Button>
                <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 gap-1 flex-shrink-0" onClick={copyToClipboard} disabled={exporting} data-testid="button-copy-clipboard">
                  <Copy className="w-3 h-3" />Copy
                </Button>
                <Button size="sm" variant={openPanel === "code" ? "default" : "outline"} className="h-6 text-[11px] px-2 gap-1 flex-shrink-0" onClick={() => togglePanel("code")} data-testid="button-toggle-code">
                  <Code2 className="w-3 h-3" />Code
                </Button>
              </div>
            </div>

            <AnimatePresence>
              {openPanel === "types" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="p-2 rounded-lg border bg-muted/20 mb-2 space-y-2">
                    {chartGroups.map(group => {
                      const groupTypes = CHART_TYPES.filter(t => t.group === group);
                      return (
                        <div key={group}>
                          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">{group}</div>
                          <div className="flex flex-wrap gap-1">
                            {groupTypes.map(({ type, label, icon: Icon }) => (
                              <button key={type} onClick={() => { setChartType(type); setOpenPanel(null); }}
                                className={`flex items-center gap-1 px-2 py-1.5 rounded-md border text-[11px] font-medium transition-all ${chartType === type ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/50 hover:bg-background"}`}
                                data-testid={`button-chart-type-${type}`}>
                                <Icon className="w-3.5 h-3.5" />{label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {openPanel === "palettes" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border bg-muted/20 mb-2 max-h-52 overflow-auto">
                    {PRESET_PALETTES.map((palette) => (
                      <button key={palette.name} onClick={() => { setColors(palette.colors); setOpenPanel(null); }}
                        className="flex items-center gap-1 px-2 py-1 rounded-md border hover:border-primary/50 hover:bg-background transition-all text-[11px] font-medium"
                        data-testid={`button-palette-${palette.name.toLowerCase()}`}>
                        <div className="flex gap-px">
                          {palette.colors.slice(0, 5).map((c, ci) => <div key={ci} className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c }} />)}
                        </div>
                        {palette.name}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {openPanel === "labels" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="flex items-center gap-1 p-2 rounded-lg border bg-muted/20 mb-2 flex-wrap">
                    <span className="text-[11px] font-semibold text-muted-foreground mr-1">Show:</span>
                    {(["none", "values", "percentages", "both"] as LabelMode[]).map((mode) => (
                      <button key={mode} onClick={() => { setLabelMode(mode); setOpenPanel(null); }}
                        className={`px-2.5 py-1.5 rounded-md border text-[11px] font-medium transition-all capitalize ${labelMode === mode ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/50 hover:bg-background"}`}
                        data-testid={`button-label-mode-${mode}`}>
                        {mode === "both" ? "Values + %" : mode === "none" ? "None" : mode === "values" ? "Values" : "Percentages"}
                      </button>
                    ))}
                    <div className="w-px h-4 bg-border mx-1" />
                    <button onClick={() => setShowLegend(!showLegend)}
                      className={`px-2.5 py-1.5 rounded-md border text-[11px] font-medium transition-all ${showLegend ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/50 hover:bg-background"}`}
                      data-testid="button-toggle-legend">
                      Legend {showLegend ? "On" : "Off"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {openPanel === "axes" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/20 mb-2">
                    <div className="flex items-center gap-1.5 flex-1">
                      <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">X Axis:</span>
                      <Input value={xLabel} onChange={(e) => setXLabel(e.target.value)} placeholder="e.g. Category" className="h-6 text-[11px] flex-1" data-testid="input-x-label" />
                    </div>
                    <div className="flex items-center gap-1.5 flex-1">
                      <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">Y Axis:</span>
                      <Input value={yLabel} onChange={(e) => setYLabel(e.target.value)} placeholder="e.g. Frequency" className="h-6 text-[11px] flex-1" data-testid="input-y-label" />
                    </div>
                    <Button size="icon" variant="ghost" className="w-6 h-6 flex-shrink-0" onClick={() => setOpenPanel(null)}><Check className="w-3 h-3" /></Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {openPanel === "style" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="p-3 rounded-lg border bg-muted/20 mb-2 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Aspect Ratio</label>
                        <div className="flex flex-wrap gap-1">
                          {[["auto", "Auto"], ["square", "Square"], ["wide", "Wide 16:9"], ["narrow", "Narrow"], ["double", "Double Col"]].map(([v, l]) => (
                            <button key={v} onClick={() => setAspectRatio(v)}
                              className={`px-2 py-1 rounded-md border text-[11px] font-medium transition-all ${aspectRatio === v ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/50"}`}
                              data-testid={`button-aspect-${v}`}>{l}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Figure Background</label>
                        <div className="flex flex-wrap gap-1">
                          {[["transparent", "None"], ["#ffffff", "White"], ["#f8f9fa", "Gray"], ["#000000", "Black"]].map(([v, l]) => (
                            <button key={v} onClick={() => setFigBg(v)}
                              className={`px-2 py-1 rounded-md border text-[11px] font-medium transition-all ${figBg === v ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/50"}`}
                              data-testid={`button-bg-${l.toLowerCase()}`} style={v !== "transparent" ? { backgroundColor: v === "#ffffff" ? "#f0f0f0" : v === "#f8f9fa" ? "#e8e8e8" : "#222" } : {}}>
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Grid Lines</label>
                        <button onClick={() => setShowGrid(!showGrid)}
                          className={`px-2.5 py-1.5 rounded-md border text-[11px] font-medium transition-all ${showGrid ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/50"}`}
                          data-testid="button-toggle-grid">
                          Grid {showGrid ? "On" : "Off"}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Bar Radius: {barRadius}px</label>
                        <Slider value={[barRadius]} onValueChange={([v]) => setBarRadius(v)} min={0} max={16} step={1} className="w-full" data-testid="slider-bar-radius" />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Line Thickness: {lineThickness}px</label>
                        <Slider value={[lineThickness]} onValueChange={([v]) => setLineThickness(v)} min={1} max={6} step={0.5} className="w-full" data-testid="slider-line-thickness" />
                      </div>
                      {chartType === "errorBar" && (
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Error Bar: ±{errorPct}%</label>
                          <Slider value={[errorPct]} onValueChange={([v]) => setErrorPct(v)} min={1} max={40} step={1} className="w-full" data-testid="slider-error-pct" />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {openPanel === "annotate" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="p-3 rounded-lg border bg-muted/20 mb-2">
                    <div className="flex items-center gap-4 flex-wrap">
                      <button onClick={() => setShowRefLine(!showRefLine)}
                        className={`px-2.5 py-1.5 rounded-md border text-[11px] font-medium transition-all ${showRefLine ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/50"}`}
                        data-testid="button-toggle-refline">
                        Reference Line {showRefLine ? "On" : "Off"}
                      </button>
                      {showRefLine && (
                        <>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-muted-foreground font-medium">Type:</span>
                            {(["mean", "median", "custom"] as const).map(t => (
                              <button key={t} onClick={() => setRefLineType(t)}
                                className={`px-2 py-1.5 rounded-md border text-[11px] font-medium capitalize transition-all ${refLineType === t ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/50"}`}
                                data-testid={`button-refline-type-${t}`}>{t}</button>
                            ))}
                          </div>
                          {refLineType === "custom" && (
                            <Input value={refLineCustom} onChange={(e) => setRefLineCustom(e.target.value)} placeholder="Value" className="h-6 text-[11px] w-20" data-testid="input-refline-value" />
                          )}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-muted-foreground font-medium">Label:</span>
                            <Input value={refLineLabel} onChange={(e) => setRefLineLabel(e.target.value)} placeholder="Label" className="h-6 text-[11px] w-24" data-testid="input-refline-label" />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-muted-foreground font-medium">Color:</span>
                            <input type="color" value={refLineColor} onChange={(e) => setRefLineColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border" data-testid="input-refline-color" />
                          </div>
                          {refVal !== null && (
                            <span className="text-[11px] text-muted-foreground">= {refVal.toFixed(2)}</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {openPanel === "edit" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="p-2.5 rounded-lg border bg-muted/20 space-y-1.5 mb-2">
                    <div className="max-h-44 overflow-auto space-y-1">
                      {chartData.map((item, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                          <Input value={item.label} onChange={(e) => updateLabel(i, e.target.value)} className="h-6 text-[11px] flex-1" data-testid={`input-label-${i}`} />
                          <Input type="number" value={item.value} onChange={(e) => updateValue(i, Number(e.target.value))} className="h-6 text-[11px] w-20" data-testid={`input-value-${i}`} />
                          <Button size="icon" variant="ghost" className="w-6 h-6 text-destructive hover:text-destructive" onClick={() => removeItem(i)} data-testid={`button-remove-bar-${i}`}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 pt-1.5 border-t">
                      <Plus className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Label" className="h-6 text-[11px] flex-1" data-testid="input-new-label" onKeyDown={(e) => e.key === "Enter" && addItem()} />
                      <Input type="number" value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="Value" className="h-6 text-[11px] w-20" data-testid="input-new-value" onKeyDown={(e) => e.key === "Enter" && addItem()} />
                      <Button size="icon" variant="ghost" className="w-6 h-6" onClick={addItem} disabled={!newLabel.trim()} data-testid="button-add-bar"><Check className="w-3 h-3" /></Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {openPanel === "templates" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="p-2 rounded-lg border bg-muted/20 mb-2">
                    <p className="text-[11px] text-muted-foreground mb-2 font-medium">Click a template to populate with sample academic data:</p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-1.5">
                      {FIGURE_TEMPLATES.map(tpl => (
                        <button key={tpl.id} onClick={() => applyTemplate(tpl)}
                          className="flex flex-col items-center gap-1 p-2 rounded-lg border text-center hover:border-primary/60 hover:bg-background transition-all text-[11px] font-medium"
                          data-testid={`button-template-${tpl.id}`}>
                          <span className="text-lg">{tpl.icon}</span>
                          <span className="leading-tight">{tpl.name}</span>
                          <span className="text-[10px] text-muted-foreground font-normal leading-tight">{tpl.description.slice(0, 35)}…</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {openPanel === "ai" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="p-3 rounded-lg border bg-muted/20 mb-2 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">AI Caption</p>
                        <Button size="sm" variant="outline" className="w-full h-7 text-[11px] gap-1.5"
                          onClick={() => aiCaptionMutation.mutate()} disabled={chartData.length === 0 || aiCaptionMutation.isPending}
                          data-testid="button-ai-caption">
                          {aiCaptionMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                          {aiCaptionMutation.isPending ? "Writing..." : "Generate Caption"}
                        </Button>
                        {aiCaptionResult && (
                          <div className="space-y-1">
                            <p className="text-[11px] bg-background border rounded p-2 leading-relaxed">{aiCaptionResult}</p>
                            <Button size="sm" variant="ghost" className="h-6 text-[11px] w-full" onClick={() => { setCaption(aiCaptionResult); toast({ title: "Caption applied" }); }} data-testid="button-apply-caption">
                              <Check className="w-3 h-3 mr-1" />Use This Caption
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Chart Recommendation</p>
                        <div className="flex gap-1">
                          <Input value={aiContext} onChange={(e) => setAiContext(e.target.value)} placeholder="e.g. translation strategies" className="h-7 text-[11px] flex-1" data-testid="input-ai-context" />
                          <Button size="sm" variant="outline" className="h-7 text-[11px] px-2 gap-1 flex-shrink-0"
                            onClick={() => aiRecommendMutation.mutate()} disabled={chartData.length === 0 || aiRecommendMutation.isPending}
                            data-testid="button-ai-recommend">
                            {aiRecommendMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                            Ask
                          </Button>
                        </div>
                        {aiRecommendResult && (
                          <div className="space-y-1">
                            <p className="text-[11px] bg-background border rounded p-2 leading-relaxed">
                              <span className="font-bold">{aiRecommendResult.chartType}</span> — {aiRecommendResult.reason}
                            </p>
                            <Button size="sm" variant="ghost" className="h-6 text-[11px] w-full"
                              onClick={() => { const found = CHART_TYPES.find(t => t.type === aiRecommendResult.chartType); if (found) { setChartType(found.type); toast({ title: "Chart type applied" }); } }}
                              data-testid="button-apply-recommendation">
                              <Check className="w-3 h-3 mr-1" />Switch to {aiRecommendResult.chartType}
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Results Paragraph</p>
                        <Button size="sm" variant="outline" className="w-full h-7 text-[11px] gap-1.5"
                          onClick={() => aiResultsMutation.mutate()} disabled={chartData.length === 0 || aiResultsMutation.isPending}
                          data-testid="button-ai-results">
                          {aiResultsMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                          {aiResultsMutation.isPending ? "Writing..." : "Write Results Section"}
                        </Button>
                        {aiResultsResult && (
                          <div className="space-y-1">
                            <p className="text-[11px] bg-background border rounded p-2 leading-relaxed line-clamp-4">{aiResultsResult}</p>
                            <Button size="sm" variant="ghost" className="h-6 text-[11px] w-full"
                              onClick={async () => { await navigator.clipboard.writeText(aiResultsResult); toast({ title: "Copied to clipboard" }); }}
                              data-testid="button-copy-results">
                              <Copy className="w-3 h-3 mr-1" />Copy to Clipboard
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {openPanel === "code" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="p-3 rounded-lg border bg-muted/20 mb-2 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold text-muted-foreground">Export code for:</span>
                      <button onClick={() => setCodeLang("python")}
                        className={`px-2.5 py-1.5 rounded-md border text-[11px] font-medium transition-all ${codeLang === "python" ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/50"}`}
                        data-testid="button-code-python">Python (matplotlib)</button>
                      <button onClick={() => setCodeLang("r")}
                        className={`px-2.5 py-1.5 rounded-md border text-[11px] font-medium transition-all ${codeLang === "r" ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/50"}`}
                        data-testid="button-code-r">R (ggplot2)</button>
                      <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1.5 ml-auto"
                        onClick={downloadCode} disabled={chartData.length === 0} data-testid="button-download-code">
                        <Download className="w-3 h-3" />Download {codeLang === "python" ? ".py" : ".R"}
                      </Button>
                    </div>
                    {chartData.length > 0 && (
                      <pre className="text-[10px] bg-background border rounded p-2 overflow-auto max-h-44 leading-relaxed font-mono">
                        {codeLang === "python"
                          ? generatePythonCode(chartData, chartType, colors, title, xLabel, yLabel, caption, figureNumber)
                          : generateRCode(chartData, chartType, colors, title, xLabel, yLabel, caption, figureNumber)}
                      </pre>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div data-export-area className="rounded-lg" style={{ background: figBg === "transparent" ? undefined : figBg }}>
              {title && (
                <h4 className="text-center font-bold text-sm mb-2 text-foreground" style={{ fontFamily: getFontCSS() }}>
                  {formatPreset === "ieee" ? `Fig. ${figureNumber}. ${title}` : title}
                </h4>
              )}
              {renderChart()}
              {getCaptionFormatted()}
            </div>
          </div>

          <div className="polished-card p-6">
            <div className="section-header">
              <Settings2 className="w-4 h-4 text-rose-500" />
              <h3>Figure Settings</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1.5 block font-medium uppercase tracking-wider">Figure Number</label>
                  <Input value={figureNumber} onChange={(e) => setFigureNumber(e.target.value)} placeholder="1" className="h-8 text-sm" data-testid="input-figure-number" />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1.5 block font-medium uppercase tracking-wider">Caption</label>
                  <Textarea value={caption} onChange={(e) => setCaption(e.target.value)}
                    placeholder="Frequency distribution of translation universals identified in the parallel corpus..."
                    className="min-h-[60px] text-sm resize-y" data-testid="textarea-caption" />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1.5 block font-medium uppercase tracking-wider">Font</label>
                  <Select value={fontFamily} onValueChange={(v) => setFontFamily(v as FontFamily)}>
                    <SelectTrigger className="h-8 text-sm" data-testid="select-font"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map(f => (
                        <SelectItem key={f.value} value={f.value}>
                          <span style={{ fontFamily: f.css }}>{f.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1.5 block font-medium uppercase tracking-wider">Academic / Presentation Format</label>
                  <Select value={formatPreset} onValueChange={(v) => applyFormatPreset(v as FormatPreset)}>
                    <SelectTrigger className="h-8 text-sm" data-testid="select-format"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FORMAT_PRESETS.map(f => (
                        <SelectItem key={f.value} value={f.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{f.label}</span>
                            <span className="text-[10px] text-muted-foreground">{f.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1.5 block font-medium uppercase tracking-wider">Export Resolution</label>
                  <Select value={resolution} onValueChange={(v) => setResolution(v as ExportResolution)}>
                    <SelectTrigger className="h-8 text-sm" data-testid="select-resolution"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1x">1x — Screen (72 DPI)</SelectItem>
                      <SelectItem value="2x">2x — Retina (144 DPI)</SelectItem>
                      <SelectItem value="3x">3x — Print (216 DPI)</SelectItem>
                      <SelectItem value="4x">4x — High-Res Print (288 DPI)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-1">
                  <label className="text-[11px] text-muted-foreground mb-2 block font-medium uppercase tracking-wider">Quick Export</label>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="secondary" onClick={downloadPNG} disabled={exporting} data-testid="button-quick-png">
                      {exporting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Image className="w-3.5 h-3.5 mr-1.5" />}PNG
                    </Button>
                    <Button size="sm" variant="secondary" onClick={downloadPDF} disabled={exporting} data-testid="button-quick-pdf">
                      <FileText className="w-3.5 h-3.5 mr-1.5" />PDF
                    </Button>
                    <Button size="sm" variant="secondary" onClick={downloadDOCX} disabled={exporting} data-testid="button-quick-docx">
                      <FileText className="w-3.5 h-3.5 mr-1.5" />Word
                    </Button>
                    <Button size="sm" variant="secondary" onClick={downloadSVG} data-testid="button-quick-svg">
                      <BarChart2 className="w-3.5 h-3.5 mr-1.5" />SVG
                    </Button>
                    <Button size="sm" variant="secondary" onClick={copyToClipboard} disabled={exporting} data-testid="button-quick-copy">
                      <Copy className="w-3.5 h-3.5 mr-1.5" />Copy
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
