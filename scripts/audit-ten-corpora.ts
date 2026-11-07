import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { View, parse } from "vega";
import { compile } from "vega-lite";
import {
  analyze,
  defaultOptions,
  concordance,
  collocations,
  compare,
  sortConcordance,
  csv,
} from "../web/src/engine";
import { importFile } from "../web/src/files";
import { validateBackup } from "../web/src/backup";
import { validateWorkspace } from "../web/src/workspace-session";
import { tableDocuments } from "../web/src/table-documents";
import {
  makePaperSnapshot,
  newPaper,
  paperTables,
  paperFigures,
  paperCsvFiles,
  validatePaperBundle,
} from "../web/src/paper-model";
import {
  defaultStudio,
  chartKinds,
  buildStudioSpec,
  studioDatasets,
} from "../web/src/studio-model";
Object.assign(globalThis, {
  DOMParser: new JSDOM("").window.DOMParser,
  window: new JSDOM("", { url: "http://localhost/" }).window,
});
const root = new URL("../../corpus-qa/", import.meta.url),
  manifest = JSON.parse(await readFile(new URL("manifest.json", root), "utf8")),
  results = [];
for (const c of manifest) {
  const checked = validateBackup(
      JSON.parse(await readFile(new URL(`${c.id}.json`, root), "utf8")),
    ),
    w = validateWorkspace(
      JSON.parse(
        await readFile(new URL(`${c.id}-workspace.json`, root), "utf8"),
      ).workspace,
    ),
    a = analyze(checked.documents, checked.options),
    checks: string[] = [];
  assert.equal(a.words, c.expected.words);
  assert.equal(a.types, c.expected.types);
  assert.equal(a.characters, c.expected.characters);
  assert.equal(
    a.frequencies.reduce((s, r) => s + r.count, 0),
    a.words,
  );
  checks.push("totals, types, code points and frequency conservation");
  const hits = concordance(checked.documents, checked.options, c.query, 55);
  assert.equal(hits.total, c.expected.concordanceHits);
  for (const sort of ["position", "left", "right", "document"])
    assert.equal(sortConcordance(hits.hits, sort).length, hits.hits.length);
  checks.push("complete concordance and four sort modes");
  for (const n of [2, 3, 4])
    assert.equal(a.ngrams[n].length, c.expected.ngrams[n]);
  for (const size of [1, 3, 5]) {
    const co = collocations(
      checked.documents,
      checked.options,
      c.query,
      size,
      1,
    );
    assert.ok(
      co.every((r) => Number.isFinite(r.pmi) && r.dice > 0 && r.dice <= 1),
    );
  }
  checks.push("2/3/4-grams, three collocation windows and finite PMI/Dice");
  const comparison = compare(a, analyze(w.reference, w.options));
  assert.equal(comparison.length, c.expected.comparisonRows);
  assert.ok(
    comparison.every(
      (r) =>
        Number.isFinite(r.g2) &&
        r.pValue >= 0 &&
        r.pValue <= r.qValue &&
        r.qValue <= 1,
    ),
  );
  assert.ok(
    compare(a, a).every(
      (r) => r.g2 === 0 && r.logRatio === 0 && r.pValue === 1,
    ),
  );
  checks.push("full comparison, BH bounds and equal-corpus zero oracle");
  const data = studioDatasets({
    name: c.name,
    analysis: a,
    documents: checked.documents,
    comparison: { rows: comparison },
    pairs: w.pairs,
  });
  assert.equal(
    data.find((d) => d.id === "frequencies")!.rows.length,
    a.frequencies.length,
  );
  for (const kind of chartKinds) {
    const rows = a.frequencies
        .slice(0, 12)
        .map((r, i) => ({
          label: r.term,
          count: r.count,
          rank: i + 1,
          series: i % 2 ? "A" : "B",
        })),
      v = new View(
        parse(
          compile(
            buildStudioSpec(rows, {
              ...defaultStudio,
              kind: kind.id,
              value: "count",
              series: "series",
              x: "rank",
              title: c.name,
            }),
          ).spec,
        ),
        { renderer: "none" },
      );
    try {
      assert.ok(!(await v.toSVG()).includes("NaN"));
    } finally {
      v.finalize();
    }
  }
  checks.push("12 real Vega chart renders and complete analysis datasets");
  const s = await makePaperSnapshot(
      {
        name: c.name,
        documents: checked.documents,
        options: checked.options,
        reference: w.reference,
        pairs: w.pairs,
      },
      "2.3.0",
      process.version,
    ),
    p = newPaper(s);
  assert.equal(paperTables(s, 0)[1].rows.length, a.frequencies.length);
  assert.equal(
    paperTables(s, 0).find((t) => t.id === "T5")!.rows.length,
    comparison.length,
  );
  assert.equal(
    (await validatePaperBundle({ snapshot: s, project: p })).snapshot.analysis
      .words,
    a.words,
  );
  assert.equal(paperFigures(s, p.top).length, 2);
  assert.ok(Object.keys(paperCsvFiles(s, p)).length >= 4);
  checks.push(
    "frozen mini-paper, all-row tables, two SVGs, project restore and complete CSV set",
  );
  const table = await importFile(
    new File([await readFile(new URL(`${c.id}.csv`, root))], `${c.id}.csv`),
  );
  const mapped = tableDocuments(table.table!.rows.slice(1), {
    name: c.name,
    text: 2,
    nameColumn: 0,
    languageColumn: 1,
    separate: true,
  });
  assert.deepEqual(mapped, checked.documents);
  checks.push("CSV name/language/text round trip with embedded paragraphs");
  const row = {
    id: c.id,
    name: c.name,
    mode: c.mode,
    languages: [...new Set(checked.documents.map((d) => d.locale))],
    tokens: a.words,
    types: a.types,
    passed: checks,
  };
  results.push(row);
  console.log(
    `${c.id}: ${a.words} tokens, ${a.types} types; ${checks.length} groups PASS`,
  );
}
await writeFile(
  new URL(
    "../../../outputs/corpuscape-ten-corpus-engine-audit.json",
    import.meta.url,
  ),
  JSON.stringify(
    {
      version: "2.3.0",
      environment: `Node ${process.version}, ICU ${process.versions.icu}`,
      generatedAt: new Date().toISOString(),
      corpora: results,
    },
    null,
    2,
  ),
);
