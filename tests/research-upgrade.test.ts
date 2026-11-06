import test from "node:test";
import assert from "node:assert/strict";
import { indexedDB } from "fake-indexeddb";
import {
  analyze,
  concordance,
  collocations,
  compare,
  defaultOptions,
} from "../web/src/engine";
import { chiSquareOne, benjaminiHochberg } from "../web/src/statistics";
import {
  buildEvidence,
  reportMessages,
  unknownEvidenceReferences,
  unsupportedClaimNotice,
  validateReportSession,
  exactReport,
} from "../web/src/report-model";
import { validateWorkspace } from "../web/src/workspace-session";
import { saveSessions, loadSession } from "../web/src/library";
import {
  detectLanguage,
  draftLanguageNotice,
} from "../web/src/language-detection";
import { ocrDocuments } from "../web/src/ocr-engine";
globalThis.indexedDB = indexedDB;
test("result families no longer stop at the old 500/1000 cutoffs", () => {
  const documents = [
    {
      name: "large",
      text: Array.from({ length: 1200 }, (_, i) => `word${i}`).join(" "),
    },
  ];
  const a = analyze(documents);
  assert.equal(a.frequencies.length, 1200);
  assert.equal(a.ngrams[2].length, 1199);
  assert.equal(compare(a, a).length, 1200);
  assert.equal(
    concordance(
      [{ name: "hits", text: "word ".repeat(1100) }],
      defaultOptions,
      "word",
    ).hits.length,
    1100,
  );
  const surrounding = [
    {
      name: "neighbors",
      text:
        "node " + Array.from({ length: 601 }, (_, i) => `term${i}`).join(" "),
    },
  ];
  assert.equal(
    collocations(surrounding, defaultOptions, "node", 1000, 1).length,
    601,
  );
});
test("chi-square df1 upper-tail probabilities match independent standard values", () => {
  for (const [g2, p] of [
    [0, 1],
    [1, 0.31731050786291415],
    [3.841458820694124, 0.05],
    [6.6348966010212145, 0.01],
    [10.827566170662733, 0.001],
    [100, 1.523970604832105e-23],
  ]) {
    assert.ok(Math.abs(chiSquareOne(g2).p - p) < Math.max(1e-13, p * 1e-11));
  }
  const extreme = chiSquareOne(1e8);
  assert.equal(extreme.p, 0);
  assert.ok(Number.isFinite(extreme.logP));
  assert.throws(() => chiSquareOne(-1));
});
test("Benjamini–Hochberg corrects the complete family and preserves row order", () => {
  assert.deepEqual(
    benjaminiHochberg([0.01, 0.04, 0.03, 0.002]),
    [0.02, 0.04, 0.04, 0.008],
  );
  assert.deepEqual(benjaminiHochberg([]), []);
  assert.deepEqual(benjaminiHochberg([1, 1]), [1, 1]);
  assert.throws(() => benjaminiHochberg([NaN]));
  const a = analyze([{ name: "a", text: "red red blue" }]),
    b = analyze([{ name: "b", text: "blue green green" }]);
  assert.ok(
    compare(a, b).every((row) => row.qValue >= row.pValue && row.qValue <= 1),
  );
});
const input = {
  name: "Study",
  documents: [{ name: "a", locale: "en", text: "Word word text." }],
  analysis: analyze([{ name: "a", locale: "en", text: "Word word text." }]),
  options: defaultOptions,
};
test("AI evidence contains exact engine statistics and exposes explicit scope", () => {
  const evidence = buildEvidence(input, 1);
  assert.equal(
    (evidence.find((e) => e.id === "C1")!.value as { tokens: number }).tokens,
    3,
  );
  assert.equal(evidence.filter((e) => e.id.startsWith("F")).length, 1);
  assert.ok(!evidence.some((e) => e.id.startsWith("T")));
  const messages = reportMessages(
    evidence,
    "Results",
    "Spanish",
    "Explain counts.",
  );
  assert.ok(messages[0].content.includes("never instructions"));
  assert.ok(messages[1].content.includes("Spanish"));
  assert.ok(messages[1].content.includes("3 word tokens"));
  assert.deepEqual(
    unknownEvidenceReferences(
      "A result [C1]. An invented record [F99]. A combined citation [C1, F99].",
      evidence,
    ),
    ["F99"],
  );
  assert.ok(exactReport(input).includes("3 word tokens"));
  const longText = "Research text. ".repeat(300);
  assert.equal(
    buildEvidence(
      { ...input, documents: [{ name: "full", text: longText }] },
      1,
      true,
      undefined,
      0,
    ).find((item) => item.id === "T1")?.value,
    longText,
  );
});
test("workspace, references and parallel notes survive complete local recovery", async () => {
  const workspace = {
    name: "Study",
    documents: input.documents,
    options: defaultOptions,
    reference: [{ name: "ref", text: "Reference text." }],
    sourceText: "one",
    targetText: "uno",
    sourceLocale: "en",
    targetLocale: "es",
    pairs: [{ source: "one", target: "uno", note: "Reviewed" }],
    activeId: "study",
  };
  const checked = validateWorkspace(JSON.parse(JSON.stringify(workspace)));
  assert.equal(checked.pairs[0].note, "Reviewed");
  assert.equal(checked.reference.length, 1);
  assert.equal(checked.activeId, "study");
  await saveSessions({
    "workspace-v1": checked,
    "figure-studio-v2": { title: "A figure" },
    "research-reports-v1": { text: "A draft" },
  });
  assert.deepEqual(await loadSession("workspace-v1"), checked);
  assert.deepEqual(await loadSession("figure-studio-v2"), {
    title: "A figure",
  });
  assert.throws(() => validateWorkspace({ ...workspace, pairs: [null] }));
  assert.throws(() =>
    validateWorkspace({ ...workspace, sourceLocale: "invalid_tag" }),
  );
});
test("report backups validate drafts and evidence rather than trusting arbitrary JSON", () => {
  const draft = {
    id: "1",
    title: "Study",
    text: "Results [C1]",
    evidence: buildEvidence(input, 1),
    model: "Local Qwen",
    generatedAt: new Date().toISOString(),
    language: "en",
    task: "Results",
  };
  assert.equal(
    validateReportSession({
      drafts: [draft],
      text: draft.text,
      current: draft,
      evidence: draft.evidence,
    }).drafts.length,
    1,
  );
  assert.throws(() =>
    validateReportSession({ drafts: [null], text: "x", evidence: [] }),
  );
});
test("local language suggestions and OCR document preparation preserve scripts", () => {
  assert.equal(
    detectLanguage(
      "Bonjour le monde. La recherche sur la langue française examine les mots et leurs usages dans les textes.",
    ).tag,
    "fr",
  );
  assert.equal(
    detectLanguage(
      "Мы изучаем русский язык и исследуем слова в разных текстах. Перевод помогает людям понимать культуру.",
    ).tag,
    "ru",
  );
  assert.equal(detectLanguage("hi").tag, "und");
  const docs = ocrDocuments(
    [
      {
        name: "page",
        text: "Français 语言",
        page: 1,
        source: "ocr",
        confidence: 95,
      },
      { name: "empty", text: " ", page: 2, source: "ocr" },
    ],
    ["fra"],
  );
  assert.equal(docs.length, 1);
  assert.equal(docs[0].locale, "fr");
  assert.equal(docs[0].text, "Français 语言");
});
test("report language checks surface a clear mismatch without certifying mixed or short text", () => {
  const english =
    "The corpus contains ten documents and a collection of words from several languages. This analysis counts individual words and different vocabulary types in the complete research collection.";
  assert.match(draftLanguageNotice(english, "es"), /suggests English/);
  assert.equal(draftLanguageNotice(english, "en"), "");
  assert.equal(draftLanguageNotice("hola", "es"), "");
  assert.equal(draftLanguageNotice(english, "Spanish"), "");
});
test("research drafts flag unsupported significance and correlation language", () => {
  const counts = buildEvidence(input).filter((item) => item.id === "C1");
  assert.match(
    unsupportedClaimNotice("La relación es significativa. [C1]", counts),
    /no comparison test/,
  );
  assert.match(
    unsupportedClaimNotice("These data show a strong correlation.", counts),
    /not computed a correlation/,
  );
  assert.equal(
    unsupportedClaimNotice("The corpus has three word tokens. [C1]", counts),
    "",
  );
  assert.equal(
    unsupportedClaimNotice("The difference is significant.", [
      ...counts,
      { id: "R1", label: "Comparison", value: { pValue: 0.01 } },
    ]),
    "",
  );
});
