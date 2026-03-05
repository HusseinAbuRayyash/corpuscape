import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Palette, ChevronDown, X, Undo2, Edit3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PRESET_PALETTES = [
  { name: "Teal", colors: ["#134e4a", "#115e59", "#0f766e", "#0d9488", "#14b8a6", "#2dd4bf", "#5eead4"] },
  { name: "Blue", colors: ["#1e3a8a", "#1e40af", "#1d4ed8", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd"] },
  { name: "Indigo", colors: ["#312e81", "#3730a3", "#4338ca", "#4f46e5", "#6366f1", "#818cf8", "#a5b4fc"] },
  { name: "Purple", colors: ["#581c87", "#6b21a8", "#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"] },
  { name: "Rose", colors: ["#881337", "#9f1239", "#be123c", "#e11d48", "#f43f5e", "#fb7185", "#fda4af"] },
  { name: "Amber", colors: ["#78350f", "#92400e", "#b45309", "#d97706", "#f59e0b", "#fbbf24", "#fcd34d"] },
  { name: "Green", colors: ["#14532d", "#166534", "#15803d", "#16a34a", "#22c55e", "#4ade80", "#86efac"] },
  { name: "Emerald", colors: ["#064e3b", "#065f46", "#047857", "#059669", "#10b981", "#34d399", "#6ee7b7"] },
  { name: "Rainbow", colors: ["#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#8b5cf6"] },
  { name: "Academic", colors: ["#1e3a5f", "#2a5078", "#366891", "#1a4731", "#24603f", "#2e794d", "#48ab6a"] },
  { name: "Slate", colors: ["#0f172a", "#1e293b", "#334155", "#475569", "#64748b", "#94a3b8", "#cbd5e1"] },
  { name: "Earth", colors: ["#451a03", "#78350f", "#92400e", "#a16207", "#854d0e", "#65a30d", "#4d7c0f"] },
];

interface WordCloudWord {
  text: string;
  value: number;
}

interface WordCloudProps {
  words: WordCloudWord[];
  width?: number;
  height?: number;
  defaultColors?: string[];
  onWordsChange?: (words: WordCloudWord[]) => void;
}

interface PlacedWord {
  text: string;
  value: number;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  rotation: number;
  width: number;
  height: number;
}

function measureText(ctx: CanvasRenderingContext2D, text: string, fontSize: number): { w: number; h: number } {
  ctx.font = `700 ${fontSize}px 'Inter', 'Segoe UI', sans-serif`;
  const metrics = ctx.measureText(text);
  return { w: metrics.width, h: fontSize * 1.2 };
}

function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
  padding: number
): boolean {
  return !(
    ax + aw + padding < bx ||
    bx + bw + padding < ax ||
    ay + ah + padding < by ||
    by + bh + padding < ay
  );
}

function layoutWords(
  words: WordCloudWord[],
  canvasWidth: number,
  canvasHeight: number,
  colors: string[],
  ctx: CanvasRenderingContext2D,
  seed: number
): PlacedWord[] {
  if (words.length === 0) return [];

  const sorted = [...words].sort((a, b) => b.value - a.value);
  const maxVal = sorted[0].value;
  const minVal = sorted[sorted.length - 1].value;
  const range = maxVal - minVal || 1;

  const minFont = 10;
  const maxFont = Math.min(canvasWidth / 8, canvasHeight / 4, 64);

  const placed: PlacedWord[] = [];
  let rng = seed;
  const nextRandom = () => {
    rng = (rng * 16807 + 0) % 2147483647;
    return rng / 2147483647;
  };

  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  for (let wi = 0; wi < sorted.length; wi++) {
    const word = sorted[wi];
    const t = (word.value - minVal) / range;
    const fontSize = Math.round(minFont + t * (maxFont - minFont));
    const color = colors[wi % colors.length];
    const rotation = nextRandom() < 0.15 ? (nextRandom() < 0.5 ? -90 : 90) : 0;

    const { w: textW, h: textH } = measureText(ctx, word.text, fontSize);
    const wordW = rotation !== 0 ? textH : textW;
    const wordH = rotation !== 0 ? textW : textH;

    let bestX = centerX - wordW / 2;
    let bestY = centerY - wordH / 2;
    let foundSpot = false;

    for (let radius = 0; radius < Math.max(canvasWidth, canvasHeight); radius += 4) {
      const angleStep = radius === 0 ? 1 : Math.max(6, Math.floor(20 * (radius / 100)));
      for (let a = 0; a < angleStep; a++) {
        const angle = (a / angleStep) * 2 * Math.PI + nextRandom() * 0.3;
        const tryX = centerX + Math.cos(angle) * radius - wordW / 2;
        const tryY = centerY + Math.sin(angle) * radius * 0.7 - wordH / 2;

        if (tryX < 2 || tryY < 2 || tryX + wordW > canvasWidth - 2 || tryY + wordH > canvasHeight - 2) continue;

        let overlaps = false;
        for (const p of placed) {
          if (rectsOverlap(tryX, tryY, wordW, wordH, p.x, p.y, p.width, p.height, 3)) {
            overlaps = true;
            break;
          }
        }

        if (!overlaps) {
          bestX = tryX;
          bestY = tryY;
          foundSpot = true;
          break;
        }
      }
      if (foundSpot) break;
    }

    if (foundSpot) {
      placed.push({
        text: word.text,
        value: word.value,
        x: bestX,
        y: bestY,
        fontSize,
        color,
        rotation,
        width: wordW,
        height: wordH,
      });
    }
  }

  return placed;
}

function drawWords(ctx: CanvasRenderingContext2D, placedWords: PlacedWord[], bgColor: string) {
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  for (const pw of placedWords) {
    ctx.save();
    ctx.font = `700 ${pw.fontSize}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillStyle = pw.color;
    ctx.textBaseline = "top";

    if (pw.rotation !== 0) {
      const cx = pw.x + pw.width / 2;
      const cy = pw.y + pw.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate((pw.rotation * Math.PI) / 180);
      ctx.fillText(pw.text, -pw.height / 2, -pw.width / 2);
    } else {
      ctx.fillText(pw.text, pw.x, pw.y);
    }
    ctx.restore();
  }
}

export function WordCloud({
  words,
  width = 700,
  height = 420,
  defaultColors = PRESET_PALETTES[0].colors,
  onWordsChange,
}: WordCloudProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [colors, setColors] = useState<string[]>(defaultColors);
  const [showPalettes, setShowPalettes] = useState(false);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2147483647));
  const [hoveredWord, setHoveredWord] = useState<PlacedWord | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const placedWordsRef = useRef<PlacedWord[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [removedWords, setRemovedWords] = useState<WordCloudWord[]>([]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const isDark = document.documentElement.classList.contains("dark");
    const bgColor = isDark ? "#1a1a2e" : "#ffffff";

    const placed = layoutWords(words, width, height, colors, ctx, seed);
    placedWordsRef.current = placed;
    drawWords(ctx, placed, bgColor);
  }, [words, width, height, colors, seed]);

  useEffect(() => {
    render();
  }, [render]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let found: PlacedWord | null = null;
    for (const pw of placedWordsRef.current) {
      if (mx >= pw.x && mx <= pw.x + pw.width && my >= pw.y && my <= pw.y + pw.height) {
        found = pw;
        break;
      }
    }
    setHoveredWord(found);
    if (found) {
      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredWord(null);
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!editMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    for (const pw of placedWordsRef.current) {
      if (mx >= pw.x && mx <= pw.x + pw.width && my >= pw.y && my <= pw.y + pw.height) {
        const removedWord = { text: pw.text, value: pw.value };
        setRemovedWords(prev => [...prev, removedWord]);
        const newWords = words.filter(w => w.text !== pw.text);
        if (onWordsChange) onWordsChange(newWords);
        break;
      }
    }
  }, [editMode, words, onWordsChange]);

  const undoLastRemoval = useCallback(() => {
    if (removedWords.length === 0) return;
    const lastRemoved = removedWords[removedWords.length - 1];
    setRemovedWords(prev => prev.slice(0, -1));
    const restored = [...words, lastRemoved].sort((a, b) => b.value - a.value);
    if (onWordsChange) onWordsChange(restored);
  }, [removedWords, words, onWordsChange]);

  const undoAllRemovals = useCallback(() => {
    if (removedWords.length === 0) return;
    const restored = [...words, ...removedWords].sort((a, b) => b.value - a.value);
    setRemovedWords([]);
    if (onWordsChange) onWordsChange(restored);
  }, [removedWords, words, onWordsChange]);

  const downloadPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const exportCanvas = document.createElement("canvas");
    const scale = 3;
    exportCanvas.width = width * scale;
    exportCanvas.height = height * scale;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);

    drawWords(ctx, placedWordsRef.current, "#ffffff");

    const link = document.createElement("a");
    link.download = "word-cloud.png";
    link.href = exportCanvas.toDataURL("image/png", 1.0);
    link.click();
  }, [width, height]);

  const regenerate = useCallback(() => {
    setSeed(Math.floor(Math.random() * 2147483647));
  }, []);

  if (words.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground" data-testid="word-cloud-empty">
        No word data available for the word cloud.
      </div>
    );
  }

  return (
    <div className="space-y-2" ref={containerRef}>
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1.5 min-w-max">
          <Button
            size="sm"
            variant={editMode ? "default" : "outline"}
            className={`h-6 text-[11px] px-2 gap-1 flex-shrink-0 ${editMode ? "bg-red-500 hover:bg-red-600 text-white" : ""}`}
            onClick={() => setEditMode(!editMode)}
            data-testid="button-edit-cloud"
          >
            {editMode ? <X className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
            {editMode ? "Done" : "Edit"}
          </Button>
          {editMode && removedWords.length > 0 && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[11px] px-2 gap-1 flex-shrink-0"
                onClick={undoLastRemoval}
                data-testid="button-undo-cloud"
              >
                <Undo2 className="w-3 h-3" />
                Undo
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[11px] px-2 gap-1 flex-shrink-0"
                onClick={undoAllRemovals}
                data-testid="button-undo-all-cloud"
              >
                <Undo2 className="w-3 h-3" />
                Restore All ({removedWords.length})
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[11px] px-2 gap-1 flex-shrink-0"
            onClick={regenerate}
            data-testid="button-regenerate-cloud"
          >
            <RefreshCw className="w-3 h-3" />
            Shuffle
          </Button>
          <Button
            size="sm"
            variant={showPalettes ? "default" : "outline"}
            className="h-6 text-[11px] px-2 gap-1 flex-shrink-0"
            onClick={() => setShowPalettes((p) => !p)}
            data-testid="button-cloud-palette"
          >
            <Palette className="w-3 h-3" />
            Colors
            <ChevronDown className="w-2.5 h-2.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[11px] px-2 gap-1 flex-shrink-0"
            onClick={downloadPNG}
            data-testid="button-download-cloud"
          >
            <Download className="w-3 h-3" />
            PNG
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showPalettes && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border bg-muted/20">
              {PRESET_PALETTES.map((palette) => (
                <button
                  key={palette.name}
                  onClick={() => {
                    setColors(palette.colors);
                    setShowPalettes(false);
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded-md border hover:border-primary/50 hover:bg-background transition-all text-[11px] font-medium"
                  data-testid={`button-cloud-palette-${palette.name.toLowerCase()}`}
                >
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

      {editMode && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-400 text-xs font-medium"
        >
          <Edit3 className="w-3.5 h-3.5 shrink-0" />
          Click any word to remove it from the cloud.
          {removedWords.length > 0 && (
            <span className="ml-auto text-muted-foreground">{removedWords.length} removed</span>
          )}
        </motion.div>
      )}

      <div className={`relative rounded-lg border overflow-hidden bg-card ${editMode ? "ring-2 ring-red-400/50" : ""}`} data-testid="word-cloud-canvas-container">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleCanvasClick}
          className={`block w-full ${editMode ? "cursor-crosshair" : "cursor-default"}`}
          style={{ maxWidth: width, maxHeight: height }}
          data-testid="word-cloud-canvas"
        />
        {hoveredWord && (
          <div
            className={`absolute pointer-events-none z-50 px-2.5 py-1.5 rounded-md border text-xs font-medium shadow-md ${
              editMode
                ? "bg-red-500 text-white border-red-600"
                : "bg-popover text-popover-foreground"
            }`}
            style={{
              left: Math.min(tooltipPos.x + 12, width - 120),
              top: tooltipPos.y - 30,
            }}
            data-testid="word-cloud-tooltip"
          >
            {editMode && <X className="w-3 h-3 inline mr-1" />}
            <span className="font-bold">{hoveredWord.text}</span>
            <span className={`ml-1.5 ${editMode ? "text-red-100" : "text-muted-foreground"}`}>
              {editMode ? "click to remove" : `(${hoveredWord.value})`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}