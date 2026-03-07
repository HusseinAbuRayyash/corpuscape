import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Label,
  LineChart, Line, AreaChart, Area, PieChart, Pie, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter, ZAxis, Legend,
} from "recharts";
import {
  Download, Pencil, Plus, Trash2, Check, Palette, Type, Tag,
  BarChart3, BarChartHorizontal, LineChart as LineChartIcon, AreaChart as AreaChartIcon,
  PieChart as PieChartIcon, Radar as RadarIcon, ScatterChart as ScatterIcon,
  ChevronDown, Upload, ClipboardPaste, Image, FileText, Settings2,
  Loader2, LayoutGrid, Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChartDataItem {
  label: string;
  value: number;
}

type ChartType = "bar" | "barHorizontal" | "line" | "area" | "pie" | "donut" | "radar" | "scatter";
type LabelMode = "none" | "values" | "percentages" | "both";
type FontFamily = "system" | "playfair" | "times" | "arial" | "georgia" | "roboto" | "lato";
type FormatPreset = "default" | "apa" | "ieee" | "chicago" | "presentation" | "poster";
type ExportResolution = "1x" | "2x" | "3x" | "4x";

const CHART_TYPES: { type: ChartType; label: string; icon: typeof BarChart3 }[] = [
  { type: "bar", label: "Bar", icon: BarChart3 },
  { type: "barHorizontal", label: "Horizontal", icon: BarChartHorizontal },
  { type: "line", label: "Line", icon: LineChartIcon },
  { type: "area", label: "Area", icon: AreaChartIcon },
  { type: "pie", label: "Pie", icon: PieChartIcon },
  { type: "donut", label: "Donut", icon: PieChartIcon },
  { type: "radar", label: "Radar", icon: RadarIcon },
  { type: "scatter", label: "Scatter", icon: ScatterIcon },
];

const PRESET_PALETTES = [
  { name: "Academic", colors: ["#1e3a5f", "#2a5078", "#366891", "#4280aa", "#5098c3", "#1a4731", "#24603f", "#2e794d", "#3a925b", "#48ab6a"] },
  { name: "APA Blue", colors: ["#003f5c", "#2f4b7c", "#665191", "#a05195", "#d45087", "#f95d6a", "#ff7c43", "#ffa600", "#7a5195", "#ef5675"] },
  { name: "Nature", colors: ["#e64b35", "#4dbbd5", "#00a087", "#3c5488", "#f39b7f", "#8491b4", "#91d1c2", "#dc0000", "#7e6148", "#b09c85"] },
  { name: "Science", colors: ["#3b4992", "#ee0000", "#008b45", "#631879", "#008280", "#bb0021", "#5f559b", "#a20056", "#808180", "#1b1919"] },
  { name: "Lancet", colors: ["#00468b", "#ed0000", "#42b540", "#0099b4", "#925e9f", "#fdaf91", "#ad002a", "#adb6b6", "#1b1919", "#767676"] },
  { name: "JAMA", colors: ["#374e55", "#df8f44", "#00a1d5", "#b24745", "#79af97", "#6a6599", "#80796b", "#ccc591", "#374e55", "#df8f44"] },
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
  { name: "Slate", colors: ["#0f172a", "#1e293b", "#334155", "#475569", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0", "#f1f5f9", "#f8fafc"] },
  { name: "B&W", colors: ["#000000", "#1a1a1a", "#333333", "#4d4d4d", "#666666", "#808080", "#999999", "#b3b3b3", "#cccccc", "#e6e6e6"] },
  { name: "Pastel", colors: ["#fca5a5", "#fdba74", "#fde68a", "#bef264", "#86efac", "#67e8f9", "#a5b4fc", "#d8b4fe", "#f9a8d4", "#fecdd3"] },
  { name: "Rainbow", colors: ["#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e"] },
  { name: "Earth", colors: ["#451a03", "#78350f", "#92400e", "#a16207", "#854d0e", "#713f12", "#65a30d", "#4d7c0f", "#3f6212", "#365314"] },
  { name: "Navy", colors: ["#0c1445", "#111b5e", "#162277", "#1b2990", "#2030a9", "#2b3dc2", "#3a4ed5", "#4f63e0", "#6b7ce8", "#8d9af0"] },
  { name: "Viridis", colors: ["#440154", "#482777", "#3f4a8a", "#31678e", "#26838f", "#1f9d8a", "#6cce5a", "#b6de2b", "#fee825", "#aadc32"] },
  { name: "Warm", colors: ["#9b2226", "#ae2012", "#bb3e03", "#ca6702", "#ee9b00", "#e9d8a6", "#94d2bd", "#0a9396", "#005f73", "#001219"] },
];

const FONT_OPTIONS: { value: FontFamily; label: string; css: string }[] = [
  { value: "system", label: "System Default", css: "system-ui, -apple-system, sans-serif" },
  { value: "playfair", label: "Playfair Display", css: "'Playfair Display', serif" },
  { value: "times", label: "Times New Roman", css: "'Times New Roman', Times, serif" },
  { value: "arial", label: "Arial / Helvetica", css: "Arial, Helvetica, sans-serif" },
  { value: "georgia", label: "Georgia", css: "Georgia, serif" },
  { value: "roboto", label: "Roboto", css: "'Roboto', sans-serif" },
  { value: "lato", label: "Lato", css: "'Lato', sans-serif" },
];

const FORMAT_PRESETS: { value: FormatPreset; label: string; description: string }[] = [
  { value: "default", label: "Default", description: "Standard web-ready figure" },
  { value: "apa", label: "APA 7th", description: "Academic — sans-serif, numbered, italic caption" },
  { value: "ieee", label: "IEEE", description: "Technical — serif, compact, bold caption" },
  { value: "chicago", label: "Chicago/MLA", description: "Humanities — serif, descriptive caption" },
  { value: "presentation", label: "Presentation", description: "Large fonts, high contrast for slides" },
  { value: "poster", label: "Poster / Print", description: "Extra large text, thick lines, high-res" },
];

const TOOLTIP_STYLE = { borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: "12px" };
const hasAxes = (t: ChartType) => !["pie", "donut", "radar"].includes(t);

const SAMPLE_DATA: ChartDataItem[] = [
  { label: "Explicitation", value: 42 },
  { label: "Simplification", value: 35 },
  { label: "Normalization", value: 28 },
  { label: "Levelling Out", value: 22 },
  { label: "Interference", value: 18 },
  { label: "Convergence", value: 14 },
];

export default function FigureMaker() {
  const { toast } = useToast();
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
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
  const [editing, setEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [showPalettes, setShowPalettes] = useState(false);
  const [showChartTypes, setShowChartTypes] = useState(false);
  const [showLabelOptions, setShowLabelOptions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [pasteData, setPasteData] = useState("");
  const [dataInputMode, setDataInputMode] = useState<"paste" | "upload">("paste");
  const [exporting, setExporting] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const getFontCSS = useCallback(() => {
    return FONT_OPTIONS.find(f => f.value === fontFamily)?.css || "system-ui, sans-serif";
  }, [fontFamily]);

  const applyFormatPreset = useCallback((preset: FormatPreset) => {
    setFormatPreset(preset);
    switch (preset) {
      case "apa":
        setFontFamily("arial");
        setLabelMode("values");
        setShowLegend(false);
        break;
      case "ieee":
        setFontFamily("times");
        setLabelMode("values");
        setShowLegend(true);
        break;
      case "chicago":
        setFontFamily("georgia");
        setLabelMode("none");
        setShowLegend(true);
        break;
      case "presentation":
        setFontFamily("arial");
        setLabelMode("values");
        setShowLegend(true);
        setResolution("2x");
        break;
      case "poster":
        setFontFamily("arial");
        setLabelMode("both");
        setShowLegend(true);
        setResolution("4x");
        break;
      default:
        break;
    }
  }, []);

  const tryLocalParse = useCallback((input: string): ChartDataItem[] => {
    const lines = input.trim().split("\n").filter(l => l.trim());
    const parsed: ChartDataItem[] = [];
    const isHeaderLine = (l: string) => /^["']?(label|name|category|item|key)\b/i.test(l.trim());
    const startIdx = lines.length > 1 && isHeaderLine(lines[0]) ? 1 : 0;

    for (let li = startIdx; li < lines.length; li++) {
      const line = lines[li];
      const parts = line.split(/[\t,;|]/).map(p => p.trim());
      if (parts.length >= 2) {
        const label = parts[0].replace(/^["']|["']$/g, "").trim();
        const rawLast = parts[parts.length - 1];
        const value = parseFloat(rawLast);
        if (label && !isNaN(value) && /^\d+(\.\d+)?$/.test(rawLast)) {
          parsed.push({ label, value });
        }
      }
    }
    return parsed;
  }, []);

  const aiParseMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/ai/parse-chart-data", { text });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.data && data.data.length > 0) {
        setChartData(data.data);
        toast({ title: "AI parsed your data", description: `${data.data.length} data points extracted` });
      } else {
        toast({ title: "No data found", description: "AI could not extract any numeric data from the text", variant: "destructive" });
      }
    },
    onError: (error: any) => {
      const local = tryLocalParse(pasteData);
      if (local.length > 0) {
        setChartData(local);
        toast({ title: "Data loaded", description: `${local.length} data points parsed` });
      } else {
        toast({ title: "Could not parse data", description: "Try a clearer format or include numbers", variant: "destructive" });
      }
    },
  });

  const parsePastedData = useCallback(() => {
    if (!pasteData.trim()) return;
    const local = tryLocalParse(pasteData);
    if (local.length > 0) {
      setChartData(local);
      toast({ title: "Data loaded", description: `${local.length} data points parsed` });
      return;
    }
    aiParseMutation.mutate(pasteData);
  }, [pasteData, toast, tryLocalParse]);

  const isAIParsing = aiParseMutation.isPending;

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;
      const local = tryLocalParse(text);
      if (local.length > 0) {
        setChartData(local);
        toast({ title: "File loaded", description: `${local.length} data points from ${file.name}` });
      } else {
        aiParseMutation.mutate(text);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, [toast]);

  const loadSample = useCallback(() => {
    setChartData(SAMPLE_DATA);
    setTitle("Translation Universals Frequency");
    setXLabel("Universal");
    setYLabel("Frequency");
    toast({ title: "Sample loaded", description: "6 sample data points" });
  }, [toast]);

  const updateLabel = useCallback((index: number, newLbl: string) => {
    setChartData(prev => prev.map((item, i) => i === index ? { ...item, label: newLbl } : item));
  }, []);

  const updateValue = useCallback((index: number, newVal: number) => {
    setChartData(prev => prev.map((item, i) => i === index ? { ...item, value: newVal } : item));
  }, []);

  const removeItem = useCallback((index: number) => {
    setChartData(prev => prev.filter((_, i) => i !== index));
  }, []);

  const addItem = useCallback(() => {
    if (!newLabel.trim()) return;
    setChartData(prev => [...prev, { label: newLabel.trim(), value: Number(newValue) || 0 }]);
    setNewLabel("");
    setNewValue("");
  }, [newLabel, newValue]);

  const togglePanel = useCallback((panel: "types" | "palettes" | "edit" | "labels" | "settings") => {
    setShowChartTypes(panel === "types" ? prev => !prev : false);
    setShowPalettes(panel === "palettes" ? prev => !prev : false);
    setEditing(panel === "edit" ? prev => !prev : false);
    setShowLabelOptions(panel === "labels" ? prev => !prev : false);
    setShowSettings(panel === "settings" ? prev => !prev : false);
  }, []);

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
      exportEl.style.background = "#ffffff";
      exportEl.style.padding = "32px";
      exportEl.style.borderRadius = "0";
      const canvas = await html2canvas(exportEl, { scale, backgroundColor: "#ffffff", useCORS: true, logging: false });
      exportEl.style.background = "";
      exportEl.style.padding = "";
      exportEl.style.borderRadius = "";
      const link = document.createElement("a");
      link.download = `${title || "figure"}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();
      toast({ title: "PNG exported", description: `Resolution: ${canvas.width}×${canvas.height}px` });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }, [title, resolution, getExportElement, toast]);

  const downloadPDF = useCallback(async () => {
    const exportEl = getExportElement();
    if (!exportEl) return;
    setExporting(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { jsPDF } = await import("jspdf");
      const scale = parseInt(resolution.replace("x", ""));
      exportEl.style.background = "#ffffff";
      exportEl.style.padding = "32px";
      exportEl.style.borderRadius = "0";
      const canvas = await html2canvas(exportEl, { scale, backgroundColor: "#ffffff", useCORS: true, logging: false });
      exportEl.style.background = "";
      exportEl.style.padding = "";
      exportEl.style.borderRadius = "";
      const imgData = canvas.toDataURL("image/png", 1.0);
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const isLandscape = imgWidth > imgHeight * 1.2;
      const pdf = new jsPDF({ orientation: isLandscape ? "landscape" : "portrait", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 40;
      const maxW = pageWidth - margin * 2;
      const maxH = pageHeight - margin * 2;
      const ratio = Math.min(maxW / imgWidth, maxH / imgHeight);
      const w = imgWidth * ratio;
      const h = imgHeight * ratio;
      const x = (pageWidth - w) / 2;
      const y = (pageHeight - h) / 2;
      pdf.addImage(imgData, "PNG", x, y, w, h);
      pdf.save(`${title || "figure"}.pdf`);
      toast({ title: "PDF exported" });
    } catch {
      toast({ title: "PDF export failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }, [title, resolution, getExportElement, toast]);

  const downloadDOCX = useCallback(async () => {
    const exportEl = getExportElement();
    if (!exportEl) return;
    setExporting(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const docx = await import("docx");
      const scale = parseInt(resolution.replace("x", ""));
      exportEl.style.background = "#ffffff";
      exportEl.style.padding = "32px";
      exportEl.style.borderRadius = "0";
      const canvas = await html2canvas(exportEl, { scale, backgroundColor: "#ffffff", useCORS: true, logging: false });
      exportEl.style.background = "";
      exportEl.style.padding = "";
      exportEl.style.borderRadius = "";
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png", 1.0));
      const arrayBuffer = await blob.arrayBuffer();
      const imgWidth = 600;
      const imgHeight = Math.round((canvas.height / canvas.width) * imgWidth);

      const doc = new docx.Document({
        sections: [{
          properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
          children: [
            ...(title ? [new docx.Paragraph({
              children: [new docx.TextRun({ text: `Figure ${figureNumber}`, bold: true, font: getFontCSS().split(",")[0].replace(/'/g, ""), size: 24 })],
              spacing: { after: 120 },
            })] : []),
            new docx.Paragraph({
              children: [new docx.ImageRun({
                data: arrayBuffer,
                transformation: { width: imgWidth, height: imgHeight },
                type: "png",
              })],
              spacing: { after: 120 },
            }),
            ...(caption ? [new docx.Paragraph({
              children: [
                new docx.TextRun({ text: `Figure ${figureNumber}. `, bold: true, italics: formatPreset === "apa", font: getFontCSS().split(",")[0].replace(/'/g, ""), size: 20 }),
                new docx.TextRun({ text: caption, italics: formatPreset === "apa", font: getFontCSS().split(",")[0].replace(/'/g, ""), size: 20 }),
              ],
              spacing: { before: 120 },
            })] : []),
          ],
        }],
      });
      const docBlob = await docx.Packer.toBlob(doc);
      const url = URL.createObjectURL(docBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title || "figure"}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Word document exported" });
    } catch {
      toast({ title: "DOCX export failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }, [title, caption, figureNumber, resolution, formatPreset, getExportElement, getFontCSS, toast]);

  const currentTypeInfo = CHART_TYPES.find(t => t.type === chartType) || CHART_TYPES[0];
  const CurrentIcon = currentTypeInfo.icon;
  const totalValue = chartData.reduce((sum, d) => sum + d.value, 0);

  const isPresentation = formatPreset === "presentation" || formatPreset === "poster";
  const tickFontSize = isPresentation ? 13 : 10;
  const labelFontSize = isPresentation ? 14 : 11;

  const xAxisLabel = xLabel ? (
    <Label value={xLabel} position="insideBottom" offset={-5} style={{ fontSize: labelFontSize, fontWeight: 600, fill: "#6b7280", fontFamily: getFontCSS() }} />
  ) : undefined;
  const yAxisLabel = yLabel ? (
    <Label value={yLabel} angle={-90} position="insideLeft" offset={10} style={{ fontSize: labelFontSize, fontWeight: 600, fill: "#6b7280", textAnchor: "middle", fontFamily: getFontCSS() }} />
  ) : undefined;

  const formatSingleLabel = (val: number) => {
    if (labelMode === "none") return "";
    const pct = totalValue > 0 ? ((val / totalValue) * 100).toFixed(1) + "%" : "0%";
    if (labelMode === "values") return String(val);
    if (labelMode === "percentages") return pct;
    return String(val);
  };

  const formatPctLabel = (val: number) => totalValue > 0 ? ((val / totalValue) * 100).toFixed(1) + "%" : "0%";

  const formatLineLabel = (val: number) => {
    if (labelMode === "none") return "";
    const pct = totalValue > 0 ? ((val / totalValue) * 100).toFixed(1) + "%" : "0%";
    if (labelMode === "values") return String(val);
    if (labelMode === "percentages") return pct;
    return `${val} (${pct})`;
  };

  const renderCustomBarLabel = (props: any) => {
    if (labelMode === "none") return null;
    const { x, y, width, height, value } = props;
    const fs = isPresentation ? 11 : 8;
    if (labelMode === "both") {
      if (chartType === "barHorizontal") {
        return (
          <g>
            <text x={x + width / 2} y={y + height / 2} dy={4} textAnchor="middle" fontSize={fs} fill="#ffffff" fontWeight={700} fontFamily={getFontCSS()}>{value}</text>
            <text x={x + width + 4} y={y + height / 2} dy={4} fontSize={fs} fill="#6b7280" fontWeight={500} fontFamily={getFontCSS()}>{formatPctLabel(value)}</text>
          </g>
        );
      }
      return (
        <g>
          <text x={x + width / 2} y={y + height / 2} dy={4} textAnchor="middle" fontSize={fs} fill="#ffffff" fontWeight={700} fontFamily={getFontCSS()}>{value}</text>
          <text x={x + width / 2} y={y - 5} textAnchor="middle" fontSize={fs} fill="#6b7280" fontWeight={500} fontFamily={getFontCSS()}>{formatPctLabel(value)}</text>
        </g>
      );
    }
    const text = formatSingleLabel(value);
    if (chartType === "barHorizontal") {
      return <text x={x + width + 4} y={y + height / 2} dy={4} fontSize={fs + 1} fill="#6b7280" fontWeight={500} fontFamily={getFontCSS()}>{text}</text>;
    }
    return <text x={x + width / 2} y={y - 5} textAnchor="middle" fontSize={fs + 1} fill="#6b7280" fontWeight={500} fontFamily={getFontCSS()}>{text}</text>;
  };

  const pieLabel = labelMode === "none" ? false : ({ label, value, percent }: any) => {
    if (labelMode === "values") return `${label}: ${value}`;
    if (labelMode === "percentages") return `${label} (${(percent * 100).toFixed(1)}%)`;
    return `${label}: ${value} (${(percent * 100).toFixed(1)}%)`;
  };

  const renderChart = () => {
    if (chartData.length === 0) return null;

    const baseHeight = chartType === "barHorizontal"
      ? Math.max(250, chartData.length * 32 + 60)
      : chartType === "pie" || chartType === "donut" ? 380
      : chartType === "radar" ? 380
      : isPresentation ? 400 : 340;

    const xAxisHeight = xLabel ? 110 : 100;

    return (
      <div style={{ height: baseHeight + (hasAxes(chartType) && chartType !== "barHorizontal" ? 20 : 0) }}>
        <ResponsiveContainer width="100%" height="100%">
          {(() => {
            switch (chartType) {
              case "bar":
                return (
                  <BarChart data={chartData} margin={{ bottom: xLabel ? 20 : 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis dataKey="label" angle={-45} textAnchor="end" height={xAxisHeight} interval={0} tick={{ fontSize: tickFontSize, fontFamily: getFontCSS() }}>{xAxisLabel}</XAxis>
                    <YAxis tick={{ fontSize: tickFontSize, fontFamily: getFontCSS() }}>{yAxisLabel}</YAxis>
                    <Tooltip contentStyle={{ ...TOOLTIP_STYLE, fontFamily: getFontCSS() }} />
                    {showLegend && <Legend wrapperStyle={{ fontFamily: getFontCSS(), fontSize: tickFontSize }} />}
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} label={labelMode !== "none" ? renderCustomBarLabel : false}>
                      {chartData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                    </Bar>
                  </BarChart>
                );
              case "barHorizontal":
                return (
                  <BarChart data={chartData} layout="vertical" margin={{ bottom: xLabel ? 20 : 5, right: labelMode !== "none" ? 60 : 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis type="number" tick={{ fontSize: tickFontSize, fontFamily: getFontCSS() }}>{yLabel ? <Label value={yLabel} position="insideBottom" offset={-5} style={{ fontSize: labelFontSize, fontWeight: 600, fill: "#6b7280", fontFamily: getFontCSS() }} /> : undefined}</XAxis>
                    <YAxis dataKey="label" type="category" width={140} tick={{ fontSize: tickFontSize, fontFamily: getFontCSS() }}>{xLabel ? <Label value={xLabel} angle={-90} position="insideLeft" offset={15} style={{ fontSize: labelFontSize, fontWeight: 600, fill: "#6b7280", textAnchor: "middle", fontFamily: getFontCSS() }} /> : undefined}</YAxis>
                    <Tooltip contentStyle={{ ...TOOLTIP_STYLE, fontFamily: getFontCSS() }} />
                    {showLegend && <Legend wrapperStyle={{ fontFamily: getFontCSS(), fontSize: tickFontSize }} />}
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} label={labelMode !== "none" ? renderCustomBarLabel : false}>
                      {chartData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                    </Bar>
                  </BarChart>
                );
              case "line":
                return (
                  <LineChart data={chartData} margin={{ bottom: xLabel ? 20 : 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis dataKey="label" angle={-45} textAnchor="end" height={xAxisHeight} interval={0} tick={{ fontSize: tickFontSize, fontFamily: getFontCSS() }}>{xAxisLabel}</XAxis>
                    <YAxis tick={{ fontSize: tickFontSize, fontFamily: getFontCSS() }}>{yAxisLabel}</YAxis>
                    <Tooltip contentStyle={{ ...TOOLTIP_STYLE, fontFamily: getFontCSS() }} />
                    {showLegend && <Legend wrapperStyle={{ fontFamily: getFontCSS(), fontSize: tickFontSize }} />}
                    <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={isPresentation ? 3.5 : 2.5} dot={{ fill: colors[0], r: isPresentation ? 5 : 4 }} activeDot={{ r: 6, fill: colors[1] || colors[0] }} label={labelMode !== "none" ? ({ x, y, value }: any) => <text x={x} y={y - 10} textAnchor="middle" fontSize={isPresentation ? 11 : 9} fill="#6b7280" fontWeight={500} fontFamily={getFontCSS()}>{formatLineLabel(value)}</text> : false} />
                  </LineChart>
                );
              case "area":
                return (
                  <AreaChart data={chartData} margin={{ bottom: xLabel ? 20 : 5 }}>
                    <defs>
                      <linearGradient id="fmAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors[0]} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={colors[0]} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis dataKey="label" angle={-45} textAnchor="end" height={xAxisHeight} interval={0} tick={{ fontSize: tickFontSize, fontFamily: getFontCSS() }}>{xAxisLabel}</XAxis>
                    <YAxis tick={{ fontSize: tickFontSize, fontFamily: getFontCSS() }}>{yAxisLabel}</YAxis>
                    <Tooltip contentStyle={{ ...TOOLTIP_STYLE, fontFamily: getFontCSS() }} />
                    {showLegend && <Legend wrapperStyle={{ fontFamily: getFontCSS(), fontSize: tickFontSize }} />}
                    <Area type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2} fill="url(#fmAreaGrad)" label={labelMode !== "none" ? ({ x, y, value }: any) => <text x={x} y={y - 10} textAnchor="middle" fontSize={isPresentation ? 11 : 9} fill="#6b7280" fontWeight={500} fontFamily={getFontCSS()}>{formatLineLabel(value)}</text> : false} />
                  </AreaChart>
                );
              case "pie":
              case "donut":
                return (
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={chartType === "donut" ? 120 : 130} innerRadius={chartType === "donut" ? 60 : 0} paddingAngle={2} label={pieLabel} labelLine={labelMode !== "none" ? { strokeWidth: 1 } : false}>
                      {chartData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ ...TOOLTIP_STYLE, fontFamily: getFontCSS() }} />
                    {showLegend && <Legend wrapperStyle={{ fontFamily: getFontCSS(), fontSize: tickFontSize }} />}
                  </PieChart>
                );
              case "radar":
                return (
                  <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid strokeDasharray="3 3" className="opacity-30" />
                    <PolarAngleAxis dataKey="label" tick={{ fontSize: tickFontSize, fontFamily: getFontCSS() }} />
                    <PolarRadiusAxis tick={{ fontSize: tickFontSize - 1 }} />
                    <Tooltip contentStyle={{ ...TOOLTIP_STYLE, fontFamily: getFontCSS() }} />
                    {showLegend && <Legend wrapperStyle={{ fontFamily: getFontCSS(), fontSize: tickFontSize }} />}
                    <Radar dataKey="value" stroke={colors[0]} fill={colors[0]} fillOpacity={0.3} strokeWidth={2} />
                  </RadarChart>
                );
              case "scatter":
                return (
                  <ScatterChart margin={{ bottom: xLabel ? 20 : 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis dataKey="label" name="Item" angle={-45} textAnchor="end" height={xAxisHeight} interval={0} tick={{ fontSize: tickFontSize, fontFamily: getFontCSS() }}>{xAxisLabel}</XAxis>
                    <YAxis dataKey="value" name="Value" tick={{ fontSize: tickFontSize, fontFamily: getFontCSS() }}>{yAxisLabel}</YAxis>
                    <ZAxis range={[60, 300]} />
                    <Tooltip contentStyle={{ ...TOOLTIP_STYLE, fontFamily: getFontCSS() }} cursor={{ strokeDasharray: "3 3" }} />
                    {showLegend && <Legend wrapperStyle={{ fontFamily: getFontCSS(), fontSize: tickFontSize }} />}
                    <Scatter data={chartData} fill={colors[0]}>
                      {chartData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                    </Scatter>
                  </ScatterChart>
                );
              default:
                return (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis dataKey="label" angle={-45} textAnchor="end" height={100} interval={0} tick={{ fontSize: tickFontSize }} />
                    <YAxis tick={{ fontSize: tickFontSize }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
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
      case "apa":
        return <p className="text-sm mt-3 italic" style={{ fontFamily: getFontCSS() }}><span className="font-bold not-italic">{prefix}</span>{caption}</p>;
      case "ieee":
        return <p className="text-xs mt-2 text-center" style={{ fontFamily: getFontCSS() }}><span className="font-bold">Fig. {figureNumber}.</span> {caption}</p>;
      case "chicago":
        return <p className="text-sm mt-3" style={{ fontFamily: getFontCSS() }}><span className="font-semibold">{prefix}</span>{caption}</p>;
      default:
        return <p className="text-xs text-muted-foreground mt-2" style={{ fontFamily: getFontCSS() }}><span className="font-semibold text-foreground">{prefix}</span>{caption}</p>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-4 mb-2"
      >
        <div className="page-header-icon bg-gradient-to-br from-rose-500 to-pink-600">
          <Image className="w-5 h-5 text-white relative z-10" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold italic tracking-tight text-rose-600 dark:text-rose-400" style={{ fontFamily: "'Playfair Display', serif" }} data-testid="text-page-title">Figure Maker</h1>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5 font-medium tracking-wide">Create publication-ready charts & figures</p>
        </div>
      </motion.div>

      <motion.div
        className="polished-card overflow-hidden"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      >
        <div className="h-1 bg-gradient-to-r from-rose-500 via-pink-400 to-rose-500" />
        <div className="p-6 md:p-7">
          <motion.div className="flex items-center gap-3 mb-5" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-md" style={{ boxShadow: "0 4px 12px -2px rgba(244,63,94,0.3)" }}>
              <LayoutGrid className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold tracking-tight text-rose-600 dark:text-rose-400" style={{ fontFamily: "'Playfair Display', serif" }}>Input Your Data</h3>
            <span className="flex items-center gap-1 ml-auto text-[10px] font-semibold text-rose-500/70 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3" />AI-Powered
            </span>
          </motion.div>

          <Tabs value={dataInputMode} onValueChange={(v) => setDataInputMode(v as "paste" | "upload")} className="space-y-4">
            <TabsList data-testid="tabs-data-input">
              <TabsTrigger value="paste" className="gap-1.5" data-testid="tab-paste"><ClipboardPaste className="w-3.5 h-3.5" />Paste / Type</TabsTrigger>
              <TabsTrigger value="upload" className="gap-1.5" data-testid="tab-upload"><Upload className="w-3.5 h-3.5" />Upload CSV</TabsTrigger>
            </TabsList>

            <TabsContent value="paste" className="space-y-3">
              <Textarea
                placeholder={"Paste your data in any format — AI will extract it automatically.\n\nExamples:\n• Arabic, 28\n• Source Language: Arabic, Value: 28\n• The study found 45% explicitation and 30% simplification\n• English has 5000 words, French has 3200\n• Any table, paragraph, or list with numbers"}
                value={pasteData}
                onChange={(e) => setPasteData(e.target.value)}
                className="min-h-[140px] font-mono text-xs resize-y border-rose-200 dark:border-rose-800/30 focus-visible:ring-rose-400/40"
                data-testid="textarea-paste-data"
              />
              <div className="flex gap-2 flex-wrap items-center">
                <Button
                  size="sm"
                  onClick={parsePastedData}
                  disabled={!pasteData.trim() || isAIParsing}
                  className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white"
                  data-testid="button-parse-data"
                >
                  {isAIParsing ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {isAIParsing ? "AI Parsing..." : "Load Data"}
                </Button>
                <Button size="sm" variant="outline" onClick={loadSample} data-testid="button-load-sample">
                  Load Sample
                </Button>
                {isAIParsing && (
                  <span className="text-[11px] text-muted-foreground animate-pulse">AI is extracting your data...</span>
                )}
                <Button size="sm" variant="outline" onClick={loadSample} className="ml-auto" data-testid="button-load-sample-paste">
                  <BarChart3 className="w-3.5 h-3.5 mr-1.5" />Try Sample Data
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="space-y-3">
              <div className="relative rounded-xl border-2 border-dashed border-rose-200 dark:border-rose-800/40 bg-rose-50/30 dark:bg-rose-950/10 p-6 text-center">
                <Upload className="w-8 h-8 text-rose-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-rose-600 dark:text-rose-400 mb-1">Upload a data file</p>
                <p className="text-[11px] text-muted-foreground mb-3">CSV, TSV, or text files — AI will extract the data automatically</p>
                <input
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  data-testid="input-file-upload"
                />
                <Button size="sm" variant="outline" className="pointer-events-none">
                  <Upload className="w-3.5 h-3.5 mr-1.5" />Choose File
                </Button>
              </div>
              <Button size="sm" variant="outline" onClick={loadSample} data-testid="button-load-sample-upload">
                Load Sample
              </Button>
            </TabsContent>
          </Tabs>

          {chartData.length > 0 && (
            <motion.div
              className="mt-4 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/30 text-xs text-rose-600 dark:text-rose-400 font-medium"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
            >
              {chartData.length} data points loaded — customize your figure below
            </motion.div>
          )}
        </div>
      </motion.div>

      {chartData.length > 0 && (
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
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
                <Button size="sm" variant={showChartTypes ? "default" : "outline"} className="h-6 text-[11px] px-2 gap-1 flex-shrink-0" onClick={() => togglePanel("types")} data-testid="button-toggle-chart-type">
                  <CurrentIcon className="w-3 h-3" />{currentTypeInfo.label}<ChevronDown className="w-2.5 h-2.5" />
                </Button>
                <Button size="sm" variant={showPalettes ? "default" : "outline"} className="h-6 text-[11px] px-2 gap-1 flex-shrink-0" onClick={() => togglePanel("palettes")} data-testid="button-toggle-palette">
                  <Palette className="w-3 h-3" />Colors
                </Button>
                {hasAxes(chartType) && (
                  <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 gap-1 flex-shrink-0" onClick={() => togglePanel("settings")} data-testid="button-toggle-axes-inline">
                    <Type className="w-3 h-3" />Axes
                  </Button>
                )}
                <Button size="sm" variant={showLabelOptions ? "default" : "outline"} className="h-6 text-[11px] px-2 gap-1 flex-shrink-0" onClick={() => togglePanel("labels")} data-testid="button-toggle-labels">
                  <Tag className="w-3 h-3" />Labels
                </Button>
                <Button size="sm" variant={editing ? "default" : "outline"} className="h-6 text-[11px] px-2 gap-1 flex-shrink-0" onClick={() => togglePanel("edit")} data-testid="button-toggle-edit">
                  <Pencil className="w-3 h-3" />{editing ? "Done" : "Edit"}
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
              </div>
            </div>

            <AnimatePresence>
              {showChartTypes && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="flex flex-wrap gap-1 p-2 rounded-lg border bg-muted/20 mb-2">
                    {CHART_TYPES.map(({ type, label, icon: Icon }) => (
                      <button key={type} onClick={() => { setChartType(type); setShowChartTypes(false); }} className={`flex items-center gap-1 px-2 py-1.5 rounded-md border text-[11px] font-medium transition-all ${chartType === type ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/50 hover:bg-background"}`} data-testid={`button-chart-type-${type}`}>
                        <Icon className="w-3.5 h-3.5" />{label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showPalettes && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border bg-muted/20 mb-2 max-h-48 overflow-auto">
                    {PRESET_PALETTES.map((palette) => (
                      <button key={palette.name} onClick={() => { setColors(palette.colors); setShowPalettes(false); }} className="flex items-center gap-1 px-2 py-1 rounded-md border hover:border-primary/50 hover:bg-background transition-all text-[11px] font-medium" data-testid={`button-palette-${palette.name.toLowerCase()}`}>
                        <div className="flex gap-px">
                          {palette.colors.slice(0, 5).map((c, ci) => (
                            <div key={ci} className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                        {palette.name}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showLabelOptions && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="flex items-center gap-1 p-2 rounded-lg border bg-muted/20 mb-2">
                    <span className="text-[11px] font-semibold text-muted-foreground mr-1">Show:</span>
                    {(["none", "values", "percentages", "both"] as LabelMode[]).map((mode) => (
                      <button key={mode} onClick={() => { setLabelMode(mode); setShowLabelOptions(false); }} className={`px-2.5 py-1.5 rounded-md border text-[11px] font-medium transition-all capitalize ${labelMode === mode ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/50 hover:bg-background"}`} data-testid={`button-label-mode-${mode}`}>
                        {mode === "both" ? "Values + %" : mode === "none" ? "None" : mode === "values" ? "Values" : "Percentages"}
                      </button>
                    ))}
                    <div className="w-px h-4 bg-border mx-1" />
                    <button onClick={() => setShowLegend(!showLegend)} className={`px-2.5 py-1.5 rounded-md border text-[11px] font-medium transition-all ${showLegend ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/50 hover:bg-background"}`} data-testid="button-toggle-legend">
                      Legend {showLegend ? "On" : "Off"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showSettings && (
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
                    <Button size="icon" variant="ghost" className="w-6 h-6 flex-shrink-0" onClick={() => setShowSettings(false)} data-testid="button-save-axes"><Check className="w-3 h-3" /></Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {editing && (
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

            <div data-export-area className="rounded-lg">
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
                  <Textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Frequency distribution of translation universals identified in the parallel corpus..."
                    className="min-h-[60px] text-sm resize-y"
                    data-testid="textarea-caption"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1.5 block font-medium uppercase tracking-wider">Font</label>
                  <Select value={fontFamily} onValueChange={(v) => setFontFamily(v as FontFamily)}>
                    <SelectTrigger className="h-8 text-sm" data-testid="select-font">
                      <SelectValue />
                    </SelectTrigger>
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
                    <SelectTrigger className="h-8 text-sm" data-testid="select-format">
                      <SelectValue />
                    </SelectTrigger>
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
                    <SelectTrigger className="h-8 text-sm" data-testid="select-resolution">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1x">1x — Screen (72 DPI)</SelectItem>
                      <SelectItem value="2x">2x — Retina (144 DPI)</SelectItem>
                      <SelectItem value="3x">3x — Print (216 DPI)</SelectItem>
                      <SelectItem value="4x">4x — High-Res Print (288 DPI)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-2">
                  <label className="text-[11px] text-muted-foreground mb-2 block font-medium uppercase tracking-wider">Quick Export</label>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="secondary" onClick={downloadPNG} disabled={exporting} data-testid="button-quick-png">
                      {exporting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Image className="w-3.5 h-3.5 mr-1.5" />}
                      PNG
                    </Button>
                    <Button size="sm" variant="secondary" onClick={downloadPDF} disabled={exporting} data-testid="button-quick-pdf">
                      <FileText className="w-3.5 h-3.5 mr-1.5" />PDF
                    </Button>
                    <Button size="sm" variant="secondary" onClick={downloadDOCX} disabled={exporting} data-testid="button-quick-docx">
                      <FileText className="w-3.5 h-3.5 mr-1.5" />Word
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
