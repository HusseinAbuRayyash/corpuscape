import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { alignSentences, pairSubtitles } from "../web/src/parallel-align";
import { subtitleCues } from "../web/src/import-parsers";
import { tmx } from "../web/src/engine";
import { validateWorkspace } from "../web/src/workspace-session";

test("sentence alignment joins a split translation and preserves text on both sides", () => {
  const source = "We went home. A detailed explanation takes much longer to present clearly. It worked.";
  const target = "We went home. A detailed explanation. It takes much longer to present clearly. It worked.";
  const rows = alignSentences(source, target, "en", "en");
  assert.equal(rows.length, 3);
  assert.equal(rows[1].target, "A detailed explanation. It takes much longer to present clearly.");
  assert.equal(rows.map((row) => row.source).join(" "), source);
  assert.equal(rows.map((row) => row.target).join(" "), target);
  assert.ok(rows.every(({ confidence }) => confidence! >= 0 && confidence! <= 1));
});

test("subtitle pairing uses half the shorter cue, joins two cues, and keeps unmatched times", () => {
  const { window } = new JSDOM();
  Object.assign(globalThis, { DOMParser: window.DOMParser });
  const source = subtitleCues("1\n00:00:01,000 --> 00:00:05,000\nHello &amp; welcome.\n\n2\n00:00:08,000 --> 00:00:10,000\nGoodbye.");
  const target = subtitleCues("WEBVTT\n\n00:01.000 --> 00:03.000 align:start\nHola.\n\n00:03.000 --> 00:05.000\nBienvenido.\n\n00:09.001 --> 00:11.001\nAdiós.");
  const rows = pairSubtitles(source, target);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].source, "Hello & welcome.");
  assert.equal(rows[0].target, "Hola.\nBienvenido.");
  assert.deepEqual(rows[0].targetTime, { start: 1000, end: 5000 });
  assert.equal(rows[1].target, "");
  assert.equal(rows[2].source, "");
  assert.equal(pairSubtitles(target.slice(0, 2), source.slice(0, 1)).length, 1);
  assert.match(tmx(rows, "en", "es"), /x-corpuscape-target-time">00:00:01.000 --&gt; 00:00:05.000/);
  assert.deepEqual(validateWorkspace({ documents: [], reference: [], pairs: rows }).pairs[0].targetTime, rows[0].targetTime);
});
