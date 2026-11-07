import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { importFile } from "../web/src/files";
import { originalResearchCorpora } from "../tests/fixtures/research-corpora";
import { tableDocuments } from "../web/src/table-documents";
import { analyze, defaultOptions } from "../web/src/engine";
const dom = new JSDOM("", { url: "http://localhost/" });
Object.assign(globalThis, {
  DOMParser: dom.window.DOMParser,
  window: dom.window,
});
const root = new URL("../../corpus-qa/", import.meta.url),
  results = [];
async function file(name: string) {
  return new File([await readFile(new URL(name, root))], name);
}
for (const locale of ["fr", "ru", "zh"]) {
  const c = originalResearchCorpora.find((c) => c.locale === locale)!;
  let docs = [];
  if (locale === "ru") {
    const first = await importFile(await file(`${c.id}.xlsx`));
    assert.ok(first.table!.rows[0][0].includes("Do not analyze"));
    const sheet = await importFile(
      await file(`${c.id}.xlsx`),
      "Russian documents",
    );
    docs = tableDocuments(sheet.table!.rows.slice(1), {
      name: c.name,
      text: 2,
      nameColumn: 0,
      languageColumn: 1,
      separate: true,
    });
    assert.deepEqual(docs, c.documents);
  } else {
    for (const [i, d] of c.documents.entries()) {
      const imported = await importFile(
        await file(`${c.id}-${i + 1}.${locale === "fr" ? "docx" : "html"}`),
      );
      assert.equal(imported.documents[0].text.trim(), d.text);
      assert.ok(!imported.documents[0].text.includes("EXCLUDE_"));
      docs.push({ ...d, text: imported.documents[0].text });
    }
  }
  const a = analyze(docs, { ...defaultOptions, locale });
  assert.equal(
    a.words,
    analyze(c.documents, { ...defaultOptions, locale }).words,
  );
  results.push({ id: c.id, format: c.format, tokens: a.words, passed: true });
  console.log(
    `${c.id}: ${c.format} actual parser round trip PASS (${a.words} tokens)`,
  );
}
await writeFile(
  new URL(
    "../../../outputs/corpuscape-file-format-audit.json",
    import.meta.url,
  ),
  JSON.stringify(results, null, 2),
);
