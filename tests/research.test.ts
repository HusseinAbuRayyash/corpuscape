import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
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
  sortConcordance,
  createTextFilter,
} from "../web/src/engine";
import {
  parseTmx,
  selectTmxPairs,
  tmxDocuments,
  subtitleText,
  decodeText,
} from "../web/src/import-parsers";
import { makeBackup, validateBackup } from "../web/src/backup";
import { parseFigureData, wrapLabel } from "../web/src/figures";
import Papa from "papaparse";
const dom = new JSDOM("");
globalThis.DOMParser = dom.window.DOMParser;
const matrix = [
  ["en", "language", "culture"],
  ["es", "lengua", "cultura"],
  ["fr", "langue", "culture"],
  ["ru", "язык", "культура"],
  ["zh", "语言", "文化"],
  ["ja", "言語", "文化"],
  ["ar", "لغة", "ثقافة"],
  ["de", "sprache", "kultur"],
  ["pt", "língua", "cultura"],
  ["hi", "भाषा", "संस्कृति"],
];
for (const [locale, word, other] of matrix) {
  const options = { ...defaultOptions, locale };
  const documents = [
    { name: locale, locale, text: `${word} ${other} ${word} ${other}.` },
  ];
  test(`${locale}: exact monolingual counts, normalization, dispersion and 2/3/4-grams`, () => {
    const result = analyze(documents, options);
    assert.equal(result.words, 4);
    assert.equal(result.types, 2);
    assert.equal(result.sentences, 1);
    assert.equal(result.ttr, 0.5);
    assert.deepEqual(
      result.frequencies.find((r) => r.term === word),
      { term: word, count: 2, perMillion: 500000, documents: 1 },
    );
    assert.equal(
      result.ngrams[2].find((r) => r.term === `${word} ${other}`)?.count,
      2,
    );
    assert.equal(result.ngrams[3].length, 2);
    assert.equal(result.ngrams[4].length, 1);
    assert.equal(result.documentStats[0].hapax, 0);
  });
  test(`${locale}: whole-word and phrase concordance with exact source offsets`, () => {
    const hits = concordance(documents, options, word);
    assert.equal(hits.total, 2);
    for (const hit of hits.hits)
      assert.equal(
        documents[0].text.slice(hit.position, hit.position + hit.match.length),
        word,
      );
    assert.equal(concordance(documents, options, `${word} ${other}`).total, 2);
    assert.equal(concordance(documents, options, "nonexistentxyz").total, 0);
  });
  test(`${locale}: independent collocation event counts, PMI and Dice`, () => {
    const rows = collocations(documents, options, word, 1, 1);
    assert.deepEqual(rows.map(({ term, count, pmi, dice }) => ({ term, count, pmi, dice })), [
      { term: other, count: 3, pmi: 1, dice: 1 },
    ]);
    assert.deepEqual(collocations(documents, options, word, 1, 4), []);
    assert.throws(
      () => collocations(documents, options, `${word} ${other}`),
      /one segmented/,
    );
  });
  test(`${locale}: comparison symmetry, normalized rates and finite statistics`, () => {
    const a = analyze(documents, options),
      b = analyze(
        [{ name: "ref", text: `${word} ${other} ${other} ${other}.` }],
        options,
      );
    const row = compare(a, b).find((r) => r.term === word)!;
    assert.equal(row.a, 2);
    assert.equal(row.b, 1);
    assert.equal(row.bPerMillion, 250000);
    assert.ok(row.logRatio > 0);
    const reverse = compare(b, a).find((r) => r.term === word)!;
    assert.ok(Math.abs(row.g2 - reverse.g2) < 1e-10);
    assert.ok(Math.abs(row.logRatio + reverse.logRatio) < 1e-10);
  });
  test(`${locale}: bilingual lines, CSV, tagged TMX and research notes round-trip`, () => {
    const pairs = alignByLine(`${word}\r${other}`, "one\rtwo");
    pairs[0].note = `Note: ${word} <&>`;
    const memory = parseTmx(tmx(pairs, locale, "it"));
    assert.deepEqual(selectTmxPairs(memory, locale, "it"), pairs);
    assert.deepEqual(
      Papa.parse<string[]>(csv([[word, other, 'a"b']]).replace(/^\uFEFF/, ""))
        .data,
      [[word, other, 'a"b']],
    );
  });
  test(`${locale}: figure input preserves labels, decimals and zero values`, () => {
    const parsed = parseFigureData(`Label,Value\n${word},2.5\n${other},0`);
    assert.deepEqual(parsed.errors, []);
    assert.deepEqual(parsed.rows, [
      { label: word, value: 2.5 },
      { label: other, value: 0 },
    ]);
  });
}
test("10-language collection agrees with the sum of separate analyses", () => {
  const documents = matrix.map(([locale, word, other]) => ({
    name: locale,
    locale,
    text: `${word} ${other} ${word} ${other}.`,
  }));
  const mixed = analyze(documents);
  assert.equal(mixed.words, 40);
  assert.equal(mixed.sentences, 10);
  assert.equal(mixed.documentStats.length, 10);
  assert.ok(mixed.documentStats.every((d) => d.words === 4 && d.types === 2));
  const summed = new Map<string, number>();
  documents.forEach((doc) =>
    analyze([doc]).frequencies.forEach((r) =>
      summed.set(r.term, (summed.get(r.term) ?? 0) + r.count),
    ),
  );
  assert.deepEqual(
    new Map(mixed.frequencies.map((r) => [r.term, r.count])),
    summed,
  );
  assert.equal(mixed.frequencies.find((r) => r.term === "文化")?.documents, 2);
  const memory = parseTmx(
    `<?xml version="1.0"?><tmx version="1.4"><header srclang="es"/><body><tu>${documents
      .map(
        (doc) => `<tuv xml:lang="${doc.locale}"><seg>${doc.text}</seg></tuv>`,
      )
      .reverse()
      .join("")}</tu></body></tmx>`,
  );
  assert.equal(memory.languages.length, 10);
  assert.equal(memory.sourceLocale, "es");
  assert.equal(tmxDocuments(memory, "matrix.tmx").length, 10);
  for (const doc of documents)
    if (doc.locale !== "en")
      assert.equal(
        selectTmxPairs(memory, doc.locale, "en")[0].source,
        doc.text,
      );
});
test("per-document Turkish folding and query normalization override global settings", () => {
  const documents = [
    { name: "Turkish", locale: "tr", text: "I İ I İ." },
    { name: "English", locale: "en", text: "I I." },
  ];
  const result = analyze(documents, { ...defaultOptions, stopWords: ["I"] });
  assert.deepEqual(
    tokenize([documents[0]], defaultOptions).map((t) => t.term),
    ["ı", "i", "ı", "i"],
  );
  assert.equal(result.frequencies.find((r) => r.term === "i")?.count, 2);
  assert.equal(concordance(documents, defaultOptions, "I").total, 4);
});
test("grapheme context preserves emoji ZWJ, combining marks and offsets", () => {
  const documents = [{ name: "emoji", text: "👩🏽‍🔬e\u0301 cat 👨‍👩‍👧‍👦" }];
  const hit = concordance(documents, defaultOptions, "cat", 3).hits[0];
  assert.equal(hit.left, "👩🏽‍🔬e\u0301 ");
  assert.equal(hit.right, " 👨‍👩‍👧‍👦");
  assert.throws(
    () => concordance(documents, defaultOptions, "cat", -1),
    /Context/,
  );
});
test("G2 matches the independently calculated Lancaster worked formula", () => {
  const a = analyze([
    { name: "a", text: "node ".repeat(10) + "other ".repeat(90) },
  ]);
  const b = analyze([
    { name: "b", text: "node ".repeat(5) + "other ".repeat(95) },
  ]);
  assert.ok(
    Math.abs(
      compare(a, b).find((r) => r.term === "node")!.g2 - 1.6989903679539724,
    ) < 1e-10,
  );
});
test("backup round-trip preserves options, per-document languages and original Unicode", () => {
  const docs = [{ name: "Turkish", locale: "tr", text: "I İ e\u0301" }];
  const options = {
    locale: "fr",
    caseSensitive: true,
    stopWords: ["et", "le"],
  };
  assert.deepEqual(
    validateBackup(
      JSON.parse(JSON.stringify(makeBackup("Study", docs, options))),
    ),
    { name: "Study", documents: docs, options },
  );
  assert.deepEqual(
    validateBackup({ format: "corpuscape-v2", locale: "es", documents: docs })
      .options,
    { ...defaultOptions, locale: "es" },
  );
});
for (const bad of [
  null,
  [],
  {},
  { format: "corpuscape-v3", documents: [null] },
  { format: "corpuscape-v3", documents: [] },
  { format: "corpuscape-v3", documents: [{ name: "x", text: "" }] },
  {
    format: "corpuscape-v3",
    documents: [{ name: "x", text: "a", locale: "invalid_tag" }],
  },
  {
    format: "corpuscape-v3",
    documents: [{ name: "x", text: "a" }],
    options: { locale: "en", caseSensitive: false, stopWords: [null] },
  },
]) {
  test(`malformed backup rejected: ${JSON.stringify(bad)}`, () =>
    assert.throws(() => validateBackup(bad)));
}
test("large backups and collections are accepted without the old product quotas", () => {
 const text="a".repeat(2000001); assert.equal(validateBackup(makeBackup("big",[{name:"big",text}],defaultOptions)).documents[0].text.length,text.length);
 assert.equal(validateBackup(makeBackup("many",Array.from({length:101},()=>({name:"a",text:"a"})),defaultOptions)).documents.length,101);
});
test("TMX uses language tags when unit order differs and preserves unmatched units", () => {
  const memory = parseTmx(
    '<tmx><header srclang="en"/><body><tu><tuv xml:lang="fr"><seg>bonjour</seg></tuv><tuv xml:lang="en"><seg>hello</seg></tuv></tu><tu><tuv xml:lang="en"><seg>bye</seg></tuv><tuv xml:lang="fr"><seg>salut</seg></tuv></tu><tu><tuv xml:lang="en"><seg>alone</seg></tuv></tu></body></tmx>',
  );
  assert.deepEqual(selectTmxPairs(memory, "en", "fr"), [
    { source: "hello", target: "bonjour", note: "" },
    { source: "bye", target: "salut", note: "" },
    { source: "alone", target: "", note: "" },
  ]);
  assert.throws(() => selectTmxPairs(memory, "en", "en"), /different/);
});
test("TMX inline formatting codes do not become corpus words", () => {
  const memory = parseTmx(
    '<tmx><body><tu><tuv xml:lang="en"><seg>Hello <bpt i="1">&lt;b&gt;</bpt><hi>world</hi><ept i="1">&lt;/b&gt;</ept></seg></tuv><tuv xml:lang="fr"><seg>Bonjour</seg></tuv></tu></body></tmx>',
  );
  assert.equal(selectTmxPairs(memory, "en", "fr")[0].source, "Hello world");
});
for (const bad of [
  "<tmx>",
  "<html/>",
  "<tmx><body><tu><tuv><seg>x</seg></tuv></tu></body></tmx>",
  '<tmx><body><tu><tuv xml:lang="en"><seg>a</seg></tuv><tuv xml:lang="en"><seg>b</seg></tuv></tu></body></tmx>',
]) {
  test("invalid or ambiguous TMX rejected: " + bad.slice(0, 30), () =>
    assert.throws(() => parseTmx(bad)),
  );
}
test("WebVTT extracts cue payloads and excludes headers, notes, CSS, regions and identifiers", () => {
  assert.equal(
    subtitleText(
      "WEBVTT test\r\nKind: captions\r\n\r\nNOTE memo\r\nprivate comment\r\n\r\nSTYLE\r\n::cue { color: red }\r\n\r\nREGION\r\nid:one\r\n\r\ncue-1\r\n00:00.000 --> 00:01.000 align:start\r\n<v Alice>Bonjour &amp; 你好</v>\r\n\r\ncue-2\r\n00:01.000 --> 00:02.000\r\nمرحبا",
    ),
    "Bonjour & 你好\n\nمرحبا",
  );
  assert.equal(
    subtitleText("1\n00:00:01,000 --> 00:00:02,000\n123\n<i>Words</i>"),
    "123\nWords",
  );
});
test("UTF-8 and BOM-marked UTF-16 decode without replacement characters", () => {
  const text = "语言 العربية français";
  assert.equal(decodeText(new TextEncoder().encode(text).buffer), text);
  assert.equal(
    decodeText(Uint8Array.from([255, 254, 65, 0, 66, 0]).buffer),
    "AB",
  );
  assert.equal(
    decodeText(Uint8Array.from([254, 255, 0, 65, 0, 66]).buffer),
    "AB",
  );
  assert.throws(
    () => decodeText(Uint8Array.from([0xff, 0x80]).buffer),
    /UTF-8/,
  );
});
for (const text of [
  "a\t",
  "a\t-1",
  "a\tInfinity",
  "a\t1\textra",
  "\t1",
  "label,value",
  '"broken,1',
]) {
  test(`figure rejects invalid data: ${text}`, () =>
    assert.ok(parseFigureData(text).errors.length > 0));
}
test("figures accept quoted comma labels and wrapping keeps grapheme clusters", () => {
  assert.deepEqual(parseFigureData('"Paris, France",2.75').rows, [
    { label: "Paris, France", value: 2.75 },
  ]);
  assert.deepEqual(wrapLabel("👩🏽‍🔬á日本語", 2), ["👩🏽‍🔬á", "日本", "語"]);
});
test("100 documents remain isolated and aggregate correctly", () => {
  const docs = Array.from({ length: 100 }, (_, i) => ({
    name: String(i),
    text: "alpha beta alpha.",
  }));
  const result = analyze(docs);
  assert.equal(result.words, 300);
  assert.equal(result.documentStats.length, 100);
  assert.equal(result.frequencies[0].documents, 100);
  assert.equal(
    result.ngrams[2].find((r) => r.term === "alpha beta")?.count,
    100,
  );
});
test("TMX export rejects duplicate or invalid tags and XML control characters", () => {
  const pairs = [{ source: "a", target: "b" }];
  assert.throws(() => tmx(pairs, "en", "EN"), /different/);
  assert.throws(() => tmx(pairs, "und", "fr"), /explicit/);
  assert.throws(() => tmx(pairs, "invalid_tag", "fr"), /valid/);
  assert.throws(
    () => tmx([{ source: "a\u0001", target: "b" }], "en", "fr"),
    /XML/,
  );
  assert.ok(tmx([{ source: "👩🏽‍🔬", target: "你好" }], "en", "zh").includes("👩🏽‍🔬"));
});
test("concordance left sorting compares nearest words in forward lexical order", () => {
  const hits = [
    {
      left: "a dog ",
      match: "node",
      right: " zebra",
      document: "b",
      position: 10,
    },
    {
      left: "z cat ",
      match: "node",
      right: " apple",
      document: "a",
      position: 5,
    },
  ];
  assert.equal(sortConcordance(hits, "left")[0].left, "z cat ");
  assert.equal(sortConcordance(hits, "right")[0].right, " apple");
  assert.equal(sortConcordance(hits, "document")[0].document, "a");
  assert.deepEqual(sortConcordance(hits, "position"), hits);
});
test("table filters use document and pair languages, including Turkish and NFC", () => {
  assert.equal(createTextFilter("I", ["und", "tr"])("ı"), true);
  assert.equal(createTextFilter("CAFÉ", ["fr"])("cafe\u0301"), true);
  assert.equal(createTextFilter("لغة", ["ar", "en"])("لغة"), true);
  assert.equal(createTextFilter("", ["und"])("anything"), true);
});
