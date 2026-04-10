import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { AIAnalysisPanel } from "@/components/ai-analysis-panel";
import { AIResultDisplay } from "@/components/ai-result-display";
import { MarkdownRender } from "@/components/markdown-render";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic2, Upload, FileText, ArrowLeftRight, BarChart3, Brain,
  Loader2, Copy, Download, Check, Waves, MessageSquare, Award,
  ChevronRight, Headphones, RefreshCw, Info, Languages, Users,
  Hash, BookOpen, Repeat2, UserCheck, Pencil, X,
  Scissors, Globe, Activity,
} from "lucide-react";

const THEME = {
  gradient: "from-fuchsia-500 to-violet-600",
  accent: "text-fuchsia-600 dark:text-fuchsia-400",
  activeBg: "bg-fuchsia-50 dark:bg-fuchsia-950/30",
  activeBorder: "border-fuchsia-500",
  badge: "bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-300",
};

const WHISPER_LANGUAGES = [
  { code: "auto", label: "Auto-detect" },
  { code: "en", label: "English" }, { code: "ar", label: "Arabic" },
  { code: "fr", label: "French" }, { code: "es", label: "Spanish" },
  { code: "de", label: "German" }, { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" }, { code: "ru", label: "Russian" },
  { code: "zh", label: "Chinese" }, { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" }, { code: "tr", label: "Turkish" },
  { code: "fa", label: "Persian" }, { code: "he", label: "Hebrew" },
  { code: "hi", label: "Hindi" }, { code: "nl", label: "Dutch" },
  { code: "pl", label: "Polish" }, { code: "sv", label: "Swedish" },
  { code: "da", label: "Danish" }, { code: "no", label: "Norwegian" },
];

type SpeechMode = "monolingual" | "bilingual" | "transcript";
type InputMethod = "upload" | "paste";

const ACCEPTED_AUDIO_VIDEO = ".mp3,.mp4,.wav,.m4a,.ogg,.flac,.webm,.aac,.opus,.wma,.mkv,.mov,.avi,.mpeg,.mpga";
const ACCEPTED_AUDIO_VIDEO_LABEL = "MP3, MP4, WAV, M4A, OGG, FLAC, WebM, AAC, Opus, WMA, MKV, MOV, AVI";

interface TranscriptData {
  corpusId: string;
  text: string;
  language: string;
  stats: {
    words: number; sentences: number; uniqueWords: number;
    typeTokenRatio: number; avgWordsPerSentence: number;
    lexicalDensity: number; fillerCount: number; fillerRate: number;
    fillers: { word: string; count: number }[];
  };
  segments?: { text: string; offset?: number; duration?: number }[];
}

function useClipboard() {
  const [copied, setCopied] = useState(false);
  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return { copy, copied };
}

// ── Speaker colour palette ────────────────────────────────────────────────────
const SPEAKER_PALETTE = [
  { badge: "bg-fuchsia-500 text-white", bubble: "bg-fuchsia-50 dark:bg-fuchsia-950/25 border-fuchsia-200/70 dark:border-fuchsia-800/40", name: "text-fuchsia-700 dark:text-fuchsia-300" },
  { badge: "bg-violet-500 text-white",  bubble: "bg-violet-50 dark:bg-violet-950/25 border-violet-200/70 dark:border-violet-800/40",   name: "text-violet-700 dark:text-violet-300"   },
  { badge: "bg-sky-500 text-white",     bubble: "bg-sky-50 dark:bg-sky-950/25 border-sky-200/70 dark:border-sky-800/40",               name: "text-sky-700 dark:text-sky-300"         },
  { badge: "bg-emerald-500 text-white", bubble: "bg-emerald-50 dark:bg-emerald-950/25 border-emerald-200/70 dark:border-emerald-800/40", name: "text-emerald-700 dark:text-emerald-300" },
  { badge: "bg-amber-500 text-white",   bubble: "bg-amber-50 dark:bg-amber-950/25 border-amber-200/70 dark:border-amber-800/40",        name: "text-amber-700 dark:text-amber-300"     },
  { badge: "bg-rose-500 text-white",    bubble: "bg-rose-50 dark:bg-rose-950/25 border-rose-200/70 dark:border-rose-800/40",            name: "text-rose-700 dark:text-rose-300"       },
  { badge: "bg-indigo-500 text-white",  bubble: "bg-indigo-50 dark:bg-indigo-950/25 border-indigo-200/70 dark:border-indigo-800/40",    name: "text-indigo-700 dark:text-indigo-300"   },
];

// Parse "Speaker N: text" or "A: text" patterns — also strips markdown **bold** markers
function parseSpeakerTurns(text: string): { speaker: string; text: string }[] | null {
  const SPEAKER_RE = /^([A-Za-z\u0600-\u06FF][\w\u0600-\u06FF\s]{0,40}?(?:\s*\([^)]{0,30}\))?)\s*:\s*(.+)/;
  const lines = text.split(/\r?\n/);
  const turns: { speaker: string; text: string }[] = [];
  let curSpeaker = "";
  let curText = "";

  for (const raw of lines) {
    // Strip markdown bold/italic markers (* ** _ __ etc.) and leading hyphens/bullets before matching
    const line = raw.replace(/\*{1,3}|_{1,3}/g, "").replace(/^[-•]\s*/, "").trim();
    if (!line) continue;
    const m = line.match(SPEAKER_RE);
    if (m && m[2].trim()) {
      if (curSpeaker) turns.push({ speaker: curSpeaker, text: curText.trim() });
      curSpeaker = m[1].trim();
      curText = m[2];
    } else if (curSpeaker) {
      curText += " " + line;
    }
  }
  if (curSpeaker && curText.trim()) turns.push({ speaker: curSpeaker, text: curText.trim() });

  const uniq = new Set(turns.map(t => t.speaker));
  return (uniq.size >= 2 || turns.length >= 3) ? turns : null;
}

// Split plain text into readable paragraphs
function toReadableParagraphs(text: string): string[] {
  // Try punctuation-based splitting first (works for English, Arabic ،, etc.)
  const bySentence = text.match(/[^.!?؟\n]+[.!?؟\n]*/g) ?? [];
  if (bySentence.length >= 3) {
    const CHUNK = 4;
    const paras: string[] = [];
    for (let i = 0; i < bySentence.length; i += CHUNK) {
      const chunk = bySentence.slice(i, i + CHUNK).join("").trim();
      if (chunk) paras.push(chunk);
    }
    return paras;
  }
  // Fallback: chunk by word count (~40 words per paragraph)
  const words = text.trim().split(/\s+/);
  const WORDS_PER_PARA = 40;
  const paras: string[] = [];
  for (let i = 0; i < words.length; i += WORDS_PER_PARA) {
    paras.push(words.slice(i, i + WORDS_PER_PARA).join(" "));
  }
  return paras.length ? paras : [text];
}

// Detect RTL-dominant text (Arabic, Hebrew, Farsi, …)
function isRtl(text: string): boolean {
  const rtlChars = (text.match(/[\u0600-\u06FF\u0750-\u077F\u0590-\u05FF\u200F]/g) ?? []).length;
  return rtlChars / text.length > 0.25;
}

// Parse structured speaker profiles — handles both multi-line bullet format and single-line format
function parseSpeakerProfiles(result: string): { speaker: string; role: string; words: string; turns: string; style: string }[] {
  const profileIdx = result.search(/(?:^|\n)\s*(?:\*{1,2})?speaker\s*profile/im);
  if (profileIdx < 0) return [];

  const clean = result.slice(profileIdx).replace(/\*{1,3}|_{1,2}/g, "");

  // Collect per-speaker raw blocks by scanning line by line
  // A "speaker header line" is one that starts with a name followed by ":" at column 0 (after trimming)
  // We exclude pure bullet lines and the "Speaker Profile:" header itself
  const HEADER = /^speaker\s*profile/i;
  const SPEAKER_HEADER = /^([A-Z][\w\s()\-]{0,60}?)\s*:\s*(.*)/; // starts with capital letter
  const BULLET = /^[-•]\s*/;

  const rawLines = clean.split("\n").map(l => l.trim());
  const blocks: { speaker: string; lines: string[] }[] = [];
  let cur: { speaker: string; lines: string[] } | null = null;

  for (const line of rawLines) {
    if (!line || HEADER.test(line)) continue;
    if (BULLET.test(line)) {
      cur?.lines.push(line.replace(BULLET, ""));
      continue;
    }
    const m = line.match(SPEAKER_HEADER);
    if (m) {
      if (cur) blocks.push(cur);
      cur = { speaker: m[1].trim(), lines: m[2] ? [m[2]] : [] };
    } else if (cur) {
      cur.lines.push(line);
    }
  }
  if (cur) blocks.push(cur);

  return blocks.map(({ speaker, lines }) => {
    const body = lines.join(" ");
    const get = (re: RegExp) => {
      const found = lines.find(l => re.test(l)) ?? "";
      return found.replace(re, "").replace(/^[:\s]+/, "").trim();
    };
    const role  = get(/^role|^position/i);
    const words = get(/\bword/i) || (body.match(/[~≈]?(\d+)\s+word/i)?.[0] ?? "");
    const turns = get(/\bturn/i) || (body.match(/(\d+)\s+turn/i)?.[0] ?? "");
    const style = get(/\bstyle|\btone|\bmanner/i);
    // fallback: use the full description as style text if nothing parsed
    const desc  = style || body.replace(/[~≈]?\d+\s+(?:words?|turns?)[^.]*\.?\s*/gi, "").trim();
    return { speaker, role, words, turns, style: desc };
  }).filter(p => p.speaker && p.speaker.length < 60);
}

// ── Disfluency section parser ──────────────────────────────────────────────
type DisfluencyType = "hesitation" | "fillers" | "repairs" | "repetitions" | "prolongations" | "codeswitching" | "fluency" | "interpreting" | "other";

interface DisfluencySection { title: string; body: string; type: DisfluencyType; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DISF_META: Record<DisfluencyType, { icon: any; color: string; bg: string; border: string; badge: string }> = {
  hesitation:    { icon: Mic2,        color: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-950/20",    border: "border-amber-200 dark:border-amber-800/30",   badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"   },
  fillers:       { icon: MessageSquare,color: "text-sky-600 dark:text-sky-400",      bg: "bg-sky-50 dark:bg-sky-950/20",        border: "border-sky-200 dark:border-sky-800/30",       badge: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300"           },
  repairs:       { icon: Scissors,    color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/20",  border: "border-orange-200 dark:border-orange-800/30", badge: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"},
  repetitions:   { icon: Repeat2,     color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/20",  border: "border-violet-200 dark:border-violet-800/30", badge: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"},
  prolongations: { icon: Waves,       color: "text-fuchsia-600 dark:text-fuchsia-400",bg:"bg-fuchsia-50 dark:bg-fuchsia-950/20",border:"border-fuchsia-200 dark:border-fuchsia-800/30",badge:"bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-300"},
  codeswitching: { icon: Globe,       color: "text-teal-600 dark:text-teal-400",     bg: "bg-teal-50 dark:bg-teal-950/20",      border: "border-teal-200 dark:border-teal-800/30",     badge: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"       },
  fluency:       { icon: Activity,    color: "text-emerald-600 dark:text-emerald-400",bg:"bg-emerald-50 dark:bg-emerald-950/20",border:"border-emerald-200 dark:border-emerald-800/30",badge:"bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"},
  interpreting:  { icon: Languages,   color: "text-rose-600 dark:text-rose-400",     bg: "bg-rose-50 dark:bg-rose-950/20",      border: "border-rose-200 dark:border-rose-800/30",     badge: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300"       },
  other:         { icon: FileText,    color: "text-muted-foreground",                bg: "bg-muted/20",                         border: "border-border/40",                            badge: "bg-muted text-muted-foreground"                                         },
};

function classifyDisfluency(title: string): DisfluencyType {
  const t = title.toLowerCase();
  if (/hesit/.test(t)) return "hesitation";
  if (/fill|discourse/.test(t)) return "fillers";
  if (/false|repair|self/.test(t)) return "repairs";
  if (/repet/.test(t)) return "repetitions";
  if (/prolong/.test(t)) return "prolongations";
  if (/code|switch|mixing|bilingua|multilingua|transition/.test(t)) return "codeswitching";
  if (/fluency|overall|profile|rating/.test(t)) return "fluency";
  if (/interpr/.test(t)) return "interpreting";
  return "other";
}

function parseDisfluencySections(result: string): { sections: DisfluencySection[]; rating: number | null; ratingLabel: string } {
  // Extract fluency rating value
  const ratingMatch = result.match(/\*\*Fluency Rating[^*]*?(\d+(?:\.\d+)?)\s*out of\s*5[^*]*?\*\*/i)
    ?? result.match(/(\d+(?:\.\d+)?)\s*out of\s*5/i)
    ?? result.match(/(\d+(?:\.\d+)?)\/5/i);
  const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

  // Extract rating label (e.g. "Moderate Fluency")
  const labelMatch = result.match(/\d+\s*out of\s*5\s*\(([^)]+)\)/i)
    ?? result.match(/Fluency Rating[^:]*:\s*\**\d[^(]*\(([^)]+)\)/i);
  const ratingLabel = labelMatch ? labelMatch[1].replace(/\*{1,3}/g, "").trim() : "";

  // Split on bold numbered headers **N. Title** or ## headers
  const SPLIT_RE = /(?=\n\s*\*\*\d+\.\s|\n#{2,3}\s)/g;
  const chunks = result.split(SPLIT_RE);

  const sections: DisfluencySection[] = [];

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (trimmed.length < 30) continue;

    // Match **N. Title** or ## Title or ### Title
    const hm = trimmed.match(/^\*\*(\d+\.\s*[^*\n]+)\*\*/m)
      ?? trimmed.match(/^#{2,3}\s+(.+?)(?:\n|$)/m);
    if (!hm) continue;

    const title = hm[1].replace(/\*{1,3}/g, "").replace(/←[^\n]*/g, "").trim();
    const body  = trimmed.slice(hm[0].length).trim();
    if (!title || body.length < 20) continue;

    const type = classifyDisfluency(title);
    sections.push({ title, body, type });
  }

  return { sections, rating, ratingLabel };
}

// Fluency rating bar color based on score
function ratingColor(r: number) {
  if (r >= 4.5) return { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" };
  if (r >= 3.5) return { bar: "bg-sky-500",     text: "text-sky-600 dark:text-sky-400" };
  if (r >= 2.5) return { bar: "bg-amber-500",   text: "text-amber-600 dark:text-amber-400" };
  if (r >= 1.5) return { bar: "bg-orange-500",  text: "text-orange-600 dark:text-orange-400" };
  return { bar: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" };
}

// Extract only the speaker-labeled lines from an AI result (before profile section)
function extractSpeakerTranscript(result: string): string {
  const profileIdx = result.search(/(?:^|\n)\s*(?:\*{1,2})?speaker\s*profile|(?:^|\n)\s*---/im);
  const raw = profileIdx > 0 ? result.slice(0, profileIdx) : result;
  return raw.trim();
}

// Shared speaker-turn renderer — chat-bubble style with alternating sides
function SpeakerTurnsView({
  turns, colorMap, rtl,
}: {
  turns: { speaker: string; text: string }[];
  colorMap: Map<string, (typeof SPEAKER_PALETTE)[0]>;
  rtl: boolean;
}) {
  // Determine a stable display-order index per speaker (first appearance = 0, second = 1, …)
  const speakerOrder: string[] = [];
  turns.forEach(({ speaker }) => { if (!speakerOrder.includes(speaker)) speakerOrder.push(speaker); });

  return (
    <div className="space-y-4 py-1">
      {turns.map((turn, i) => {
        const col = colorMap.get(turn.speaker) ?? SPEAKER_PALETTE[0];
        const speakerIdx = speakerOrder.indexOf(turn.speaker);
        // Even-index speaker (Speaker 1) → left; odd-index (Speaker 2) → right
        const isRight = speakerIdx % 2 === 1;
        // Avatar initials: first letter of last word in speaker name
        const initial = (turn.speaker.trim().split(/\s+/).pop() ?? "?")[0].toUpperCase();

        return (
          <div key={i} className={`flex items-end gap-2.5 ${isRight ? "flex-row-reverse" : "flex-row"}`} data-testid={`turn-${i}`}>
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-sm ${col.badge.split(" ")[0]}`}>
              {initial}
            </div>

            {/* Bubble */}
            <div className={`max-w-[78%] space-y-1 ${isRight ? "items-end" : "items-start"} flex flex-col`}>
              <span className={`text-[10px] font-semibold px-1 ${col.name} ${isRight ? "self-end" : "self-start"}`}>
                {turn.speaker}
              </span>
              <div className={cn(
                "px-4 py-3 border shadow-sm",
                col.bubble,
                isRight
                  ? "rounded-2xl rounded-br-md"
                  : "rounded-2xl rounded-bl-md",
              )}>
                <p
                  className="text-sm leading-[1.9] text-foreground/90 tracking-wide"
                  dir={rtl ? "rtl" : "ltr"}
                  style={{ textAlign: rtl ? "right" : "left", fontFamily: rtl ? "'Noto Sans Arabic', 'Segoe UI', sans-serif" : undefined }}
                >
                  {turn.text}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TranscriptBox({
  data, label, editable = false,
}: {
  data: TranscriptData; label: string; editable?: boolean;
}) {
  const { copy, copied } = useClipboard();
  const [expanded, setExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [localText, setLocalText] = useState(data.text);

  // Keep localText in sync when new transcription arrives
  useEffect(() => { setLocalText(data.text); }, [data.text]);

  const downloadTxt = () => {
    const blob = new Blob([localText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${label.replace(/\s/g, "_")}_transcript.txt`; a.click(); URL.revokeObjectURL(url);
  };

  const displayText = localText;
  const turns = parseSpeakerTurns(displayText);
  const rtl = isRtl(displayText);
  const paragraphs = turns ? null : toReadableParagraphs(displayText);

  const speakerColorMap = new Map<string, (typeof SPEAKER_PALETTE)[0]>();
  let colorIdx = 0;
  turns?.forEach(({ speaker }) => {
    if (!speakerColorMap.has(speaker)) {
      speakerColorMap.set(speaker, SPEAKER_PALETTE[colorIdx % SPEAKER_PALETTE.length]);
      colorIdx++;
    }
  });

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <div className={`h-0.5 bg-gradient-to-r ${THEME.gradient}`} />
      <div className="p-4 bg-card/60">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${THEME.badge}`}>{data.language}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{data.stats.words.toLocaleString()} words</span>
            {turns && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-700 dark:text-fuchsia-300">
                {speakerColorMap.size} speaker{speakerColorMap.size !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex gap-1">
            {editable && !editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="Edit transcript (fix typos)"
                data-testid="button-edit-transcript"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {!editMode && (
              <>
                <button onClick={() => copy(localText)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Copy" data-testid="button-copy-transcript">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
                <button onClick={downloadTxt} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Download .txt" data-testid="button-download-transcript">
                  <Download className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Edit mode */}
        {editMode ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Pencil className="w-3.5 h-3.5 text-fuchsia-500" />
              <span className="text-xs font-semibold text-fuchsia-600 dark:text-fuchsia-400">Edit mode — fix typos, then save</span>
            </div>
            <Textarea
              value={localText}
              onChange={(e) => setLocalText(e.target.value)}
              className="min-h-[280px] text-sm leading-relaxed resize-y font-mono"
              dir={rtl ? "rtl" : "ltr"}
              data-testid="textarea-edit-transcript"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setEditMode(false)}
                className={`h-8 text-xs bg-gradient-to-r ${THEME.gradient} text-white border-0 hover:opacity-90`}
                data-testid="button-save-transcript-edit"
              >
                <Check className="w-3.5 h-3.5 mr-1.5" /> Save changes
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setLocalText(data.text); setEditMode(false); }}
                className="h-8 text-xs"
                data-testid="button-cancel-transcript-edit"
              >
                <X className="w-3.5 h-3.5 mr-1.5" /> Revert
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Speaker legend */}
            {turns && speakerColorMap.size > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {[...speakerColorMap.entries()].map(([name, col]) => (
                  <span key={name} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${col.bubble}`}>
                    <span className={`w-2 h-2 rounded-full ${col.badge.split(" ")[0]}`} />
                    <span className={col.name}>{name}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Transcript body */}
            <div
              className={cn("overflow-y-auto pr-1 transition-all duration-300", expanded ? "max-h-[640px]" : "max-h-80")}
              dir={rtl ? "rtl" : "ltr"}
            >
              {turns ? (
                <SpeakerTurnsView turns={turns} colorMap={speakerColorMap} rtl={rtl} />
              ) : (
                <div className="space-y-3">
                  {paragraphs!.map((para, i) => (
                    <p key={i} className="text-sm leading-[1.9] text-foreground/85 px-0.5" style={{ textAlign: rtl ? "right" : "left" }}>
                      {para}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Expand toggle */}
            <button
              onClick={() => setExpanded(e => !e)}
              className="mt-3 w-full flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors py-1"
              data-testid="button-expand-transcript"
            >
              <ChevronRight className={cn("w-3.5 h-3.5 transition-transform duration-200", expanded ? "rotate-[-90deg]" : "rotate-90")} />
              {expanded ? "Show less" : "Show full transcript"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function StatPill({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <motion.div
      className="metric-card p-4 text-center"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
    >
      <p className="text-2xl font-extrabold tabular-nums tracking-tight text-gradient">{typeof value === "number" ? value.toLocaleString() : value}</p>
      <p className="text-[11px] text-muted-foreground mt-1 font-medium uppercase tracking-wider">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>}
    </motion.div>
  );
}

function InputPanel({
  method, setMethod, lang, setLang,
  onUpload, uploadPending,
  onUploadGemini, geminiPending,
  pasteText, setPasteText, onPaste, pastePending,
  label = "Source",
}: any) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [engine, setEngine] = useState<"whisper" | "gemini">("whisper");
  const activeUploadPending = engine === "gemini" ? geminiPending : uploadPending;
  const handleFile = (file: File) => engine === "gemini" ? onUploadGemini(file) : onUpload(file);

  return (
    <div className="space-y-4">
      {/* Method switcher */}
      <div className="flex gap-1.5 p-1 bg-muted/40 rounded-xl w-fit">
        {([["upload", Upload, "Upload / Record"], ["paste", FileText, "Paste Text"]] as [InputMethod, any, string][]).map(([m, Icon, lbl]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            data-testid={`tab-input-${m}`}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150",
              method === m
                ? "bg-white dark:bg-slate-800 shadow-sm text-fuchsia-600 dark:text-fuchsia-400"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {lbl}
          </button>
        ))}
      </div>

      {/* Upload */}
      {method === "upload" && (
        <motion.div key="up" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {/* Engine + language row */}
          <div className="flex gap-2 items-center flex-wrap">
            {/* Engine toggle */}
            <div className="flex gap-1 p-0.5 bg-muted/50 rounded-lg border border-border/40">
              {(["whisper", "gemini"] as const).map((eng) => (
                <button
                  key={eng}
                  type="button"
                  onClick={() => setEngine(eng)}
                  data-testid={`button-engine-${eng}`}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all duration-150",
                    engine === eng
                      ? "bg-white dark:bg-slate-800 shadow-sm text-fuchsia-600 dark:text-fuchsia-400"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {eng === "whisper" ? "Whisper" : "✦ Gemini"}
                </button>
              ))}
            </div>
            <Select value={lang} onValueChange={setLang}>
              <SelectTrigger className="h-9 text-xs w-40" data-testid={`select-lang-${label.toLowerCase()}`}>
                <Languages className="w-3.5 h-3.5 mr-1 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WHISPER_LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code} className="text-xs">{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_AUDIO_VIDEO}
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            data-testid={`dropzone-audio-${label.toLowerCase()}`}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200",
              dragOver
                ? "border-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-950/20"
                : "border-border/50 hover:border-fuchsia-300 hover:bg-muted/30"
            )}
          >
            {activeUploadPending ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-fuchsia-500 animate-spin" />
                <p className="text-sm font-medium">
                  Transcribing with {engine === "gemini" ? "Gemini AI" : "Whisper"}…
                </p>
                <p className="text-xs text-muted-foreground">This may take a moment for longer recordings</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${THEME.gradient} flex items-center justify-center`}>
                  <Headphones className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Drop audio or video here</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed max-w-sm mx-auto">
                    {ACCEPTED_AUDIO_VIDEO_LABEL} · max {engine === "gemini" ? "20" : "25"} MB
                  </p>
                </div>
                <Button size="sm" variant="outline" className="h-8 text-xs mt-1" onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }} data-testid={`button-browse-file-${label.toLowerCase()}`}>
                  <Upload className="w-3 h-3 mr-1.5" /> Browse file
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Paste */}
      {method === "paste" && (
        <motion.div key="paste" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="flex gap-2 items-center">
            <Select value={lang} onValueChange={setLang}>
              <SelectTrigger className="h-9 text-xs w-44" data-testid={`select-paste-lang-${label.toLowerCase()}`}>
                <Languages className="w-3.5 h-3.5 mr-1 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WHISPER_LANGUAGES.filter(l => l.code !== "auto").map((l) => (
                  <SelectItem key={l.code} value={l.code} className="text-xs">{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={`Paste your ${label.toLowerCase()} transcript here…`}
            className="min-h-[180px] text-sm resize-none"
            data-testid={`textarea-paste-${label.toLowerCase()}`}
          />
          <Button
            onClick={onPaste}
            disabled={!pasteText.trim() || pastePending}
            className={`bg-gradient-to-r ${THEME.gradient} text-white border-0 hover:opacity-90`}
            data-testid={`button-use-text-${label.toLowerCase()}`}
          >
            {pastePending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
            {pastePending ? "Processing…" : "Use This Text"}
          </Button>
        </motion.div>
      )}
    </div>
  );
}

export default function SpeechLab() {
  const { toast } = useToast();
  const [speechMode, setSpeechMode] = useState<SpeechMode>("monolingual");
  const [activeTab, setActiveTab] = useState("input");

  // Source
  const [srcMethod, setSrcMethod] = useState<InputMethod>("upload");
  const [srcLang, setSrcLang] = useState("auto");
  const [srcPasteText, setSrcPasteText] = useState("");
  const [srcData, setSrcData] = useState<TranscriptData | null>(null);

  // Target (bilingual)
  const [tgtMethod, setTgtMethod] = useState<InputMethod>("upload");
  const [tgtLang, setTgtLang] = useState("auto");
  const [tgtPasteText, setTgtPasteText] = useState("");
  const [tgtData, setTgtData] = useState<TranscriptData | null>(null);

  // Analysis results
  const [disfluencyResult, setDisfluencyResult] = useState("");
  const [discourseResult, setDiscourseResult] = useState("");
  const [interpretingResult, setInterpretingResult] = useState("");
  const [qualityResult, setQualityResult] = useState("");
  const [speakersResult, setSpeakersResult] = useState("");
  const [numbersResult, setNumbersResult] = useState("");
  const [terminologyResult, setTerminologyResult] = useState("");
  const [consecutiveResult, setConsecutiveResult] = useState("");
  const [biStats, setBiStats] = useState<any>(null);

  const ready = !!srcData;
  const bilingualReady = speechMode === "bilingual" && !!srcData && !!tgtData;

  // ── Source mutations ────────────────────────────────────────────────────────

  const srcUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData(); fd.append("audio", file); if (srcLang !== "auto") fd.append("language", srcLang);
      const res = await fetch("/api/speech/transcribe", { method: "POST", body: fd });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Transcription failed"); }
      return res.json();
    },
    onSuccess: (data) => {
      setSrcData(data);
      setSpeakersResult("");
      setActiveTab("transcript");
      speakersMutation.mutate(data.corpusId);
      toast({ title: "Transcribed!", description: `Detected: ${data.language} · ${data.stats?.words?.toLocaleString() ?? "?"} words` });
    },
    onError: (e: any) => toast({ title: "Transcription failed", description: e.message, variant: "destructive" }),
  });

  const srcGeminiUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData(); fd.append("audio", file); if (srcLang !== "auto") fd.append("language", srcLang);
      const res = await fetch("/api/speech/transcribe-gemini", { method: "POST", body: fd });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Gemini transcription failed"); }
      return res.json();
    },
    onSuccess: (data) => {
      setSrcData(data);
      setSpeakersResult("");
      setActiveTab("transcript");
      speakersMutation.mutate(data.corpusId);
      toast({ title: "Transcribed with Gemini!", description: `${data.stats?.words?.toLocaleString() ?? "?"} words` });
    },
    onError: (e: any) => toast({ title: "Gemini transcription failed", description: e.message, variant: "destructive" }),
  });

  const srcPasteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/speech/paste", { text: srcPasteText, language: srcLang !== "auto" ? srcLang : undefined });
      return res.json();
    },
    onSuccess: (data) => {
      setSrcData(data);
      setSpeakersResult("");
      setActiveTab("transcript");
      speakersMutation.mutate(data.corpusId);
      toast({ title: "Text loaded", description: `${data.stats?.words?.toLocaleString() ?? "?"} words` });
    },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  // ── Target mutations ────────────────────────────────────────────────────────

  const tgtUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData(); fd.append("audio", file); if (tgtLang !== "auto") fd.append("language", tgtLang);
      const res = await fetch("/api/speech/transcribe", { method: "POST", body: fd });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Transcription failed"); }
      return res.json();
    },
    onSuccess: (data) => { setTgtData(data); toast({ title: "Target transcribed!", description: `Detected: ${data.language}` }); },
    onError: (e: any) => toast({ title: "Transcription failed", description: e.message, variant: "destructive" }),
  });

  const tgtPasteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/speech/paste", { text: tgtPasteText, language: tgtLang !== "auto" ? tgtLang : undefined });
      return res.json();
    },
    onSuccess: (data) => { setTgtData(data); toast({ title: "Target text loaded" }); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  // ── AI mutations ────────────────────────────────────────────────────────────

  const disfluencyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/speech/ai/disfluencies", { corpusId: srcData?.corpusId });
      return res.json();
    },
    onSuccess: (data) => setDisfluencyResult(data.result),
    onError: () => toast({ title: "Analysis failed", variant: "destructive" }),
  });

  const discourseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/speech/ai/discourse", { corpusId: srcData?.corpusId });
      return res.json();
    },
    onSuccess: (data) => setDiscourseResult(data.result),
    onError: () => toast({ title: "Analysis failed", variant: "destructive" }),
  });

  const interpretingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/speech/ai/interpreting", {
        sourceCorpusId: srcData?.corpusId, targetCorpusId: tgtData?.corpusId,
      });
      return res.json();
    },
    onSuccess: (data) => setInterpretingResult(data.result),
    onError: () => toast({ title: "Analysis failed", variant: "destructive" }),
  });

  const qualityMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/speech/ai/quality", {
        sourceCorpusId: srcData?.corpusId, targetCorpusId: tgtData?.corpusId,
      });
      return res.json();
    },
    onSuccess: (data) => setQualityResult(data.result),
    onError: () => toast({ title: "Analysis failed", variant: "destructive" }),
  });

  const biStatsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/speech/bilingual-stats", {
        sourceCorpusId: srcData?.corpusId, targetCorpusId: tgtData?.corpusId,
      });
      return res.json();
    },
    onSuccess: setBiStats,
  });

  const speakersMutation = useMutation({
    mutationFn: async (overrideCorpusId?: string) => {
      const res = await apiRequest("POST", "/api/speech/ai/speakers", { corpusId: overrideCorpusId ?? srcData?.corpusId });
      return res.json();
    },
    onSuccess: (data) => setSpeakersResult(data.result),
    onError: () => toast({ title: "Speaker detection failed", variant: "destructive" }),
  });

  const numbersMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/speech/ai/numbers", {
        sourceCorpusId: srcData?.corpusId, targetCorpusId: tgtData?.corpusId,
      });
      return res.json();
    },
    onSuccess: (data) => setNumbersResult(data.result),
    onError: () => toast({ title: "Analysis failed", variant: "destructive" }),
  });

  const terminologyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/speech/ai/terminology", {
        sourceCorpusId: srcData?.corpusId, targetCorpusId: tgtData?.corpusId,
      });
      return res.json();
    },
    onSuccess: (data) => setTerminologyResult(data.result),
    onError: () => toast({ title: "Analysis failed", variant: "destructive" }),
  });

  const consecutiveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/speech/ai/consecutive", {
        sourceCorpusId: srcData?.corpusId, targetCorpusId: tgtData?.corpusId,
      });
      return res.json();
    },
    onSuccess: (data) => setConsecutiveResult(data.result),
    onError: () => toast({ title: "Analysis failed", variant: "destructive" }),
  });

  // ── Nav ─────────────────────────────────────────────────────────────────────

  const NavItem = ({ value, icon: Icon, label, disabled, hasResult }: {
    value: string; icon: any; label: string; disabled?: boolean; hasResult?: boolean;
  }) => (
    <button
      type="button"
      onClick={() => { if (!disabled) setActiveTab(value); }}
      disabled={disabled}
      data-testid={`tab-speech-${value}`}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 border-l-2",
        activeTab === value
          ? `${THEME.activeBg} ${THEME.accent} ${THEME.activeBorder}`
          : "text-foreground/65 hover:bg-muted/60 hover:text-foreground border-transparent",
        disabled && "opacity-30 cursor-not-allowed hover:bg-transparent hover:text-foreground/65"
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {hasResult && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
    </button>
  );

  const NavGroup = ({ label }: { label: string }) => (
    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 px-3 pt-3 pb-1">{label}</p>
  );

  // ── Reset ────────────────────────────────────────────────────────────────────

  const reset = () => {
    setSrcData(null); setTgtData(null);
    setDisfluencyResult(""); setDiscourseResult("");
    setInterpretingResult(""); setQualityResult("");
    setSpeakersResult(""); setNumbersResult(""); setTerminologyResult(""); setConsecutiveResult("");
    setBiStats(null);
    setActiveTab("input");
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className={`page-header-icon bg-gradient-to-br ${THEME.gradient}`}>
            <Mic2 className="w-5 h-5 text-white relative z-10" />
          </div>
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold italic tracking-tight ${THEME.accent}`} style={{ fontFamily: "'Playfair Display', serif" }} data-testid="text-page-title">
              Speech Lab
            </h1>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5 font-medium tracking-wide">
              Spoken corpus analysis · transcription · interpreting research
            </p>
          </div>
        </div>
        {ready && (
          <button onClick={reset} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid="button-reset-speech">
            <RefreshCw className="w-3.5 h-3.5" /> New session
          </button>
        )}
      </motion.div>

      {/* Main layout */}
      <div className="flex gap-5 items-start">
        {/* Left nav */}
        <div className="w-[176px] shrink-0">
          <div className="sticky top-6 rounded-2xl border bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden">
            <div className={`h-0.5 bg-gradient-to-r ${THEME.gradient}`} />
            <nav className="p-2 pb-3">
              <NavGroup label="Data" />
              <NavItem value="input" icon={Mic2} label="Input & Setup" />
              <NavItem value="transcript" icon={FileText} label="Transcript" disabled={!ready} hasResult={ready} />
              <NavGroup label="Analysis" />
              <NavItem value="stats" icon={BarChart3} label="Speech Stats" disabled={!ready} hasResult={!!srcData?.stats} />
              <NavItem value="speakers" icon={Users} label="Speakers" disabled={!ready} hasResult={!!speakersResult} />
              <NavItem value="disfluencies" icon={Waves} label="Disfluency" disabled={!ready} hasResult={!!disfluencyResult} />
              <NavItem value="discourse" icon={MessageSquare} label="Discourse" disabled={!ready} hasResult={!!discourseResult} />
              {speechMode === "bilingual" && (<>
                <NavGroup label="Interpreting" />
                <NavItem value="interpreting" icon={ArrowLeftRight} label="Strategies" disabled={!bilingualReady} hasResult={!!interpretingResult} />
                <NavItem value="quality" icon={Award} label="Quality" disabled={!bilingualReady} hasResult={!!qualityResult} />
                <NavItem value="numbers" icon={Hash} label="Numbers & Names" disabled={!bilingualReady} hasResult={!!numbersResult} />
                <NavItem value="terminology" icon={BookOpen} label="Terminology" disabled={!bilingualReady} hasResult={!!terminologyResult} />
                <NavItem value="consecutive" icon={Repeat2} label="Consecutive CI" disabled={!bilingualReady} hasResult={!!consecutiveResult} />
              </>)}
              <NavGroup label="AI" />
              <NavItem value="ai" icon={Brain} label="AI Insights" disabled={!ready} />
            </nav>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-5">
          <AnimatePresence mode="wait">

            {/* ── Input ──────────────────────────────────────────────── */}
            {activeTab === "input" && (
              <motion.div key="input" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">

                {/* Mode cards */}
                <div className="polished-card p-5">
                  <h2 className="text-sm font-bold mb-3">Select Mode</h2>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      ["monolingual", Mic2, "Monolingual", "Single-language spoken corpus analysis"],
                      ["bilingual", ArrowLeftRight, "Bilingual / Interpreted", "Source speech + interpretation or translation"],
                      ["transcript", FileText, "Transcript Only", "Paste or upload an existing transcript"],
                    ] as const).map(([mode, Icon, title, desc]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => { setSpeechMode(mode as SpeechMode); reset(); }}
                        data-testid={`button-mode-${mode}`}
                        className={cn(
                          "flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 text-center transition-all duration-200 hover:scale-[1.02]",
                          speechMode === mode
                            ? `border-fuchsia-400 bg-gradient-to-br from-fuchsia-50 to-violet-50 dark:from-fuchsia-950/30 dark:to-violet-950/30 shadow-md`
                            : "border-border/50 hover:border-fuchsia-200 bg-card/60"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                          speechMode === mode ? `bg-gradient-to-br ${THEME.gradient}` : "bg-muted"
                        )}>
                          <Icon className={cn("w-5 h-5", speechMode === mode ? "text-white" : "text-muted-foreground")} />
                        </div>
                        <div>
                          <p className={cn("text-xs font-bold", speechMode === mode ? THEME.accent : "text-foreground")}>{title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Source input */}
                <div className="polished-card p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-md bg-gradient-to-br ${THEME.gradient} flex items-center justify-center`}>
                      <Mic2 className="w-3 h-3 text-white" />
                    </div>
                    <h3 className="text-sm font-bold">
                      {speechMode === "bilingual" ? "Source Speech" : "Speech Input"}
                    </h3>
                  </div>
                  {srcData ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Transcript ready</p>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 truncate">{srcData.stats.words.toLocaleString()} words · {srcData.language}</p>
                      </div>
                      <button onClick={() => { setSrcData(null); setActiveTab("input"); }} className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 text-[11px] font-medium shrink-0">Replace</button>
                    </div>
                  ) : (
                    <InputPanel
                      method={srcMethod} setMethod={setSrcMethod}
                      lang={srcLang} setLang={setSrcLang}
                      onUpload={(f: File) => srcUploadMutation.mutate(f)} uploadPending={srcUploadMutation.isPending}
                      onUploadGemini={(f: File) => srcGeminiUploadMutation.mutate(f)} geminiPending={srcGeminiUploadMutation.isPending}
                      pasteText={srcPasteText} setPasteText={setSrcPasteText}
                      onPaste={() => srcPasteMutation.mutate()} pastePending={srcPasteMutation.isPending}
                      label="Source"
                    />
                  )}
                </div>

                {/* Target input (bilingual only) */}
                {speechMode === "bilingual" && (
                  <motion.div key="tgt" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="polished-card p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                        <Headphones className="w-3 h-3 text-white" />
                      </div>
                      <h3 className="text-sm font-bold">Interpretation / Translation</h3>
                    </div>
                    {tgtData ? (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Target transcript ready</p>
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 truncate">{tgtData.stats.words.toLocaleString()} words · {tgtData.language}</p>
                        </div>
                        <button onClick={() => setTgtData(null)} className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 text-[11px] font-medium shrink-0">Replace</button>
                      </div>
                    ) : (
                      <InputPanel
                        method={tgtMethod} setMethod={setTgtMethod}
                        lang={tgtLang} setLang={setTgtLang}
                        onUpload={(f: File) => tgtUploadMutation.mutate(f)} uploadPending={tgtUploadMutation.isPending}
                        pasteText={tgtPasteText} setPasteText={setTgtPasteText}
                        onPaste={() => tgtPasteMutation.mutate()} pastePending={tgtPasteMutation.isPending}
                        label="Target"
                      />
                    )}
                    {bilingualReady && !biStats && (
                      <Button size="sm" variant="outline" onClick={() => biStatsMutation.mutate()} disabled={biStatsMutation.isPending} className="w-full" data-testid="button-compute-bistats">
                        {biStatsMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5 mr-2" />}
                        Compute bilingual statistics
                      </Button>
                    )}
                  </motion.div>
                )}

                {/* Ready prompt */}
                {ready && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r ${THEME.gradient} text-white shadow-md`}>
                    <Check className="w-5 h-5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-bold">Transcript ready — explore the tabs on the left</p>
                      <p className="text-[11px] opacity-80">
                        {srcData?.stats.words.toLocaleString()} words available for analysis
                        {speechMode === "bilingual" && tgtData ? ` · target: ${tgtData.stats.words.toLocaleString()} words` : ""}
                      </p>
                    </div>
                    <button onClick={() => setActiveTab("transcript")} className="shrink-0 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors" data-testid="button-go-to-transcript">
                      View Transcript →
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ── Transcript ─────────────────────────────────────────── */}
            {activeTab === "transcript" && srcData && (
              <motion.div key="transcript" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

                {/* ── PRIMARY: Speaker-labeled view ── */}
                {(() => {
                  const speakerText = speakersResult ? extractSpeakerTranscript(speakersResult) : "";
                  const speakerTurns = speakerText ? parseSpeakerTurns(speakerText) : null;
                  const rtl = isRtl(srcData.text);

                  const colorMap = new Map<string, (typeof SPEAKER_PALETTE)[0]>();
                  let ci = 0;
                  speakerTurns?.forEach(({ speaker }) => {
                    if (!colorMap.has(speaker)) { colorMap.set(speaker, SPEAKER_PALETTE[ci % SPEAKER_PALETTE.length]); ci++; }
                  });

                  /* Loading skeleton while AI runs */
                  if (speakersMutation.isPending) {
                    return (
                      <div className="polished-card p-5 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${THEME.gradient} flex items-center justify-center shrink-0`}>
                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">Identifying speakers with AI…</p>
                            <p className="text-[11px] text-muted-foreground/60">Gemini is labeling each speaker turn</p>
                          </div>
                        </div>
                        {/* Fake bubbles to preview the layout */}
                        <div className="space-y-3 pt-1">
                          {[{ w: "72%", side: "left" }, { w: "58%", side: "right" }, { w: "80%", side: "left" }, { w: "50%", side: "right" }, { w: "65%", side: "left" }].map((b, i) => (
                            <div key={i} className={`flex ${b.side === "right" ? "justify-end" : "justify-start"}`}>
                              <Skeleton className="h-14 rounded-2xl" style={{ width: b.w }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  /* Speaker view — AI returned parseable turns */
                  if (speakerTurns && speakerTurns.length > 0) {
                    return (
                      <div className="polished-card p-5 space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${THEME.gradient} flex items-center justify-center shrink-0`}>
                              <Users className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <h2 className={`text-sm font-bold ${THEME.accent}`}>Speaker-Labeled Transcript</h2>
                              <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                                {colorMap.size} speaker{colorMap.size !== 1 ? "s" : ""} identified by Gemini AI
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm" variant="outline"
                            onClick={() => speakersMutation.mutate()}
                            disabled={speakersMutation.isPending}
                            className="h-8 text-xs shrink-0"
                            data-testid="button-redetect-speakers"
                          >
                            <RefreshCw className="w-3 h-3 mr-1.5" /> Re-detect
                          </Button>
                        </div>

                        {/* Speaker legend */}
                        <div className="flex flex-wrap gap-2 pb-1 border-b border-border/40">
                          {[...colorMap.entries()].map(([name, col]) => (
                            <span key={name} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${col.bubble}`}>
                              <span className={`w-2 h-2 rounded-full ${col.badge.split(" ")[0]}`} />
                              <span className={col.name}>{name}</span>
                            </span>
                          ))}
                        </div>

                        {/* Speaker bubbles */}
                        <div className="overflow-y-auto max-h-[680px] pr-1" dir={rtl ? "rtl" : "ltr"}>
                          <SpeakerTurnsView turns={speakerTurns} colorMap={colorMap} rtl={rtl} />
                        </div>
                      </div>
                    );
                  }

                  /* AI returned result but can't parse turns — show raw */
                  if (speakersResult) {
                    return (
                      <div className="polished-card p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className={`text-sm font-bold ${THEME.accent} flex items-center gap-2`}>
                            <UserCheck className="w-4 h-4" /> Speaker Analysis
                          </h3>
                          <Button size="sm" variant="outline" onClick={() => speakersMutation.mutate()} className="h-7 text-xs" data-testid="button-redetect-speakers-raw">
                            <RefreshCw className="w-3 h-3 mr-1" /> Re-detect
                          </Button>
                        </div>
                        <pre className="text-sm leading-[1.8] text-foreground/85 whitespace-pre-wrap font-sans" dir={rtl ? "rtl" : "ltr"}>{speakerText || speakersResult}</pre>
                      </div>
                    );
                  }

                  /* Nothing yet — show detect prompt */
                  return (
                    <div className="polished-card p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${THEME.gradient} opacity-20 flex items-center justify-center shrink-0`}>
                            <Users className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold">Speaker Identification</h3>
                            <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                              Gemini will label each turn — ideal for interviews &amp; interpreted speech
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => speakersMutation.mutate()}
                          className={`bg-gradient-to-r ${THEME.gradient} text-white border-0 hover:opacity-90 text-sm shrink-0`}
                          data-testid="button-detect-speakers-transcript"
                        >
                          <UserCheck className="w-4 h-4 mr-2" /> Detect Speakers
                        </Button>
                      </div>
                    </div>
                  );
                })()}

                {/* ── SECONDARY: Raw editable transcript ── */}
                <details className="group" open={!speakersResult && !speakersMutation.isPending}>
                  <summary className="flex items-center gap-2 px-1 py-2 cursor-pointer text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors list-none select-none">
                    <ChevronRight className="w-3.5 h-3.5 transition-transform duration-200 group-open:rotate-90" />
                    <FileText className="w-3.5 h-3.5" />
                    Raw transcript &amp; typo editor
                    <span className="text-[10px] opacity-60 ml-auto">click to expand</span>
                  </summary>
                  <div className="polished-card p-5 space-y-4 mt-2">
                    <div className="flex items-center justify-between">
                      <h2 className={`text-sm font-bold ${THEME.accent}`}>Raw Transcript</h2>
                      <span className="text-[11px] text-muted-foreground/50 flex items-center gap-1">
                        <Pencil className="w-3 h-3" /> Click the pencil to fix typos
                      </span>
                    </div>
                    <TranscriptBox
                      data={srcData}
                      label={speechMode === "bilingual" ? "Source Speech" : "Transcript"}
                      editable
                    />
                    {speechMode === "bilingual" && tgtData && (
                      <TranscriptBox data={tgtData} label="Interpretation / Translation" editable />
                    )}
                  </div>
                </details>

              </motion.div>
            )}

            {/* ── Stats ──────────────────────────────────────────────── */}
            {activeTab === "stats" && srcData && (
              <motion.div key="stats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                <div className="polished-card p-5">
                  <h2 className={`text-sm font-bold mb-4 ${THEME.accent}`}>
                    {speechMode === "bilingual" ? "Source Speech Statistics" : "Speech Statistics"}
                  </h2>
                  <div className="grid grid-cols-3 gap-3">
                    <StatPill label="Total Words" value={srcData.stats.words} />
                    <StatPill label="Unique Words" value={srcData.stats.uniqueWords} />
                    <StatPill label="Sentences" value={srcData.stats.sentences} />
                    <StatPill label="TTR" value={srcData.stats.typeTokenRatio} sub="type-token ratio" />
                    <StatPill label="Avg Words/Sent" value={srcData.stats.avgWordsPerSentence} />
                    <StatPill label="Lexical Density" value={srcData.stats.lexicalDensity} />
                  </div>
                </div>

                {/* Filler summary */}
                {srcData.stats.fillerCount > 0 && (
                  <div className="polished-card p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold">Filler & Hesitation Summary</h3>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${THEME.badge}`}>
                        {srcData.stats.fillerRate}% filler rate
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {srcData.stats.fillers.map((f) => (
                        <div key={f.word} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-fuchsia-50 dark:bg-fuchsia-950/20 border border-fuchsia-200/60 dark:border-fuchsia-800/40">
                          <span className="text-xs font-medium text-fuchsia-700 dark:text-fuchsia-300">"{f.word}"</span>
                          <span className="text-[10px] font-bold text-fuchsia-500 bg-fuchsia-100 dark:bg-fuchsia-900/40 px-1.5 py-0.5 rounded-full">{f.count}×</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bilingual comparison */}
                {speechMode === "bilingual" && tgtData && (
                  <div className="polished-card p-5">
                    <h2 className={`text-sm font-bold mb-4 ${THEME.accent}`}>Target Statistics</h2>
                    <div className="grid grid-cols-3 gap-3">
                      <StatPill label="Total Words" value={tgtData.stats.words} />
                      <StatPill label="Unique Words" value={tgtData.stats.uniqueWords} />
                      <StatPill label="Sentences" value={tgtData.stats.sentences} />
                      <StatPill label="TTR" value={tgtData.stats.typeTokenRatio} />
                      <StatPill label="Avg Words/Sent" value={tgtData.stats.avgWordsPerSentence} />
                      <StatPill label="Lexical Density" value={tgtData.stats.lexicalDensity} />
                    </div>
                    {biStats && (
                      <div className="mt-4 pt-4 border-t border-border/40">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Bilingual Comparison</h4>
                        <div className="grid grid-cols-3 gap-3">
                          <StatPill label="Compression Ratio" value={biStats.compressionRatio} sub="target/source words" />
                          <StatPill label="Expansion Rate" value={`${biStats.expansionRate > 0 ? "+" : ""}${biStats.expansionRate}%`} sub="word count change" />
                          <StatPill label="Direction" value={biStats.isCompressed ? "Compressed ↓" : biStats.isExpanded ? "Expanded ↑" : "Balanced ≈"} />
                        </div>
                      </div>
                    )}
                    {bilingualReady && !biStats && (
                      <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => biStatsMutation.mutate()} disabled={biStatsMutation.isPending} data-testid="button-compute-bistats-stats">
                        {biStatsMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : null} Compute bilingual comparison
                      </Button>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Disfluency ─────────────────────────────────────────── */}
            {activeTab === "disfluencies" && srcData && (() => {
              const parsed = disfluencyResult ? parseDisfluencySections(disfluencyResult) : null;
              const { sections = [], rating = null, ratingLabel = "" } = parsed ?? {};
              const rc = rating !== null ? ratingColor(rating) : null;

              return (
                <motion.div key="disfluencies" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

                  {/* ── Header card ── */}
                  <div className="polished-card p-5 space-y-5">
                    <div className="flex items-start justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${THEME.gradient} flex items-center justify-center shadow-sm`}>
                          <Waves className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h2 className={`text-sm font-bold ${THEME.accent}`}>Disfluency &amp; Fluency Analysis</h2>
                          <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                            Hesitation · repairs · fillers · code-switching · interpreting implications
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {disfluencyResult && (
                          <>
                            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5"
                              onClick={() => navigator.clipboard.writeText(disfluencyResult)}
                              data-testid="button-copy-disfluency">
                              <Copy className="w-3 h-3" /> Copy
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5"
                              onClick={() => disfluencyMutation.mutate()} disabled={disfluencyMutation.isPending}
                              data-testid="button-rerun-disfluency">
                              <RefreshCw className="w-3 h-3" /> Re-run
                            </Button>
                          </>
                        )}
                        {!disfluencyResult && (
                          <Button
                            onClick={() => disfluencyMutation.mutate()}
                            disabled={disfluencyMutation.isPending}
                            className={`bg-gradient-to-r ${THEME.gradient} text-white border-0 hover:opacity-90 text-sm`}
                            data-testid="button-run-disfluency"
                          >
                            {disfluencyMutation.isPending
                              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analysing…</>
                              : <><Waves className="w-4 h-4 mr-2" />Run Analysis</>}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Loading skeleton */}
                    {disfluencyMutation.isPending && (
                      <div className="space-y-4 pt-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground/60 animate-pulse">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-fuchsia-500" />
                          Analyzing hesitation patterns, repairs, and fluency profile…
                        </div>
                        {[92, 78, 85, 65, 72, 88, 55].map((w, i) => (
                          <Skeleton key={i} className="h-3 rounded-full" style={{ width: `${w}%` }} />
                        ))}
                      </div>
                    )}

                    {/* Fluency rating banner */}
                    {rating !== null && rc && (
                      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        className={`rounded-2xl border p-4 space-y-2 ${rc.bar === "bg-emerald-500" ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/30" : rc.bar === "bg-sky-500" ? "bg-sky-50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800/30" : rc.bar === "bg-amber-500" ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30" : "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800/30"}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Activity className={`w-4 h-4 ${rc.text}`} />
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Fluency Rating</span>
                          </div>
                          <span className={`text-lg font-bold tabular-nums ${rc.text}`}>{rating} <span className="text-sm font-normal text-muted-foreground/60">/ 5</span></span>
                        </div>
                        {/* Progress bar */}
                        <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${(rating / 5) * 100}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
                            className={`h-full rounded-full ${rc.bar}`} />
                        </div>
                        {ratingLabel && <p className={`text-xs font-semibold ${rc.text}`}>{ratingLabel}</p>}
                      </motion.div>
                    )}

                    {/* Raw fallback if sections couldn't be parsed */}
                    {disfluencyResult && sections.length === 0 && !disfluencyMutation.isPending && (
                      <AIResultDisplay content={disfluencyResult} onContentChange={setDisfluencyResult} downloadFilename="Disfluency_Analysis" />
                    )}
                  </div>

                  {/* ── Section cards ── */}
                  {sections.length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                      {sections.map((sec, i) => {
                        const meta = DISF_META[sec.type];
                        const Icon = meta.icon;
                        const isInterp = sec.type === "interpreting";

                        return (
                          <motion.div key={i}
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                            className={`rounded-2xl border p-5 space-y-3 ${meta.bg} ${meta.border} ${isInterp ? "ring-1 ring-rose-300/50 dark:ring-rose-700/30" : ""}`}>

                            {/* Section header */}
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${meta.badge}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className={`text-sm font-bold leading-tight ${meta.color}`}>{sec.title}</h3>
                              </div>
                              {isInterp && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 whitespace-nowrap">
                                  Interpreting Focus
                                </span>
                              )}
                              {sec.type === "codeswitching" && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 whitespace-nowrap">
                                  Bilingual
                                </span>
                              )}
                            </div>

                            {/* Content via MarkdownRender (no download buttons here) */}
                            <div className="pl-1">
                              <MarkdownRender content={sec.body} showDownload={false} />
                            </div>
                          </motion.div>
                        );
                      })}

                      {/* Download bar */}
                      <div className="polished-card px-4 py-3 flex items-center justify-between gap-4">
                        <span className="text-[11px] text-muted-foreground/60">
                          {sections.length} section{sections.length !== 1 ? "s" : ""} analysed
                        </span>
                        <div className="[&_.markdown-content]:hidden">
                          <MarkdownRender content={disfluencyResult} showDownload={true} downloadFilename="Disfluency_Analysis" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })()}

            {/* ── Discourse ──────────────────────────────────────────── */}
            {activeTab === "discourse" && srcData && (
              <motion.div key="discourse" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="polished-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className={`text-sm font-bold ${THEME.accent}`}>Discourse Marker Analysis</h2>
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">Structural, contrastive, causal, hedging, and interactive discourse patterns</p>
                    </div>
                    {!discourseResult && (
                      <Button
                        onClick={() => discourseMutation.mutate()}
                        disabled={discourseMutation.isPending}
                        className={`bg-gradient-to-r ${THEME.gradient} text-white border-0 hover:opacity-90 text-sm`}
                        data-testid="button-run-discourse"
                      >
                        {discourseMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-2" />}
                        {discourseMutation.isPending ? "Analysing…" : "Run Analysis"}
                      </Button>
                    )}
                  </div>
                  {discourseMutation.isPending && (
                    <div className="space-y-2">{[100,88,75,60,45].map((w, i) => <Skeleton key={i} className="h-3 rounded-full" style={{ width: `${w}%` }} />)}</div>
                  )}
                  {discourseResult && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <AIResultDisplay content={discourseResult} onContentChange={setDiscourseResult} downloadFilename="Discourse_Analysis" />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Interpreting Strategies ─────────────────────────────── */}
            {activeTab === "interpreting" && bilingualReady && (
              <motion.div key="interpreting" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="polished-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className={`text-sm font-bold ${THEME.accent}`}>Interpreting Strategies Analysis</h2>
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">Omission · Addition · Reformulation · Compression · Coping strategies</p>
                    </div>
                    {!interpretingResult && (
                      <Button
                        onClick={() => interpretingMutation.mutate()}
                        disabled={interpretingMutation.isPending}
                        className={`bg-gradient-to-r ${THEME.gradient} text-white border-0 hover:opacity-90 text-sm`}
                        data-testid="button-run-interpreting"
                      >
                        {interpretingMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowLeftRight className="w-4 h-4 mr-2" />}
                        {interpretingMutation.isPending ? "Analysing…" : "Run Analysis"}
                      </Button>
                    )}
                  </div>
                  {interpretingMutation.isPending && (
                    <div className="space-y-2">{[100,88,75,60,45].map((w, i) => <Skeleton key={i} className="h-3 rounded-full" style={{ width: `${w}%` }} />)}</div>
                  )}
                  {interpretingResult && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <AIResultDisplay content={interpretingResult} onContentChange={setInterpretingResult} downloadFilename="Interpreting_Strategies" />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Quality ────────────────────────────────────────────── */}
            {activeTab === "quality" && bilingualReady && (
              <motion.div key="quality" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="polished-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className={`text-sm font-bold ${THEME.accent}`}>Interpreting Quality Assessment</h2>
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">AIIC rubric · Accuracy · Completeness · Fluency · Register · Coherence</p>
                    </div>
                    {!qualityResult && (
                      <Button
                        onClick={() => qualityMutation.mutate()}
                        disabled={qualityMutation.isPending}
                        className={`bg-gradient-to-r ${THEME.gradient} text-white border-0 hover:opacity-90 text-sm`}
                        data-testid="button-run-quality"
                      >
                        {qualityMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Award className="w-4 h-4 mr-2" />}
                        {qualityMutation.isPending ? "Assessing…" : "Run Assessment"}
                      </Button>
                    )}
                  </div>
                  {qualityMutation.isPending && (
                    <div className="space-y-2">{[100,88,75,60,45].map((w, i) => <Skeleton key={i} className="h-3 rounded-full" style={{ width: `${w}%` }} />)}</div>
                  )}
                  {qualityResult && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <AIResultDisplay content={qualityResult} onContentChange={setQualityResult} downloadFilename="Quality_Assessment" />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Speakers ───────────────────────────────────────────── */}
            {activeTab === "speakers" && srcData && (() => {
              const speakerText  = speakersResult ? extractSpeakerTranscript(speakersResult) : "";
              const speakerTurns = speakerText ? parseSpeakerTurns(speakerText) : null;
              const profiles     = speakersResult ? parseSpeakerProfiles(speakersResult) : [];
              const rtl          = isRtl(srcData.text);
              const colorMap     = new Map<string, (typeof SPEAKER_PALETTE)[0]>();
              let ci = 0;
              speakerTurns?.forEach(({ speaker }) => {
                if (!colorMap.has(speaker)) { colorMap.set(speaker, SPEAKER_PALETTE[ci % SPEAKER_PALETTE.length]); ci++; }
              });
              const totalTurns = speakerTurns?.length ?? 0;
              const totalWords = speakerTurns?.reduce((n, t) => n + t.text.trim().split(/\s+/).length, 0) ?? 0;

              return (
                <motion.div key="speakers" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

                  {/* ── Header card ── */}
                  <div className="polished-card p-5 space-y-5">
                    <div className="flex items-start justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${THEME.gradient} flex items-center justify-center shadow-sm`}>
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h2 className={`text-sm font-bold ${THEME.accent}`}>Speaker Detection &amp; Diarization</h2>
                          <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                            AI labels each turn · speaker profiles · conversation structure
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {speakersResult && (
                          <>
                            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5"
                              onClick={() => navigator.clipboard.writeText(speakersResult)}
                              data-testid="button-copy-speakers">
                              <Copy className="w-3 h-3" /> Copy
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5"
                              onClick={() => speakersMutation.mutate()} disabled={speakersMutation.isPending}
                              data-testid="button-rerun-speakers">
                              <RefreshCw className="w-3 h-3" /> Re-detect
                            </Button>
                          </>
                        )}
                        {!speakersResult && (
                          <Button
                            onClick={() => speakersMutation.mutate()}
                            disabled={speakersMutation.isPending}
                            className={`bg-gradient-to-r ${THEME.gradient} text-white border-0 hover:opacity-90 text-sm`}
                            data-testid="button-run-speakers"
                          >
                            {speakersMutation.isPending
                              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Detecting…</>
                              : <><UserCheck className="w-4 h-4 mr-2" />Detect Speakers</>}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Loading skeleton */}
                    {speakersMutation.isPending && (
                      <div className="space-y-4 pt-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground/60 animate-pulse">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-fuchsia-500" />
                          Gemini is reading the conversation and labeling each speaker turn…
                        </div>
                        <div className="space-y-3">
                          {[{ w: "68%", r: false }, { w: "52%", r: true }, { w: "76%", r: false }, { w: "44%", r: true }, { w: "60%", r: false }].map((b, i) => (
                            <div key={i} className={`flex ${b.r ? "justify-end" : "justify-start"}`}>
                              <Skeleton className="h-14 rounded-2xl" style={{ width: b.w }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Results */}
                    {speakerTurns && speakerTurns.length > 0 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                        {/* Summary stats row */}
                        <div className="flex flex-wrap gap-3 py-3 border-y border-border/40">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground/60 uppercase tracking-wider font-semibold">Speakers</span>
                            <span className={`text-sm font-bold ${THEME.accent}`}>{colorMap.size}</span>
                          </div>
                          <div className="w-px bg-border/40" />
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground/60 uppercase tracking-wider font-semibold">Turns</span>
                            <span className={`text-sm font-bold ${THEME.accent}`}>{totalTurns}</span>
                          </div>
                          <div className="w-px bg-border/40" />
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground/60 uppercase tracking-wider font-semibold">Words</span>
                            <span className={`text-sm font-bold ${THEME.accent}`}>{totalWords.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap gap-2">
                          {[...colorMap.entries()].map(([name, col]) => (
                            <span key={name} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold border ${col.bubble}`}>
                              <span className={`w-2 h-2 rounded-full ${col.badge.split(" ")[0]}`} />
                              <span className={col.name}>{name}</span>
                            </span>
                          ))}
                        </div>

                        {/* Chat bubbles */}
                        <div className="overflow-y-auto max-h-[720px] pr-1 scroll-smooth" dir={rtl ? "rtl" : "ltr"}>
                          <SpeakerTurnsView turns={speakerTurns} colorMap={colorMap} rtl={rtl} />
                        </div>
                      </motion.div>
                    )}

                    {/* Raw fallback when parse failed */}
                    {speakersResult && !speakerTurns && !speakersMutation.isPending && (
                      <AIResultDisplay content={speakersResult} onContentChange={setSpeakersResult} downloadFilename="Speaker_Diarization" />
                    )}
                  </div>

                  {/* ── Speaker Profile cards ── */}
                  {profiles.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="polished-card p-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${THEME.gradient} flex items-center justify-center`}>
                          <UserCheck className="w-3.5 h-3.5 text-white" />
                        </div>
                        <h3 className={`text-sm font-bold ${THEME.accent}`}>Speaker Profiles</h3>
                      </div>
                      <div className={`grid gap-4 ${profiles.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
                        {profiles.map((p, i) => {
                          const col = colorMap.get(p.speaker) ?? SPEAKER_PALETTE[i % SPEAKER_PALETTE.length];
                          return (
                            <div key={i} className={`rounded-2xl border p-4 space-y-3 ${col.bubble}`}>
                              {/* Speaker label */}
                              <div className="flex items-center gap-2.5">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm ${col.badge.split(" ")[0]}`}>
                                  {i + 1}
                                </div>
                                <div>
                                  <p className={`text-sm font-bold ${col.name}`}>{p.speaker}</p>
                                  {p.role && <p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-snug">{p.role}</p>}
                                </div>
                              </div>
                              {/* Stats row */}
                              {(p.words || p.turns) && (
                                <div className="flex gap-4 pt-1 border-t border-border/30">
                                  {p.words && (
                                    <div>
                                      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold">Words</p>
                                      <p className={`text-sm font-bold tabular-nums ${col.name}`}>{p.words.replace(/[~≈]/g, "").trim()}</p>
                                    </div>
                                  )}
                                  {p.turns && (
                                    <div>
                                      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold">Turns</p>
                                      <p className={`text-sm font-bold tabular-nums ${col.name}`}>{p.turns.replace(/[~≈]/g, "").trim()}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                              {/* Style */}
                              {p.style && (
                                <p className="text-[11px] text-foreground/70 leading-relaxed italic border-t border-border/30 pt-2">{p.style}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })()}

            {/* ── Numbers & Names ─────────────────────────────────────── */}
            {activeTab === "numbers" && bilingualReady && (
              <motion.div key="numbers" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="polished-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className={`text-sm font-bold ${THEME.accent}`}>Numbers, Names & Critical Elements</h2>
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">Accuracy of figures · proper nouns · dates · acronyms · cultural references</p>
                    </div>
                    {!numbersResult && (
                      <Button
                        onClick={() => numbersMutation.mutate()}
                        disabled={numbersMutation.isPending}
                        className={`bg-gradient-to-r ${THEME.gradient} text-white border-0 hover:opacity-90 text-sm`}
                        data-testid="button-run-numbers"
                      >
                        {numbersMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Hash className="w-4 h-4 mr-2" />}
                        {numbersMutation.isPending ? "Analysing…" : "Run Analysis"}
                      </Button>
                    )}
                  </div>
                  {numbersMutation.isPending && (
                    <div className="space-y-2">{[100,88,75,60,45].map((w, i) => <Skeleton key={i} className="h-3 rounded-full" style={{ width: `${w}%` }} />)}</div>
                  )}
                  {numbersResult && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <AIResultDisplay content={numbersResult} onContentChange={setNumbersResult} downloadFilename="Numbers_Names_Analysis" />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Terminology ─────────────────────────────────────────── */}
            {activeTab === "terminology" && bilingualReady && (
              <motion.div key="terminology" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="polished-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className={`text-sm font-bold ${THEME.accent}`}>Terminology Consistency</h2>
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">Key term inventory · translation consistency · glossary recommendations</p>
                    </div>
                    {!terminologyResult && (
                      <Button
                        onClick={() => terminologyMutation.mutate()}
                        disabled={terminologyMutation.isPending}
                        className={`bg-gradient-to-r ${THEME.gradient} text-white border-0 hover:opacity-90 text-sm`}
                        data-testid="button-run-terminology"
                      >
                        {terminologyMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BookOpen className="w-4 h-4 mr-2" />}
                        {terminologyMutation.isPending ? "Analysing…" : "Run Analysis"}
                      </Button>
                    )}
                  </div>
                  {terminologyMutation.isPending && (
                    <div className="space-y-2">{[100,88,75,60,45].map((w, i) => <Skeleton key={i} className="h-3 rounded-full" style={{ width: `${w}%` }} />)}</div>
                  )}
                  {terminologyResult && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <AIResultDisplay content={terminologyResult} onContentChange={setTerminologyResult} downloadFilename="Terminology_Consistency" />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Consecutive CI ──────────────────────────────────────── */}
            {activeTab === "consecutive" && bilingualReady && (
              <motion.div key="consecutive" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="polished-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className={`text-sm font-bold ${THEME.accent}`}>Consecutive Interpreting Analysis</h2>
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">Segmentation · memory · reformulation · EVS · CI performance profile</p>
                    </div>
                    {!consecutiveResult && (
                      <Button
                        onClick={() => consecutiveMutation.mutate()}
                        disabled={consecutiveMutation.isPending}
                        className={`bg-gradient-to-r ${THEME.gradient} text-white border-0 hover:opacity-90 text-sm`}
                        data-testid="button-run-consecutive"
                      >
                        {consecutiveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Repeat2 className="w-4 h-4 mr-2" />}
                        {consecutiveMutation.isPending ? "Analysing…" : "Run Analysis"}
                      </Button>
                    )}
                  </div>
                  {consecutiveMutation.isPending && (
                    <div className="space-y-2">{[100,88,75,60,45].map((w, i) => <Skeleton key={i} className="h-3 rounded-full" style={{ width: `${w}%` }} />)}</div>
                  )}
                  {consecutiveResult && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <AIResultDisplay content={consecutiveResult} onContentChange={setConsecutiveResult} downloadFilename="Consecutive_CI_Analysis" />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── AI Insights ─────────────────────────────────────────── */}
            {activeTab === "ai" && srcData && (
              <motion.div key="ai" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <AIAnalysisPanel
                  corpusId={srcData.corpusId}
                  theme={{ gradient: THEME.gradient, accent: THEME.accent, text: THEME.accent }}
                />
              </motion.div>
            )}

          </AnimatePresence>

          {/* Empty state */}
          {activeTab === "input" && !ready && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.3 } }} className="rounded-2xl border-2 border-dashed border-border/40 p-10 text-center space-y-3">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${THEME.gradient} flex items-center justify-center mx-auto opacity-70`}>
                <Mic2 className="w-7 h-7 text-white" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground/70">Select a mode, upload an audio/video file, or paste a transcript to begin</p>
              <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground/50">
                <span className="flex items-center gap-1"><Headphones className="w-3 h-3" /> Audio / video upload</span>
                <span className="flex items-center gap-1"><Mic2 className="w-3 h-3" /> Whisper transcription</span>
                <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> Paste transcript</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
