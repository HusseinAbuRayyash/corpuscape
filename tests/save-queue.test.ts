import test from "node:test";
import assert from "node:assert/strict";
import { exclusiveSave } from "../web/src/save-queue";
test("rapid repeated Save clicks cannot commit overlapping records", async () => {
  const save = exclusiveSave();
  let finish!: () => void,
    writes = 0;
  const pending = save(async () => {
    writes++;
    await new Promise<void>((resolve) => {
      finish = resolve;
    });
  });
  assert.equal(
    await save(async () => {
      writes++;
    }),
    false,
  );
  assert.equal(writes, 1);
  finish();
  assert.equal(await pending, true);
  assert.equal(
    await save(async () => {
      writes++;
    }),
    true,
  );
  assert.equal(writes, 2);
});
test("failed saves release the lock for a retry", async () => {
  const save = exclusiveSave();
  await assert.rejects(
    save(async () => {
      throw new Error("quota");
    }),
    /quota/,
  );
  assert.equal(await save(async () => {}), true);
});
