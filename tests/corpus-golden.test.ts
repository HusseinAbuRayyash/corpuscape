import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  analyze,
  collocations,
  compare,
  concordance,
  defaultOptions,
  sortConcordance,
} from "../web/src/engine";
import { samples } from "../web/src/samples";

const queries = new Map([
  ["Translation & language", ["language", "translation", "in language"]],
  ["Languages in conversation", ["la", "اللغة", "翻译", "言語", "Перевод", "अनुवाद"]],
  ["Translation in context", ["language", "readers", "اللغة", "الترجمة"]],
]);

const byTerm = (a: { term: string }, b: { term: string }) =>
  a.term < b.term ? -1 : a.term > b.term ? 1 : 0;

// Keep exact counts and values. Ignore presentation fields introduced by later
// features and ICU's ordering of tied rows except in the concordance tests.
const corpora = [...queries].map(([name, terms]) => {
  const { documents, locale } = samples.find((sample) => sample.name === name)!;
  const options = { ...defaultOptions, locale };
  const analysis = analyze(documents, options);
  return {
    name,
    analysis,
    frequencies: analysis.frequencies
      .map(({ term, count, perMillion, documents }) => ({ term, count, perMillion, documents }))
      .sort(byTerm),
    ngrams: Object.fromEntries(
      Object.entries(analysis.ngrams).map(([size, rows]) => [size, [...rows].sort(byTerm)]),
    ),
    searches: terms.map((query) => {
      const { hits, total } = concordance(documents, options, query);
      const sorting = Object.fromEntries(
        ["document", "left", "right"].map((order) => [
          order,
          sortConcordance(hits, order, locale).map((hit) => hits.indexOf(hit)),
        ]),
      );
      const neighbours = query.includes(" ") ? [] : collocations(documents, options, query, 5, 2)
        .map(({ term, count, pmi, dice }) => ({ term, count, pmi, dice }))
        .sort(byTerm);
      return { query, total, hits, sorting, neighbours };
    }),
  };
});
const actual = {
  corpora: corpora.map(({ analysis, ...evidence }) => evidence),
  comparisons: corpora.flatMap((a, i) =>
    corpora.slice(i + 1).map((b) => ({
      a: a.name,
      b: b.name,
      rows: compare(a.analysis, b.analysis)
        .map(({ term, a, b, aPerMillion, bPerMillion, g2, logRatio, pValue, qValue }) => ({
          term, a, b, aPerMillion, bPerMillion, g2, logRatio, pValue, qValue,
        }))
        .sort(byTerm),
    })),
  ),
};

test("teaching corpus results match the recorded pre-upgrade baseline", () => {
  const fixture = new URL("./fixtures/teaching-corpus-golden.json", import.meta.url);
  assert.deepEqual(actual, JSON.parse(readFileSync(fixture, "utf8")));
});
