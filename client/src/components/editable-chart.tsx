import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Label,
  LineChart, Line, AreaChart, Area, PieChart, Pie, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter, ZAxis,
} from "recharts";
import {
  Download, Pencil, Plus, Trash2, Check, Palette, Type, Tag,
  BarChart3, BarChartHorizontal, LineChartIcon, AreaChartIcon, PieChartIcon,
  Radar as RadarIcon, ScatterChart as ScatterIcon, ChevronDown,
} from "lucide-react";

const PRESET_PALETTES = [
  { name: "Teal", colors: ["#134e4a", "#115e59", "#0f766e", "#0d9488", "#14b8a6", "#2dd4bf", "#5eead4", "#99f6e4", "#b2f5ea", "#ccfbf1"] },
  { name: "Blue", colors: ["#1e3a8a", "#1e40af", "#1d4ed8", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe", "#eff6ff"] },
  { name: "Indigo", colors: ["#312e81", "#3730a3", "#4338ca", "#4f46e5", "#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe", "#e0e7ff", "#eef2ff"] },
  { name: "Purple", colors: ["#581c87", "#6b21a8", "#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe", "#f5f3ff", "#d8b4fe"] },
  { name: "Rose", colors: ["#881337", "#9f1239", "#be123c", "#e11d48", "#f43f5e", "#fb7185", "#fda4af", "#fecdd3", "#ffe4e6", "#fff1f2"] },
  { name: "Amber", colors: ["#78350f", "#92400e", "#b45309", "#d97706", "#f59e0b", "#fbbf24", "#fcd34d", "#fde68a", "#fef3c7", "#fffbeb"] },
  { name: "Orange", colors: ["#7c2d12", "#9a3412", "#c2410c", "#ea580c", "#f97316", "#fb923c", "#fdba74", "#fed7aa", "#ffedd5", "#fff7ed"] },
  { name: "Cyan", colors: ["#164e63", "#155e75", "#0e7490", "#0891b2", "#06b6d4", "#22d3ee", "#67e8f9", "#a5f3fc", "#cffafe", "#ecfeff"] },
  { name: "Green", colors: ["#14532d", "#166534", "#15803d", "#16a34a", "#22c55e", "#4ade80", "#86efac", "#bbf7d0", "#dcfce7", "#f0fdf4"] },
  { name: "Emerald", colors: ["#064e3b", "#065f46", "#047857", "#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5", "#ecfdf5"] },
  { name: "Red", colors: ["#7f1d1d", "#991b1b", "#b91c1c", "#dc2626", "#ef4444", "#f87171", "#fca5a5", "#fecaca", "#fee2e2", "#fef2f2"] },
  { name: "Slate", colors: ["#0f172a", "#1e293b", "#334155", "#475569", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0", "#f1f5f9", "#f8fafc"] },
  { name: "B&W", colors: ["#000000", "#1a1a1a", "#333333", "#4d4d4d", "#666666", "#808080", "#999999", "#b3b3b3", "#cccccc", "#e6e6e6"] },
  { name: "Pastel", colors: ["#fca5a5", "#fdba74", "#fde68a", "#bef264", "#86efac", "#67e8f9", "#a5b4fc", "#d8b4fe", "#f9a8d4", "#fecdd3"] },
  { name: "Rainbow", colors: ["#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e"] },
  { name: "Earth", colors: ["#451a03", "#78350f", "#92400e", "#a16207", "#854d0e", "#713f12", "#65a30d", "#4d7c0f", "#3f6212", "#365314"] },
  { name: "Academic", colors: ["#1e3a5f", "#2a5078", "#366891", "#4280aa", "#5098c3", "#1a4731", "#24603f", "#2e794d", "#3a925b", "#48ab6a"] },
  { name: "Navy", colors: ["#0c1445", "#111b5e", "#162277", "#1b2990", "#2030a9", "#2b3dc2", "#3a4ed5", "#4f63e0", "#6b7ce8", "#8d9af0"] },
];

type ChartType = "bar" | "barHorizontal" | "line" | "area" | "pie" | "donut" | "radar" | "scatter";

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

interface ChartDataItem {
  label: string;
  value: number;
}

interface EditableChartProps {
  data: ChartDataItem[];
  defaultTitle?: string;
  defaultColors?: string[];
  layout?: "vertical" | "horizontal";
  defaultXLabel?: string;
  defaultYLabel?: string;
}

const TOOLTIP_STYLE = { borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: "12px" };

const hasAxes = (t: ChartType) => !["pie", "donut", "radar"].includes(t);

type LabelMode = "none" | "values" | "percentages" | "both";

export function EditableChart({
  data: initialData,
  defaultTitle = "",
  defaultColors = PRESET_PALETTES[0].colors,
  layout = "horizontal",
  defaultXLabel = "",
  defaultYLabel = "",
}: EditableChartProps) {
  const [chartData, setChartData] = useState<ChartDataItem[]>(initialData);
  const [title, setTitle] = useState(defaultTitle);
  const [xLabel, setXLabel] = useState(defaultXLabel);
  const [yLabel, setYLabel] = useState(defaultYLabel);
  const [colors, setColors] = useState<string[]>(defaultColors);
  const [chartType, setChartType] = useState<ChartType>(layout === "vertical" ? "barHorizontal" : "bar");
  const [labelMode, setLabelMode] = useState<LabelMode>("none");
  const [editing, setEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingAxes, setEditingAxes] = useState(false);
  const [showPalettes, setShowPalettes] = useState(false);
  const [showChartTypes, setShowChartTypes] = useState(false);
  const [showLabelOptions, setShowLabelOptions] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setChartData(initialData);
  }, [initialData]);

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

  const applyPalette = useCallback((palette: string[]) => {
    setColors(palette);
    setShowPalettes(false);
  }, []);

  const togglePanel = useCallback((panel: "types" | "palettes" | "edit" | "axes" | "labels") => {
    setShowChartTypes(panel === "types" ? prev => !prev : false);
    setShowPalettes(panel === "palettes" ? prev => !prev : false);
    setEditing(panel === "edit" ? prev => !prev : false);
    setEditingAxes(panel === "axes" ? prev => !prev : false);
    setShowLabelOptions(panel === "labels" ? prev => !prev : false);
  }, []);

  const downloadPNG = useCallback(async () => {
    const container = chartContainerRef.current;
    if (!container) return;
    const { default: html2canvas } = await import("html2canvas");
    const exportEl = container.querySelector("[data-export-area]") as HTMLElement;
    if (!exportEl) return;
    exportEl.style.background = "#ffffff";
    exportEl.style.padding = "32px";
    exportEl.style.borderRadius = "0";
    const canvas = await html2canvas(exportEl, { scale: 3, backgroundColor: "#ffffff", useCORS: true, logging: false });
    exportEl.style.background = "";
    exportEl.style.padding = "";
    exportEl.style.borderRadius = "";
    const link = document.createElement("a");
    link.download = `${title || "chart"}.png`;
    link.href = canvas.toDataURL("image/png", 1.0);
    link.click();
  }, [title]);

  const currentTypeInfo = CHART_TYPES.find(t => t.type === chartType) || CHART_TYPES[0];
  const CurrentIcon = currentTypeInfo.icon;

  const xAxisLabel = xLabel ? (
    <Label value={xLabel} position="insideBottom" offset={-5} style={{ fontSize: 11, fontWeight: 600, fill: "#6b7280" }} />
  ) : undefined;

  const yAxisLabel = yLabel ? (
    <Label value={yLabel} angle={-90} position="insideLeft" offset={10} style={{ fontSize: 11, fontWeight: 600, fill: "#6b7280", textAnchor: "middle" }} />
  ) : undefined;

  const totalValue = chartData.reduce((sum, d) => sum + d.value, 0);

  const formatSingleLabel = (val: number) => {
    if (labelMode === "none") return "";
    const pct = totalValue > 0 ? ((val / totalValue) * 100).toFixed(1) + "%" : "0%";
    if (labelMode === "values") return String(val);
    if (labelMode === "percentages") return pct;
    return String(val);
  };

  const formatPctLabel = (val: number) => {
    return totalValue > 0 ? ((val / totalValue) * 100).toFixed(1) + "%" : "0%";
  };

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

    if (labelMode === "both") {
      if (chartType === "barHorizontal") {
        return (
          <g>
            <text x={x + width / 2} y={y + height / 2} dy={4} textAnchor="middle" fontSize={8} fill="#ffffff" fontWeight={700}>{value}</text>
            <text x={x + width + 4} y={y + height / 2} dy={4} fontSize={8} fill="#6b7280" fontWeight={500}>{formatPctLabel(value)}</text>
          </g>
        );
      }
      return (
        <g>
          <text x={x + width / 2} y={y + height / 2} dy={4} textAnchor="middle" fontSize={8} fill="#ffffff" fontWeight={700}>{value}</text>
          <text x={x + width / 2} y={y - 5} textAnchor="middle" fontSize={8} fill="#6b7280" fontWeight={500}>{formatPctLabel(value)}</text>
        </g>
      );
    }

    const text = formatSingleLabel(value);
    if (chartType === "barHorizontal") {
      return <text x={x + width + 4} y={y + height / 2} dy={4} fontSize={9} fill="#6b7280" fontWeight={500}>{text}</text>;
    }
    return <text x={x + width / 2} y={y - 5} textAnchor="middle" fontSize={9} fill="#6b7280" fontWeight={500}>{text}</text>;
  };

  const pieLabel = labelMode === "none" ? false : ({ label, value, percent }: any) => {
    if (labelMode === "values") return `${label}: ${value}`;
    if (labelMode === "percentages") return `${label} (${(percent * 100).toFixed(1)}%)`;
    return `${label}: ${value} (${(percent * 100).toFixed(1)}%)`;
  };

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
          No data to display. Use the Edit panel to add items.
        </div>
      );
    }

    const baseHeight = chartType === "barHorizontal"
      ? Math.max(200, chartData.length * 28 + 60)
      : chartType === "pie" || chartType === "donut" ? 320
      : chartType === "radar" ? 320
      : 300;

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
                    <XAxis dataKey="label" angle={-45} textAnchor="end" height={xAxisHeight} interval={0} tick={{ fontSize: 10 }}>
                      {xAxisLabel}
                    </XAxis>
                    <YAxis tick={{ fontSize: 11 }}>{yAxisLabel}</YAxis>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} label={labelMode !== "none" ? renderCustomBarLabel : false}>
                      {chartData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                    </Bar>
                  </BarChart>
                );

              case "barHorizontal":
                return (
                  <BarChart data={chartData} layout="vertical" margin={{ bottom: xLabel ? 20 : 5, right: labelMode !== "none" ? 60 : 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis type="number" tick={{ fontSize: 11 }}>{yLabel ? <Label value={yLabel} position="insideBottom" offset={-5} style={{ fontSize: 11, fontWeight: 600, fill: "#6b7280" }} /> : undefined}</XAxis>
                    <YAxis dataKey="label" type="category" width={140} tick={{ fontSize: 10 }}>{xLabel ? <Label value={xLabel} angle={-90} position="insideLeft" offset={15} style={{ fontSize: 11, fontWeight: 600, fill: "#6b7280", textAnchor: "middle" }} /> : undefined}</YAxis>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} label={labelMode !== "none" ? renderCustomBarLabel : false}>
                      {chartData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                    </Bar>
                  </BarChart>
                );

              case "line":
                return (
                  <LineChart data={chartData} margin={{ bottom: xLabel ? 20 : 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis dataKey="label" angle={-45} textAnchor="end" height={xAxisHeight} interval={0} tick={{ fontSize: 10 }}>
                      {xAxisLabel}
                    </XAxis>
                    <YAxis tick={{ fontSize: 11 }}>{yAxisLabel}</YAxis>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={colors[0]}
                      strokeWidth={2.5}
                      dot={{ fill: colors[0], r: 4 }}
                      activeDot={{ r: 6, fill: colors[1] || colors[0] }}
                      label={labelMode !== "none" ? ({ x, y, value }: any) => <text x={x} y={y - 10} textAnchor="middle" fontSize={9} fill="#6b7280" fontWeight={500}>{formatLineLabel(value)}</text> : false}
                    />
                  </LineChart>
                );

              case "area":
                return (
                  <AreaChart data={chartData} margin={{ bottom: xLabel ? 20 : 5 }}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors[0]} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={colors[0]} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis dataKey="label" angle={-45} textAnchor="end" height={xAxisHeight} interval={0} tick={{ fontSize: 10 }}>
                      {xAxisLabel}
                    </XAxis>
                    <YAxis tick={{ fontSize: 11 }}>{yAxisLabel}</YAxis>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={colors[0]}
                      strokeWidth={2}
                      fill="url(#areaGrad)"
                      label={labelMode !== "none" ? ({ x, y, value }: any) => <text x={x} y={y - 10} textAnchor="middle" fontSize={9} fill="#6b7280" fontWeight={500}>{formatLineLabel(value)}</text> : false}
                    />
                  </AreaChart>
                );

              case "pie":
              case "donut":
                return (
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={chartType === "donut" ? 100 : 110}
                      innerRadius={chartType === "donut" ? 55 : 0}
                      paddingAngle={2}
                      label={pieLabel}
                      labelLine={labelMode !== "none" ? { strokeWidth: 1 } : false}
                    >
                      {chartData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                );

              case "radar":
                return (
                  <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid strokeDasharray="3 3" className="opacity-30" />
                    <PolarAngleAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis tick={{ fontSize: 9 }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Radar dataKey="value" stroke={colors[0]} fill={colors[0]} fillOpacity={0.3} strokeWidth={2} />
                  </RadarChart>
                );

              case "scatter":
                return (
                  <ScatterChart margin={{ bottom: xLabel ? 20 : 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis dataKey="label" name="Item" angle={-45} textAnchor="end" height={xAxisHeight} interval={0} tick={{ fontSize: 10 }}>
                      {xAxisLabel}
                    </XAxis>
                    <YAxis dataKey="value" name="Value" tick={{ fontSize: 11 }}>{yAxisLabel}</YAxis>
                    <ZAxis range={[60, 300]} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ strokeDasharray: "3 3" }} />
                    <Scatter data={chartData} fill={colors[0]}>
                      {chartData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                    </Scatter>
                  </ScatterChart>
                );

              default:
                return (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis dataKey="label" angle={-45} textAnchor="end" height={100} interval={0} tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
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

  return (
    <div ref={chartContainerRef} className="space-y-2">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1.5 min-w-max">
          {editingTitle ? (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Chart title..."
                className="h-7 text-xs w-36"
                data-testid="input-chart-title"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
              />
              <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => setEditingTitle(false)} data-testid="button-save-title">
                <Check className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors group flex-shrink-0 border rounded-md px-2 h-6"
              data-testid="button-edit-title"
            >
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
            <Button size="sm" variant={editingAxes ? "default" : "outline"} className="h-6 text-[11px] px-2 gap-1 flex-shrink-0" onClick={() => togglePanel("axes")} data-testid="button-toggle-axes">
              <Type className="w-3 h-3" />Axes
            </Button>
          )}
          <Button size="sm" variant={showLabelOptions ? "default" : "outline"} className="h-6 text-[11px] px-2 gap-1 flex-shrink-0" onClick={() => togglePanel("labels")} data-testid="button-toggle-labels">
            <Tag className="w-3 h-3" />Labels
          </Button>
          <Button size="sm" variant={editing ? "default" : "outline"} className="h-6 text-[11px] px-2 gap-1 flex-shrink-0" onClick={() => togglePanel("edit")} data-testid="button-toggle-edit">
            <Pencil className="w-3 h-3" />{editing ? "Done" : "Edit"}
          </Button>
          <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 gap-1 flex-shrink-0" onClick={downloadPNG} data-testid="button-download-chart">
            <Download className="w-3 h-3" />PNG
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showChartTypes && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="flex flex-wrap gap-1 p-2 rounded-lg border bg-muted/20">
              {CHART_TYPES.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => { setChartType(type); setShowChartTypes(false); }}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-md border text-[11px] font-medium transition-all ${
                    chartType === type ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/50 hover:bg-background"
                  }`}
                  data-testid={`button-chart-type-${type}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPalettes && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border bg-muted/20">
              {PRESET_PALETTES.map((palette) => (
                <button
                  key={palette.name}
                  onClick={() => applyPalette(palette.colors)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md border hover:border-primary/50 hover:bg-background transition-all text-[11px] font-medium"
                  data-testid={`button-palette-${palette.name.toLowerCase()}`}
                >
                  <div className="flex gap-0.5">
                    {palette.colors.slice(0, 4).map((c, i) => (
                      <div key={i} className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c }} />
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
            <div className="flex items-center gap-1 p-2 rounded-lg border bg-muted/20">
              <span className="text-[11px] font-semibold text-muted-foreground mr-1">Show:</span>
              {(["none", "values", "percentages", "both"] as LabelMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => { setLabelMode(mode); setShowLabelOptions(false); }}
                  className={`px-2.5 py-1.5 rounded-md border text-[11px] font-medium transition-all capitalize ${
                    labelMode === mode ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/50 hover:bg-background"
                  }`}
                  data-testid={`button-label-mode-${mode}`}
                >
                  {mode === "both" ? "Values + %" : mode === "none" ? "None" : mode === "values" ? "Values" : "Percentages"}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingAxes && hasAxes(chartType) && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/20">
              <div className="flex items-center gap-1.5 flex-1">
                <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">X Axis:</span>
                <Input
                  value={xLabel}
                  onChange={(e) => setXLabel(e.target.value)}
                  placeholder="e.g. Terms"
                  className="h-6 text-[11px] flex-1"
                  data-testid="input-x-label"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-1">
                <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">Y Axis:</span>
                <Input
                  value={yLabel}
                  onChange={(e) => setYLabel(e.target.value)}
                  placeholder="e.g. Frequency"
                  className="h-6 text-[11px] flex-1"
                  data-testid="input-y-label"
                />
              </div>
              <Button size="icon" variant="ghost" className="w-6 h-6 flex-shrink-0" onClick={() => setEditingAxes(false)} data-testid="button-save-axes">
                <Check className="w-3 h-3" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editing && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="p-2.5 rounded-lg border bg-muted/20 space-y-1.5">
              <div className="max-h-44 overflow-auto space-y-1">
                {chartData.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                    <Input value={item.label} onChange={(e) => updateLabel(i, e.target.value)} className="h-6 text-[11px] flex-1" data-testid={`input-label-${i}`} />
                    <Input type="number" value={item.value} onChange={(e) => updateValue(i, Number(e.target.value))} className="h-6 text-[11px] w-16" data-testid={`input-value-${i}`} />
                    <Button size="icon" variant="ghost" className="w-6 h-6 text-destructive hover:text-destructive" onClick={() => removeItem(i)} data-testid={`button-remove-bar-${i}`}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1.5 pt-1.5 border-t">
                <Plus className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Label" className="h-6 text-[11px] flex-1" data-testid="input-new-label" onKeyDown={(e) => e.key === "Enter" && addItem()} />
                <Input type="number" value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="Value" className="h-6 text-[11px] w-16" data-testid="input-new-value" onKeyDown={(e) => e.key === "Enter" && addItem()} />
                <Button size="icon" variant="ghost" className="w-6 h-6" onClick={addItem} disabled={!newLabel.trim()} data-testid="button-add-bar">
                  <Check className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div data-export-area className="rounded-lg">
        {title && (
          <h4 className="text-center font-bold text-sm mb-2 text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            {title}
          </h4>
        )}
        {renderChart()}
      </div>
    </div>
  );
}
