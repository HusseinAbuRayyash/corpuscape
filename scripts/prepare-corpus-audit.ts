import { readFile, writeFile, mkdir } from "node:fs/promises";
import {
  originalResearchCorpora,
  type ResearchCorpus,
} from "../tests/fixtures/research-corpora";
import {
  analyze,
  defaultOptions,
  concordance,
  collocations,
  compare,
  csv,
  tmx,
  xmlEscape,
} from "../web/src/engine";
import { makeBackup } from "../web/src/backup";
const root = new URL("../../corpus-qa/", import.meta.url);
await mkdir(root, { recursive: true });
const metadata = JSON.parse(
  await readFile(new URL("sources.json", root), "utf8"),
);
const books: ResearchCorpus[] = await Promise.all(
  metadata.map(async (m: any) => ({
    id: m.id,
    name: m.title,
    mode: "monolingual",
    locale: m.language,
    format: "TXT",
    query: m.language === "en" ? "Alice" : "Pepita",
    documents: [
      {
        name: m.title,
        locale: m.language,
        text: await readFile(new URL(`${m.id}.txt`, root), "utf8"),
      },
    ],
    description: `${m.author}. ${m.source}. Gutenberg body between marker lines; editorial front matter retained. ${m.rights}`,
  })),
);
const corpora = [...books, ...originalResearchCorpora];
const summary = [];
for (const c of corpora) {
  const options = { ...defaultOptions, locale: c.locale },
    a = analyze(c.documents, options),
    reference =
      c.documents.length > 1
        ? c.documents.slice(1)
        : [
            {
              ...c.documents[0],
              text: c.documents[0].text.slice(
                0,
                Math.floor(c.documents[0].text.length / 2),
              ),
            },
          ];
  const expected = {
    documents: c.documents.length,
    words: a.words,
    types: a.types,
    sentences: a.sentences,
    characters: a.characters,
    frequencyRows: a.frequencies.length,
    frequencySum: a.frequencies.reduce((s, r) => s + r.count, 0),
    query: c.query,
    concordanceHits: concordance(c.documents, options, c.query, 55).total,
    collocationRows: collocations(c.documents, options, c.query, 5, 1).length,
    ngrams: Object.fromEntries([2, 3, 4].map((n) => [n, a.ngrams[n].length])),
    comparisonRows: compare(a, analyze(reference, options)).length,
  };
  await writeFile(
    new URL(`${c.id}.json`, root),
    JSON.stringify(makeBackup(c.name, c.documents, options), null, 2),
  );
  await writeFile(
    new URL(`${c.id}-workspace.json`, root),
    JSON.stringify(
      {
        format: "corpuscape-workspace-v1",
        workspace: {
          name: c.name,
          documents: c.documents,
          options,
          reference,
          sourceText: c.pairs?.map((p) => p.source).join("\n") ?? "",
          targetText: c.pairs?.map((p) => p.target).join("\n") ?? "",
          sourceLocale: c.pairLocales?.source ?? "en",
          targetLocale: c.pairLocales?.target ?? "es",
          pairs: c.pairs ?? [],
          activeId: null,
        },
        figure: null,
        reports: null,
      },
      null,
      2,
    ),
  );
  await writeFile(
    new URL(`${c.id}.csv`, root),
    csv([
      ["name", "language", "text"],
      ...c.documents.map((d) => [d.name, d.locale ?? c.locale, d.text]),
    ]),
  );
  if (c.pairs)
    await writeFile(
      new URL(`${c.id}.tmx`, root),
      tmx(c.pairs, c.pairLocales!.source, c.pairLocales!.target),
    );
  if (c.locale === "zh")
    for (const [i, d] of c.documents.entries())
      await writeFile(
        new URL(`${c.id}-${i + 1}.html`, root),
        `<!doctype html><html lang="zh"><head><title>ignored</title></head><body><nav>EXCLUDE_NAV</nav><script>EXCLUDE_SCRIPT</script><article><p>${xmlEscape(d.text)}</p></article><footer>EXCLUDE_FOOTER</footer></body></html>`,
      );
  summary.push({ ...c, documents: undefined, pairs: undefined, expected });
}
await writeFile(
  new URL("manifest.json", root),
  JSON.stringify(summary, null, 2),
);
await writeFile(
  new URL("original-corpora.json", root),
  JSON.stringify(originalResearchCorpora, null, 2),
);
console.log(
  JSON.stringify(
    summary.map((c) => ({ id: c.id, mode: c.mode, ...c.expected })),
    null,
    2,
  ),
);
