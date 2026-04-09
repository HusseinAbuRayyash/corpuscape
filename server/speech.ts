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

  const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const pageRes = await fetch(pageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Corpuscape/1.0)",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!pageRes.ok) throw new Error(`Could not load YouTube page (HTTP ${pageRes.status})`);

  const html = await pageRes.text();

  const match = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});(?:\s*var\s|\s*window\[|\s*<\/script>)/s);
  if (!match) throw new Error("Could not parse YouTube player data. The video may be private, age-restricted, or unavailable.");

  let playerData: any;
  try {
    playerData = JSON.parse(match[1]);
  } catch {
    throw new Error("Failed to parse YouTube player response.");
  }

  const captions = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!captions || captions.length === 0) {
    throw new Error("This video has no available captions. Try a video with auto-generated or manual subtitles enabled.");
  }

  const preferred = captions.find((t: any) => t.languageCode?.startsWith("en")) || captions[0];
  const detectedLang: string = preferred.languageCode || "auto-detected";

  const baseUrl: string = preferred.baseUrl;
  const sep = baseUrl.includes("?") ? "&" : "?";
  const jsonUrl = `${baseUrl}${sep}fmt=json3`;

  const jsonRes = await fetch(jsonUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Corpuscape/1.0)" },
  });
  if (!jsonRes.ok) throw new Error(`Failed to fetch caption track (HTTP ${jsonRes.status}).`);

  let captionJson: any;
  try {
    captionJson = await jsonRes.json();
  } catch {
    throw new Error("Could not parse caption data from YouTube.");
  }

  const events: any[] = captionJson?.events ?? [];
  const segments: TranscriptSegment[] = [];

  for (const event of events) {
    if (!event.segs) continue;
    const raw = event.segs
      .map((s: any) => (s.utf8 ?? "").replace(/\n/g, " "))
      .join("")
      .trim();
    if (raw && raw !== "\n") {
      segments.push({
        text: raw,
        offset: event.tStartMs,
        duration: event.dDurationMs,
      });
    }
  }

  if (segments.length === 0) throw new Error("No transcript segments found. The video may have no captions.");

  const text = segments.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim();
  return { text, language: detectedLang, videoId, segments };
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
