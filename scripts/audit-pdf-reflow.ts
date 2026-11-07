import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { analyze, defaultOptions } from "../web/src/engine";
import { joinCjkLineWraps } from "../web/src/text-cleanup";
import { originalResearchCorpora } from "../tests/fixtures/research-corpora";
const root = new URL("../../corpus-qa/", import.meta.url),
  c = originalResearchCorpora.find((c) => c.locale === "ja")!,
  results = [];
for (let i = 1; i <= 2; i++) {
  const loading = pdfjs.getDocument({
    data: new Uint8Array(await readFile(new URL(`${c.id}-${i}.pdf`, root))),
    cMapUrl: process.cwd() + "/node_modules/pdfjs-dist/cmaps/",
    cMapPacked: true,
    standardFontDataUrl:
      process.cwd() + "/node_modules/pdfjs-dist/standard_fonts/",
  });
  try {
    const pdf = await loading.promise,
      content = await (await pdf.getPage(1)).getTextContent(),
      text = content.items
        .map((item) =>
          "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "",
        )
        .join(""),
      reflowed = joinCjkLineWraps(text),
      raw = analyze(
        [{ name: "PDF", locale: "ja", text }],
        defaultOptions,
      ).words,
      clean = analyze(
        [{ name: "PDF", locale: "ja", text: reflowed }],
        defaultOptions,
      ).words,
      expected = analyze([c.documents[i - 1]], defaultOptions).words;
    assert.equal(clean, expected);
    const cleanedStats = analyze(
        [{ name: "PDF", locale: "ja", text: reflowed }],
        defaultOptions,
      ),
      referenceStats = analyze([c.documents[i - 1]], defaultOptions);
    assert.equal(cleanedStats.types, referenceStats.types);
    assert.equal(cleanedStats.sentences, referenceStats.sentences);
    results.push({
      page: i,
      rawPdfTokens: raw,
      afterExplicitReflow: clean,
      referenceTokens: expected,
      cleanedTypes: cleanedStats.types,
      referenceTypes: referenceStats.types,
      cleanedSentences: cleanedStats.sentences,
      referenceSentences: referenceStats.sentences,
      text,
      reflowed,
    });
  } finally {
    await loading.destroy();
  }
}
await writeFile(
  new URL(
    "../../../outputs/corpuscape-japanese-pdf-audit.json",
    import.meta.url,
  ),
  JSON.stringify(results, null, 2),
);
console.log(
  results.map((r) => ({
    page: r.page,
    raw: r.rawPdfTokens,
    reflowed: r.afterExplicitReflow,
    expected: r.referenceTokens,
  })),
);
