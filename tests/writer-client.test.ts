import test from "node:test";
import assert from "node:assert/strict";
import { LocalWriterClient, type WriterPort } from "../web/src/writer-client";
class Port implements WriterPort {
  onmessage: WriterPort["onmessage"] = null;
  onerror: WriterPort["onerror"] = null;
  messages: unknown[] = [];
  terminated = false;
  postMessage = (data: unknown) => {
    this.messages.push(data);
  };
  terminate = () => {
    this.terminated = true;
  };
  send(data: unknown) {
    this.onmessage?.({ data } as MessageEvent);
  }
}
function setup() {
  const ports: Port[] = [];
  const client = new LocalWriterClient(
    () => {},
    () => {
      const port = new Port();
      ports.push(port);
      return port;
    },
  );
  return { client, ports };
}
async function connected() {
  const result = setup();
  const loading = result.client.load("qwen-small", "cpu");
  result.ports[0].send({
    type: "ready",
    model: "real-model",
    revision: "abc123",
    device: "CPU / WASM",
    contextWindow: 32768,
  });
  await loading;
  return result;
}
test("writer load resolves exact connection metadata and streams authoritative final text", async () => {
  const { client, ports } = await connected();
  let stream = "";
  const writing = client.generate(
    [{ role: "user", content: "Write facts" }],
    20,
    (text) => (stream += text),
  );
  ports[0].send({ type: "delta", text: "A " });
  ports[0].send({ type: "delta", text: "draft" });
  ports[0].send({
    type: "done",
    text: "A draft.",
    inputTokens: 7,
    outputTokens: 4,
    budgetReached: false,
  });
  const result = await writing;
  assert.equal(stream, "A draft");
  assert.equal(result.text, "A draft.");
  assert.equal(result.connection.revision, "abc123");
  assert.equal(result.inputTokens, 7);
  assert.equal(client.state.phase, "ready");
  client.dispose();
});
test("cancelling a model download settles its pending promise and terminates the worker", async () => {
  const { client, ports } = setup();
  const loading = client.load("qwen-small");
  const rejection = assert.rejects(loading, { name: "AbortError" });
  client.cancel();
  await rejection;
  assert.equal(ports[0].terminated, true);
  assert.equal(client.state.phase, "not-loaded");
});
test("GPU fallback replaces the worker without losing the caller promise", async () => {
  const { client, ports } = setup();
  const loading = client.load("qwen-small", "auto");
  ports[0].send({ type: "fallback", message: "CPU fallback" });
  assert.equal(ports[0].terminated, true);
  assert.equal((ports[1].messages[0] as { device: string }).device, "cpu");
  ports[1].send({ type: "ready", device: "CPU / WASM", contextWindow: 32768 });
  const connection = await loading;
  assert.equal(connection.runtime, "CPU / WASM");
  assert.equal(connection.requestedDevice, "auto");
  client.dispose();
});
test("automatic GPU-to-compact fallback records the actual model and revision", async () => {
  const { client, ports } = setup();
  const loading = client.load("mlc-qwen", "auto");
  ports[0].send({
    type: "fallback",
    model: "qwen-small",
    message: "Compact CPU fallback",
  });
  assert.equal((ports[1].messages[0] as { model: string }).model, "qwen-small");
  ports[1].send({ type: "ready", device: "CPU / WASM", contextWindow: 32768 });
  const connection = await loading;
  assert.equal(connection.id, "qwen-small");
  assert.match(connection.repo, /0.6B/);
  assert.equal(connection.revision, "58ca03a5e7b354b480b1a82b34bde8dc7b854cc0");
  client.dispose();
});
test("cancelling generation rejects promptly and old messages cannot complete the next request", async () => {
  const { client, ports } = await connected();
  const old = ports[0].onmessage;
  const writing = client.generate([{ role: "user", content: "first" }], 10);
  const rejected = assert.rejects(writing, { name: "AbortError" });
  client.cancel();
  await rejected;
  const loading = client.load("qwen-small", "cpu");
  old?.({ data: { type: "done", text: "stale" } } as MessageEvent);
  ports[1].send({ type: "ready", device: "CPU" });
  await loading;
  assert.equal(client.state.phase, "ready");
  client.dispose();
});
test("context errors preserve a loaded model; fatal errors release it", async () => {
  const { client, ports } = await connected();
  const writing = client.generate([{ role: "user", content: "too much" }], 100);
  const rejected = assert.rejects(writing, /Context/);
  ports[0].send({ type: "error", message: "Context exceeded", fatal: false });
  await rejected;
  assert.equal(client.state.phase, "ready");
  const next = client.generate([{ role: "user", content: "retry" }], 10);
  const failed = assert.rejects(next, /device lost/);
  ports[0].send({ type: "error", message: "device lost", fatal: true });
  await failed;
  assert.equal(client.state.connection, null);
  assert.equal(ports[0].terminated, true);
});
test("dispose settles in-flight generation without publishing another state update", async () => {
  const { client } = await connected();
  const writing = client.generate([{ role: "user", content: "draft" }], 10);
  const rejected = assert.rejects(writing, { name: "AbortError" });
  client.dispose();
  await rejected;
  await assert.rejects(client.load("qwen-small"), /released/);
});
test("simultaneous operations and invalid output lengths are rejected", async () => {
  const { client, ports } = await connected();
  await assert.rejects(client.generate([], 0), /positive/);
  const writing = client.generate([], 10);
  await assert.rejects(client.generate([], 10), /ready/);
  await assert.rejects(client.load("qwen-large"), /Another/);
  const rejected = assert.rejects(writing, { name: "AbortError" });
  client.cancel();
  await rejected;
  assert.equal(ports[0].terminated, true);
});
