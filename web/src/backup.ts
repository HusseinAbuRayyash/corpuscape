import { defaultOptions, type CorpusDocument, type Options } from "./engine";

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
    !value.documents.length ||
    value.documents.length > 100
  )
    throw new Error("A Corpuscape backup must contain 1–100 documents.");
  function locale(tag: unknown) {
    if (typeof tag !== "string") throw new Error("Invalid language in backup.");
    try {
      return tag === "und" ? tag : Intl.getCanonicalLocales(tag)[0] || "und";
    } catch {
      throw new Error(`Invalid language tag in backup: ${tag}.`);
    }
  }
  const documents = value.documents.map((item: unknown) => {
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
    };
  });
  if (documents.reduce((sum, doc) => sum + doc.text.length, 0) > 2_000_000)
    throw new Error("Backup exceeds the 2 million character workspace limit.");
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
      opts.stopWords.length > 10000 ||
      !opts.stopWords.every(
        (word) => typeof word === "string" && word.length <= 200,
      )
    )
      throw new Error("Invalid case or stop-list settings in backup.");
    options = {
      locale: locale(opts.locale),
      caseSensitive: opts.caseSensitive,
      stopWords: [...opts.stopWords] as string[],
    };
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
