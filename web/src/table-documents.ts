import type { CorpusDocument } from "./engine";
export function tableDocuments(
  rows: string[][],
  settings: {
    name: string;
    text: number;
    separate: boolean;
    nameColumn: number;
    languageColumn: number;
  },
): CorpusDocument[] {
  if (!settings.separate) {
    const text = rows.map((row) => row[settings.text] ?? "").join("\n");
    if (!text.trim()) throw new Error("The selected column has no text.");
    return [{ name: settings.name, text }];
  }
  const documents: CorpusDocument[] = [];
  for (const [i, row] of rows.entries()) {
    const text = row[settings.text] ?? "";
    if (!text.trim()) continue;
    const raw =
      settings.languageColumn < 0
        ? ""
        : (row[settings.languageColumn] ?? "").trim();
    let locale: string | undefined;
    if (raw) {
      try {
        locale = Intl.getCanonicalLocales(raw)[0];
      } catch {
        throw new Error(
          `Row ${i + 1} has an invalid language tag: ${raw}. Use BCP 47 tags such as en, es, zh or ar.`,
        );
      }
    }
    documents.push({
      name:
        settings.nameColumn < 0
          ? `${settings.name} · row ${i + 1}`
          : row[settings.nameColumn]?.trim() ||
            `${settings.name} · row ${i + 1}`,
      text,
      ...(locale ? { locale } : {}),
    });
  }
  if (!documents.length)
    throw new Error("The selected column has no non-empty document rows.");
  return documents;
}
