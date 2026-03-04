const corpusStore = new Map<string, string>();

export function storeCorpus(id: string, text: string): void {
  corpusStore.set(id, text);
}

export function getCorpus(id: string): string | undefined {
  return corpusStore.get(id);
}

export function deleteCorpus(id: string): void {
  corpusStore.delete(id);
}

export function generateCorpusId(): string {
  return `corpus_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
