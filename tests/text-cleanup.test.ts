import test from "node:test";
import assert from "node:assert/strict";
import { joinCjkLineWraps } from "../web/src/text-cleanup";
import { draftLanguageNotice } from "../web/src/language-detection";
import { analyze, defaultOptions } from "../web/src/engine";
test("line wraps before Japanese punctuation do not create extra counted sentences", () => {
  const raw = "数値を示し\n、図を作る。\n次の文です。";
  const clean = joinCjkLineWraps(raw);
  assert.equal(clean, "数値を示し、図を作る。次の文です。");
  assert.equal(
    analyze([{ name: "pdf", text: clean, locale: "ja" }], defaultOptions)
      .sentences,
    2,
  );
});
test("short English numerical lists do not receive an unreliable French label", () => {
  assert.equal(
    draftLanguageNotice(
      "10 documents, 492 word tokens, 404 unique types, 45 sentences, 2777 Unicode characters. Type-token ratio: 82.1%. Mean sentence length: 10.9 tokens.",
      "en",
    ),
    "",
  );
});
test("mixed Japanese numerical report is flagged as mixed script rather than falsely labelled French", () => {
  const text =
    "文書数: 2\nトークン数: 236\n異なり語数: 129\nSentence Count: 13\nUnicode Characters: 416\nType-Token Ratio: 54.66%\nMean Sentence Length: 18.15tokens";
  assert.match(draftLanguageNotice(text, "ja"), /mixes Japanese script/);
  assert.ok(!draftLanguageNotice(text, "ja").includes("French"));
});
test("CJK reflow repairs extracted word splits while retaining paragraphs, spaces and other scripts", () => {
  assert.equal(
    joinCjkLineWraps("研究の記\n録。\n\n文書\r\nとして保存しまし\nた。"),
    "研究の記録。\n\n文書として保存しました。",
  );
  assert.equal(
    joinCjkLineWraps("Chinese 中文\n研究\n\n第二段。\nEnglish\ntext"),
    "Chinese 中文研究\n\n第二段。\nEnglish\ntext",
  );
  assert.equal(joinCjkLineWraps("漢字 空白\nかな"), "漢字 空白かな");
  assert.equal(
    joinCjkLineWraps("اللغة\nالعربية\nрусский\nязык"),
    "اللغة\nالعربية\nрусский\nязык",
  );
});
