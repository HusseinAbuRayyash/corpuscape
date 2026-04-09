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

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]+>/g, "")
    .trim();
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
  const captionUrl: string = preferred.baseUrl;
  const detectedLang: string = preferred.languageCode || "auto-detected";

  const xmlRes = await fetch(captionUrl + "&fmt=srv3");
  if (!xmlRes.ok) throw new Error("Failed to fetch caption track.");

  const xmlText = await xmlRes.text();

  const segRe = /<p\s[^>]*t="(\d+)"[^>]*d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  const segments: TranscriptSegment[] = [];
  let m: RegExpExecArray | null;
  while ((m = segRe.exec(xmlText)) !== null) {
    const text = decodeXmlEntities(m[3]);
    if (text) segments.push({ text, offset: Number(m[1]), duration: Number(m[2]) });
  }

  if (segments.length === 0) {
    const fallbackRe = /<text\s[^>]*start="([^"]+)"[^>]*dur="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g;
    const xmlRes2 = await fetch(captionUrl);
    const xmlText2 = await xmlRes2.text();
    let m2: RegExpExecArray | null;
    while ((m2 = fallbackRe.exec(xmlText2)) !== null) {
      const text = decodeXmlEntities(m2[3]);
      if (text) segments.push({ text, offset: Math.round(parseFloat(m2[1]) * 1000), duration: Math.round(parseFloat(m2[2]) * 1000) });
    }
  }

  if (segments.length === 0) throw new Error("No transcript segments found. The video may have no captions.");

  const text = segments.map((s) => s.text).join(" ");
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
