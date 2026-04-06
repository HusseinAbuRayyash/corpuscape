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
  extractExcelStructure,
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
  generateChartData,
  chatWithCorpus,
  backTranslate,
  generateGlossary,
  generateContent,
  generateFigureCaption,
  recommendChartType,
  generateResultsParagraph,
} from "./ai";
import {
  storeCorpus,
  getCorpus,
  generateCorpusId,
  registerCorpus,
  listCorpora,
} from "./corpusStorage";
import { scrapeUrl, scrapeMultipleUrls } from "./scraper";
import {
  getLibraryCorpora,
  getLibraryCorpus,
  saveLibraryCorpus,
  deleteLibraryCorpus,
  seedLibraryIfEmpty,
} from "./libraryStorage";
import { ensureTablesExist } from "./db";

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
  try {
    await ensureTablesExist();
    await seedLibraryIfEmpty();
  } catch (err) {
    console.error("[Library] DB init error:", err);
  }

  app.post("/api/corpus/upload", upload.array("files", 20), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const texts: string[] = [];
      let fullStructure: Awaited<ReturnType<typeof extractExcelStructure>> = null;

      for (const file of files) {
        const text = await extractTextFromFile(file.buffer, file.originalname);
        texts.push(text);

        const ext = file.originalname.split(".").pop()?.toLowerCase();
        if ((ext === "xlsx" || ext === "xls") && !fullStructure) {
          fullStructure = await extractExcelStructure(file.buffer);
        }
      }

      const combined = cleanText(texts.join("\n\n"));
      const corpusId = generateCorpusId();
      storeCorpus(corpusId, combined);

      if (fullStructure) {
        storeCorpus(`${corpusId}_columns`, JSON.stringify({
          headers: fullStructure.headers,
          dateColumns: fullStructure.dateColumns,
          totalRows: fullStructure.totalRows,
          rows: fullStructure.rows,
        }));
      }

      const stats = getStats(combined);
      const fileNames = files.map((f: Express.Multer.File) => f.originalname).join(", ");
      registerCorpus({ id: corpusId, name: fileNames, source: "monolingual", words: stats.words, createdAt: Date.now() });

      const sentenceSample = combined.split(/(?<=[.!?؟])\s+/).slice(0, 30).filter(s => s.trim().length > 10);
      res.json({ corpusId, stats, wordCount: stats.words, columns: fullStructure ? { headers: fullStructure.headers, dateColumns: fullStructure.dateColumns, totalRows: fullStructure.totalRows } : null, sentenceSample });
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({ error: error.message || "Upload failed" });
    }
  });

  app.post("/api/corpus/dataset", async (req, res) => {
    try {
      const { corpusId, page = 1, pageSize = 50 } = req.body;
      if (!corpusId) return res.status(400).json({ error: "corpusId required" });
      const columnsStr = getCorpus(`${corpusId}_columns`);
      if (!columnsStr) return res.json({ headers: [], rows: [], totalRows: 0, page: 1, totalPages: 0 });
      const colData = JSON.parse(columnsStr);
      const totalRows = colData.rows.length;
      const totalPages = Math.ceil(totalRows / pageSize);
      const start = (page - 1) * pageSize;
      const paginatedRows = colData.rows.slice(start, start + pageSize);
      res.json({
        headers: colData.headers,
        rows: paginatedRows,
        totalRows,
        page,
        totalPages,
        dateColumns: colData.dateColumns || [],
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch dataset" });
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

  app.post("/api/corpus/filter", (req, res) => {
    try {
      const { corpusId, filterText, filterMode = "include", filterColumn, filterColumns, dateFrom, dateTo } = req.body;
      const text = resolveCorpusText(corpusId);
      if (!text) return res.status(404).json({ error: "Corpus not found" });

      const columnsStr = getCorpus(`${corpusId}_columns`);
      const hasColumns = !!columnsStr;

      if (hasColumns) {
        const colData = JSON.parse(columnsStr!);
        let filteredRows: Record<string, any>[] = [...colData.rows];
        const headers: string[] = colData.headers;

        const cols: string[] = filterColumns && Array.isArray(filterColumns) && filterColumns.length > 0
          ? filterColumns
          : (filterColumn && filterColumn !== "_all" ? [filterColumn] : []);

        if (filterText && filterText.trim()) {
          const query = filterText.trim().toLowerCase();

          if (cols.length > 0) {
            if (filterMode === "include") {
              filteredRows = filteredRows.filter(r => cols.some(c => String(r[c] || "").toLowerCase().includes(query)));
            } else {
              filteredRows = filteredRows.filter(r => !cols.some(c => String(r[c] || "").toLowerCase().includes(query)));
            }
          } else {
            if (filterMode === "include") {
              filteredRows = filteredRows.filter(r => headers.some(h => String(r[h] || "").toLowerCase().includes(query)));
            } else {
              filteredRows = filteredRows.filter(r => !headers.some(h => String(r[h] || "").toLowerCase().includes(query)));
            }
          }
        }

        if (dateFrom || dateTo) {
          const dateCol = colData.dateColumns?.[0];
          if (dateCol) {
            filteredRows = filteredRows.filter(r => {
              const val = String(r[dateCol] || "").trim();
              if (!val) return false;
              const yearMatch = val.match(/\d{4}/);
              if (!yearMatch) return false;
              const numVal = parseInt(yearMatch[0]);
              if (dateFrom && numVal < parseInt(dateFrom)) return false;
              if (dateTo && numVal > parseInt(dateTo)) return false;
              return true;
            });
          }
        }

        if (filteredRows.length === 0) return res.status(400).json({ error: "Filter returned no results. Try different criteria." });

        const textCols = cols.length > 0 ? cols : headers;
        const filteredText = filteredRows.map(r => textCols.map(h => String(r[h] || "")).join(" ")).join("\n");
        const filteredId = generateCorpusId();
        storeCorpus(filteredId, filteredText);
        const filteredHeaders = cols.length > 0 ? cols : colData.headers;
        const filteredDateCols = (colData.dateColumns || []).filter((dc: string) => filteredHeaders.includes(dc));
        const narrowedRows = cols.length > 0
          ? filteredRows.map((r: Record<string, any>) => {
              const narrow: Record<string, any> = {};
              cols.forEach(c => { narrow[c] = r[c]; });
              return narrow;
            })
          : filteredRows;
        storeCorpus(`${filteredId}_columns`, JSON.stringify({
          headers: filteredHeaders,
          dateColumns: filteredDateCols,
          totalRows: narrowedRows.length,
          rows: narrowedRows,
        }));
        const stats = getStats(filteredText);
        const originalStats = getStats(text);
        registerCorpus({ id: filteredId, name: `Filtered corpus`, source: "monolingual", words: stats.words, createdAt: Date.now() });
        res.json({
          corpusId: filteredId, stats, originalStats,
          matchedParagraphs: filteredRows.length, totalParagraphs: colData.rows.length,
          columns: { headers: filteredHeaders, dateColumns: filteredDateCols, totalRows: narrowedRows.length },
        });
      } else {
        if (!filterText || !filterText.trim()) return res.status(400).json({ error: "Filter text required" });
        const query = filterText.trim().toLowerCase();
        const paragraphs = text.split(/\n/).filter(p => p.trim().length > 0);
        let filtered: string[];
        if (filterMode === "include") {
          filtered = paragraphs.filter(p => p.toLowerCase().includes(query));
        } else {
          filtered = paragraphs.filter(p => !p.toLowerCase().includes(query));
        }
        if (filtered.length === 0) return res.status(400).json({ error: "Filter returned no results. Try a different term." });
        const filteredText = filtered.join("\n\n");
        const filteredId = generateCorpusId();
        storeCorpus(filteredId, filteredText);
        const stats = getStats(filteredText);
        const originalStats = getStats(text);
        registerCorpus({ id: filteredId, name: `Filtered (${filterText})`, source: "monolingual", words: stats.words, createdAt: Date.now() });
        res.json({ corpusId: filteredId, stats, originalStats, matchedParagraphs: filtered.length, totalParagraphs: paragraphs.length });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Filter failed" });
    }
  });

  app.post("/api/bilingual/filter", (req, res) => {
    try {
      const { corpusId, filterText, filterField = "both", filterStrategy } = req.body;
      const pairsStr = getCorpus(`${corpusId}_pairs`);
      if (!pairsStr) return res.status(404).json({ error: "Pairs not found" });
      const pairs = JSON.parse(pairsStr);
      let filtered = pairs;
      if (filterText && filterText.trim()) {
        const query = filterText.trim().toLowerCase();
        filtered = filtered.filter((p: any) => {
          const src = (p.source || "").toLowerCase();
          const tgt = (p.target || "").toLowerCase();
          if (filterField === "source") return src.includes(query);
          if (filterField === "target") return tgt.includes(query);
          return src.includes(query) || tgt.includes(query);
        });
      }
      if (filterStrategy && filterStrategy !== "all") {
        filtered = filtered.filter((p: any) => p.strategy === filterStrategy);
      }
      if (filtered.length === 0) return res.status(400).json({ error: "Filter returned no results. Try a different term." });
      const filteredId = generateCorpusId();
      const srcText = filtered.map((p: any) => p.source).join("\n");
      const tgtText = filtered.map((p: any) => p.target).join("\n");
      storeCorpus(`${filteredId}_src`, srcText);
      storeCorpus(`${filteredId}_tgt`, tgtText);
      storeCorpus(`${filteredId}_pairs`, JSON.stringify(filtered));
      registerCorpus({ id: filteredId, name: `Filtered bilingual`, source: "bilingual", words: srcText.split(/\s+/).length, createdAt: Date.now() });
      res.json({ corpusId: filteredId, pairs: filtered, totalPairs: pairs.length, filteredPairs: filtered.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Filter failed" });
    }
  });

  app.post("/api/corpus/stats", (req, res) => {
    const { corpusId } = req.body;
    const text = getCorpus(corpusId);
    if (!text) return res.status(404).json({ error: "Corpus not found" });
    res.json(getStats(text));
  });

  app.post("/api/corpus/keywords", (req, res) => {
    const { corpusId, topN = 30, stopWords } = req.body;
    const text = getCorpus(corpusId);
    if (!text) return res.status(404).json({ error: "Corpus not found" });
    res.json(extractKeywords(text, topN, stopWords));
  });

  app.post("/api/corpus/ngrams", (req, res) => {
    const { corpusId, n = 2, topN = 25, stopWords } = req.body;
    const text = getCorpus(corpusId);
    if (!text) return res.status(404).json({ error: "Corpus not found" });
    res.json(extractNgrams(text, n, topN, stopWords));
  });

  app.post("/api/corpus/collocations", (req, res) => {
    const { corpusId, nodeWord, topN = 20, minFreq = 2, stopWords } = req.body;
    const text = getCorpus(corpusId);
    if (!text) return res.status(404).json({ error: "Corpus not found" });
    res.json(extractCollocations(text, nodeWord, topN, minFreq, stopWords));
  });

  app.post("/api/corpus/concordance", (req, res) => {
    const { corpusId, query, contextWords = 5, maxHits = 50 } = req.body;
    const text = getCorpus(corpusId);
    if (!text) return res.status(404).json({ error: "Corpus not found" });
    if (!query) return res.status(400).json({ error: "Query required" });
    res.json(concordance(text, query, contextWords, maxHits));
  });

  app.post("/api/ai/analyze", async (req, res) => {
    const { corpusId, analysisType, customInstructions } = req.body;
    const text = resolveCorpusText(corpusId);
    if (!text) return res.status(404).json({ error: "Corpus not found" });
    const result = await runAnalysis(text, analysisType, customInstructions);
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

  app.post("/api/ai/chart", async (req, res) => {
    try {
      const { corpusId, prompt } = req.body;
      if (!prompt) return res.status(400).json({ error: "Prompt required" });
      const text = resolveCorpusText(corpusId);
      if (!text) return res.status(404).json({ error: "Corpus not found" });

      let enrichedText = text;
      const columnsStr = getCorpus(`${corpusId}_columns`);
      if (columnsStr) {
        try {
          const colData = JSON.parse(columnsStr);
          if (colData.headers && colData.rows) {
            const columnSummaries: string[] = [];
            columnSummaries.push(`DATASET STRUCTURE: ${colData.headers.length} columns, ${colData.rows.length} rows`);
            columnSummaries.push(`COLUMN HEADERS: ${colData.headers.join(" | ")}`);

            interface ColSummary { header: string; uniqueCount: number; totalCount: number; sorted: [string, number][]; ratio: number; }
            const colInfos: ColSummary[] = [];

            for (let col = 0; col < colData.headers.length; col++) {
              const header = colData.headers[col];
              const values = colData.rows.map((r: any) => {
                const val = Array.isArray(r) ? r[col] : r[header];
                return val != null ? String(val) : "";
              }).filter((v: string) => v && v.trim());
              const freq: Record<string, number> = {};
              for (const v of values) {
                const key = v.trim().slice(0, 200);
                freq[key] = (freq[key] || 0) + 1;
              }
              const uniqueCount = Object.keys(freq).length;
              if (uniqueCount > 0) {
                const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
                const ratio = uniqueCount / Math.max(values.length, 1);
                colInfos.push({ header, uniqueCount, totalCount: values.length, sorted, ratio });
              }
            }

            colInfos.sort((a, b) => a.ratio - b.ratio);

            const MAX_SUMMARY_CHARS = 180000;
            let currentSize = columnSummaries.join("\n").length;

            for (const col of colInfos) {
              if (col.ratio > 0.8 && col.uniqueCount > 500) {
                const topN = col.sorted.slice(0, 50);
                const topValues = topN.map(([k, v]) => `${k}: ${v}`).join(", ");
                const entry = `\nCOLUMN "${col.header}" (${col.uniqueCount} unique values, ${col.totalCount} total, showing top 50):\n${topValues}`;
                if (currentSize + entry.length < MAX_SUMMARY_CHARS) {
                  columnSummaries.push(entry);
                  currentSize += entry.length;
                }
              } else {
                const allValues = col.sorted.map(([k, v]) => `${k}: ${v}`).join(", ");
                const entry = `\nCOLUMN "${col.header}" (${col.uniqueCount} unique values, ${col.totalCount} total):\n${allValues}`;
                if (currentSize + entry.length < MAX_SUMMARY_CHARS) {
                  columnSummaries.push(entry);
                  currentSize += entry.length;
                }
              }
            }

            const summaryBlock = columnSummaries.join("\n");
            const remainingBudget = 195000 - summaryBlock.length;
            const rawSample = remainingBudget > 1000 ? text.slice(0, remainingBudget) : "";
            enrichedText = summaryBlock + (rawSample ? "\n\n---RAW TEXT SAMPLE---\n" + rawSample : "");
          }
        } catch {}
      }

      const chartData = await generateChartData(enrichedText, prompt);
      res.json(chartData);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Chart generation failed" });
    }
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

      const srcText = srcTexts.join("\n\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
      const tgtText = tgtTexts.join("\n\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

      console.log(`[Bilingual] Source text (${srcText.length} chars):`, srcText.slice(0, 300));
      console.log(`[Bilingual] Target text (${tgtText.length} chars):`, tgtText.slice(0, 300));

      if (srcText.length < 5 || tgtText.length < 5) {
        return res.status(400).json({ error: "Could not extract sufficient text from the uploaded files. Please ensure the files contain readable text." });
      }

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

  app.post("/api/bilingual/preview-aligned", upload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ error: "No file provided" });

      function parseDelimitedLine(line: string, delimiter: string): string[] {
        if (!line.trim()) return [];
        if (!line.includes('"')) return line.split(delimiter).map(s => s.trim());
        const result: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          if (line[i] === '"') {
            if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
            else { inQuotes = !inQuotes; }
          } else if (line[i] === delimiter && !inQuotes) {
            result.push(current.trim()); current = "";
          } else {
            current += line[i];
          }
        }
        result.push(current.trim());
        return result;
      }

      const ext = file.originalname.toLowerCase().split(".").pop() || "";

      if (ext === "xlsx" || ext === "xls") {
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(file.buffer, { type: "buffer" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];
        if (!data.length) return res.json({ type: "excel", headers: [], previewRows: [] });
        const headers = (data[0] as any[]).map(String);
        const previewRows = data.slice(1, 4).map(row => (row as any[]).map(String));
        return res.json({ type: "excel", headers, previewRows });
      }

      if (ext === "csv") {
        const text = file.buffer.toString("utf-8");
        const rawLines = text.split(/\r?\n/).filter(l => l.trim());
        if (!rawLines.length) return res.json({ type: "csv", headers: [], previewRows: [] });
        const sampleLine = rawLines[0];
        const tabCount = (sampleLine.match(/\t/g) || []).length;
        const semicolonCount = (sampleLine.match(/;/g) || []).length;
        const commaCount = (sampleLine.match(/,/g) || []).length;
        const delimiter = tabCount > 0 ? "\t" : semicolonCount > commaCount ? ";" : ",";
        const firstRow = parseDelimitedLine(rawLines[0], delimiter);
        const looksLikeHdr = firstRow.length >= 2 && /^(no|#|id|source|src|english|arabic|original|target|text|segment)/i.test((firstRow[0] || "").trim());
        const headers = looksLikeHdr ? firstRow : firstRow.map((_, i) => `Column ${i + 1}`);
        const startLine = looksLikeHdr ? 1 : 0;
        const previewRows = rawLines.slice(startLine, startLine + 3).map(l => parseDelimitedLine(l, delimiter));
        return res.json({ type: "csv", headers, previewRows });
      }

      return res.json({ type: "text", headers: null, previewRows: null });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to inspect file" });
    }
  });

  app.post("/api/bilingual/upload-aligned", upload.array("files", 10), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || !files.length) {
        return res.status(400).json({ error: "At least one file required" });
      }

      const sourceColIdx = Math.max(0, parseInt((req.body?.sourceColIdx as string) ?? "0") || 0);
      const targetColIdx = Math.max(0, parseInt((req.body?.targetColIdx as string) ?? "1") || 1);

      function parseDelimitedLine(line: string, delimiter: string): string[] {
        if (!line.trim()) return [];
        if (!line.includes('"')) return line.split(delimiter).map(s => s.trim());
        const result: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          if (line[i] === '"') {
            if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
            else { inQuotes = !inQuotes; }
          } else if (line[i] === delimiter && !inQuotes) {
            result.push(current.trim()); current = "";
          } else {
            current += line[i];
          }
        }
        result.push(current.trim());
        return result;
      }

      function looksLikeHeader(row: string[]): boolean {
        if (!row || row.length < 2) return false;
        const first = (row[0] || "").toLowerCase().trim();
        return /^(no|#|id|source|src|en|english|arabic|original|text.?a|segment|sentence)$/i.test(first);
      }

      const allPairs: any[] = [];

      for (const f of files) {
        const ext = f.originalname.toLowerCase().split(".").pop() || "";
        const filePairs: any[] = [];

        if (ext === "xlsx" || ext === "xls") {
          const XLSX = await import("xlsx");
          const workbook = XLSX.read(f.buffer, { type: "buffer" });
          for (const name of workbook.SheetNames) {
            const sheet = workbook.Sheets[name];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];
            const startRow = data.length > 0 && looksLikeHeader(data[0].map(String)) ? 1 : 0;
            for (let i = startRow; i < data.length; i++) {
              const row = data[i];
              const src = String(row[sourceColIdx] ?? "").trim();
              const tgt = String(row[targetColIdx] ?? "").trim();
              if (src || tgt) filePairs.push({ source: src, target: tgt, similarity: 1.0 });
            }
          }
        } else if (ext === "csv") {
          const text = f.buffer.toString("utf-8");
          const rawLines = text.split(/\r?\n/).filter(l => l.trim());
          const sampleLine = rawLines.find(l => l.trim()) || "";
          const tabCount = (sampleLine.match(/\t/g) || []).length;
          const semicolonCount = (sampleLine.match(/;/g) || []).length;
          const commaCount = (sampleLine.match(/,/g) || []).length;
          const delimiter = tabCount > 0 ? "\t" : semicolonCount > commaCount ? ";" : ",";
          const startLine = rawLines.length > 0 && looksLikeHeader(parseDelimitedLine(rawLines[0], delimiter)) ? 1 : 0;
          for (let i = startLine; i < rawLines.length; i++) {
            const parts = parseDelimitedLine(rawLines[i], delimiter);
            const maxIdx = Math.max(sourceColIdx, targetColIdx);
            if (parts.length > maxIdx) {
              const src = (parts[sourceColIdx] || "").trim();
              const tgt = (parts[targetColIdx] || "").trim();
              if (src || tgt) filePairs.push({ source: src, target: tgt, similarity: 1.0 });
            }
          }
        } else {
          const text = await extractTextFromFile(f.buffer, f.originalname);
          const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
          const hasTabOrPipe = lines.some(l => l.includes("\t") || /\|\|/.test(l));
          if (hasTabOrPipe) {
            const delimiter = lines[0]?.includes("\t") ? "\t" : "||";
            for (const line of lines) {
              const parts = line.split(delimiter).map(s => s.trim());
              if (parts.length >= 2) filePairs.push({ source: parts[0], target: parts[1], similarity: 1.0 });
            }
          } else {
            for (let i = 0; i < lines.length; i += 2) {
              filePairs.push({ source: lines[i], target: lines[i + 1] || "", similarity: 1.0 });
            }
          }
        }

        allPairs.push(...filePairs);
      }

      const pairs = allPairs;

      if (pairs.length === 0) {
        return res.status(400).json({ error: "Could not extract aligned pairs. Check that your file has source text in column A and target text in column B (for Excel/CSV), or alternating source/target lines (for TXT)." });
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

  app.post("/api/ai/parse-chart-data", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || !text.trim()) return res.status(400).json({ error: "Text required" });

      const prompt = `You are a data extraction assistant for academic research and translation studies. The user has pasted text containing data they want to visualize in a chart (bar, line, area, pie, donut, radar, scatter, funnel, treemap, or stacked bar). Your job is to extract label-value pairs from this text, no matter what format it's in.

Rules:
- Extract EVERY data point mentioned in the text — do not skip any
- Each data point needs a short, clean LABEL (the category/name) and a numeric VALUE
- If the text describes percentages, use the percentage number as the value
- If the text is a paragraph describing statistics, extract each statistic as a data point
- If it's a table (markdown, plain text, HTML, or tab-separated), extract each row
- If it's key-value pairs in any format, extract them
- Handle complex academic data: corpus frequencies, word counts, translation strategy distributions, language pair comparisons, survey results, Likert scale data, error counts, etc.
- Clean up labels: remove prefixes like "Source Language:", "Category:", "Variable:", etc. — just use the core name
- For multi-column tables, use the first text column as label and the most relevant numeric column as value
- Handle decimal numbers, negative numbers, and scientific notation
- If values are in thousands (e.g., "5k", "2.3K"), convert them to full numbers (5000, 2300)
- If there are multiple data series or groups, still extract all individual data points
- Return ONLY a valid JSON array, nothing else. No markdown, no explanation, no code fences.

Format: [{"label": "Clean Label", "value": 42}, ...]

Examples:
Input: "Source Language: Arabic, Value: 28\\nTarget Language: Spanish, Value: 11"
Output: [{"label":"Arabic","value":28},{"label":"Spanish","value":11}]

Input: "The study found 45% explicitation, 30% simplification, and 25% normalization"
Output: [{"label":"Explicitation","value":45},{"label":"Simplification","value":30},{"label":"Normalization","value":25}]

Input: "English has 5000 words, French has 3200, German has 4100"
Output: [{"label":"English","value":5000},{"label":"French","value":3200},{"label":"German","value":4100}]

Input: "The corpus contains: literary texts (45.2%), legal documents (28.7%), medical texts (15.3%), and technical manuals (10.8%)"
Output: [{"label":"Literary Texts","value":45.2},{"label":"Legal Documents","value":28.7},{"label":"Medical Texts","value":15.3},{"label":"Technical Manuals","value":10.8}]

Input: "Mean fixation duration: Source text 245ms, Target text 312ms, Reference 198ms"
Output: [{"label":"Source Text","value":245},{"label":"Target Text","value":312},{"label":"Reference","value":198}]

Input: "| Strategy | Count |\\n|---|---|\\n| Domestication | 156 |\\n| Foreignization | 89 |\\n| Omission | 34 |"
Output: [{"label":"Domestication","value":156},{"label":"Foreignization","value":89},{"label":"Omission","value":34}]

Now extract data from the user's text. Return ONLY the JSON array:`;

      const result = await generateContent(prompt, text, 10000);
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return res.status(422).json({ error: "Could not extract data" });

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed) || parsed.length === 0) return res.status(422).json({ error: "No data points found" });

      const validated = parsed
        .filter((item: any) => item.label && typeof item.value === "number" && !isNaN(item.value))
        .map((item: any) => ({ label: String(item.label).trim(), value: Number(item.value) }));

      if (validated.length === 0) return res.status(422).json({ error: "No valid data points extracted" });

      res.json({ data: validated });
    } catch (error: any) {
      console.error("AI chart data parse error:", error);
      res.status(500).json({ error: error.message || "Failed to parse data" });
    }
  });

  app.post("/api/ai/figure-caption", async (req, res) => {
    try {
      const { chartType, data, formatPreset, title } = req.body;
      if (!data || !Array.isArray(data) || data.length === 0) return res.status(400).json({ error: "Data required" });
      const caption = await generateFigureCaption(chartType || "bar", data, formatPreset || "default", title || "");
      res.json({ caption: caption.trim() });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to generate caption" });
    }
  });

  app.post("/api/ai/chart-recommend", async (req, res) => {
    try {
      const { data, context } = req.body;
      if (!data || !Array.isArray(data) || data.length === 0) return res.status(400).json({ error: "Data required" });
      const result = await recommendChartType(data, context || "");
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to recommend chart type" });
    }
  });

  app.post("/api/ai/results-paragraph", async (req, res) => {
    try {
      const { chartType, data, title, caption, figureNumber } = req.body;
      if (!data || !Array.isArray(data) || data.length === 0) return res.status(400).json({ error: "Data required" });
      const paragraph = await generateResultsParagraph(chartType || "bar", data, title || "", caption || "", figureNumber || "1");
      res.json({ paragraph: paragraph.trim() });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to generate paragraph" });
    }
  });

  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { corpusId, message, history = [] } = req.body;
      if (!message) return res.status(400).json({ error: "Message required" });
      const text = resolveCorpusText(corpusId);
      if (!text) return res.status(404).json({ error: "Corpus not found" });
      const result = await chatWithCorpus(text, message, history);
      res.json({ result });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Chat failed" });
    }
  });

  app.post("/api/corpus/compare", async (req, res) => {
    try {
      const { corpusIdA, corpusIdB } = req.body;
      const textA = resolveCorpusText(corpusIdA);
      const textB = resolveCorpusText(corpusIdB);
      if (!textA || !textB) return res.status(404).json({ error: "One or both corpora not found" });
      const statsA = getStats(textA);
      const statsB = getStats(textB);
      const keywordsA = extractKeywords(textA, 30);
      const keywordsB = extractKeywords(textB, 30);
      const termsA = new Set(keywordsA.map(k => k.term));
      const termsB = new Set(keywordsB.map(k => k.term));
      const shared = keywordsA.filter(k => termsB.has(k.term)).map(k => ({
        term: k.term,
        freqA: k.frequency,
        freqB: keywordsB.find(kb => kb.term === k.term)?.frequency || 0,
      }));
      const uniqueA = keywordsA.filter(k => !termsB.has(k.term));
      const uniqueB = keywordsB.filter(k => !termsA.has(k.term));
      res.json({ statsA, statsB, keywordsA, keywordsB, shared, uniqueA, uniqueB });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Comparison failed" });
    }
  });

  app.post("/api/corpus/segment", (req, res) => {
    const { corpusId } = req.body;
    const text = resolveCorpusText(corpusId);
    if (!text) return res.status(404).json({ error: "Corpus not found" });
    const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 0);
    const segments = paragraphs.map((p, i) => ({
      index: i,
      preview: p.slice(0, 120) + (p.length > 120 ? "..." : ""),
      text: p,
      wordCount: p.split(/\s+/).filter(w => w.length > 0).length,
      charCount: p.length,
    }));
    res.json({ segments, totalSegments: segments.length });
  });

  app.post("/api/bilingual/back-translate", async (req, res) => {
    try {
      const { corpusId, srcLang = "en", tgtLang = "ar" } = req.body;
      const pairsStr = getCorpus(`${corpusId}_pairs`);
      if (!pairsStr) return res.status(404).json({ error: "Pairs not found" });
      const pairs = JSON.parse(pairsStr);
      const results = await backTranslate(pairs, srcLang, tgtLang);
      res.json({ results });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Back-translation failed" });
    }
  });

  app.post("/api/bilingual/concordance", (req, res) => {
    const { corpusId, query } = req.body;
    if (!query) return res.status(400).json({ error: "Query required" });
    const pairsStr = getCorpus(`${corpusId}_pairs`);
    if (!pairsStr) return res.status(404).json({ error: "Pairs not found" });
    const pairs = JSON.parse(pairsStr);
    const queryLower = query.toLowerCase();
    const results = pairs
      .filter((p: any) => p.source && typeof p.source === "string" && p.source.toLowerCase().includes(queryLower))
      .map((p: any) => {
        const idx = p.source.toLowerCase().indexOf(queryLower);
        const matchLen = query.length;
        return {
          left: p.source.slice(Math.max(0, idx - 60), idx),
          match: p.source.slice(idx, idx + matchLen),
          right: p.source.slice(idx + matchLen, idx + matchLen + 60),
          target: p.target,
        };
      })
      .slice(0, 50);
    res.json({ results });
  });

  app.post("/api/bilingual/glossary", async (req, res) => {
    try {
      const { corpusId } = req.body;
      const pairsStr = getCorpus(`${corpusId}_pairs`);
      if (!pairsStr) return res.status(404).json({ error: "Pairs not found" });
      const pairs = JSON.parse(pairsStr);
      const glossary = await generateGlossary(pairs);
      res.json({ glossary });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Glossary generation failed" });
    }
  });

  app.post("/api/corpus/compare-ai", async (req, res) => {
    try {
      const { corpusIdA, corpusIdB } = req.body;
      const textA = resolveCorpusText(corpusIdA);
      const textB = resolveCorpusText(corpusIdB);
      if (!textA || !textB) return res.status(404).json({ error: "One or both corpora not found" });
      const combinedText = `===CORPUS_A===\n${textA}\n\n===CORPUS_B===\n${textB}`;
      const result = await runAnalysis(combinedText, "Custom", `You are given two corpora separated by markers ===CORPUS_A=== and ===CORPUS_B===. Provide a detailed comparative analysis covering:
1. Lexical richness and diversity comparison
2. Stylistic and register differences
3. Thematic overlap and divergence
4. Structural and syntactic patterns
5. Overall assessment and research implications
Format with clear headings and specific examples from each corpus.`);
      res.json({ result });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "AI comparison failed" });
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
    res.setHeader("Content-Disposition", "attachment; filename=corpuscape_report.md");
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

  app.get("/api/library", async (_req, res) => {
    try {
      const corpora = await getLibraryCorpora();
      const grouped = {
        user: corpora.filter(c => c.origin === "user"),
        builtin: corpora.filter(c => c.origin === "builtin"),
        external: corpora.filter(c => c.origin === "external"),
      };
      res.json(grouped);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to load library" });
    }
  });

  app.get("/api/library/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      const corpus = await getLibraryCorpus(id);
      if (!corpus) return res.status(404).json({ error: "Corpus not found" });
      res.json(corpus);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to load corpus" });
    }
  });

  app.post("/api/library/save", async (req, res) => {
    try {
      const { name, type, sourceTrack, languagePair, domain, sizeLabel, samplePairs } = req.body;
      if (!name || !type) return res.status(400).json({ error: "name and type are required" });
      const saved = await saveLibraryCorpus({
        name,
        type,
        origin: "user",
        sourceTrack: sourceTrack || null,
        languagePair: languagePair || null,
        domain: domain || null,
        sizeLabel: sizeLabel || null,
        license: null,
        externalUrl: null,
        samplePairs: samplePairs || null,
      });
      res.json(saved);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to save corpus" });
    }
  });

  const loadLibraryCorpusHandler = async (req: any, res: any) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      const corpus = await getLibraryCorpus(id);
      if (!corpus) return res.status(404).json({ error: "Corpus not found" });

      const pairs = corpus.samplePairs as any[] | null;
      if (!pairs || pairs.length === 0) return res.status(400).json({ error: "No sample data available for this corpus" });

      const type = corpus.type;
      if (type === "monolingual") {
        const text = pairs.map((p: any) => p.source || p.text || (typeof p === "string" ? p : "")).filter(Boolean).join("\n\n");
        const corpusId = generateCorpusId();
        storeCorpus(corpusId, text);
        const stats = getStats(text);
        registerCorpus({ id: corpusId, name: corpus.name, source: "monolingual", words: stats.words, createdAt: Date.now() });
        res.json({ type: "monolingual", corpusId, stats, name: corpus.name });
      } else {
        const bilingualPairs = pairs.map((p: any) => ({
          source: p.source || "",
          target: p.target || "",
          similarity: p.similarity ?? 1,
          strategy: p.strategy || "",
        }));
        const corpusId = generateCorpusId();
        const srcText = bilingualPairs.map((p: any) => p.source).join("\n");
        const tgtText = bilingualPairs.map((p: any) => p.target).join("\n");
        storeCorpus(`${corpusId}_src`, srcText);
        storeCorpus(`${corpusId}_tgt`, tgtText);
        storeCorpus(`${corpusId}_pairs`, JSON.stringify(bilingualPairs));
        registerCorpus({ id: corpusId, name: corpus.name, source: "bilingual", words: srcText.split(/\s+/).length + tgtText.split(/\s+/).length, createdAt: Date.now() });
        res.json({ type: "bilingual", corpusId, pairs: bilingualPairs, name: corpus.name });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to load corpus" });
    }
  };

  app.post("/api/library/:id/load", loadLibraryCorpusHandler);
  app.get("/api/library/:id/load", loadLibraryCorpusHandler);

  app.delete("/api/library/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      await deleteLibraryCorpus(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to delete corpus" });
    }
  });

  return httpServer;
}
