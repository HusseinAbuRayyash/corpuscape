import type { CorpusDocument } from "./engine";

export interface TranslationMemory {
  languages: string[];
  sourceLocale: string;
  targetLocale: string;
  units: { variants: { language: string; text: string }[]; note: string }[];
}
export function parseTmx(text: string): TranslationMemory {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (
    doc.querySelector("parsererror") ||
    doc.documentElement.localName !== "tmx"
  )
    throw new Error("This TMX file is not valid TMX XML.");
  const languages = new Set<string>();
  const units = [...doc.querySelectorAll("tu")]
    .map((tu) => {
      const seen = new Set<string>();
      const variants = [...tu.querySelectorAll(":scope > tuv")].map((tuv) => {
        const tag =
          tuv.getAttributeNS("http://www.w3.org/XML/1998/namespace", "lang") ||
          tuv.getAttribute("lang");
        if (!tag)
          throw new Error("A TMX translation variant has no language tag.");
        let language: string;
        try {
          language = Intl.getCanonicalLocales(tag)[0];
        } catch {
          throw new Error(`Invalid TMX language tag: ${tag}.`);
        }
        if (seen.has(language))
          throw new Error(
            `Duplicate ${language} variants in a TMX unit. Choose one variant before importing.`,
          );
        seen.add(language);
        languages.add(language);
        const seg = tuv.querySelector("seg");
        if (!seg) throw new Error("A TMX translation variant has no segment.");
        const copy = seg.cloneNode(true) as Element;
        // TMX inline codes carry formatting, not words. Preserve text inside hi/sub.
        copy
          .querySelectorAll("bpt,ept,ph,it,ut")
          .forEach((node) => node.remove());
        return { language, text: copy.textContent ?? "" };
      });
      return {
        variants,
        note:
          tu.querySelector('prop[type="x-corpuscape-note"]')?.textContent ?? "",
      };
    })
    .filter((unit) => unit.variants.some((v) => v.text.trim()));
  if (!units.length || languages.size < 2)
    throw new Error(
      "TMX needs readable segments in at least two tagged languages.",
    );
  const tags = [...languages];
  const declared = doc.querySelector("header")?.getAttribute("srclang");
  let canonical = "";
  try {
    if (declared && declared !== "*all*")
      canonical = Intl.getCanonicalLocales(declared)[0];
  } catch {
    /* use a language present in the file */
  }
  const sourceLocale = tags.includes(canonical) ? canonical : tags[0];
  return {
    languages: tags,
    sourceLocale,
    targetLocale: tags.find((tag) => tag !== sourceLocale)!,
    units,
  };
}
export function selectTmxPairs(
  memory: TranslationMemory,
  source: string,
  target: string,
) {
  if (
    source === target ||
    !memory.languages.includes(source) ||
    !memory.languages.includes(target)
  )
    throw new Error("Choose two different languages present in the TMX file.");
  const pairs = memory.units
    .map((unit) => ({
      source: unit.variants.find((v) => v.language === source)?.text ?? "",
      target: unit.variants.find((v) => v.language === target)?.text ?? "",
      note: unit.note,
    }))
    .filter((pair) => pair.source.trim() || pair.target.trim());
  if (!pairs.length)
    throw new Error("No readable segments for the selected languages.");
  return pairs;
}
export function tmxDocuments(
  memory: TranslationMemory,
  name: string,
): CorpusDocument[] {
  return memory.languages
    .map((locale) => ({
      name: `${name} · ${locale}`,
      locale,
      text: memory.units
        .map(
          (unit) =>
            unit.variants.find((v) => v.language === locale)?.text ?? "",
        )
        .join("\n"),
    }))
    .filter((doc) => doc.text.trim());
}
export interface SubtitleCue { start: number; end: number; text: string }

export function subtitleCues(input: string): SubtitleCue[] {
  const blocks = input
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/);
  const cues: SubtitleCue[] = [];
  const stamp = "(?:\\d{2,}:)?[0-5]\\d:[0-5]\\d[.,]\\d{3}";
  const timingLine = new RegExp(`^\\s*(${stamp})\\s+-->\\s+(${stamp})(?:\\s|$)`);
  const milliseconds = (value: string) =>
    value.replace(",", ".").split(":").reduce((total, part) => total * 60 + Number(part), 0) * 1000;
  for (const block of blocks) {
    const lines = block.split("\n");
    if (
      /^(?:WEBVTT|NOTE(?:\s|$)|STYLE(?:\s|$)|REGION(?:\s|$))/.test(
        lines[0].trim(),
      )
    )
      continue;
    const timing = lines.findIndex((line) => timingLine.test(line));
    if (timing < 0) continue;
    const [, from, to] = timingLine.exec(lines[timing])!;
    const start = Math.round(milliseconds(from)), end = Math.round(milliseconds(to));
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end <= start) continue;
    const cue = lines
      .slice(timing + 1)
      .join("\n")
      .replace(/<[^>]*>/g, "");
    const decoded =
      new DOMParser().parseFromString(
        `<body>${cue.replace(/</g, "&lt;")}</body>`,
        "text/html",
      ).body.textContent ?? "";
    if (decoded.trim()) cues.push({ start, end, text: decoded });
  }
  return cues;
}

export function subtitleText(input: string) {
  return subtitleCues(input).map(({ text }) => text).join("\n\n");
}
export function decodeText(bytes: ArrayBuffer) {
  const data = new Uint8Array(bytes);
  const encoding =
    data[0] === 0xff && data[1] === 0xfe
      ? "utf-16le"
      : data[0] === 0xfe && data[1] === 0xff
        ? "utf-16be"
        : "utf-8";
  try {
    return new TextDecoder(encoding, { fatal: true }).decode(data);
  } catch {
    throw new Error(
      "Cannot decode this text. Save it as UTF-8 or UTF-16 with a byte-order mark before importing.",
    );
  }
}
