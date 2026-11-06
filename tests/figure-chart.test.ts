import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { FrequencyChart } from "../web/src/figure-chart";
const labels = [
  "language",
  "lengua",
  "français",
  "русский",
  "语言",
  "日本語",
  "العربية",
  "Deutsch",
  "português",
  "हिन्दी",
];
for (const type of ["bar", "column", "lollipop"]) {
  test(`${type} SVG exports all ten scripts, complete labels, exact values and a zero baseline`, () => {
    const rows = labels.map((label, i) => ({ label, value: i + 0.125 }));
    rows.push({
      label:
        "A long research label that must be preserved without silent truncation 👩🏽‍🔬",
      value: 0,
    });
    const markup = renderToStaticMarkup(
      React.createElement(FrequencyChart, {
        rows,
        title: "Language research ".repeat(8),
        color: "#2355df",
        type,
        unit: "Per million tokens",
      }),
    );
    const doc = new JSDOM(markup, { contentType: "image/svg+xml" }).window
      .document;
    assert.equal(doc.querySelectorAll("parsererror").length, 0);
    for (const row of rows)
      assert.ok(
        doc
          .querySelector("desc")!
          .textContent!.includes(`${row.label}: ${row.value}`),
      );
    assert.ok(markup.includes("zero baseline"));
    for (const node of doc.querySelectorAll("rect,circle,line,text"))
      for (const attr of [
        "x",
        "y",
        "width",
        "height",
        "cx",
        "cy",
        "x1",
        "x2",
        "y1",
        "y2",
      ])
        if (node.hasAttribute(attr))
          assert.ok(
            Number.isFinite(Number(node.getAttribute(attr))),
            `${attr} must be finite`,
          );
  });
}
test("empty figures do not fabricate a preview; zero-only figures remain valid", () => {
  assert.equal(
    renderToStaticMarkup(
      React.createElement(FrequencyChart, {
        rows: [],
        title: "empty",
        color: "#000",
        type: "bar",
      }),
    ),
    "",
  );
  const markup = renderToStaticMarkup(
    React.createElement(FrequencyChart, {
      rows: [{ label: "Observed zero", value: 0 }],
      title: "Zero",
      color: "#000",
      type: "bar",
    }),
  );
  assert.ok(!markup.includes("NaN"));
  assert.ok(markup.includes("Observed zero: 0"));
});
