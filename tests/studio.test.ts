import test from "node:test";
import assert from "node:assert/strict";
import { compile } from "vega-lite";
import { View, parse } from "vega";
import {
  buildStudioSpec,
  chartKinds,
  defaultStudio,
  numericFields,
  parseStudioCsv,
  prepareStudioRows,
  studioDatasets,
  studioErrors,
  validateStudioProject,
  type DataRow,
} from "../web/src/studio-model";
import { analyze } from "../web/src/engine";
const labels = [
  "English",
  "Español",
  "Français",
  "Русский",
  "中文",
  "日本語",
  "العربية",
  "Deutsch",
  "Português",
  "हिन्दी",
];
const rows: DataRow[] = labels.flatMap((label, i) =>
  ["A", "B"].map((series, j) => ({
    label,
    series,
    value: i + 2 + j,
    x: i + 1,
    lower: i + 1,
    upper: i + 5,
  })),
);
test("CSV and TSV support multiple series, Unicode, signed values, decimals and quoted labels", () => {
  const data = parseStudioCsv(
    'label,series,value,x\n"Paris, France",A,-2.5,1\n语言,B,0,2\nالعربية,A,3e2,3',
  );
  assert.deepEqual(data.errors, []);
  assert.equal(data.rows.length, 3);
  assert.equal(data.rows[0].label, "Paris, France");
  assert.equal(data.rows[0].value, -2.5);
  assert.equal(data.rows[2].value, 300);
  assert.deepEqual(numericFields(data.rows), ["value", "x"]);
  assert.equal(parseStudioCsv("语言\t2\n日本語\t3").rows[1].value, 3);
});
test("figure imports report malformed rows and duplicate or reserved headings", () => {
  for (const data of [
    "label,value\na,2,extra",
    "label,label\na,2",
    "__proto__,value\na,2",
    '"unclosed,2',
  ])
    assert.ok(parseStudioCsv(data).errors.length);
  const parsed = parseStudioCsv("label,value\na,\nb,word");
  assert.ok(
    studioErrors(parsed.rows, { ...defaultStudio, value: "value" }).length,
  );
});
test("focus preserves complete series groups and all-items mode has no fixed cap", () => {
  const data = Array.from({ length: 1100 }, (_, i) => ({
    label: `Item ${i}`,
    series: i % 2 ? "A" : "B",
    value: i,
  }));
  assert.equal(
    prepareStudioRows(data, { ...defaultStudio, value: "value", top: 0 })
      .length,
    1100,
  );
  const grouped = prepareStudioRows(rows, {
    ...defaultStudio,
    value: "value",
    series: "series",
    top: 3,
  });
  assert.equal(new Set(grouped.map((r) => r.label)).size, 3);
  assert.equal(grouped.length, 6);
  assert.equal(rows.length, 20);
});
for (const kind of chartKinds) {
  test(`${kind.name}: real Vega grammar compiles and renders an SVG`, async () => {
    const config = {
      ...defaultStudio,
      kind: kind.id,
      value: "value",
      series: "series",
      x: "x",
      top: 0,
      title: "A multilingual research figure · 语言 العربية",
    };
    assert.deepEqual(studioErrors(rows, config), []);
    const spec = buildStudioSpec(rows, config);
    const compiled = compile(spec).spec;
    const view = new View(parse(compiled), { renderer: "none" });
    await view.runAsync();
    const svg = await view.toSVG();
    view.finalize();
    assert.ok(svg.includes("<svg"));
    assert.ok(!svg.includes("NaN"));
    assert.ok(svg.includes("A multilingual research figure"));
    if (
      ["bar", "column", "grouped", "lollipop", "heatmap", "donut"].includes(
        kind.id,
      )
    )
      for (const label of labels)
        assert.ok(svg.includes(label), `${kind.id}: ${label} is retained`);
  });
}
test("literal dotted CSV headings render correctly instead of becoming nested field paths", async () => {
  const data = [
    { "Language.name": "Français", "Frequency.pm": 12 },
    { "Language.name": "语言", "Frequency.pm": 8 },
  ];
  const config = {
    ...defaultStudio,
    category: "Language.name",
    value: "Frequency.pm",
    top: 0,
  };
  const view = new View(parse(compile(buildStudioSpec(data, config)).spec), {
    renderer: "none",
  });
  await view.runAsync();
  const svg = await view.toSVG();
  view.finalize();
  assert.ok(svg.includes("Français"));
  assert.ok(svg.includes("语言"));
  assert.ok(!svg.includes("NaN"));
});
test("donut, scatter, dimensions and interval mappings reject invalid data", () => {
  assert.ok(
    studioErrors([{ label: "a", value: -2 }], {
      ...defaultStudio,
      kind: "donut",
      value: "value",
    }).length,
  );
  assert.ok(
    studioErrors([{ label: "a", value: 0 }], {
      ...defaultStudio,
      kind: "donut",
      value: "value",
    }).length,
  );
  assert.ok(
    studioErrors(rows, {
      ...defaultStudio,
      kind: "scatter",
      value: "value",
      x: "label",
    }).length,
  );
  assert.ok(
    studioErrors(rows, { ...defaultStudio, value: "value", width: NaN }).length,
  );
  assert.ok(
    studioErrors(rows, {
      ...defaultStudio,
      value: "value",
      lower: "lower",
      upper: "",
    }).length,
  );
});
test("figure project round-trip preserves complete data, settings and Unicode", () => {
  const project = {
    format: "corpuscape-figure-v1",
    config: { ...defaultStudio, value: "value", caption: "语言 العربية" },
    rows,
    name: "Research",
  };
  const restored = validateStudioProject(JSON.parse(JSON.stringify(project)));
  assert.equal(restored.rows.length, 20);
  assert.equal(restored.config.caption, "语言 العربية");
  assert.equal(restored.config.value, "value");
  assert.throws(() => validateStudioProject({ format: "wrong" }));
  assert.throws(() =>
    validateStudioProject({ ...project, rows: [{ value: Infinity }] }),
  );
});
test("all analysis data sources retain exact numeric measures", () => {
  const documents = [{ name: "a", text: "word word text." }];
  const analysis = analyze(documents);
  const data = studioDatasets({
    name: "Study",
    documents,
    analysis,
    pairs: [{ source: "语言", target: "language", note: "Reviewed" }],
  });
  assert.equal(
    data
      .find((d) => d.id === "frequencies")!
      .rows.find((r) => r.label === "word")!.count,
    2,
  );
  assert.equal(data.find((d) => d.id === "documents")!.rows[0].hapax, 1);
  assert.equal(data.find((d) => d.id === "parallel")!.rows[0].source, 2);
});
