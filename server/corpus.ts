import type {
  CorpusStats,
  KeywordResult,
  NgramResult,
  CollocationResult,
  ConcordanceResult,
} from "@shared/schema";

export function getStats(text: string): CorpusStats {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const uniqueSet = new Set(words.map((w) => w.toLowerCase()));
  const sentences = Math.max(1, (text.match(/[.!?]+/g) || []).length);
  return {
    characters: text.length,
    words: words.length,
    uniqueWords: uniqueSet.size,
    sentences,
    typeTokenRatio: words.length > 0 ? Math.round((uniqueSet.size / words.length) * 10000) / 10000 : 0,
    avgWordsPerSentence: words.length > 0 ? Math.round((words.length / sentences) * 10) / 10 : 0,
  };
}

export function extractKeywords(text: string, topN: number = 30): KeywordResult[] {
  const words = text.split(/\s+/).filter((w) => w.length > 3).map((w) => w.toLowerCase().replace(/[^a-zA-Z\u0600-\u06FF]/g, "")).filter((w) => w.length > 3);
  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([term, frequency]) => ({ term, frequency }));
}

export function extractNgrams(text: string, n: number = 2, topN: number = 25): NgramResult[] {
  const words = text.split(/\s+/).filter((w) => w.length > 2).map((w) => w.toLowerCase());
  const freq = new Map<string, number>();
  for (let i = 0; i <= words.length - n; i++) {
    const ngram = words.slice(i, i + n).join(" ");
    freq.set(ngram, (freq.get(ngram) || 0) + 1);
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([ngram, frequency]) => ({ ngram, frequency }));
}

export function extractCollocations(
  text: string,
  nodeWord?: string,
  topN: number = 20,
  minFreq: number = 2
): CollocationResult[] {
  const words = text.split(/\s+/).filter((w) => w.length > 2).map((w) => w.toLowerCase());
  const nTotal = words.length;
  if (nTotal < 10) return [];

  const bigramFreq = new Map<string, number>();
  const wordFreq = new Map<string, number>();

  for (const w of words) {
    wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
  }

  for (let i = 0; i < words.length - 1; i++) {
    const key = `${words[i]}|||${words[i + 1]}`;
    bigramFreq.set(key, (bigramFreq.get(key) || 0) + 1);
  }

  const results: CollocationResult[] = [];
  for (const [key, f] of bigramFreq.entries()) {
    if (f < minFreq) continue;
    const [a, b] = key.split("|||");
    if (nodeWord) {
      const node = nodeWord.toLowerCase();
      if (a !== node && b !== node) continue;
    }
    const cA = wordFreq.get(a) || 0;
    const cB = wordFreq.get(b) || 0;
    const pA = cA / nTotal;
    const pB = cB / nTotal;
    const pAB = f / nTotal;
    const mi = pA * pB > 0 ? Math.log2(pAB / (pA * pB)) : 0;
    const dice = cA + cB > 0 ? (2 * f) / (cA + cB) : 0;
    results.push({
      collocate: `${a} ... ${b}`,
      frequency: f,
      mi: Math.round(mi * 100) / 100,
      dice: Math.round(dice * 1000) / 1000,
    });
  }

  return results.sort((a, b) => b.mi - a.mi).slice(0, topN);
}

export function concordance(
  text: string,
  query: string,
  contextWords: number = 5,
  maxHits: number = 50
): ConcordanceResult[] {
  const words = text.split(/\s+/);
  const queryLower = query.toLowerCase().trim();
  const qWords = queryLower.split(/\s+/);
  const hits: ConcordanceResult[] = [];
  let i = 0;

  while (i < words.length && hits.length < maxHits) {
    let matched = false;
    let matchText = "";

    if (qWords.length === 1) {
      if (words[i].toLowerCase() === queryLower || words[i].toLowerCase().includes(queryLower)) {
        matched = true;
        matchText = words[i];
      }
    } else {
      const window = words.slice(i, i + qWords.length).map((w) => w.toLowerCase()).join(" ");
      if (window.includes(queryLower) || window.startsWith(queryLower)) {
        matched = true;
        matchText = words.slice(i, i + qWords.length).join(" ");
      }
    }

    if (matched) {
      const left = words.slice(Math.max(0, i - contextWords), i).join(" ");
      const rightStart = i + (qWords.length > 1 ? qWords.length : 1);
      const right = words.slice(rightStart, rightStart + contextWords).join(" ");
      hits.push({ left, match: matchText, right });
      i = rightStart;
    } else {
      i++;
    }
  }

  return hits;
}

export function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export async function extractTextFromFile(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const ext = filename.toLowerCase().split(".").pop();

  if (ext === "txt") {
    return buffer.toString("utf-8");
  }

  if (ext === "docx") {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.default.extractRawText({ buffer });
      return result.value;
    } catch {
      return buffer.toString("utf-8");
    }
  }

  if (ext === "pdf") {
    let text = "";
    try {
      const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
      const data = await pdfParse(buffer);
      text = (data.text || "").trim();
      console.log(`[PDF] pdf-parse extracted ${text.length} chars from ${filename}`);
    } catch (err) {
      console.error(`[PDF] pdf-parse failed for ${filename}:`, err);
    }

    if (text.length < 10) {
      console.log(`[PDF] Text too short, using Gemini OCR for ${filename}`);
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({
          apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
          httpOptions: {
            apiVersion: "",
            baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
          },
        });
        const base64Data = buffer.toString("base64");
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: "application/pdf",
                    data: base64Data,
                  },
                },
                {
                  text: "Extract ALL text from this PDF document. Return ONLY the extracted text, preserving the original language (Arabic, English, etc.), line breaks, and paragraph structure. Do not add any commentary, headers, or formatting. Just the raw text content.",
                },
              ],
            },
          ],
        });
        text = (response.text || "").trim();
        console.log(`[PDF] Gemini OCR extracted ${text.length} chars from ${filename}`);
      } catch (err) {
        console.error(`[PDF] Gemini OCR failed for ${filename}:`, err);
      }
    }

    return text;
  }

  if (ext === "xlsx" || ext === "xls") {
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const texts: string[] = [];
      for (const name of workbook.SheetNames) {
        const sheet = workbook.Sheets[name];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];
        for (const row of data) {
          texts.push(row.filter((c) => c != null).join(" "));
        }
      }
      return texts.join("\n");
    } catch {
      return "";
    }
  }

  return buffer.toString("utf-8");
}
