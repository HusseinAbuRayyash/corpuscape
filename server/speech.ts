import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Proxy client — used for generateContent (supported by Replit AI integrations proxy)
const geminiAi = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: { apiVersion: "", baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL },
});

// Direct client — used ONLY for File API operations (upload/get/delete) because the
// Replit proxy does not support the /upload/v1beta/files endpoint.
const geminiAiDirect = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
});

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
  console.log(`[yt] page fetch: ${pageRes.status}`);
  if (!pageRes.ok) throw new Error(`Could not load YouTube page (HTTP ${pageRes.status})`);

  const cookies = pageRes.headers.getSetCookie?.() ?? [];
  const cookieHeader = cookies.map((c) => c.split(";")[0]).join("; ");

  const html = await pageRes.text();
  const hasCaptionTracks = html.includes('"captionTracks"');
  const hasPlayerResponse = html.includes("ytInitialPlayerResponse");
  const hasConsent = html.includes("consent.youtube.com") || html.includes("CONSENT");
  console.log(`[yt] html=${html.length}B hasCaptionTracks=${hasCaptionTracks} hasPlayerResponse=${hasPlayerResponse} hasConsent=${hasConsent}`);

  // Check playabilityStatus for unavailable/private/region-locked videos
  const playabilityMatch = html.match(/"playabilityStatus"\s*:\s*\{"status"\s*:\s*"([^"]+)"(?:,"reason"\s*:\s*"([^"]*)")?/);
  const playStatus = playabilityMatch?.[1];
  const playReason = playabilityMatch?.[2];
  console.log(`[yt] playabilityStatus=${playStatus} reason=${playReason}`);
  if (playStatus && playStatus !== "OK" && playStatus !== "LIVE_STREAM_OFFLINE") {
    if (playStatus === "LOGIN_REQUIRED") throw new Error("This video requires sign-in (age-restricted). Try another video or use Paste Text mode.");
    if (playStatus === "UNPLAYABLE") throw new Error(`Video unplayable: ${playReason || "content not available"}. Try Paste Text mode.`);
    throw new Error(`Video unavailable from server (${playReason || playStatus}). This may be region-restricted. Use Paste Text mode — open YouTube, click "…" under the video, then "Open transcript", and paste it here.`);
  }

  const playerData = extractJsonFromHtml(html, "captionTracks");
  const captions = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks
    ?? playerData?.captionTracks;
  console.log(`[yt] captionTracks found: ${captions?.length ?? 0}`);

  if (!captions || captions.length === 0) {
    // Try InnerTube API as alternative
    const innerTube = await tryInnerTubeTranscript(videoId);
    if (innerTube) return innerTube;
    const directXml = await tryDirectTimedText(videoId, cookieHeader);
    if (directXml) return directXml;
    throw new Error("This video has no available captions. Try a video with auto-generated or manual subtitles enabled.");
  }

  const preferred = captions.find((t: any) => t.languageCode?.startsWith("en")) || captions[0];
  const detectedLang: string = preferred.languageCode || "auto-detected";
  const baseUrl: string = preferred.baseUrl;
  console.log(`[yt] fetching caption baseUrl lang=${detectedLang}`);

  const captionRes = await fetch(baseUrl, {
    headers: { ...YT_BROWSER_HEADERS, ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
  });
  console.log(`[yt] captionRes status=${captionRes.status}`);

  if (captionRes.ok) {
    const raw = await captionRes.text();
    console.log(`[yt] caption raw length=${raw.length} starts=${raw.slice(0, 60)}`);
    const segments = raw.trim().startsWith("{") ? parseJsonCaptions(raw) : parseXmlCaptions(raw);
    console.log(`[yt] parsed segments=${segments.length}`);
    if (segments.length > 0) {
      return { text: segments.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim(), language: detectedLang, videoId, segments };
    }
  }

  const innerTube = await tryInnerTubeTranscript(videoId);
  if (innerTube) return innerTube;

  const fallback = await tryDirectTimedText(videoId, cookieHeader);
  if (fallback) return fallback;

  throw new Error("YOUTUBE_BLOCKED:YouTube restricts server-side caption access from cloud servers. To get this transcript: open the video on YouTube → click the three-dot menu (…) below the video → choose 'Open transcript' → copy all the text → paste it in the Paste Text tab.");
}

async function tryInnerTubeTranscript(videoId: string): Promise<{ text: string; language: string; videoId: string; segments: TranscriptSegment[] } | null> {
  try {
    const videoIdBuf = Buffer.from(videoId, "utf8");
    const params = Buffer.concat([
      Buffer.from([0x0a, videoIdBuf.length]),
      videoIdBuf,
    ]).toString("base64");

    const res = await fetch(
      "https://www.youtube.com/youtubei/v1/get_transcript?prettyPrint=false",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": YT_BROWSER_HEADERS["User-Agent"],
          "Accept-Language": "en-US,en;q=0.9",
          "X-YouTube-Client-Name": "1",
          "X-YouTube-Client-Version": "2.20240101.00.00",
          "Origin": "https://www.youtube.com",
          "Referer": `https://www.youtube.com/watch?v=${videoId}`,
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: "WEB",
              clientVersion: "2.20240101.00.00",
              hl: "en",
              gl: "US",
            },
          },
          params,
        }),
      },
    );
    console.log(`[yt/innertube] status=${res.status}`);
    if (!res.ok) return null;

    const data = await res.json();
    const actions = data?.actions ?? [];
    const segments: TranscriptSegment[] = [];

    for (const action of actions) {
      const runs =
        action?.updateEngagementPanelAction?.content?.transcriptRenderer
          ?.content?.transcriptSearchPanelRenderer?.body
          ?.transcriptSegmentListRenderer?.initialSegments ?? [];
      for (const seg of runs) {
        const r = seg?.transcriptSegmentRenderer;
        if (!r) continue;
        const text = (r.snippet?.runs ?? []).map((x: any) => x.text ?? "").join("").trim();
        const offset = parseInt(r.startMs ?? "0", 10);
        const duration = parseInt(r.endMs ?? "0", 10) - offset;
        if (text) segments.push({ text, offset, duration });
      }
    }

    console.log(`[yt/innertube] segments=${segments.length}`);
    if (segments.length === 0) return null;
    return { text: segments.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim(), language: "en", videoId, segments };
  } catch (e: any) {
    console.log(`[yt/innertube] error: ${e.message}`);
    return null;
  }
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
  const isAutoDetect = !language || language === "auto";

  const response = await (openai.audio.transcriptions as any).create({
    file,
    model: "whisper-1",
    // Only lock the language when the user explicitly chose one.
    // Auto-detect lets Whisper handle code-switching (e.g. Arabic + English).
    ...(isAutoDetect ? {} : { language }),
    response_format: "verbose_json",
    // When auto-detecting, hint that the recording may switch languages so
    // Whisper keeps each word in its original spoken language rather than
    // normalising everything to the dominant language.
    ...(isAutoDetect ? {
      prompt: "This recording may contain multiple languages. Do not translate. Transcribe every word exactly as spoken, preserving each language as-is.",
    } : {}),
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

// Map common audio/video extensions → MIME types accepted by Gemini
function toAudioMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    mp3: "audio/mp3", mp4: "audio/mp4", wav: "audio/wav",
    m4a: "audio/m4a", ogg: "audio/ogg", flac: "audio/flac",
    webm: "audio/webm", aac: "audio/aac", opus: "audio/opus",
    wma: "audio/x-ms-wma", mkv: "video/x-matroska",
    mov: "video/quicktime", avi: "video/x-msvideo",
    mpeg: "audio/mpeg", mpga: "audio/mpeg",
  };
  return map[ext] ?? "audio/mp3";
}

// Files ≤ INLINE_LIMIT are sent as base64 inline data (fast, no upload).
// Files > INLINE_LIMIT are uploaded via the Gemini File API (up to 2 GB)
// and referenced by URI — the uploaded file is deleted after transcription.
const INLINE_LIMIT = 15 * 1024 * 1024; // 15 MB

export async function transcribeWithGemini(
  buffer: Buffer,
  filename: string,
  language?: string,
): Promise<{ text: string; language: string }> {
  const mimeType = toAudioMimeType(filename);
  const isAutoDetect = !language || language === "auto";
  const langHint = isAutoDetect
    ? "The audio may be in one language or may switch between multiple languages (code-switching). Detect all languages present."
    : `The audio is primarily in ${language}, but may also contain segments in other languages.`;

  const transcriptionPrompt = `Transcribe this audio recording with maximum accuracy. ${langHint}

Rules:
- Output ONLY the spoken text — no timestamps, no speaker labels, no explanations, no preamble.
- MULTILINGUAL: If the audio contains more than one language (e.g. Arabic and English, French and Arabic, etc.), transcribe each word or phrase in the EXACT language it was spoken. Do NOT translate any segment into another language. Do NOT normalize everything into one language. Preserve code-switching exactly as it occurs.
- Preserve the exact words spoken including filler words, hesitations, and repetitions.
- For Arabic: use the spelling closest to what was spoken (dialect or MSA) rather than normalizing.
- If multiple speakers are present, run their speech together in the order spoken (no labels).
- If you cannot detect any speech, output only the word: [inaudible]`;

  // Decide between inline data and File API
  let audioPart: Record<string, unknown>;
  let uploadedFileName: string | undefined;

  if (buffer.length <= INLINE_LIMIT) {
    // ── Inline base64 (fast for small files) ──────────────────────────
    audioPart = { inlineData: { mimeType, data: buffer.toString("base64") } };
  } else {
    // ── Gemini File API (large files up to 2 GB) ─────────────────────
    console.log(`[Gemini] File size ${(buffer.length / 1024 / 1024).toFixed(1)} MB — uploading via File API`);
    const blob = new Blob([buffer], { type: mimeType });
    // File API goes via direct client — proxy doesn't support /upload/v1beta/files
    const uploaded = await (geminiAiDirect as any).files.upload({
      file: blob,
      config: { mimeType, displayName: filename },
    });
    // Wait for ACTIVE state (audio is usually immediate; video may take a moment)
    let fileInfo = uploaded;
    let attempts = 0;
    while (fileInfo.state === "PROCESSING" && attempts < 20) {
      await new Promise(r => setTimeout(r, 3000));
      fileInfo = await (geminiAiDirect as any).files.get(fileInfo.name);
      attempts++;
    }
    if (fileInfo.state === "FAILED") {
      throw new Error("Gemini file processing failed. Try a different format or a shorter file.");
    }
    audioPart = { fileData: { mimeType, fileUri: fileInfo.uri } };
    uploadedFileName = fileInfo.name;
    console.log(`[Gemini] File uploaded and ready: ${fileInfo.uri}`);
  }

  try {
    const response = await geminiAi.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [audioPart as any, { text: transcriptionPrompt }],
        },
      ],
    });

    const text = (response.text ?? "").trim();
    const detectedLang = language && language !== "auto" ? language : "detected";
    return { text, language: detectedLang };
  } finally {
    // Always clean up the uploaded file to free quota
    if (uploadedFileName) {
      try { await (geminiAiDirect as any).files.delete(uploadedFileName); } catch { /* ignore */ }
    }
  }
}
