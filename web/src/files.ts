import type { CorpusDocument } from "./engine";
import Papa from "papaparse";
import { joinCjkLineWraps } from "./text-cleanup";
import {
  decodeText,
  parseTmx,
  selectTmxPairs,
  subtitleText,
  tmxDocuments,
  type TranslationMemory,
} from "./import-parsers";
// Compatibility export; imports are bounded by available browser memory, not a product quota.
export const MAX_CHARACTERS = Number.MAX_SAFE_INTEGER;
export const ACCEPT =
  ".txt,.md,.csv,.tsv,.docx,.pdf,.xlsx,.html,.htm,.srt,.vtt,.tmx,.png,.jpg,.jpeg,.webp,.bmp";
export class RequiresOcr extends Error {
  constructor(public file: File) {
    super(
      "This file needs text extraction. Choose its languages in Text extraction.",
    );
  }
}
export interface Imported {
  warnings?: string[];
  documents: CorpusDocument[];
  table?: {
    headers: string[];
    rows: string[][];
    sheetNames?: string[];
    sheet?: string;
  };
  pairs?: { source: string; target: string; note: string }[];
  translationMemory?: TranslationMemory;
}
export async function importFile(
  file: File,
  sheet?: string,
): Promise<Imported> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (["png", "jpg", "jpeg", "webp", "bmp"].includes(ext ?? ""))
    throw new RequiresOcr(file);
  let text = "";
  if (ext === "docx") {
    const mammoth = await import("mammoth/mammoth.browser");
    text = (
      await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    ).value;
  } else if (ext === "pdf") {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).href;
    const support = new URL("./pdf-support/", window.location.href).href;
    const loadingTask = pdfjs.getDocument({
      data: await file.arrayBuffer(),
      cMapUrl: support + "cmaps/",
      cMapPacked: true,
      standardFontDataUrl: support + "standard_fonts/",
      wasmUrl: support + "wasm/",
    });
    try {
      const pdf = await loadingTask.promise;
      const pages: string[] = [];
      let total = 0;
      for (let i = 1; i <= pdf.numPages; i++) {
        const content = await (await pdf.getPage(i)).getTextContent();
        const page = content.items
          .map((item) =>
            "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "",
          )
          .join("");
        total += page.length;
        pages.push(page);
      }
      text = pages.join("\n\n");
    } finally {
      await loadingTask.destroy();
    }
    if (!text.trim()) throw new RequiresOcr(file);
  } else if (ext === "xlsx") {
    const { default: readXlsx, readSheetNames } = await import(
      "read-excel-file"
    );
    const sheetNames = await readSheetNames(file);
    const selectedSheet = sheet ?? sheetNames[0];
    if (!selectedSheet || !sheetNames.includes(selectedSheet))
      throw new Error("Choose a worksheet present in this workbook.");
    const data = await readXlsx(file, { sheet: selectedSheet });
    const result = tableResult(
      data.map((row) =>
        row.map((cell) =>
          cell instanceof Date ? cell.toISOString() : String(cell ?? ""),
        ),
      ),
      file.name,
    );
    result.table = { ...result.table!, sheetNames, sheet: selectedSheet };
    return result;
  } else {
    text = decodeText(await file.arrayBuffer());
    if (ext === "csv" || ext === "tsv") {
      const parsed = Papa.parse<string[]>(text, {
        delimiter: ext === "tsv" ? "\t" : "",
        skipEmptyLines: "greedy",
      });
      if (parsed.errors.length)
        throw new Error(
          `Cannot read ${file.name}: ${parsed.errors[0].message}`,
        );
      return tableResult(parsed.data, file.name);
    }
    if (ext === "html" || ext === "htm") {
      const { htmlText } = await import("./html-text");
      text = htmlText(text);
    }
    if (ext === "tmx") {
      const translationMemory = parseTmx(text);
      const pairs = selectTmxPairs(
        translationMemory,
        translationMemory.sourceLocale,
        translationMemory.targetLocale,
      );
      return {
        documents: tmxDocuments(translationMemory, file.name),
        pairs,
        translationMemory,
      };
    }
    if (ext === "srt" || ext === "vtt") text = subtitleText(text);
    if (!["txt", "md", "html", "htm", "srt", "vtt"].includes(ext ?? ""))
      throw new Error(
        `Unsupported format: ${ext}. Use TXT, MD, CSV, TSV, DOCX, PDF, XLSX, HTML, SRT, VTT or TMX.`,
      );
  }
  if (!text.trim()) throw new Error(`${file.name} contains no readable text.`);
  return {
    documents: [{ name: file.name, text, ...(ext === "pdf" ? { source: "pdf" } as const : {}) }],
    ...(ext === "pdf" && joinCjkLineWraps(text) !== text
      ? {
          warnings: [
            "PDF line wraps may split Chinese or Japanese words. Review Documents; optional Join CJK line wraps can restore continuous text.",
          ],
        }
      : {}),
  };
}
function tableResult(data: string[][], name: string): Imported {
  if (!data.length) throw new Error("This table is empty.");
  const width = data.reduce((max, row) => Math.max(max, row.length), 0);
  // Keep the first row as data until the visitor explicitly selects a header row.
  return {
    documents: [{ name, text: data.map((row) => row[0] ?? "").join("\n") }],
    table: {
      headers: Array.from({ length: width }, (_, i) => `Column ${i + 1}`),
      rows: data,
    },
  };
}
