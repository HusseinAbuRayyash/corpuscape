import test from "node:test";
import assert from "node:assert/strict";
import {
  makePaperSnapshot,
  newPaper,
  paperTables,
  paperFigures,
  paperHtml,
  paperCsvFiles,
  paperDraftIssues,
  paperMessages,
  paperMethods,
  validatePaperBundle,
} from "../web/src/paper-model";
import { defaultOptions, alignByLine } from "../web/src/engine";
import { tableDocuments } from "../web/src/table-documents";
import { benjaminiHochberg } from "../web/src/statistics";
import {
  numericClaimNotice,
  unsupportedClaimNotice,
  reportExport,
} from "../web/src/report-model";
import { parallelReviewFlags } from "../web/src/parallel-review";
test("exact full-precision model values are accepted alongside rounded values", () => {
  const e = [
    {
      id: "C1",
      label: "Arabic corpus",
      value: { ratio: 142 / 156, mean: 156 / 14 },
    },
  ];
  assert.equal(
    numericClaimNotice("91.02564102564102٪ ؛ 11.142857142857142", e),
    "",
  );
});
const source = () => ({
  name: "Original corpus",
  documents: [
    { name: "fr", locale: "fr", text: "Le climat change. Le climat compte." },
    { name: "ja", locale: "ja", text: "研究の資料です。研究を続けます。" },
  ],
  options: { ...defaultOptions, stopWords: [] },
  reference: [],
  pairs: [],
});
test("BH never rounds adjusted tied probabilities below the original probabilities", () => {
  const p = 0.9658164012795423;
  assert.ok(
    benjaminiHochberg(Array(142).fill(p)).every((q) => q >= p && q <= 1),
  );
});
test("re-pairing unchanged text preserves notes and keeps duplicate notes in occurrence order", () => {
  const old = [
    { source: "a", target: "b", note: "first" },
    { source: "a", target: "b", note: "second" },
    { source: "c", target: "d", note: "third" },
  ];
  assert.deepEqual(
    alignByLine("new\na\na\nc", "nuevo\nb\nb\nd", old).map((p) => p.note),
    ["", "first", "second", "third"],
  );
});
test("parallel evidence flags actual duplicate units and catches the observed invented P2 duplicate claim", () => {
  const pairs = [
    { source: "a", target: "b" },
    { source: "c", target: "d" },
    { source: "a", target: "b" },
    { source: "2026", target: "2026" },
    { source: "missing", target: "" },
  ];
  const flags = parallelReviewFlags(pairs);
  assert.deepEqual(flags, [
    ["Duplicate pair"],
    [],
    ["Duplicate pair"],
    ["Identical segments"],
    ["Missing target"],
  ]);
  const e = pairs.map((p, i) => ({
    id: `P${i + 1}`,
    label: "pair",
    value: { ...p, reviewFlags: flags[i] },
  }));
  assert.match(
    unsupportedClaimNotice("[P2] Carefully review the duplicate pair.", e),
    /do not mark/,
  );
  assert.equal(
    unsupportedClaimNotice("[P1] Review this duplicate pair.", e),
    "",
  );
});
test("actual large-book AI numerical hallucination is flagged while rounded source counts and identifiers pass", () => {
  const evidence = [
    {
      id: "C1",
      label: "book",
      value: {
        documents: 1,
        tokens: 26775,
        types: 2747,
        typeTokenRatio: 2747 / 26775,
      },
    },
  ];
  assert.match(
    numericClaimNotice("267, 750 word tokens; 2747 types. [C1]", evidence),
    /267, 750/,
  );
  assert.equal(
    numericClaimNotice(
      "26,775 word tokens; 2,747 types; 10.26%. [C1]",
      evidence,
    ),
    "",
  );
  assert.match(
    unsupportedClaimNotice(
      "La majorité des termes (74.6%) sont représentés par moins de deux fois.",
      evidence,
    ),
    /type-token/,
  );
  assert.equal(
    unsupportedClaimNotice(
      "Document: 26775 tokens, 2747 types, 1215 hapax.",
      evidence,
    ),
    "",
  );
});
test("Arabic, Persian and fullwidth AI numerals use the same evidence mismatch check", () => {
  const e = [
    { id: "C1", label: "counts", value: { tokens: 156, ratio: 0.91 } },
  ];
  assert.equal(numericClaimNotice("١٥٦ ؛ ۱۵۶ ؛ １５６ ؛ ٩١٪", e), "");
  assert.match(numericClaimNotice("١٥٦٠", e), /1560/);
});
test("report exports retain frozen title, requested language, incomplete status, checks and evidence", () => {
  const metadata = {
      title: "Original title <unsafe>",
      model: "Local writer @ revision",
      language: "es",
      generatedAt: "2026-11-06",
      incomplete: true,
    },
    e = [{ id: "C1", label: "counts", value: { tokens: 12 } }];
  for (const format of ["md", "html"] as const) {
    const out = reportExport(
      "draft <script>",
      e,
      metadata,
      ["Numeric mismatch"],
      format,
    );
    assert.ok(out.includes("Original title"));
    assert.ok(out.includes("incomplete"));
    assert.ok(out.includes("Numeric mismatch"));
    assert.ok(out.includes("Frozen evidence"));
    if (format === "html") {
      assert.ok(!out.includes("<script>"));
      assert.ok(out.includes('lang="es"'));
    }
  }
});
test("snapshot freezes before any await and recomputes rather than trusting stale props", async () => {
  const input = source(),
    pending = makePaperSnapshot(input, "test", "Node ICU");
  input.documents[0].text = "changed";
  const s = await pending;
  assert.equal(
    s.source.documents[0].text,
    "Le climat change. Le climat compte.",
  );
  assert.ok(s.analysis.words > 6);
  assert.equal(s.fingerprint.length, 64);
  const twice = await makePaperSnapshot(source(), "test", "Node ICU");
  assert.equal(s.fingerprint, twice.fingerprint);
});
test("paper tables cover every document and all requested rows, normalized denominators and true hapax", async () => {
  const s = await makePaperSnapshot(source(), "test", "ICU"),
    a = s.analysis;
  const tables = paperTables(s, 1);
  assert.equal(tables[0].rows.length, 2);
  assert.equal(tables[1].rows.length, 1);
  assert.equal(paperTables(s, 0)[1].rows.length, a.frequencies.length);
  assert.equal(
    paperTables(s, 0)[1].rows.reduce((sum, r) => sum + Number(r[2]), 0),
    a.words,
  );
  assert.equal(tables[0].rows[0][4], a.documentStats[0].hapax);
  assert.throws(() => paperTables(s, -1));
});
test("comparison paper includes all-family adjusted values and preserves missing parallel targets", async () => {
  const input = {
    ...source(),
    reference: [{ name: "other", text: "Le soleil change." }],
    pairs: [{ source: "A", target: "", note: "missing" }],
  };
  const s = await makePaperSnapshot(input, "test", "ICU");
  const t = paperTables(s, 0);
  assert.equal(t.find((t) => t.id === "T4")!.rows[0][2], "");
  assert.equal(t.find((t) => t.id === "T5")!.rows.length, s.comparison.length);
  assert.equal(
    t.find((t) => t.id === "T5")!.rows[0][6],
    s.comparison[0].qValue,
  );
  assert.match(paperMethods(s), /Benjamini/);
});
test("manuscript escapes user text and SVG data, includes editable provenance without fabricated references", async () => {
  const input = source();
  input.name = "<script>alert(1)</script>";
  input.documents[0].name = '<img onerror="alert(1)">';
  const s = await makePaperSnapshot(input, "test", "ICU"),
    p = newPaper(s);
  p.sections.abstract.text = "<script>bad</script>";
  const html = paperHtml(s, p);
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img onerror"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes(s.fingerprint));
  assert.ok(html.includes("not a rare-word proportion"));
  assert.ok(paperFigures(s, 15)[0].svg.includes("&lt;img"));
  assert.equal(Object.keys(paperCsvFiles(s, p)).length, 5);
});
test("paper restore detects tampered source and recalculates tampered results with unchanged hash", async () => {
  const s = await makePaperSnapshot(source(), "test", "ICU"),
    p = newPaper(s);
  const tampered = structuredClone({ snapshot: s, project: p });
  tampered.snapshot.source.documents[0].text = "tampered";
  await assert.rejects(validatePaperBundle(tampered), /fingerprint/);
  const fake = structuredClone({ snapshot: s, project: p });
  fake.snapshot.analysis.words = 999999;
  const restored = await validatePaperBundle(fake);
  assert.equal(restored.snapshot.analysis.words, s.analysis.words);
});
test("AI narrative guards incomplete, numeric and unknown/inferential claims and model instructions exclude invented data", async () => {
  const s = await makePaperSnapshot(source(), "test", "ICU"),
    p = newPaper(s);
  const issues = paperDraftIssues({
    text: "A significant 95% change [Z8].",
    origin: "local-ai",
    reviewed: false,
    incomplete: true,
  });
  assert.equal(issues.length, 5);
  const messages = paperMessages(s, p, "discussion");
  assert.match(messages[0].content, /Do not add numerical claims/);
  assert.ok(!messages[1].content.includes("perMillion"));
  assert.equal(
    paperDraftIssues({
      text: "Read the examples in [T2, T3] and [F1; F2].",
      origin: "human",
      reviewed: true,
      incomplete: false,
    }).length,
    0,
  );
});
test("table row mapping preserves names, BCP47 languages, embedded newlines and rejects invalid language atomically", () => {
  const rows = [
    ["one", "en", "first\nsecond"],
    ["二", "zh-Hans", "研究"],
    ["blank", "fr", ""],
  ];
  assert.deepEqual(
    tableDocuments(rows, {
      name: "file",
      text: 2,
      separate: true,
      nameColumn: 0,
      languageColumn: 1,
    }),
    [
      { name: "one", locale: "en", text: "first\nsecond" },
      { name: "二", locale: "zh-Hans", text: "研究" },
    ],
  );
  assert.throws(
    () =>
      tableDocuments(
        [
          ["x", "Spanish", "hola"],
          ["y", "not_valid", "bad"],
        ],
        {
          name: "file",
          text: 2,
          separate: true,
          nameColumn: 0,
          languageColumn: 1,
        },
      ),
    /invalid language/,
  );
  assert.equal(
    tableDocuments(rows, {
      name: "file",
      text: 2,
      separate: false,
      nameColumn: -1,
      languageColumn: -1,
    }).length,
    1,
  );
});
