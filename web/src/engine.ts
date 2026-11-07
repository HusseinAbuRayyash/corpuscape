import { chiSquareOne, benjaminiHochberg } from "./statistics";
export interface CorpusDocument {
  name: string;
  text: string;
  /** Overrides the workspace language for this document. und uses browser ICU defaults. */
  locale?: string;
  source?: "pdf" | "ocr";
}
export const arabicSettings = [
  ["alef", "Unify alef forms"],
  ["yaa", "Unify alef maqsura and yaa"],
  ["taMarbuta", "Unify ta marbuta and heh"],
  ["diacritics", "Remove Arabic diacritics"],
  ["tatweel", "Remove tatweel"],
  ["presentationForms", "Expand Arabic presentation forms"],
] as const;
export type ArabicOptions = Partial<Record<(typeof arabicSettings)[number][0], boolean>>;
export interface Options {
  locale: string;
  caseSensitive: boolean;
  stopWords: string[];
  arabic?: ArabicOptions;
  splitArabicClitics?: boolean;
  stopListLanguage?: string;
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
  documentStats: {
    name: string;
    words: number;
    types: number;
    hapax: number;
    locale: string;
  }[];
}
export const defaultOptions: Options = {
  locale: "und",
  caseSensitive: false,
  stopWords: [],
};
export function createTextFilter(
  query: string,
  locales: string[],
  options?: Options,
  documents: CorpusDocument[] = [],
) {
  if (!query) return (_text: string) => true;
  const variants = [...new Set(locales)].flatMap((locale) => {
    const tag = locale === "und" ? undefined : locale;
    const insensitive = { ...defaultOptions, ...options, caseSensitive: false };
    const forms = new Set([options?.arabic?.presentationForms ?? false]);
    if (options?.arabic?.presentationForms === undefined && documents.some((doc) => doc.source))
      forms.add(true);
    return [...forms].map((forms) => ({
      tag,
      query: query.split(/(\s+)/u).map((word) => normalizeTerm(word, insensitive, tag, forms)).join(""),
    }));
  });
  return (text: string) =>
    variants.some(({ tag, query }) =>
      text.normalize("NFC").toLocaleLowerCase(tag).includes(query),
    );
}

function normalizeTerm(surface: string, options: Options, locale?: string, forms = false) {
  const arabic = options.arabic;
  let term = surface.replace(/[\u200c-\u200f\u202a-\u202e\u2066-\u2069]/gu, "");
  if (forms) term = term.replace(/[\ufb50-\ufdff\ufe70-\ufeff]/gu, (glyph) => glyph.normalize("NFKC"));
  term = term.normalize("NFC");
  if (arabic?.alef) term = term.replace(/[أإآٱ]/gu, "ا");
  if (arabic?.yaa) term = term.replace(/ى/gu, "ي");
  if (arabic?.taMarbuta) term = term.replace(/ة/gu, "ه");
  if (arabic?.diacritics) term = term.replace(/[\u064b-\u065f\u0670\u06d6-\u06ed]/gu, "");
  if (arabic?.tatweel) term = term.replace(/\u0640/gu, "");
  if (options.splitArabicClitics) {
    // Requiring the article before dropping a preposition keeps كتاب intact.
    const stem = term.replace(/^[وف]?(?:[بكل]?ال|لل)|^[وف]/u, "");
    if (stem !== term && (stem.match(/\p{Script=Arabic}/gu)?.length ?? 0) >= 3)
      term = stem;
  }
  return options.caseSensitive ? term : term.toLocaleLowerCase(locale);
}

function presentationForms(doc: CorpusDocument, options: Options) {
  return options.arabic?.presentationForms ?? Boolean(doc.source);
}

export function analysisOptionNotes(options: Options, documents: CorpusDocument[]) {
  const active = arabicSettings.filter(([key]) => key !== "presentationForms" && options.arabic?.[key]).map(([, label]) => label);
  const forms = documents.filter((doc) => presentationForms(doc, options)).length;
  const stopList = options.stopWords.length
    ? options.stopListLanguage ? `Stopwords ISO (${options.stopListLanguage}, editable)` : "Custom list"
    : "None";
  return {
    arabic: `${active.join(", ") || "No letter or diacritic folding"}. Presentation forms: ${forms}/${documents.length} documents. Experimental clitic splitting: ${options.splitArabicClitics ? "on" : "off"}.`,
    stopList,
  };
}

// Keep surface text and offsets for concordance. Only the matching term changes.
export function tokenize(
  documents: CorpusDocument[],
  options: Options,
): Token[] {
  const result: Token[] = [];
  documents.forEach((doc, document) => {
    const locale = effectiveLocale(doc, options);
    const wordSegmenter = new Intl.Segmenter(locale, { granularity: "word" });
    const sentenceSegmenter = new Intl.Segmenter(locale, {
      granularity: "sentence",
    });
    let sentence = 0;
    for (const part of sentenceSegmenter.segment(doc.text)) {
      for (const word of wordSegmenter.segment(part.segment)) {
        if (!word.isWordLike) continue;
        const surface = word.segment;
        const term = normalizeTerm(surface, options, locale, presentationForms(doc, options));
        if (!term) continue;
        result.push({
          term,
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
function effectiveLocale(doc: CorpusDocument, options: Options) {
  const locale = doc.locale ?? options.locale;
  return locale === "und" ? undefined : locale;
}
function stopSet(options: Options, doc: CorpusDocument) {
  return new Set(
    options.stopWords.map((w) =>
      normalizeTerm(w, options, effectiveLocale(doc, options), presentationForms(doc, options)),
    ),
  );
}
export function analyze(
  documents: CorpusDocument[],
  options = defaultOptions,
): Analysis {
  const tokens = tokenize(documents, options),
    stops = documents.map((doc) =>
      stopSet(options, doc),
    );
  const perDocument = documents.map(() => new Map<string, number>());
  const counts = new Map<string, { count: number; documents: Set<number> }>();
  const unique = new Set<string>(),
    sentences = new Set<string>();
  for (const token of tokens) {
    unique.add(token.term);
    sentences.add(`${token.document}:${token.sentence}`);
    const docCounts = perDocument[token.document];
    docCounts.set(token.term, (docCounts.get(token.term) ?? 0) + 1);
    if (stops[token.document].has(token.term)) continue;
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
            stops[t.document].has(t.term),
        )
      )
        continue;
      const term = group.map((t) => t.term).join(" ");
      map.set(term, (map.get(term) ?? 0) + 1);
    }
    ngrams[n] = [...map]
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term));
  }
  const documentStats = documents.map((doc, i) => {
    const counts = perDocument[i];
    return {
      name: doc.name,
      words: [...counts.values()].reduce((a, b) => a + b, 0),
      types: counts.size,
      hapax: [...counts.values()].filter((count) => count === 1).length,
      locale: doc.locale ?? options.locale,
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
  maxHits = Number.POSITIVE_INFINITY,
): { hits: Hit[]; total: number } {
  if (!Number.isSafeInteger(context) || context < 0)
    throw new Error("Context must be a non-negative integer.");
  const tokens = tokenize(documents, options);
  const needles = documents.map((doc) =>
    tokenize([{ ...doc, text: query }], options).map((t) => t.term),
  );
  const boundaries = new Map<number, number[]>();
  const hits: Hit[] = [];
  let total = 0;
  for (let i = 0; i < tokens.length; i++) {
    const first = tokens[i],
      needle = needles[first.document];
    if (!needle.length || i + needle.length > tokens.length) continue;
    const last = tokens[i + needle.length - 1];
    if (
      first.document !== last.document ||
      first.sentence !== last.sentence ||
      !needle.every((term, j) => tokens[i + j].term === term)
    )
      continue;
    total++;
    if (hits.length >= maxHits) continue;
    const doc = documents[first.document];
    let edges = boundaries.get(first.document);
    if (!edges) {
      edges = [];
      for (const part of new Intl.Segmenter(effectiveLocale(doc, options), {
        granularity: "grapheme",
      }).segment(doc.text))
        edges.push(part.index);
      edges.push(doc.text.length);
      boundaries.set(first.document, edges);
    }
    const start = lowerBound(edges, first.start),
      end = lowerBound(edges, last.end);
    hits.push({
      left: doc.text.slice(edges[Math.max(0, start - context)], first.start),
      match: doc.text.slice(first.start, last.end),
      right: doc.text.slice(
        last.end,
        edges[Math.min(edges.length - 1, end + context)],
      ),
      document: doc.name,
      position: first.start,
    });
  }
  return { hits, total };
}
function lowerBound(values: number[], value: number) {
  let lo = 0,
    hi = values.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (values[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
export function sortConcordance(hits: Hit[], order: string, locale = "und") {
  const tag = locale === "und" ? undefined : locale;
  const segmenter = new Intl.Segmenter(tag, { granularity: "word" });
  const leftKey = (text: string) =>
    [...segmenter.segment(text)]
      .filter((part) => part.isWordLike)
      .map((part) => part.segment.normalize("NFC").toLocaleLowerCase(tag))
      .reverse()
      .join("\u0000");
  const keys = new Map(
    hits.map((hit) => [hit, order === "left" ? leftKey(hit.left) : hit.right]),
  );
  return [...hits].sort((a, b) =>
    order === "document"
      ? a.document.localeCompare(b.document, tag) || a.position - b.position
      : order === "left" || order === "right"
        ? keys.get(a)!.localeCompare(keys.get(b)!, tag)
        : 0,
  );
}
export function collocations(
  documents: CorpusDocument[],
  options: Options,
  query: string,
  window = 5,
  minimum = 2,
) {
  if (
    !Number.isSafeInteger(window) ||
    window < 1 ||
    !Number.isSafeInteger(minimum) ||
    minimum < 1
  )
    throw new Error("Use a positive integer token window and minimum count.");
  const tokens = tokenize(documents, options);
  const nodes = documents.map((doc) =>
    tokenize([{ ...doc, text: query }], options),
  );
  if (nodes.some((node) => node.length !== 1))
    throw new Error(
      "Collocations require one segmented node word. Use Concordance for phrases.",
    );
  const stops = documents.map((doc) =>
    stopSet(options, doc),
  );
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
      if (tokens[i].term === nodes[tokens[i].document][0].term) {
        nodeSlots++;
        if (!stops[tokens[j].document].has(tokens[j].term))
          pairs.set(tokens[j].term, (pairs.get(tokens[j].term) ?? 0) + 1);
      }
    }
  }
  return [...pairs]
    .filter(([, count]) => count >= minimum)
    .map(([term, count]) => ({
      term,
      count,
      pmi: Math.log2((count * slots) / (nodeSlots * rightMarginal.get(term)!)),
      dice: (2 * count) / (nodeSlots + rightMarginal.get(term)!),
    }))
    .sort((a, b) => b.count - a.count || b.pmi - a.pmi);
}
export function compare(a: Analysis, b: Analysis) {
  const terms = new Set([
    ...a.frequencies.map((t) => t.term),
    ...b.frequencies.map((t) => t.term),
  ]);
  const left = new Map(a.frequencies.map((t) => [t.term, t.count])),
    right = new Map(b.frequencies.map((t) => [t.term, t.count]));
  if (!a.words || !b.words) return [];
  const rows = [...terms]
    .map((term) => {
      const ca = left.get(term) ?? 0,
        cb = right.get(term) ?? 0,
        total = ca + cb;
      const ea = (total * a.words) / (a.words + b.words),
        eb = (total * b.words) / (a.words + b.words);
      const g2 = Math.max(
        0,
        2 *
          ((ca ? ca * Math.log(ca / ea) : 0) +
            (cb ? cb * Math.log(cb / eb) : 0)),
      );
      const probability = chiSquareOne(g2);
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
        pValue: probability.p,
        log10P: probability.logP / Math.LN10,
      };
    })
    .sort((a, b) => b.g2 - a.g2);
  const adjusted = benjaminiHochberg(rows.map((row) => row.pValue));
  return rows.map((row, index) => ({ ...row, qValue: adjusted[index] }));
}
export function alignByLine(
  source: string,
  target: string,
  previous: { source: string; target: string; note: string }[] = [],
) {
  function lines(text: string) {
    const rows = text.split(/\r\n?|\n/);
    while (rows.length && !rows.at(-1)!.trim()) rows.pop();
    return rows;
  }
  const a = lines(source),
    b = lines(target);
  const notes = new Map<string, string[]>();
  for (const p of previous) {
    const key = JSON.stringify([p.source, p.target]);
    const queue = notes.get(key) ?? [];
    queue.push(p.note);
    notes.set(key, queue);
  }
  const cursors = new Map<string, number>();
  const noteFor = (key: string) => {
    const cursor = cursors.get(key) ?? 0;
    cursors.set(key, cursor + 1);
    return notes.get(key)?.[cursor] ?? "";
  };
  return Array.from({ length: Math.max(a.length, b.length) }, (_, i) => ({
    source: a[i] ?? "",
    target: b[i] ?? "",
    note: noteFor(JSON.stringify([a[i] ?? "", b[i] ?? ""])),
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
  pairs: { source: string; target: string; note?: string }[],
  sourceLocale: string,
  targetLocale: string,
) {
  let source: string, target: string;
  try {
    source = Intl.getCanonicalLocales(sourceLocale)[0];
    target = Intl.getCanonicalLocales(targetLocale)[0];
  } catch {
    throw new Error(
      "TMX export needs valid BCP 47 source and target language tags.",
    );
  }
  if (
    !source ||
    !target ||
    source === target ||
    source === "und" ||
    target === "und"
  )
    throw new Error(
      "Choose two different, explicit language tags for TMX export.",
    );
  const invalidXml =
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u;
  if (pairs.some((p) => invalidXml.test(p.source + p.target + (p.note ?? ""))))
    throw new Error(
      "TMX contains characters forbidden in XML. Remove control characters before exporting.",
    );
  return (
    `<?xml version="1.0" encoding="UTF-8"?><tmx version="1.4"><header creationtool="Corpuscape" creationtoolversion="2" segtype="sentence" o-tmf="Corpuscape" adminlang="en" srclang="${xmlEscape(sourceLocale)}" datatype="PlainText"/><body>` +
    pairs
      .map(
        (p) =>
          `<tu>${p.note ? `<prop type="x-corpuscape-note">${xmlEscape(p.note)}</prop>` : ""}<tuv xml:lang="${xmlEscape(sourceLocale)}"><seg>${xmlEscape(p.source)}</seg></tuv><tuv xml:lang="${xmlEscape(targetLocale)}"><seg>${xmlEscape(p.target)}</seg></tuv></tu>`,
      )
      .join("") +
    "</body></tmx>"
  );
}
