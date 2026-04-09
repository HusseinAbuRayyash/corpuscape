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


const YT_BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

function extractJsonFromHtml(html: string, key: string): any | null {
  const idx = html.indexOf(`"${key}":`);
  if (idx === -1) return null;
  const keyIdx = html.lastIndexOf("{", idx);
  if (keyIdx === -1) return null;
  let depth = 0;
  let end = -1;
  for (let i = keyIdx; i < html.length; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end === -1) return null;
  try { return JSON.parse(html.slice(keyIdx, end + 1)); } catch { return null; }
}

function parseXmlCaptions(xml: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const re = /<text[^>]+start="([\d.]+)"[^>]*dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const text = m[3]
      .replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/<[^>]+>/g, "").trim();
    if (text) segments.push({
      text,
      offset: Math.round(parseFloat(m[1]) * 1000),
      duration: Math.round(parseFloat(m[2]) * 1000),
    });
  }
  return segments;
}

function parseJsonCaptions(raw: string): TranscriptSegment[] {
  const data = JSON.parse(raw);
  const segments: TranscriptSegment[] = [];
  for (const event of (data.events ?? [])) {
    if (!event.segs) continue;
    const text = event.segs.map((s: any) => (s.utf8 ?? "").replace(/\n/g, " ")).join("").trim();
    if (text) segments.push({ text, offset: event.tStartMs, duration: event.dDurationMs });
  }
  return segments;
}

export async function fetchYouTubeTranscript(url: string): Promise<{
  text: string;
  language: string;
  videoId: string;
  segments: TranscriptSegment[];
}> {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error("Could not extract video ID from URL. Supported formats: youtube.com/watch?v=…, youtu.be/…, youtube.com/shorts/…");

  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: YT_BROWSER_HEADERS,
  });
  if (!pageRes.ok) throw new Error(`Could not load YouTube page (HTTP ${pageRes.status})`);

  const cookies = pageRes.headers.getSetCookie?.() ?? [];
  const cookieHeader = cookies.map((c) => c.split(";")[0]).join("; ");

  const html = await pageRes.text();

  const playerData = extractJsonFromHtml(html, "captionTracks");
  const captions = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks
    ?? playerData?.captionTracks;

  if (!captions || captions.length === 0) {
    const directXml = await tryDirectTimedText(videoId, cookieHeader);
    if (directXml) return directXml;
    throw new Error("This video has no available captions. Try a video with auto-generated or manual subtitles enabled.");
  }

  const preferred = captions.find((t: any) => t.languageCode?.startsWith("en")) || captions[0];
  const detectedLang: string = preferred.languageCode || "auto-detected";
  const baseUrl: string = preferred.baseUrl;

  const captionRes = await fetch(baseUrl, {
    headers: { ...YT_BROWSER_HEADERS, ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
  });

  if (captionRes.ok) {
    const raw = await captionRes.text();
    const segments = raw.trim().startsWith("{") ? parseJsonCaptions(raw) : parseXmlCaptions(raw);
    if (segments.length > 0) {
      return { text: segments.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim(), language: detectedLang, videoId, segments };
    }
  }

  const fallback = await tryDirectTimedText(videoId, cookieHeader);
  if (fallback) return fallback;

  throw new Error("No transcript segments found. The video may have captions disabled or only auto-generated captions in an unsupported format.");
}

async function tryDirectTimedText(videoId: string, cookieHeader: string): Promise<{ text: string; language: string; videoId: string; segments: TranscriptSegment[] } | null> {
  for (const lang of ["en", "en-US", "ar", "fr", "de", "es"]) {
    try {
      const res = await fetch(
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=vtt`,
        { headers: { ...YT_BROWSER_HEADERS, ...(cookieHeader ? { Cookie: cookieHeader } : {}) } },
      );
      if (!res.ok) continue;
      const vtt = await res.text();
      if (!vtt || vtt.length < 30 || !vtt.includes("-->")) continue;
      const segments: TranscriptSegment[] = [];
      const vttRe = /(\d{2}:\d{2}:\d{2}\.\d{3}) --> [\d:.]+\n([\s\S]*?)(?=\n\n|\n*$)/g;
      let m: RegExpExecArray | null;
      while ((m = vttRe.exec(vtt)) !== null) {
        const text = m[2].replace(/<[^>]+>/g, "").replace(/\n/g, " ").trim();
        if (text) {
          const [h, min, s] = m[1].split(":").map(parseFloat);
          segments.push({ text, offset: Math.round((h * 3600 + min * 60 + s) * 1000) });
        }
      }
      if (segments.length > 0) {
        return { text: segments.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim(), language: lang, videoId, segments };
      }
    } catch { continue; }
  }
  return null;
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
