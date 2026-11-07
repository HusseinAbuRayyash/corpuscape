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
    const req = indexedDB.open("corpuscape-local-v2", 2);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains("corpora"))
        req.result.createObjectStore("corpora", { keyPath: "id" });
      if (!req.result.objectStoreNames.contains("sessions"))
        req.result.createObjectStore("sessions");
    };
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
  storeName = "corpora",
): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode),
      req = run(tx.objectStore(storeName));
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
export const loadSession = <T>(key: string) =>
  transaction("readonly", (s) => s.get(key), "sessions") as Promise<
    T | undefined
  >;
export const saveSession = (key: string, value: unknown) =>
  transaction("readwrite", (s) => s.put(value, key), "sessions");
export const saveSessions = (entries: Record<string, unknown>) =>
  transaction(
    "readwrite",
    (store) => {
      let last: IDBRequest = store.get("workspace-v1");
      for (const [key, value] of Object.entries(entries))
        last = store.put(value, key);
      return last;
    },
    "sessions",
  );
export const listSessions = async <T>(
  prefix: string,
): Promise<{ key: string; value: T }[]> => {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("sessions", "readonly"),
      rows: { key: string; value: T }[] = [];
    const request = tx
      .objectStore("sessions")
      .openCursor(IDBKeyRange.bound(prefix, prefix + "\uffff"));
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        rows.push({ key: String(cursor.key), value: cursor.value });
        cursor.continue();
      }
    };
    tx.oncomplete = () => {
      db.close();
      resolve(rows);
    };
    tx.onerror = tx.onabort = () => {
      db.close();
      reject(
        new Error(
          "Could not read saved papers. Export backups before clearing browser storage.",
        ),
      );
    };
  });
};
/** Restore sessions and library copies together, so a quota failure cannot leave half an archive. */
export async function restoreArchive(
  sessions: Record<string, unknown>,
  corpora: SavedCorpus[],
) {
  const db = await open();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["corpora", "sessions"], "readwrite");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = tx.onabort = () => {
      db.close();
      reject(
        new Error(
          "Archive restore failed. Existing data was preserved; export a backup or free browser storage.",
        ),
      );
    };
    try {
      for (const c of corpora) tx.objectStore("corpora").put(c);
      for (const [key, value] of Object.entries(sessions))
        tx.objectStore("sessions").put(value, key);
    } catch {
      tx.abort();
    }
  });
}
