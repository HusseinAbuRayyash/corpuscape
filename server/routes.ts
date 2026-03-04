import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import {
  getStats,
  extractKeywords,
  extractNgrams,
  extractCollocations,
  concordance,
  cleanText,
  extractTextFromFile,
} from "./corpus";
import {
  runAnalysis,
  summarizeCorpus,
  extractTopics,
  extractTerminology,
  alignSentences,
  labelStrategies,
  analyzeUniversals,
  analyzeStrategies,
  generateResearchReport,
  generateTMX,
} from "./ai";
import {
  storeCorpus,
  getCorpus,
  generateCorpusId,
  registerCorpus,
  listCorpora,
} from "./corpusStorage";
import { scrapeUrl, scrapeMultipleUrls } from "./scraper";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

function resolveCorpusText(corpusId: string): string | undefined {
  const text = getCorpus(corpusId);
  if (text) return text;
  const src = getCorpus(`${corpusId}_src`);
  const tgt = getCorpus(`${corpusId}_tgt`);
  if (src || tgt) return [src, tgt].filter(Boolean).join("\n\n");
  return undefined;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/corpus/upload", upload.array("files", 20), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const texts: string[] = [];
      for (const file of files) {
        const text = await extractTextFromFile(file.buffer, file.originalname);
        texts.push(text);
      }

      const combined = cleanText(texts.join("\n\n"));
      const corpusId = generateCorpusId();
      storeCorpus(corpusId, combined);
      const stats = getStats(combined);
      const fileNames = files.map((f: Express.Multer.File) => f.originalname).join(", ");
      registerCorpus({ id: corpusId, name: fileNames, source: "monolingual", words: stats.words, createdAt: Date.now() });

      res.json({ corpusId, stats, wordCount: stats.words });
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({ error: error.message || "Upload failed" });
    }
  });

  app.post("/api/corpus/sample", async (req, res) => {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const samplePath = path.join(process.cwd(), "server", "samples", "literary_en.txt");
      let text: string;
      try {
        text = fs.readFileSync(samplePath, "utf-8");
      } catch {
        text = `The art of translation has long been debated among scholars and practitioners alike. From the earliest religious texts to modern literary works, translators have grappled with the tension between fidelity and creativity. The domestication strategy, as described by Venuti, involves adapting foreign texts to the cultural norms of the target language. In contrast, foreignization preserves the otherness of the source text, challenging readers to engage with unfamiliar cultural elements. Translation universals, such as explicitation and simplification, have been observed across multiple language pairs and text types. The corpus-based approach to translation studies, pioneered by Baker and others, has revolutionized the field by providing empirical evidence for these theoretical claims. Audiovisual translation, including subtitling and dubbing, presents unique challenges related to time and space constraints. Literary translation requires a delicate balance between preserving the author's style and producing readable target texts. The translation industry has evolved significantly with the advent of computer-assisted translation tools and machine translation. Post-editing of machine translation output has become a standard practice in many professional settings. Quality assessment in translation remains a complex issue, with multiple frameworks and metrics competing for acceptance. The role of the translator as a cultural mediator has gained recognition in recent years, moving beyond the traditional view of translation as mere linguistic transfer.`;
      }
      const cleaned = cleanText(text);
      const corpusId = generateCorpusId();
      storeCorpus(corpusId, cleaned);
      const stats = getStats(cleaned);
      registerCorpus({ id: corpusId, name: "Sample Literary Corpus", source: "monolingual", words: stats.words, createdAt: Date.now() });
      res.json({ corpusId, stats, wordCount: stats.words });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/corpus/stats", (req, res) => {
    const { corpusId } = req.body;
    const text = getCorpus(corpusId);
    if (!text) return res.status(404).json({ error: "Corpus not found" });
    res.json(getStats(text));
  });

  app.post("/api/corpus/keywords", (req, res) => {
    const { corpusId, topN = 30 } = req.body;
    const text = getCorpus(corpusId);
    if (!text) return res.status(404).json({ error: "Corpus not found" });
    res.json(extractKeywords(text, topN));
  });

  app.post("/api/corpus/ngrams", (req, res) => {
    const { corpusId, n = 2, topN = 25 } = req.body;
    const text = getCorpus(corpusId);
    if (!text) return res.status(404).json({ error: "Corpus not found" });
    res.json(extractNgrams(text, n, topN));
  });

  app.post("/api/corpus/collocations", (req, res) => {
    const { corpusId, nodeWord, topN = 20, minFreq = 2 } = req.body;
    const text = getCorpus(corpusId);
    if (!text) return res.status(404).json({ error: "Corpus not found" });
    res.json(extractCollocations(text, nodeWord, topN, minFreq));
  });

  app.post("/api/corpus/concordance", (req, res) => {
    const { corpusId, query, contextWords = 5, maxHits = 50 } = req.body;
    const text = getCorpus(corpusId);
    if (!text) return res.status(404).json({ error: "Corpus not found" });
    if (!query) return res.status(400).json({ error: "Query required" });
    res.json(concordance(text, query, contextWords, maxHits));
  });

  app.post("/api/ai/analyze", async (req, res) => {
    const { corpusId, analysisType, customInstructions, maxChars = 12000 } = req.body;
    const text = resolveCorpusText(corpusId);
    if (!text) return res.status(404).json({ error: "Corpus not found" });
    const result = await runAnalysis(text, analysisType, customInstructions, maxChars);
    res.json({ result });
  });

  app.post("/api/ai/summarize", async (req, res) => {
    const { corpusId } = req.body;
    const text = resolveCorpusText(corpusId);
    if (!text) return res.status(404).json({ error: "Corpus not found" });
    const result = await summarizeCorpus(text);
    res.json({ result });
  });

  app.post("/api/ai/topics", async (req, res) => {
    const { corpusId, nTopics = 8 } = req.body;
    const text = resolveCorpusText(corpusId);
    if (!text) return res.status(404).json({ error: "Corpus not found" });
    const result = await extractTopics(text, nTopics);
    res.json({ result });
  });

  app.post("/api/ai/terminology", async (req, res) => {
    const { corpusId } = req.body;
    const text = resolveCorpusText(corpusId);
    if (!text) return res.status(404).json({ error: "Corpus not found" });
    const result = await extractTerminology(text);
    res.json({ result });
  });

  app.post("/api/bilingual/upload", upload.fields([
    { name: "sourceFiles", maxCount: 10 },
    { name: "targetFiles", maxCount: 10 },
  ]), async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const srcFiles = files.sourceFiles || [];
      const tgtFiles = files.targetFiles || [];
      if (!srcFiles.length || !tgtFiles.length) {
        return res.status(400).json({ error: "Both source and target files required" });
      }

      const srcTexts: string[] = [];
      const tgtTexts: string[] = [];
      for (const f of srcFiles) srcTexts.push(await extractTextFromFile(f.buffer, f.originalname));
      for (const f of tgtFiles) tgtTexts.push(await extractTextFromFile(f.buffer, f.originalname));

      const srcText = cleanText(srcTexts.join("\n\n"));
      const tgtText = cleanText(tgtTexts.join("\n\n"));

      const corpusId = generateCorpusId();
      storeCorpus(`${corpusId}_src`, srcText);
      storeCorpus(`${corpusId}_tgt`, tgtText);

      const aligned = await alignSentences(srcText, tgtText);
      const strategies = await labelStrategies(aligned);
      const pairs = aligned.map((p: any, i: number) => ({
        ...p,
        strategy: strategies[i] || "",
      }));

      storeCorpus(`${corpusId}_pairs`, JSON.stringify(pairs));

      const srcWords = srcText.split(/\s+/).length;
      const tgtWords = tgtText.split(/\s+/).length;
      const srcNames = srcFiles.map((f: Express.Multer.File) => f.originalname).join(", ");
      const tgtNames = tgtFiles.map((f: Express.Multer.File) => f.originalname).join(", ");
      registerCorpus({ id: corpusId, name: `${srcNames} ↔ ${tgtNames}`, source: "bilingual", words: srcWords + tgtWords, createdAt: Date.now() });

      res.json({
        corpusId,
        pairs,
        metrics: {
          alignedPairs: pairs.length,
          avgSimilarity: pairs.reduce((s: number, p: any) => s + (p.similarity || 0), 0) / pairs.length,
          strategiesLabeled: pairs.filter((p: any) => p.strategy && p.strategy.trim()).length,
          lengthRatio: srcWords > 0 ? Math.round((tgtWords / srcWords) * 100) / 100 : 0,
        },
      });
    } catch (error: any) {
      console.error("Bilingual upload error:", error);
      res.status(500).json({ error: error.message || "Processing failed" });
    }
  });

  app.post("/api/bilingual/upload-aligned", upload.array("files", 10), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || !files.length) {
        return res.status(400).json({ error: "At least one file required" });
      }

      const allTexts: string[] = [];
      for (const f of files) {
        allTexts.push(await extractTextFromFile(f.buffer, f.originalname));
      }
      const fullText = allTexts.join("\n");

      const lines = fullText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

      const pairs: any[] = [];

      const hasTabOrDelimiter = lines.some(l => l.includes("\t") || /\|\|/.test(l));
      const looksAlternating = !hasTabOrDelimiter && lines.length >= 2;
      let isAlternatingFormat = false;

      if (looksAlternating) {
        const arabicRe = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
        const cjkRe = /[\u3000-\u9FFF\uAC00-\uD7AF]/;
        const cyrillicRe = /[\u0400-\u04FF]/;
        const hasNonLatin = (s: string) => arabicRe.test(s) || cjkRe.test(s) || cyrillicRe.test(s);

        const line0NonLatin = hasNonLatin(lines[0]);
        const line1NonLatin = hasNonLatin(lines[1]);

        if (line0NonLatin !== line1NonLatin) {
          isAlternatingFormat = true;
        } else {
          const line0HasMixed = /[a-zA-Z]/.test(lines[0]) && hasNonLatin(lines[0]);
          if (!line0HasMixed) {
            isAlternatingFormat = true;
          }
        }
      }

      if (hasTabOrDelimiter) {
        const delimiter = lines[0].includes("\t") ? "\t" : "||";
        for (const line of lines) {
          const parts = line.split(delimiter).map(s => s.trim());
          if (parts.length >= 2) {
            pairs.push({ source: parts[0], target: parts[1], similarity: 1.0 });
          }
        }
      } else if (isAlternatingFormat) {
        for (let i = 0; i < lines.length - 1; i += 2) {
          pairs.push({
            source: lines[i],
            target: lines[i + 1] || "",
            similarity: 1.0,
          });
        }
      } else {
        const nonLatinRanges = [
          /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/,
          /[\u3000-\u9FFF\uAC00-\uD7AF\u30A0-\u30FF\u3040-\u309F]/,
          /[\u0400-\u04FF\u0500-\u052F]/,
          /[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F]/,
          /[\u0E00-\u0E7F]/,
          /[\u1100-\u11FF]/,
        ];

        function findFirstNonLatinIndex(s: string): number {
          for (let i = 0; i < s.length; i++) {
            const ch = s[i];
            for (const re of nonLatinRanges) {
              if (re.test(ch)) return i;
            }
          }
          return -1;
        }

        for (const line of lines) {
          const idx = findFirstNonLatinIndex(line);

          if (idx <= 0) {
            pairs.push({ source: line, target: "", similarity: 1.0 });
            continue;
          }

          let splitIdx = idx;
          while (splitIdx > 0 && /[\s"'"\u201C\u201D\u0022([\-]/.test(line[splitIdx - 1])) {
            splitIdx--;
          }

          const source = line.slice(0, splitIdx).trim();
          const target = line.slice(idx).trim();

          if (!source && target) {
            pairs.push({ source: target, target: "", similarity: 1.0 });
          } else {
            pairs.push({ source, target, similarity: 1.0 });
          }
        }
      }

      if (pairs.length === 0) {
        return res.status(400).json({ error: "Could not extract aligned pairs. Ensure alternating source/target lines." });
      }

      const finalPairs = pairs.map((p) => ({
        ...p,
        strategy: "",
      }));

      const corpusId = generateCorpusId();
      const srcText = finalPairs.map(p => p.source).join("\n");
      const tgtText = finalPairs.map(p => p.target).join("\n");
      storeCorpus(`${corpusId}_src`, srcText);
      storeCorpus(`${corpusId}_tgt`, tgtText);
      storeCorpus(`${corpusId}_pairs`, JSON.stringify(finalPairs));

      const srcWords = srcText.split(/\s+/).length;
      const tgtWords = tgtText.split(/\s+/).length;
      const fileNames = files.map((f: Express.Multer.File) => f.originalname).join(", ");
      registerCorpus({ id: corpusId, name: `${fileNames} (aligned)`, source: "bilingual", words: srcWords + tgtWords, createdAt: Date.now() });

      res.json({
        corpusId,
        pairs: finalPairs,
        metrics: {
          alignedPairs: finalPairs.length,
          avgSimilarity: 1.0,
          strategiesLabeled: 0,
          lengthRatio: srcWords > 0 ? Math.round((tgtWords / srcWords) * 100) / 100 : 0,
        },
      });
    } catch (error: any) {
      console.error("Pre-aligned upload error:", error);
      res.status(500).json({ error: error.message || "Processing failed" });
    }
  });

  app.post("/api/bilingual/universals", async (req, res) => {
    const { corpusId } = req.body;
    const pairsStr = getCorpus(`${corpusId}_pairs`);
    if (!pairsStr) return res.status(404).json({ error: "Pairs not found" });
    const pairs = JSON.parse(pairsStr);
    const result = await analyzeUniversals(pairs);
    res.json({ result });
  });

  app.post("/api/bilingual/strategies", async (req, res) => {
    const { corpusId } = req.body;
    const pairsStr = getCorpus(`${corpusId}_pairs`);
    if (!pairsStr) return res.status(404).json({ error: "Pairs not found" });
    const pairs = JSON.parse(pairsStr);
    const result = await analyzeStrategies(pairs);
    res.json({ result });
  });

  app.post("/api/export/tmx", (req, res) => {
    const { corpusId, srcLang = "en", tgtLang = "ar" } = req.body;
    const pairsStr = getCorpus(`${corpusId}_pairs`);
    if (!pairsStr) return res.status(404).json({ error: "Pairs not found" });
    const pairs = JSON.parse(pairsStr);
    const tmx = generateTMX(pairs, srcLang, tgtLang);
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Content-Disposition", "attachment; filename=translation_memory.tmx");
    res.send(tmx);
  });

  app.post("/api/export/report", (req, res) => {
    const { corpusId, aiSummary, aiAnalyses } = req.body;
    const text = getCorpus(corpusId);
    const stats = text ? getStats(text) : undefined;
    const keywords = text ? extractKeywords(text, 20) : undefined;
    const pairsStr = getCorpus(`${corpusId}_pairs`);
    const pairs = pairsStr ? JSON.parse(pairsStr) : undefined;
    const report = generateResearchReport(stats, keywords, pairs, aiSummary, aiAnalyses);
    res.setHeader("Content-Type", "text/markdown");
    res.setHeader("Content-Disposition", "attachment; filename=traduxa_report.md");
    res.send(report);
  });

  app.post("/api/scrape", async (req, res) => {
    try {
      const { urls } = req.body;
      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: "Provide an array of URLs" });
      }
      const articles = await scrapeMultipleUrls(urls);
      res.json({ articles });
    } catch (error: any) {
      console.error("Scrape error:", error);
      res.status(500).json({ error: error.message || "Scraping failed" });
    }
  });

  app.post("/api/scrape/to-corpus", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== "string" || text.trim().length < 10) {
        return res.status(400).json({ error: "Text too short to create a corpus" });
      }
      const cleaned = cleanText(text);
      const corpusId = generateCorpusId();
      storeCorpus(corpusId, cleaned);
      const stats = getStats(cleaned);
      registerCorpus({ id: corpusId, name: "Web Scraper Results", source: "scraper", words: stats.words, createdAt: Date.now() });
      res.json({ corpusId, stats, wordCount: stats.words });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to create corpus" });
    }
  });

  app.get("/api/corpora", (_req, res) => {
    res.json({ corpora: listCorpora() });
  });

  return httpServer;
}
