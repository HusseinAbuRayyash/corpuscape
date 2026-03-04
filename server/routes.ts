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
} from "./corpusStorage";
import { scrapeUrl, scrapeMultipleUrls } from "./scraper";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

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
    const text = getCorpus(corpusId);
    if (!text) return res.status(404).json({ error: "Corpus not found" });
    const result = await runAnalysis(text, analysisType, customInstructions, maxChars);
    res.json({ result });
  });

  app.post("/api/ai/summarize", async (req, res) => {
    const { corpusId } = req.body;
    const text = getCorpus(corpusId);
    if (!text) return res.status(404).json({ error: "Corpus not found" });
    const result = await summarizeCorpus(text);
    res.json({ result });
  });

  app.post("/api/ai/topics", async (req, res) => {
    const { corpusId, nTopics = 8 } = req.body;
    const text = getCorpus(corpusId);
    if (!text) return res.status(404).json({ error: "Corpus not found" });
    const result = await extractTopics(text, nTopics);
    res.json({ result });
  });

  app.post("/api/ai/terminology", async (req, res) => {
    const { corpusId } = req.body;
    const text = getCorpus(corpusId);
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
      res.json({ corpusId, stats, wordCount: stats.words });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to create corpus" });
    }
  });

  return httpServer;
}
