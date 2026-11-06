import type { CorpusDocument, Options } from "./engine";
import { validateBackup } from "./backup";
export interface WorkspaceSession {
  name: string;
  documents: CorpusDocument[];
  options: Options;
  reference: CorpusDocument[];
  sourceText: string;
  targetText: string;
  sourceLocale: string;
  targetLocale: string;
  pairs: { source: string; target: string; note: string }[];
  activeId: string | null;
}
export function validateWorkspace(value: unknown): WorkspaceSession {
  if (!value || typeof value !== "object")
    throw new Error("Invalid workspace backup.");
  const v = value as Record<string, unknown>;
  if (
    !Array.isArray(v.documents) ||
    !Array.isArray(v.reference) ||
    !Array.isArray(v.pairs)
  )
    throw new Error("Workspace documents, reference and pairs are required.");
  const base = validateBackup({
    format: "corpuscape-v3",
    name: v.name,
    documents: v.documents.length
      ? v.documents
      : [{ name: "empty", text: "empty" }],
    options: v.options,
  });
  const reference = v.reference.length
    ? validateBackup({
        format: "corpuscape-v3",
        documents: v.reference,
        options: v.options,
      }).documents
    : [];
  const pairs = v.pairs.map((item: unknown) => {
    if (!item || typeof item !== "object")
      throw new Error("Invalid parallel pair.");
    const p = item as Record<string, unknown>;
    if (
      typeof p.source !== "string" ||
      typeof p.target !== "string" ||
      typeof p.note !== "string"
    )
      throw new Error("Invalid parallel segment or note.");
    return { source: p.source, target: p.target, note: p.note };
  });
  const tag = (key: string, fallback: string) => {
    const raw = v[key] ?? fallback;
    if (typeof raw !== "string") throw new Error("Invalid workspace language.");
    try {
      return Intl.getCanonicalLocales(raw)[0] ?? fallback;
    } catch {
      throw new Error("Invalid workspace language tag.");
    }
  };
  return {
    name: base.name,
    documents: v.documents.length ? base.documents : [],
    options: base.options,
    reference,
    sourceText: typeof v.sourceText === "string" ? v.sourceText : "",
    targetText: typeof v.targetText === "string" ? v.targetText : "",
    sourceLocale: tag("sourceLocale", "en"),
    targetLocale: tag("targetLocale", "es"),
    pairs,
    activeId: typeof v.activeId === "string" ? v.activeId : null,
  };
}
