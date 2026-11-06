import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { indexedDB } from "fake-indexeddb";
import { importFile } from "../web/src/files";
import { listCorpora, saveCorpus, deleteCorpus } from "../web/src/library";
import { defaultOptions } from "../web/src/engine";
const dom = new JSDOM("");
Object.assign(globalThis, {
  DOMParser: dom.window.DOMParser,
  indexedDB,
  window: dom.window,
});
async function fixture(name: string) {
  const data = await readFile(new URL(`./fixtures/${name}`, import.meta.url));
  return new File([data], name);
}
for (const ext of ["txt", "md", "docx", "html", "srt", "vtt"]) {
  test(`${ext.toUpperCase()} real file import preserves multilingual content`, async () => {
    const result = await importFile(await fixture(`research.${ext}`));
    assert.ok(
      result.documents[0].text.includes(
        ext === "vtt" || ext === "srt" ? "你好" : "语言",
      ),
    );
    assert.ok(!result.documents[0].text.includes("exclude"));
  });
}
for (const ext of ["csv", "tsv", "xlsx"]) {
  test(`${ext.toUpperCase()} real table import retains first row for explicit header selection`, async () => {
    const result = await importFile(await fixture(`research.${ext}`));
    assert.deepEqual(result.table!.rows[0], [
      "Source",
      "Target",
      ...(ext === "csv" ? ["Note"] : []),
    ]);
    assert.equal(result.table!.rows[1][1], "你好");
  });
}
test("TMX file creates separately tagged documents and retains the full multilingual memory", async () => {
  const result = await importFile(await fixture("research.tmx"));
  assert.equal(result.documents.length, 3);
  assert.equal(
    result.documents.find((d) => d.locale === "zh")?.text,
    "你好\n语言",
  );
  assert.equal(result.pairs![0].source, "Hello");
  assert.equal(result.pairs![0].note, "Reviewed");
});
test("XLSX worksheet selection imports the requested sheet", async () => {
  const result = await importFile(
    await fixture("research.xlsx"),
    "Ignored second sheet",
  );
  assert.equal(result.table!.sheetNames!.length, 2);
  assert.equal(result.table!.rows[0][0], "second");
  await assert.rejects(
    importFile(await fixture("research.xlsx"), "missing"),
    /worksheet/,
  );
});
test("import validation rejects empty, malformed CSV, wrong format, encoding and size", async () => {
  for (const file of [
    new File([""], "empty.txt"),
    new File(['"unclosed'], "bad.csv"),
    new File(["hello"], "bad.exe"),
    new File([Uint8Array.from([0xff, 0x80])], "bad.txt"),
    new File(["a".repeat(2000001)], "big.txt"),
    new File(["a,b\n" + "x".repeat(2000001)], "big.csv"),
    new File(["x".repeat(26 * 1024 * 1024)], "huge.txt"),
  ])
    await assert.rejects(importFile(file));
});
test("IndexedDB save, reopen, update without duplication and delete preserve full settings", async () => {
  const record = {
    id: "test-only",
    name: "Study",
    locale: "tr",
    options: {
      ...defaultOptions,
      locale: "tr",
      caseSensitive: true,
      stopWords: ["ve"],
    },
    savedAt: new Date().toISOString(),
    documents: [{ name: "Turkish", locale: "tr", text: "I İ" }],
  };
  await saveCorpus(record);
  assert.deepEqual(await listCorpora(), [record]);
  const updated = { ...record, name: "Revised study" };
  await saveCorpus(updated);
  assert.deepEqual(await listCorpora(), [updated]);
  await deleteCorpus(record.id);
  assert.deepEqual(await listCorpora(), []);
});
