import type { CorpusDocument } from "./engine";
import Papa from "papaparse";
export const MAX_CHARACTERS = 2_000_000;
export const ACCEPT =
  ".txt,.md,.csv,.tsv,.docx,.pdf,.xlsx,.html,.htm,.srt,.vtt,.tmx";
export interface Imported {
  documents: CorpusDocument[];
  table?: { headers: string[]; rows: string[][] };
  pairs?: { source: string; target: string; note: string }[];
}
export async function importFile(file: File): Promise<Imported> {
  if (file.size > 25 * 1024 * 1024)
    throw new Error(`${file.name}: maximum file size is 25 MB.`);
  const ext = file.name.split(".").pop()?.toLowerCase();
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
    const pdf = await loadingTask.promise;
    try {
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
        if (total > MAX_CHARACTERS)
          throw new Error(
            "This PDF exceeds the 2 million character workspace limit. Split it into smaller files.",
          );
        pages.push(page);
      }
      text = pages.join("\n\n");
    } finally {
      await loadingTask.destroy();
    }
    if (!text.trim())
      throw new Error(
        "No selectable text found in this PDF. Scanned PDFs need OCR in a separate tool before importing.",
      );
  } else if (ext === "xlsx") {
    const { default: readXlsx } = await import("read-excel-file");
    const data = await readXlsx(file);
    return tableResult(
      data.map((row) =>
        row.map((cell) =>
          cell instanceof Date ? cell.toISOString() : String(cell ?? ""),
        ),
      ),
      file.name,
    );
  } else {
    text = await file.text();
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
      const doc = new DOMParser().parseFromString(text, "text/html");
      doc
        .querySelectorAll("script,style,noscript,nav,header,footer")
        .forEach((node) => node.remove());
      doc
        .querySelectorAll("p,br,div,li,h1,h2,h3")
        .forEach((node) => node.append("\n"));
      text = doc.body.textContent ?? "";
    }
    if (ext === "tmx") {
      const doc = new DOMParser().parseFromString(text, "application/xml");
      if (doc.querySelector("parsererror"))
        throw new Error("This TMX file is not valid XML.");
      const pairs = [...doc.querySelectorAll("tu")]
        .map((tu) => {
          const segs = tu.querySelectorAll("tuv seg");
          return {
            source: segs[0]?.textContent ?? "",
            target: segs[1]?.textContent ?? "",
            note: "",
          };
        })
        .filter((p) => p.source || p.target);
      if (!pairs.length)
        throw new Error("No translation pairs found in this TMX file.");
      return {
        documents: [
          { name: file.name, text: pairs.map((p) => p.source).join("\n") },
        ],
        pairs,
      };
    }
    if (ext === "srt" || ext === "vtt")
      text = text
        .split(/\r?\n/)
        .filter((line) => !/^\d+$|-->|^WEBVTT|^NOTE\b/.test(line.trim()))
        .join("\n")
        .replace(/<[^>]*>/g, "");
    if (!["txt", "md", "html", "htm", "srt", "vtt"].includes(ext ?? ""))
      throw new Error(
        `Unsupported format: ${ext}. Use TXT, MD, CSV, TSV, DOCX, PDF, XLSX, HTML, SRT, VTT or TMX.`,
      );
  }
  if (!text.trim()) throw new Error(`${file.name} contains no readable text.`);
  if (text.length > MAX_CHARACTERS)
    throw new Error(
      "This file exceeds the 2 million character workspace limit.",
    );
  return { documents: [{ name: file.name, text }] };
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
