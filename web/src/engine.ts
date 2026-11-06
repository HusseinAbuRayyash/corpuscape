export interface CorpusDocument {
  name: string;
  text: string;
}
export interface Options {
  locale: string;
  caseSensitive: boolean;
  stopWords: string[];
}
export interface Token {
  term: string;
  surface: string;
  start: number;
  end: number;
  document: number;
  sentence: number;
}
export interface Frequency {
  term: string;
  count: number;
  perMillion: number;
  documents: number;
}
export interface Hit {
  left: string;
  match: string;
  right: string;
  document: string;
  position: number;
}
export interface Analysis {
  words: number;
  types: number;
  sentences: number;
  characters: number;
  ttr: number;
  averageSentence: number;
  frequencies: Frequency[];
  ngrams: Record<number, { term: string; count: number }[]>;
  documentStats: { name: string; words: number; types: number }[];
}
export const defaultOptions: Options = {
  locale: "und",
  caseSensitive: false,
  stopWords: [],
};

// Use the browser's ICU word boundaries: this includes dictionary segmentation for CJK.
// NFC preserves meaningful letters and diacritics; no Latin-only or Arabic-only normalization.
export function tokenize(
  documents: CorpusDocument[],
  options: Options,
): Token[] {
  const locale = options.locale === "und" ? undefined : options.locale;
  const wordSegmenter = new Intl.Segmenter(locale, { granularity: "word" });
  const sentenceSegmenter = new Intl.Segmenter(locale, {
    granularity: "sentence",
  });
  const result: Token[] = [];
  documents.forEach((doc, document) => {
    let sentence = 0;
    for (const part of sentenceSegmenter.segment(doc.text)) {
      for (const word of wordSegmenter.segment(part.segment)) {
        if (!word.isWordLike) continue;
        const surface = word.segment;
        const normalized = surface.normalize("NFC");
        result.push({
          term: options.caseSensitive
            ? normalized
            : normalized.toLocaleLowerCase(locale),
          surface,
          start: part.index + word.index,
          end: part.index + word.index + surface.length,
          document,
          sentence,
        });
      }
      sentence++;
    }
  });
  return result;
}
function stopSet(options: Options) {
  const locale = options.locale === "und" ? undefined : options.locale;
  return new Set(
    options.stopWords.map((w) =>
      options.caseSensitive
        ? w.normalize("NFC")
        : w.normalize("NFC").toLocaleLowerCase(locale),
    ),
  );
}
export function analyze(
  documents: CorpusDocument[],
  options = defaultOptions,
): Analysis {
  const tokens = tokenize(documents, options),
    stops = stopSet(options);
  const counts = new Map<string, { count: number; documents: Set<number> }>();
  const unique = new Set<string>(),
    sentences = new Set<string>();
  for (const token of tokens) {
    unique.add(token.term);
    sentences.add(`${token.document}:${token.sentence}`);
    if (stops.has(token.term)) continue;
    const entry = counts.get(token.term) ?? {
      count: 0,
      documents: new Set<number>(),
    };
    entry.count++;
    entry.documents.add(token.document);
    counts.set(token.term, entry);
  }
  const frequencies = [...counts]
    .map(([term, entry]) => ({
      term,
      count: entry.count,
      perMillion: (entry.count / tokens.length) * 1e6,
      documents: entry.documents.size,
    }))
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term));
  const ngrams: Analysis["ngrams"] = {};
  for (const n of [2, 3, 4]) {
    const map = new Map<string, number>();
    for (let i = 0; i <= tokens.length - n; i++) {
      const group = tokens.slice(i, i + n);
      if (
        group.some(
          (t) =>
            t.document !== group[0].document ||
            t.sentence !== group[0].sentence ||
            stops.has(t.term),
        )
      )
        continue;
      const term = group.map((t) => t.term).join(" ");
      map.set(term, (map.get(term) ?? 0) + 1);
    }
    ngrams[n] = [...map]
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term))
      .slice(0, 500);
  }
  const documentStats = documents.map((doc, i) => {
    const subset = tokens.filter((t) => t.document === i);
    return {
      name: doc.name,
      words: subset.length,
      types: new Set(subset.map((t) => t.term)).size,
    };
  });
  return {
    words: tokens.length,
    types: unique.size,
    sentences: sentences.size,
    characters: documents.reduce(
      (sum, d) => sum + Array.from(d.text).length,
      0,
    ),
    ttr: tokens.length ? unique.size / tokens.length : 0,
    averageSentence: sentences.size ? tokens.length / sentences.size : 0,
    frequencies,
    ngrams,
    documentStats,
  };
}
export function concordance(
  documents: CorpusDocument[],
  options: Options,
  query: string,
  context = 55,
  maxHits = 1000,
): { hits: Hit[]; total: number } {
  const tokens = tokenize(documents, options),
    needle = tokenize([{ name: "", text: query }], options).map((t) => t.term);
  const hits: Hit[] = [];
  let total = 0;
  if (!needle.length) return { hits, total };
  for (let i = 0; i <= tokens.length - needle.length; i++) {
    const first = tokens[i],
      last = tokens[i + needle.length - 1];
    if (
      first.document !== last.document ||
      first.sentence !== last.sentence ||
      !needle.every((term, j) => tokens[i + j].term === term)
    )
      continue;
    total++;
    if (hits.length >= maxHits) continue;
    const doc = documents[first.document];
    hits.push({
      left: doc.text.slice(Math.max(0, first.start - context), first.start),
      match: doc.text.slice(first.start, last.end),
      right: doc.text.slice(last.end, last.end + context),
      document: doc.name,
      position: first.start,
    });
  }
  return { hits, total };
}
export function collocations(
  documents: CorpusDocument[],
  options: Options,
  query: string,
  window = 5,
  minimum = 2,
) {
  const tokens = tokenize(documents, options),
    node = tokenize([{ name: "", text: query }], options);
  if (node.length !== 1) return [];
  const stops = stopSet(options),
    nodeTerm = node[0].term;
  const pairs = new Map<string, number>(),
    rightMarginal = new Map<string, number>();
  let slots = 0,
    nodeSlots = 0;
  for (let i = 0; i < tokens.length; i++) {
    for (
      let j = Math.max(0, i - window);
      j <= Math.min(tokens.length - 1, i + window);
      j++
    ) {
      if (
        j === i ||
        tokens[j].document !== tokens[i].document ||
        tokens[j].sentence !== tokens[i].sentence
      )
        continue;
      slots++;
      rightMarginal.set(
        tokens[j].term,
        (rightMarginal.get(tokens[j].term) ?? 0) + 1,
      );
      if (tokens[i].term === nodeTerm) {
        nodeSlots++;
        pairs.set(tokens[j].term, (pairs.get(tokens[j].term) ?? 0) + 1);
      }
    }
  }
  return [...pairs]
    .filter(([term, count]) => count >= minimum && !stops.has(term))
    .map(([term, count]) => ({
      term,
      count,
      pmi: Math.log2((count * slots) / (nodeSlots * rightMarginal.get(term)!)),
      dice: (2 * count) / (nodeSlots + rightMarginal.get(term)!),
    }))
    .sort((a, b) => b.count - a.count || b.pmi - a.pmi)
    .slice(0, 500);
}
export function compare(a: Analysis, b: Analysis) {
  const terms = new Set([
    ...a.frequencies.map((t) => t.term),
    ...b.frequencies.map((t) => t.term),
  ]);
  const left = new Map(a.frequencies.map((t) => [t.term, t.count])),
    right = new Map(b.frequencies.map((t) => [t.term, t.count]));
  if (!a.words || !b.words) return [];
  return [...terms]
    .map((term) => {
      const ca = left.get(term) ?? 0,
        cb = right.get(term) ?? 0,
        total = ca + cb;
      const ea = (total * a.words) / (a.words + b.words),
        eb = (total * b.words) / (a.words + b.words);
      const g2 =
        2 *
        ((ca ? ca * Math.log(ca / ea) : 0) + (cb ? cb * Math.log(cb / eb) : 0));
      return {
        term,
        a: ca,
        b: cb,
        aPerMillion: (ca / a.words) * 1e6,
        bPerMillion: (cb / b.words) * 1e6,
        logRatio: Math.log2(
          (ca + 0.5) / (a.words + 0.5) / ((cb + 0.5) / (b.words + 0.5)),
        ),
        g2,
      };
    })
    .sort((a, b) => b.g2 - a.g2)
    .slice(0, 1000);
}
export function alignByLine(source: string, target: string) {
  function lines(text: string) {
    const rows = text.split(/\r?\n/);
    while (rows.length && !rows.at(-1)!.trim()) rows.pop();
    return rows;
  }
  const a = lines(source),
    b = lines(target);
  return Array.from({ length: Math.max(a.length, b.length) }, (_, i) => ({
    source: a[i] ?? "",
    target: b[i] ?? "",
    note: "",
  }));
}
export function csv(rows: unknown[][]): string {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            let s = String(value ?? "");
            // Neutralize spreadsheet formulas in user-supplied text.
            if (
              typeof value === "string" &&
              (/^\s*[=+@\-]/.test(s) || /^[\t\r]/.test(s))
            )
              s = "'" + s;
            return '"' + s.replace(/"/g, '""') + '"';
          })
          .join(","),
      )
      .join("\r\n")
  );
}
export function xmlEscape(value: string) {
  return value.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
}
export function tmx(
  pairs: { source: string; target: string }[],
  sourceLocale: string,
  targetLocale: string,
) {
  return (
    `<?xml version="1.0" encoding="UTF-8"?><tmx version="1.4"><header creationtool="Corpuscape" creationtoolversion="2" segtype="sentence" o-tmf="Corpuscape" adminlang="en" srclang="${xmlEscape(sourceLocale)}" datatype="PlainText"/><body>` +
    pairs
      .map(
        (p) =>
          `<tu><tuv xml:lang="${xmlEscape(sourceLocale)}"><seg>${xmlEscape(p.source)}</seg></tuv><tuv xml:lang="${xmlEscape(targetLocale)}"><seg>${xmlEscape(p.target)}</seg></tuv></tu>`,
      )
      .join("") +
    "</body></tmx>"
  );
}
