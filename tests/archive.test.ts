import test from "node:test";
import assert from "node:assert/strict";
import { indexedDB, IDBKeyRange } from "fake-indexeddb";
import {
  saveSession,
  listSessions,
  loadSession,
  restoreArchive,
  listCorpora,
} from "../web/src/library";
Object.assign(globalThis, { indexedDB, IDBKeyRange });
test("paper library prefix reads avoid large unrelated snapshots", async () => {
  await saveSession("paper-project:a", { title: "A" });
  await saveSession("paper-snapshot:a", { large: "source" });
  await saveSession("other-session", { data: 1 });
  assert.deepEqual(
    (await listSessions<{ title: string }>("paper-project:")).map(
      (d) => d.value.title,
    ),
    ["A"],
  );
});
test("complete archive restores library and sessions atomically and rolls back synchronous clone failures", async () => {
  const corpus = {
    id: "restored-copy",
    name: "Corpus",
    locale: "en",
    savedAt: new Date().toISOString(),
    documents: [{ name: "doc", text: "word" }],
  };
  await restoreArchive({ "archive-session": { ok: true } }, [corpus]);
  assert.equal((await listCorpora()).length, 1);
  assert.deepEqual(await loadSession("archive-session"), { ok: true });
  await assert.rejects(
    restoreArchive({ "archive-session": { bad: () => {} } }, [
      { ...corpus, id: "should-not-commit" },
    ]),
    /preserved/,
  );
  assert.equal((await listCorpora()).length, 1);
  assert.deepEqual(await loadSession("archive-session"), { ok: true });
});
