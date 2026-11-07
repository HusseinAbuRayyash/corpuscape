import { arabicSettings, defaultOptions, type CorpusDocument, type Options } from "./engine";

export function validateBackup(data: unknown): {
  name: string;
  documents: CorpusDocument[];
  options: Options;
} {
  if (!data || typeof data !== "object")
    throw new Error("This is not a valid Corpuscape backup.");
  const value = data as Record<string, unknown>;
  if (
    !["corpuscape-v2", "corpuscape-v3"].includes(String(value.format)) ||
    !Array.isArray(value.documents) ||
    !value.documents.length
  )
    throw new Error("A Corpuscape backup must contain at least one document.");
  function locale(tag: unknown) {
    if (typeof tag !== "string") throw new Error("Invalid language in backup.");
    try {
      return tag === "und" ? tag : Intl.getCanonicalLocales(tag)[0] || "und";
    } catch {
      throw new Error(`Invalid language tag in backup: ${tag}.`);
    }
  }
  const documents = value.documents.map((item: unknown): CorpusDocument => {
    if (!item || typeof item !== "object")
      throw new Error("Invalid document in backup.");
    const doc = item as Record<string, unknown>;
    if (
      typeof doc.name !== "string" ||
      typeof doc.text !== "string" ||
      !doc.text.trim()
    )
      throw new Error("Every backup document needs a name and readable text.");
    return {
      name: doc.name,
      text: doc.text,
      ...(doc.locale === undefined ? {} : { locale: locale(doc.locale) }),
      ...(doc.source === "pdf" || doc.source === "ocr" ? { source: doc.source } : {}),
    };
  });
  const raw = value.options;
  let options: Options = {
    ...defaultOptions,
    locale: locale(value.locale ?? "und"),
    stopWords: [],
  };
  if (raw !== undefined) {
    if (!raw || typeof raw !== "object")
      throw new Error("Invalid analysis options in backup.");
    const opts = raw as Record<string, unknown>;
    if (
      typeof opts.caseSensitive !== "boolean" ||
      !Array.isArray(opts.stopWords) ||
      !opts.stopWords.every(
        (word) => typeof word === "string",
      )
    )
      throw new Error("Invalid case or stop-list settings in backup.");
    options = {
      locale: locale(opts.locale),
      caseSensitive: opts.caseSensitive,
      stopWords: [...opts.stopWords] as string[],
    };
    if (opts.arabic !== undefined) {
      if (!opts.arabic || typeof opts.arabic !== "object")
        throw new Error("Invalid Arabic normalisation settings.");
      const source = opts.arabic as Record<string, unknown>;
      const arabic: NonNullable<Options["arabic"]> = {};
      for (const [key] of arabicSettings) {
        const value = source[key];
        if (value === undefined) continue;
        if (typeof value !== "boolean") throw new Error("Invalid Arabic normalisation setting.");
        arabic[key] = value;
      }
      options.arabic = arabic;
    }
    if (typeof opts.splitArabicClitics === "boolean") options.splitArabicClitics = opts.splitArabicClitics;
    if (typeof opts.stopListLanguage === "string" && /^[a-z]{2}$/.test(opts.stopListLanguage))
      options.stopListLanguage = opts.stopListLanguage;
    const base = opts.normalisationBase;
    if (base === 1000 || base === 10000 || base === 1000000) options.normalisationBase = base;
  }
  return {
    name: typeof value.name === "string" ? value.name : "Restored corpus",
    documents,
    options,
  };
}
export function makeBackup(
  name: string,
  documents: CorpusDocument[],
  options: Options,
) {
  return {
    format: "corpuscape-v3",
    name,
    documents,
    options,
    locale: options.locale,
    exportedAt: new Date().toISOString(),
  };
}
