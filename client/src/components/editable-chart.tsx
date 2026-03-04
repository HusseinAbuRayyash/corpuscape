import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, AreaChart, Area, PieChart, Pie, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter, ZAxis,
} from "recharts";
import {
  Download, Pencil, X, Plus, Trash2, Check, Palette, Type,
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
  { type: "bar", label: "Bar (Vertical)", icon: BarChart3 },
  { type: "barHorizontal", label: "Bar (Horizontal)", icon: BarChartHorizontal },
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
}

const TOOLTIP_STYLE = { borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" };

export function EditableChart({
  data: initialData,
  defaultTitle = "",
  defaultColors = PRESET_PALETTES[0].colors,
  layout = "horizontal",
}: EditableChartProps) {
  const [chartData, setChartData] = useState<ChartDataItem[]>(initialData);
  const [title, setTitle] = useState(defaultTitle);
  const [colors, setColors] = useState<string[]>(defaultColors);
  const [chartType, setChartType] = useState<ChartType>(layout === "vertical" ? "barHorizontal" : "bar");
  const [editing, setEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
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

  const closeAllPanels = useCallback(() => {
    setShowPalettes(false);
    setEditing(false);
    setShowChartTypes(false);
  }, []);

  const currentTypeInfo = CHART_TYPES.find(t => t.type === chartType) || CHART_TYPES[0];
  const CurrentIcon = currentTypeInfo.icon;

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
          No data to display. Use the Edit panel to add items.
        </div>
      );
    }

    const chartHeight = chartType === "barHorizontal" ? "h-72" :
      chartType === "pie" || chartType === "donut" || chartType === "radar" ? "h-80" : "h-80";

    return (
      <div className={chartHeight}>
        <ResponsiveContainer width="100%" height="100%">
          {(() => {
            switch (chartType) {
              case "bar":
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

              case "barHorizontal":
                return (
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="label" type="category" width={150} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {chartData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                    </Bar>
                  </BarChart>
                );

              case "line":
                return (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis dataKey="label" angle={-45} textAnchor="end" height={100} interval={0} tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={colors[0]}
                      strokeWidth={2.5}
                      dot={{ fill: colors[0], r: 4 }}
                      activeDot={{ r: 6, fill: colors[1] || colors[0] }}
                    />
                  </LineChart>
                );

              case "area":
                return (
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors[0]} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={colors[0]} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis dataKey="label" angle={-45} textAnchor="end" height={100} interval={0} tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={colors[0]}
                      strokeWidth={2}
                      fill="url(#areaGrad)"
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
                      outerRadius={chartType === "donut" ? 110 : 120}
                      innerRadius={chartType === "donut" ? 60 : 0}
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
                  <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="75%">
                    <PolarGrid strokeDasharray="3 3" className="opacity-30" />
                    <PolarAngleAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis tick={{ fontSize: 9 }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Radar
                      dataKey="value"
                      stroke={colors[0]}
                      fill={colors[0]}
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  </RadarChart>
                );

              case "scatter":
                return (
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis dataKey="label" name="Item" angle={-45} textAnchor="end" height={100} interval={0} tick={{ fontSize: 10 }} />
                    <YAxis dataKey="value" name="Value" tick={{ fontSize: 11 }} />
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
    <div ref={chartContainerRef} className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Chart title..."
                className="h-8 text-sm w-48"
                data-testid="input-chart-title"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
              />
              <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => setEditingTitle(false)} data-testid="button-save-title">
                <Check className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
              data-testid="button-edit-title"
            >
              <Type className="w-3.5 h-3.5" />
              {title ? <span className="font-medium text-foreground">{title}</span> : <span className="italic">Add title...</span>}
              <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <Button
              size="sm"
              variant={showChartTypes ? "default" : "outline"}
              className="h-7 text-xs px-2.5"
              onClick={() => { setShowChartTypes(!showChartTypes); setShowPalettes(false); setEditing(false); }}
              data-testid="button-toggle-chart-type"
            >
              <CurrentIcon className="w-3.5 h-3.5 mr-1" />
              {currentTypeInfo.label}
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <Button
            size="sm"
            variant={showPalettes ? "default" : "outline"}
            className="h-7 text-xs px-2.5"
            onClick={() => { setShowPalettes(!showPalettes); setEditing(false); setShowChartTypes(false); }}
            data-testid="button-toggle-palette"
          >
            <Palette className="w-3.5 h-3.5 mr-1" />Colors
          </Button>
          <Button
            size="sm"
            variant={editing ? "default" : "outline"}
            className="h-7 text-xs px-2.5"
            onClick={() => { setEditing(!editing); setShowPalettes(false); setShowChartTypes(false); }}
            data-testid="button-toggle-edit"
          >
            <Pencil className="w-3.5 h-3.5 mr-1" />{editing ? "Done" : "Edit"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs px-2.5"
            onClick={downloadPNG}
            data-testid="button-download-chart"
          >
            <Download className="w-3.5 h-3.5 mr-1" />PNG
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showChartTypes && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1.5 p-3 rounded-lg border bg-muted/20">
              {CHART_TYPES.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => { setChartType(type); setShowChartTypes(false); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md border text-xs font-medium transition-all ${
                    chartType === type
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:border-primary/50 hover:bg-background"
                  }`}
                  data-testid={`button-chart-type-${type}`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPalettes && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 p-3 rounded-lg border bg-muted/20">
              {PRESET_PALETTES.map((palette) => (
                <button
                  key={palette.name}
                  onClick={() => applyPalette(palette.colors)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border hover:border-primary/50 hover:bg-background transition-all text-xs font-medium"
                  data-testid={`button-palette-${palette.name.toLowerCase()}`}
                >
                  <div className="flex gap-0.5">
                    {palette.colors.slice(0, 5).map((c, i) => (
                      <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
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
        {editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 rounded-lg border bg-muted/20 space-y-2">
              <div className="max-h-48 overflow-auto space-y-1.5">
                {chartData.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                    <Input
                      value={item.label}
                      onChange={(e) => updateLabel(i, e.target.value)}
                      className="h-7 text-xs flex-1"
                      data-testid={`input-label-${i}`}
                    />
                    <Input
                      type="number"
                      value={item.value}
                      onChange={(e) => updateValue(i, Number(e.target.value))}
                      className="h-7 text-xs w-20"
                      data-testid={`input-value-${i}`}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-7 h-7 text-destructive hover:text-destructive"
                      onClick={() => removeItem(i)}
                      data-testid={`button-remove-bar-${i}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1.5 border-t">
                <Plus className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Label"
                  className="h-7 text-xs flex-1"
                  data-testid="input-new-label"
                  onKeyDown={(e) => e.key === "Enter" && addItem()}
                />
                <Input
                  type="number"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Value"
                  className="h-7 text-xs w-20"
                  data-testid="input-new-value"
                  onKeyDown={(e) => e.key === "Enter" && addItem()}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-7 h-7"
                  onClick={addItem}
                  disabled={!newLabel.trim()}
                  data-testid="button-add-bar"
                >
                  <Check className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div data-export-area className="rounded-lg">
        {title && (
          <h4
            className="text-center font-bold text-sm mb-3 text-foreground"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {title}
          </h4>
        )}
        {renderChart()}
      </div>
    </div>
  );
}
