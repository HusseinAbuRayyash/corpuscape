import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { View, parse } from "vega";
import { compile } from "vega-lite";
import { originalResearchCorpora } from "./fixtures/research-corpora";
import {
  analyze,
  tokenize,
  defaultOptions,
  concordance,
  collocations,
  compare,
  csv,
  tmx,
} from "../web/src/engine";
import { parseTmx, selectTmxPairs } from "../web/src/import-parsers";
import {
  defaultStudio,
  studioDatasets,
  buildStudioSpec,
  chartKinds,
} from "../web/src/studio-model";
import {
  makePaperSnapshot,
  newPaper,
  paperTables,
  paperHtml,
} from "../web/src/paper-model";
Object.assign(globalThis, { DOMParser: new JSDOM("").window.DOMParser });
const expected: [number, number, number][] = [
  [215, 142, 3],
  [158, 139, 4],
  [206, 150, 5],
  [236, 129, 3],
  [156, 142, 3],
  [142, 106, 2],
  [178, 136, 4],
  [492, 404, 1],
];
for (const [index, c] of originalResearchCorpora.entries()) {
  test(`${c.id}: totals, language tags, independent count conservation, KWIC offsets, every n-gram family and collocation bounds`, () => {
    const options = { ...defaultOptions, locale: c.locale },
      a = analyze(c.documents, options);
    assert.equal(a.words, expected[index][0]);
    assert.equal(a.types, expected[index][1]);
    assert.equal(a.documentStats.length, c.documents.length);
    assert.equal(
      a.frequencies.reduce((sum, r) => sum + r.count, 0),
      a.words,
    );
    assert.equal(
      a.documentStats.reduce((sum, r) => sum + r.words, 0),
      a.words,
    );
    assert.ok(
      Math.abs(a.frequencies.reduce((sum, r) => sum + r.perMillion, 0) - 1e6) <
        1e-6,
    );
    assert.ok(
      a.documentStats.every((r, i) => r.locale === c.documents[i].locale),
    );
    const kwic = concordance(c.documents, options, c.query, 55);
    assert.equal(kwic.total, expected[index][2]);
    for (const hit of kwic.hits) {
      const d = c.documents.find((d) => d.name === hit.document)!;
      assert.equal(
        d.text.slice(hit.position, hit.position + hit.match.length),
        hit.match,
      );
    }
    const tokens = tokenize(c.documents, options);
    for (const n of [2, 3, 4]) {
      let independentlyCounted = 0;
      for (let i = 0; i + n <= tokens.length; i++) {
        const group = tokens.slice(i, i + n);
        if (
          group.every(
            (t) =>
              t.document === group[0].document &&
              t.sentence === group[0].sentence,
          )
        )
          independentlyCounted++;
      }
      assert.equal(
        a.ngrams[n].reduce((s, r) => s + r.count, 0),
        independentlyCounted,
      );
    }
    for (const window of [1, 3, 5])
      for (const r of collocations(c.documents, options, c.query, window, 1)) {
        assert.ok(Number.isFinite(r.pmi));
        assert.ok(r.dice > 0 && r.dice <= 1);
        assert.ok(r.count >= 1);
      }
    const stop = analyze(c.documents, {
      ...options,
      stopWords: [a.frequencies[0].term],
    });
    assert.equal(stop.words, a.words);
    assert.ok(!stop.frequencies.some((r) => r.term === a.frequencies[0].term));
    assert.ok(
      stop.ngrams[2].every(
        (r) => !r.term.split(" ").includes(a.frequencies[0].term),
      ),
    );
  });
  test(`${c.id}: comparison self-oracle, complete CSV, all 12 rendered charts and immutable mini paper`, async () => {
    const options = { ...defaultOptions, locale: c.locale },
      a = analyze(c.documents, options);
    for (const r of compare(a, a)) {
      assert.equal(r.g2, 0);
      assert.equal(r.logRatio, 0);
      assert.equal(r.pValue, 1);
      assert.equal(r.qValue, 1);
    }
    assert.ok(
      csv([
        ["term", "count"],
        ...a.frequencies.map((r) => [r.term, r.count]),
      ]).startsWith("\uFEFF"),
    );
    const data = studioDatasets({
      name: c.name,
      analysis: a,
      documents: c.documents,
    });
    assert.equal(
      data.find((d) => d.id === "frequencies")!.rows.length,
      a.frequencies.length,
    );
    for (const kind of chartKinds) {
      const rows = a.frequencies
        .slice(0, 10)
        .map((r, i) => ({
          label: r.term,
          count: r.count,
          rank: i + 1,
          series: i % 2 ? "A" : "B",
        }));
      const spec = buildStudioSpec(rows, {
        ...defaultStudio,
        kind: kind.id,
        value: "count",
        x: "rank",
        series: "series",
        top: 0,
        title: c.name,
      });
      const view = new View(parse(compile(spec).spec), { renderer: "none" });
      try {
        const svg = await view.toSVG();
        assert.ok(svg.startsWith("<svg"));
        assert.ok(svg.includes("mark-"));
        assert.ok(svg.includes("aria-label="));
      } finally {
        view.finalize();
      }
    }
    const s = await makePaperSnapshot(
        {
          name: c.name,
          documents: c.documents,
          options,
          reference: [],
          pairs: c.pairs ?? [],
        },
        "test",
        "Node ICU",
      ),
      p = newPaper(s);
    assert.equal(paperTables(s, 0)[1].rows.length, a.frequencies.length);
    assert.ok(paperHtml(s, p).includes(s.fingerprint));
  });
}
test("real parallel memory preserves duplicates, missing targets, numeric-identical units and research notes", () => {
  const c = originalResearchCorpora.find((c) => c.pairs)!;
  const exported = tmx(c.pairs!, "en", "es"),
    memory = parseTmx(exported),
    restored = selectTmxPairs(memory, "en", "es");
  assert.deepEqual(restored, c.pairs);
  assert.equal(restored.length, 12);
  assert.equal(restored[11].target, "");
});
