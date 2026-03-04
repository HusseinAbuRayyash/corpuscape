const corpusStore = new Map<string, string>();

export interface CorpusMetadata {
  id: string;
  name: string;
  source: "monolingual" | "bilingual" | "scraper" | "ai-insights";
  words: number;
  createdAt: number;
}

const corpusRegistry = new Map<string, CorpusMetadata>();

export function storeCorpus(id: string, text: string): void {
  corpusStore.set(id, text);
}

export function getCorpus(id: string): string | undefined {
  return corpusStore.get(id);
}

export function deleteCorpus(id: string): void {
  corpusStore.delete(id);
  corpusRegistry.delete(id);
}

export function generateCorpusId(): string {
  return `corpus_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function registerCorpus(meta: CorpusMetadata): void {
  corpusRegistry.set(meta.id, meta);
}

export function listCorpora(): CorpusMetadata[] {
  return Array.from(corpusRegistry.values()).sort((a, b) => b.createdAt - a.createdAt);
}
