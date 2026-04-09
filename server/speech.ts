import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface TranscriptSegment {
  text: string;
  offset?: number;
  duration?: number;
}

export interface SpeechStats {
  words: number;
  sentences: number;
  uniqueWords: number;
  typeTokenRatio: number;
  avgWordsPerSentence: number;
  lexicalDensity: number;
  fillerCount: number;
  fillerRate: number;
  fillers: { word: string; count: number }[];
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.trim().match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

export async function fetchYouTubeTranscript(url: string): Promise<{
  text: string;
  language: string;
  videoId: string;
  segments: TranscriptSegment[];
}> {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error("Could not extract video ID from URL. Supported formats: youtube.com/watch?v=…, youtu.be/…, youtube.com/shorts/…");

  const { YoutubeTranscript } = await import("youtube-transcript");
  let items: any[];
  try {
    items = await YoutubeTranscript.fetchTranscript(videoId);
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes("disabled") || msg.includes("Could not retrieve")) {
      throw new Error("This video has no available captions. Try a video with auto-generated or manual subtitles enabled.");
    }
    throw new Error(`YouTube transcript error: ${msg}`);
  }

  if (!items || items.length === 0) {
    throw new Error("No transcript segments found. The video may have no captions.");
  }

  const segments: TranscriptSegment[] = items.map((item: any) => ({
    text: item.text?.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/<[^>]+>/g, "").trim() || "",
    offset: item.offset,
    duration: item.duration,
  })).filter((s: TranscriptSegment) => s.text.length > 0);

  const text = segments.map((s) => s.text).join(" ");
  return { text, language: "auto-detected", videoId, segments };
}

export async function transcribeWithWhisper(
  buffer: Buffer,
  filename: string,
  language?: string,
): Promise<{ text: string; language: string }> {
  const file = new File([buffer], filename);
  const response = await (openai.audio.transcriptions as any).create({
    file,
    model: "whisper-1",
    ...(language && language !== "auto" ? { language } : {}),
    response_format: "verbose_json",
  }) as any;

  const text: string = response.text || "";
  const detectedLang: string = response.language || "unknown";
  return { text, language: detectedLang };
}

const FILLER_WORDS: Record<string, string[]> = {
  en: ["um", "uh", "er", "ah", "hmm", "ehm", "mhm", "you know", "i mean", "like", "right", "okay", "so", "well", "basically", "literally", "actually", "sort of", "kind of"],
  ar: ["يعني", "ايوه", "ممم", "اه", "والله", "عارف"],
  fr: ["euh", "ben", "bah", "hein", "quoi", "voilà"],
  es: ["eh", "este", "o sea", "pues", "bueno"],
  de: ["äh", "ähm", "also", "halt", "ne", "nicht wahr"],
  generic: ["um", "uh", "er", "ah", "hmm"],
};

export function computeSpeechStats(text: string, language = "en"): SpeechStats {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const cleanWords = words.map((w) => w.toLowerCase().replace(/[^\p{L}]/gu, "")).filter((w) => w.length > 0);
  const uniqueWords = new Set(cleanWords);
  const sentences = text.split(/[.!?؟]+/).filter((s) => s.trim().length > 2);

  const fillers = FILLER_WORDS[language] ?? FILLER_WORDS.en;
  const fillerMap = new Map<string, number>();
  const lowerText = text.toLowerCase();

  for (const filler of fillers) {
    const regex = new RegExp(`\\b${filler.replace(/\s+/g, "\\s+")}\\b`, "gi");
    const count = (lowerText.match(regex) || []).length;
    if (count > 0) fillerMap.set(filler, count);
  }

  const fillerList = Array.from(fillerMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([word, count]) => ({ word, count }));

  const fillerCount = fillerList.reduce((sum, f) => sum + f.count, 0);

  return {
    words: words.length,
    sentences: sentences.length,
    uniqueWords: uniqueWords.size,
    typeTokenRatio: words.length > 0 ? Math.round((uniqueWords.size / words.length) * 10000) / 10000 : 0,
    avgWordsPerSentence: sentences.length > 0 ? Math.round((words.length / sentences.length) * 10) / 10 : 0,
    lexicalDensity: Math.round((uniqueWords.size / Math.max(words.length, 1)) * 100) / 100,
    fillerCount,
    fillerRate: words.length > 0 ? Math.round((fillerCount / words.length) * 10000) / 100 : 0,
    fillers: fillerList,
  };
}

export function computeBilingualSpeechStats(sourceText: string, targetText: string) {
  const srcWords = sourceText.split(/\s+/).filter((w) => w.length > 0).length;
  const tgtWords = targetText.split(/\s+/).filter((w) => w.length > 0).length;
  const compressionRatio = srcWords > 0 ? Math.round((tgtWords / srcWords) * 1000) / 1000 : 0;
  const expansionRate = srcWords > 0 ? Math.round(((tgtWords - srcWords) / srcWords) * 10000) / 100 : 0;

  return {
    sourceWords: srcWords,
    targetWords: tgtWords,
    compressionRatio,
    expansionRate,
    isCompressed: compressionRatio < 0.9,
    isExpanded: compressionRatio > 1.1,
  };
}
