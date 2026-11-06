import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { analyze, concordance, defaultOptions } from "../web/src/engine";
test(
  "maximum-size 2M-character corpus produces exact counts and capped KWIC with full totals",
  { timeout: 60000 },
  () => {
    const documents = [
      {
        name: "synthetic-capacity.txt",
        locale: "en",
        text: "word ".repeat(400000),
      },
    ];
    const started = performance.now();
    const result = analyze(documents);
    assert.equal(result.characters, 2000000);
    assert.equal(result.words, 400000);
    assert.equal(result.types, 1);
    assert.equal(result.ngrams[2][0].count, 399999);
    const analysisMs = performance.now() - started;
    const kwicStart = performance.now();
    const hits = concordance(documents, defaultOptions, "word", 20, 1000);
    assert.equal(hits.total, 400000);
    assert.equal(hits.hits.length, 1000);
    console.info(
      JSON.stringify({
        capacity: "2M UTF-16 units",
        tokens: result.words,
        analysisMs: Math.round(analysisMs),
        concordanceMs: Math.round(performance.now() - kwicStart),
      }),
    );
  },
);
