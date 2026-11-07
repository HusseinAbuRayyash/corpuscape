import test from "node:test";
import assert from "node:assert/strict";
import {
  analyze,
  tokenize,
  concordance,
  collocations,
  compare,
  alignByLine,
  csv,
  tmx,
  defaultOptions,
  createTextFilter,
} from "../web/src/engine";
const docs = (text: string) => [{ name: "test.txt", text }];
test("Arabic folding affects matching terms, queries, filters and stop words without altering source", () => {
  const corpus = docs("أحمد وكتاب. احمد وكتاب. إحمد وكتاب. كَتَبَ");
  assert.equal(analyze(corpus).frequencies.filter((row) => /حمد$/u.test(row.term)).length, 3);
  const options = { ...defaultOptions, locale: "ar", arabic: { alef: true, diacritics: true } };
  assert.equal(analyze(corpus, options).frequencies.find((row) => row.term === "احمد")?.count, 3);
  assert.equal(tokenize(corpus, options).at(-1)?.term, "كتب");
  assert.deepEqual(concordance(corpus, options, "إحمد").hits.map(({ match }) => match), ["أحمد", "احمد", "إحمد"]);
  assert.equal(collocations(corpus, options, "أحمد")[0].count, 3);
  assert.ok(createTextFilter("إحمد", ["ar"], options)("احمد"));
  assert.ok(!analyze(corpus, { ...options, stopWords: ["أحمد"] }).frequencies.some(({ term }) => term === "احمد"));
});

test("extracted Arabic presentation forms expand automatically and can be preserved", () => {
  const text = "ﻛﺘﺐ";
  const extracted = [{ name: "page.pdf", text, source: "pdf" as const }];
  assert.equal(tokenize(docs(text), defaultOptions)[0].term, text);
  assert.equal(tokenize(extracted, defaultOptions)[0].term, "كتب");
  assert.equal(concordance(extracted, defaultOptions, "كتب").hits[0].match, text);
  assert.equal(tokenize(extracted, { ...defaultOptions, arabic: { presentationForms: false } })[0].term, text);
});

test("invisible bidi and joiner controls do not affect matching or surface offsets", () => {
  const word = "la\u200dngu\u2066a\u202ege";
  const corpus = docs(`A ${word} example.`);
  assert.equal(tokenize(corpus, defaultOptions)[1].term, "language");
  assert.equal(concordance(corpus, defaultOptions, "language").hits[0].match, word);
  assert.equal(concordance(corpus, defaultOptions, word).hits[0].position, 2);
});

test("experimental Arabic splitting preserves short stems and treats والكتاب like كتاب", () => {
  const corpus = docs("والكتاب كتاب بالكتاب واليد");
  const terms = tokenize(corpus, { ...defaultOptions, splitArabicClitics: true }).map(({ term }) => term);
  assert.deepEqual(terms, ["كتاب", "كتاب", "كتاب", "واليد"]);
});
test("empty corpus has zero statistics", () => {
  const a = analyze(docs(" \n!? "));
  assert.equal(a.words, 0);
  assert.equal(a.sentences, 0);
  assert.equal(a.ttr, 0);
});
test("punctuation, numbers, Unicode NFC and word boundaries are counted consistently", () => {
  const a = analyze(docs("Cat, cat! cafe\u0301 café. 123"));
  assert.equal(a.words, 5);
  assert.equal(a.types, 3);
  assert.equal(a.frequencies.find((r) => r.term === "café")?.count, 2);
  assert.equal(a.frequencies.find((r) => r.term === "cat")?.count, 2);
});
test("case-sensitive option and Turkish locale folding are respected", () => {
  assert.equal(
    analyze(docs("Cat cat"), { ...defaultOptions, caseSensitive: true }).types,
    2,
  );
  assert.deepEqual(
    tokenize(docs("I İ"), { ...defaultOptions, locale: "tr" }).map(
      (t) => t.term,
    ),
    ["ı", "i"],
  );
});
for (const [locale, text, word] of [
  ["es", "Traducción y traducción.", "traducción"],
  ["fr", "Français français.", "français"],
  ["ru", "Язык язык.", "язык"],
  ["ar", "لغة لغة.", "لغة"],
  ["de", "Übersetzung übersetzung.", "übersetzung"],
  ["pt", "Tradução tradução.", "tradução"],
  ["hi", "भाषा भाषा।", "भाषा"],
  ["ko", "언어 언어.", "언어"],
]) {
  test(`${locale} text is preserved and counted`, () => {
    assert.equal(
      analyze(docs(text), { ...defaultOptions, locale }).frequencies.find(
        (r) => r.term === word,
      )?.count,
      2,
    );
  });
}
for (const [locale, text] of [
  ["zh", "我们研究语言。语言连接文化。"],
  ["ja", "私たちは言語を研究します。言語は文化をつなぎます。"],
  ["th", "ภาษาเชื่อมโยงผู้คน"],
]) {
  test(`${locale} is segmented without spaces`, () => {
    const a = analyze(docs(text), { ...defaultOptions, locale });
    assert.ok(a.words > 2);
    assert.ok(a.frequencies.every((r) => r.term.length < text.length));
  });
}
test("custom languages use valid BCP 47 locales", () => {
  assert.ok(
    analyze(docs("Lugha huunganisha watu."), {
      ...defaultOptions,
      locale: "sw",
    }).words > 1,
  );
});
test("stop lists filter results without changing totals or fabricating n-grams", () => {
  const a = analyze(docs("red and blue. Red blue."), {
    ...defaultOptions,
    stopWords: ["and"],
  });
  assert.equal(a.words, 5);
  assert.equal(
    a.frequencies.some((r) => r.term === "and"),
    false,
  );
  assert.equal(a.ngrams[2].find((r) => r.term === "red blue")?.count, 1);
});
test("n-grams respect sentence and document boundaries", () => {
  const a = analyze([
    { name: "a", text: "red blue. Green." },
    { name: "b", text: "yellow orange." },
  ]);
  assert.deepEqual(a.ngrams[2].map((r) => r.term).sort(), [
    "red blue",
    "yellow orange",
  ]);
});
test("document dispersion is per document rather than token count", () => {
  const a = analyze([
    { name: "a", text: "red red" },
    { name: "b", text: "red" },
  ]);
  assert.deepEqual(a.frequencies[0], {
    term: "red",
    count: 3,
    perMillion: 1e6,
    documents: 2,
  });
});
test("concordance uses whole words, returns original offsets and does not match inside a word", () => {
  const text = "A Cat, a caterpillar and cat.";
  const r = concordance(docs(text), defaultOptions, "cat");
  assert.equal(r.total, 2);
  assert.equal(r.hits[0].match, "Cat");
  assert.equal(text.slice(r.hits[0].position, r.hits[0].position + 3), "Cat");
  assert.equal(concordance(docs(text), defaultOptions, "   ").total, 0);
});
test("phrase matching stays inside documents and returns all matches beyond the former cap", () => {
  assert.equal(
    concordance(
      [
        { name: "a", text: "red" },
        { name: "b", text: "blue" },
      ],
      defaultOptions,
      "red blue",
    ).total,
    0,
  );
  const r = concordance(docs("cat ".repeat(1005)), defaultOptions, "cat");
  assert.equal(r.total, 1005);
  assert.equal(r.hits.length, 1005);
});
test("collocation event marginals have correct PMI and Dice", () => {
  // a -> b, b -> a, b -> a, a -> b: 4 slots. 2 start at a, 2 end at b.
  const r = collocations(docs("a b a"), defaultOptions, "a", 1, 1);
  assert.deepEqual(r, [{ term: "b", count: 2, pmi: 1, dice: 1 }]);
  assert.deepEqual(
    collocations(docs("Cat! Dog!"), defaultOptions, "cat", 5, 1),
    [],
  );
});
test("comparison handles zero cells and equal corpora without NaN", () => {
  const a = analyze(docs("cat cat dog")),
    b = analyze(docs("bird bird dog"));
  assert.equal(
    compare(a, a).every((r) => Math.abs(r.g2) < 1e-10 && r.logRatio === 0),
    true,
  );
  assert.equal(
    compare(a, b).every(
      (r) => Number.isFinite(r.g2) && Number.isFinite(r.logRatio),
    ),
    true,
  );
  assert.ok(compare(a, b).find((r) => r.term === "cat")!.logRatio > 0);
  assert.deepEqual(compare(a, analyze([])), []);
});
test("bilingual lines preserve unmatched segments", () => {
  assert.deepEqual(alignByLine("one\ntwo", "uno"), [
    { source: "one", target: "uno", note: "" },
    { source: "two", target: "", note: "" },
  ]);
  assert.deepEqual(
    alignByLine("one\n\nthree\n", "uno\ndos\ntres\n").map((p) => p.source),
    ["one", "", "three"],
  );
});
test("CSV escapes multilingual text, quotes and spreadsheet formulas", () => {
  const output = csv([["语言", 'a"b', '=HYPERLINK("bad")']]);
  assert.ok(output.startsWith("\uFEFF"));
  assert.ok(output.includes('"a""b"'));
  assert.ok(output.includes("\"'=HYPERLINK"));
  assert.equal(csv([[-2, " =cmd"]]), '\uFEFF"-2","\' =cmd"');
});
test("TMX escapes content and language attributes", () => {
  const output = tmx(
    [{ source: '<script> & "hello"', target: "你好" }],
    "en",
    "zh",
  );
  assert.ok(output.includes("&lt;script&gt; &amp; &quot;hello&quot;"));
  assert.ok(output.includes('xml:lang="zh"'));
  assert.ok(!output.includes("<script>"));
});
