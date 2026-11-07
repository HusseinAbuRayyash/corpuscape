import { createWorker } from "tesseract.js";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { originalResearchCorpora } from "../tests/fixtures/research-corpora";
import { analyze, defaultOptions } from "../web/src/engine";
const root = new URL("../../corpus-qa/", import.meta.url),
  cache = fileURLToPath(new URL("ocr-data/", root));
await mkdir(cache, { recursive: true });
const c = originalResearchCorpora.find((c) => c.locale === "ar")!;
function normalized(s: string) {
  return s.normalize("NFC").replace(/\s+/gu, " ").trim();
}
function distance(a: string, b: string) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++)
      row[j] = Math.min(
        row[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    previous = row;
  }
  return previous[b.length];
}
const worker = await createWorker("ara", 1, {
    cachePath: cache,
    errorHandler: () => {},
  }),
  results = [];
try {
  for (let i = 1; i <= 2; i++) {
    const { data } = await worker.recognize(
        fileURLToPath(new URL(`${c.id}-${i}.png`, root)),
      ),
      expected = normalized(c.documents[i - 1].text),
      actual = normalized(data.text);
    const row = {
      page: i,
      engineConfidence: data.confidence,
      referenceCharacters: expected.length,
      characterEdits: distance(expected, actual),
      characterErrorRate: distance(expected, actual) / expected.length,
      rawText: data.text,
      rawTokens: analyze(
        [{ name: "OCR", locale: "ar", text: data.text }],
        defaultOptions,
      ).words,
      referenceTokens: analyze([c.documents[i - 1]], defaultOptions).words,
    };
    results.push(row);
    console.log(JSON.stringify({ ...row, rawText: undefined }));
  }
} finally {
  await worker.terminate();
}
await writeFile(
  new URL("../../../outputs/corpuscape-arabic-ocr-audit.json", import.meta.url),
  JSON.stringify(
    {
      engine: "Tesseract.js 7 / ara default fast model",
      reference: "Original shaped Arabic scan fixtures",
      normalizationForComparison:
        "NFC and whitespace collapse only; diacritics preserved",
      results,
    },
    null,
    2,
  ),
);
