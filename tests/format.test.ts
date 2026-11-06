import test from "node:test";
import assert from "node:assert/strict";
import { formatPercentage } from "../web/src/format";
test("small nonzero TTR values never display as zero", () => {
  assert.equal(formatPercentage(1 / 400000), "0.00025%");
  assert.equal(formatPercentage(0), "0%");
  assert.equal(formatPercentage(.5), "50%");
  assert.equal(formatPercentage(1), "100%");
});
