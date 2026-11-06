import type { CorpusDocument } from "./engine";
export const ocrLanguages = [
  ["eng", "English", "en"],
  ["spa", "Español", "es"],
  ["fra", "Français", "fr"],
  ["rus", "Русский", "ru"],
  ["chi_sim", "中文 · simplified", "zh-Hans"],
  ["chi_tra", "中文 · traditional", "zh-Hant"],
  ["jpn", "日本語", "ja"],
  ["ara", "العربية", "ar"],
  ["deu", "Deutsch", "de"],
  ["por", "Português", "pt"],
  ["hin", "हिन्दी", "hi"],
  ["kor", "한국어", "ko"],
  ["ita", "Italiano", "it"],
  ["tur", "Türkçe", "tr"],
  ["fas", "فارسی", "fa"],
  ["heb", "עברית", "he"],
  ["tha", "ไทย", "th"],
  ["vie", "Tiếng Việt", "vi"],
  ["ukr", "Українська", "uk"],
] as const;
export interface OcrPage {
  name: string;
  text: string;
  page: number;
  source: "text" | "ocr";
  confidence?: number;
}
export interface OcrProgress {
  stage: string;
  page: number;
  pages: number;
  progress: number;
}
export async function extractWithOcr(
  file: File,
  languages: string[],
  mode: "auto" | "ocr",
  onProgress: (p: OcrProgress) => void,
  signal?: AbortSignal,
): Promise<OcrPage[]> {
  if (!languages.length) throw new Error("Choose at least one OCR language.");
  const { createWorker } = await import("tesseract.js");
  let pageNumber = 1,
    totalPages = 1;
  const base = new URL("../ocr-runtime/", import.meta.url).href;
  const worker = await createWorker(languages.join("+"), 1, {
    ...(import.meta.env.PROD
      ? {
          workerPath: base + "worker.min.js",
          corePath: base + "core/",
          workerBlobURL: false,
        }
      : {}),
    logger: (entry) =>
      onProgress({
        stage: entry.status,
        page: pageNumber,
        pages: totalPages,
        progress: entry.progress ?? 0,
      }),
  });
  const abort = () => {
    void worker.terminate();
  };
  signal?.addEventListener("abort", abort, { once: true });
  const check = () => {
    if (signal?.aborted) throw new Error("Text extraction cancelled.");
  };
  try {
    check();
    if (file.name.toLowerCase().endsWith(".pdf")) {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).href;
      const support = new URL("./pdf-support/", location.href).href;
      const task = pdfjs.getDocument({
        data: await file.arrayBuffer(),
        cMapUrl: support + "cmaps/",
        cMapPacked: true,
        standardFontDataUrl: support + "standard_fonts/",
        wasmUrl: support + "wasm/",
      });
      try {
        const pdf = await task.promise;
        totalPages = pdf.numPages;
        const pages: OcrPage[] = [];
        for (let index = 1; index <= pdf.numPages; index++) {
          pageNumber = index;
          check();
          const page = await pdf.getPage(index);
          const content = await page.getTextContent();
          const text = content.items
            .map((item) =>
              "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "",
            )
            .join("");
          if (mode === "auto" && text.trim().length >= 20) {
            pages.push({
              name: `${file.name} · page ${index}`,
              text,
              page: index,
              source: "text",
            });
            onProgress({
              stage: "Selectable text extracted",
              page: index,
              pages: totalPages,
              progress: 1,
            });
            page.cleanup();
            continue;
          }
          onProgress({
            stage: "Rendering scanned page",
            page: index,
            pages: totalPages,
            progress: 0,
          });
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const context = canvas.getContext("2d");
          if (!context)
            throw new Error("This browser cannot create an OCR image.");
          await page.render({ canvas, canvasContext: context, viewport })
            .promise;
          check();
          const blob = await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob(
              (value) =>
                value
                  ? resolve(value)
                  : reject(new Error("Could not render PDF page.")),
              "image/png",
            ),
          );
          const result = await worker.recognize(blob);
          pages.push({
            name: `${file.name} · page ${index}`,
            text: result.data.text,
            page: index,
            source: "ocr",
            confidence: result.data.confidence,
          });
          canvas.width = 0;
          canvas.height = 0;
          page.cleanup();
        }
        return pages;
      } finally {
        await task.destroy();
      }
    }
    const result = await worker.recognize(file);
    check();
    return [
      {
        name: file.name,
        text: result.data.text,
        page: 1,
        source: "ocr",
        confidence: result.data.confidence,
      },
    ];
  } finally {
    signal?.removeEventListener("abort", abort);
    await worker.terminate();
  }
}
export function ocrDocuments(
  pages: OcrPage[],
  languages: string[],
): CorpusDocument[] {
  const tag =
    languages.length === 1
      ? ocrLanguages.find(([id]) => id === languages[0])?.[2]
      : undefined;
  return pages
    .filter((page) => page.text.trim())
    .map((page) => ({
      name: page.name,
      text: page.text,
      ...(tag ? { locale: tag } : {}),
    }));
}
