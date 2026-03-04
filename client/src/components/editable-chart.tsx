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
  Download, Pencil, Plus, Trash2, Check, Palette, Type,
  BarChart3, BarChartHorizontal, LineChartIcon, AreaChartIcon, PieChartIcon,
  Radar as RadarIcon, ScatterChart as ScatterIcon, ChevronDown,
} from "lucide-react";

const PRESET_PALETTES = [
  { name: "Teal", colors: ["#0d9488", "#14b8a6", "#2dd4bf", "#5eead4", "#99f6e4", "#0891b2", "#06b6d4", "#22d3ee"] },
  { name: "Blue", colors: ["#1e40af", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#1d4ed8", "#3b82f6", "#60a5fa"] },
  { name: "Purple", colors: ["#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#6d28d9", "#7c3aed", "#8b5cf6"] },
  { name: "Warm", colors: ["#dc2626", "#ea580c", "#f59e0b", "#eab308", "#84cc16", "#ef4444", "#f97316", "#fbbf24"] },
  { name: "Mono", colors: ["#1f2937", "#374151", "#4b5563", "#6b7280", "#9ca3af", "#374151", "#4b5563", "#6b7280"] },
  { name: "Forest", colors: ["#065f46", "#047857", "#059669", "#10b981", "#34d399", "#047857", "#059669", "#10b981"] },
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
  const [editing, setEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingAxes, setEditingAxes] = useState(false);
  const [showPalettes, setShowPalettes] = useState(false);
  const [showChartTypes, setShowChartTypes] = useState(false);
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

  const closeAllPanels = useCallback(() => {
    setShowPalettes(false);
    setEditing(false);
    setShowChartTypes(false);
    setEditingAxes(false);
  }, []);

  const togglePanel = useCallback((panel: "types" | "palettes" | "edit" | "axes") => {
    setShowChartTypes(panel === "types" ? prev => !prev : false);
    setShowPalettes(panel === "palettes" ? prev => !prev : false);
    setEditing(panel === "edit" ? prev => !prev : false);
    setEditingAxes(panel === "axes" ? prev => !prev : false);
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
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                    </Bar>
                  </BarChart>
                );

              case "barHorizontal":
                return (
                  <BarChart data={chartData} layout="vertical" margin={{ bottom: xLabel ? 20 : 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis type="number" tick={{ fontSize: 11 }}>{yLabel ? <Label value={yLabel} position="insideBottom" offset={-5} style={{ fontSize: 11, fontWeight: 600, fill: "#6b7280" }} /> : undefined}</XAxis>
                    <YAxis dataKey="label" type="category" width={140} tick={{ fontSize: 10 }}>{xLabel ? <Label value={xLabel} angle={-90} position="insideLeft" offset={15} style={{ fontSize: 11, fontWeight: 600, fill: "#6b7280", textAnchor: "middle" }} /> : undefined}</YAxis>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
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
                    <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2.5} dot={{ fill: colors[0], r: 4 }} activeDot={{ r: 6, fill: colors[1] || colors[0] }} />
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
                    <Area type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2} fill="url(#areaGrad)" />
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
                      label={({ label, percent }) => `${label} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={{ strokeWidth: 1 }}
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
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {editingTitle ? (
            <div className="flex items-center gap-1.5">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Chart title..."
                className="h-7 text-xs w-40"
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
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group"
              data-testid="button-edit-title"
            >
              <Type className="w-3 h-3" />
              {title ? <span className="font-medium text-foreground">{title}</span> : <span className="italic">Add title...</span>}
              <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            size="sm"
            variant={showChartTypes ? "default" : "outline"}
            className="h-6 text-[11px] px-2 gap-1"
            onClick={() => togglePanel("types")}
            data-testid="button-toggle-chart-type"
          >
            <CurrentIcon className="w-3 h-3" />
            {currentTypeInfo.label}
            <ChevronDown className="w-2.5 h-2.5" />
          </Button>
          <Button
            size="sm"
            variant={showPalettes ? "default" : "outline"}
            className="h-6 text-[11px] px-2 gap-1"
            onClick={() => togglePanel("palettes")}
            data-testid="button-toggle-palette"
          >
            <Palette className="w-3 h-3" />Colors
          </Button>
          {hasAxes(chartType) && (
            <Button
              size="sm"
              variant={editingAxes ? "default" : "outline"}
              className="h-6 text-[11px] px-2 gap-1"
              onClick={() => togglePanel("axes")}
              data-testid="button-toggle-axes"
            >
              <Type className="w-3 h-3" />Axes
            </Button>
          )}
          <Button
            size="sm"
            variant={editing ? "default" : "outline"}
            className="h-6 text-[11px] px-2 gap-1"
            onClick={() => togglePanel("edit")}
            data-testid="button-toggle-edit"
          >
            <Pencil className="w-3 h-3" />{editing ? "Done" : "Edit"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[11px] px-2 gap-1"
            onClick={downloadPNG}
            data-testid="button-download-chart"
          >
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
