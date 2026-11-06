import test from "node:test";
import assert from "node:assert/strict";
import { htmlText } from "../web/src/html-text";
test("HTML extraction preserves table boundaries and entities without a browser DOM or resource loading", () => {
  const text = htmlText(
    '<!doctype html><html><head><title>Exclude title</title></head><body><nav>Exclude menu</nav><script>Exclude script</script><iframe src="https://example.invalid/">Exclude frame</iframe><img src="https://example.invalid/image"><p hidden>Exclude hidden</p><table><tr><td>Hello</td><td>World &amp; 语言</td></tr></table><h4>العربية</h4></body></html>',
  );
  assert.ok(!text.includes("Exclude"));
  assert.ok(text.includes("Hello\tWorld & 语言"));
  assert.ok(text.includes("العربية"));
  assert.ok(!text.includes("HelloWorld"));
});
