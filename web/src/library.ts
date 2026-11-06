import type { CorpusDocument, Options } from "./engine";
export interface SavedCorpus {
  id: string;
  name: string;
  locale: string;
  savedAt: string;
  documents: CorpusDocument[];
  options?: Options;
}
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("corpuscape-local-v2", 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore("corpora", { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(
        new Error(
          "Browser storage is unavailable. You can still analyze and export your corpus.",
        ),
      );
  });
}
async function transaction<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("corpora", mode),
      req = run(tx.objectStore("corpora"));
    let result: T;
    req.onsuccess = () => {
      result = req.result;
    };
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(
        new Error(
          "Could not save browser data. Export a backup or free browser storage.",
        ),
      );
    };
  });
}
export const listCorpora = () =>
  transaction("readonly", (s) => s.getAll()) as Promise<SavedCorpus[]>;
export const saveCorpus = (corpus: SavedCorpus) =>
  transaction("readwrite", (s) => s.put(corpus));
export const deleteCorpus = (id: string) =>
  transaction("readwrite", (s) => s.delete(id));
