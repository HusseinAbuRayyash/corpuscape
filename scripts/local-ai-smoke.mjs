import { pipeline, env } from "@huggingface/transformers";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
delete process.env.HF_TOKEN;
env.allowLocalModels = false;
env.cacheDir = fileURLToPath(
  new URL("../../local-model-cache/", import.meta.url),
);
mkdirSync(env.cacheDir, { recursive: true });
const repo = process.argv.includes("--small")
  ? "HuggingFaceTB/SmolLM2-135M-Instruct"
  : "onnx-community/Qwen3-0.6B-ONNX";
const started = Date.now();
let last = 0;
const generator = await pipeline("text-generation", repo, {
  device: "cpu",
  dtype: "q8",
  progress_callback: (p) => {
    if (p.status === "progress" && Date.now() - last > 10000) {
      last = Date.now();
      console.log(`Downloading ${p.file}: ${Math.round(p.progress ?? 0)}%`);
    }
  },
});
const results = [];
for (const language of process.argv.includes("--small")
  ? ["English"]
  : ["English", "Spanish"]) {
  const prompt = generator.tokenizer.apply_chat_template(
    [
      {
        role: "system",
        content:
          "Write only a short factual research statement. Do not invent statistics. Cite [C1].",
      },
      {
        role: "user",
        content: `Write two sentences in ${language} explaining these corpus statistics: 100 word tokens, 40 types, 5 sentences. TTR is 40%. Evidence ID C1.`,
      },
    ],
    { tokenize: false, add_generation_prompt: true, enable_thinking: false },
  );
  const output = await generator(prompt, {
    max_new_tokens: 80,
    do_sample: false,
    return_full_text: false,
  });
  const text = output[0].generated_text;
  if (typeof text !== "string" || text.trim().length < 15)
    throw new Error("Model did not generate a real response.");
  results.push({ language, text });
  console.log(JSON.stringify({ repo, language, text }));
}
await generator.dispose();
const record = {
  repo,
  runtime: "onnxruntime-node / CPU",
  dtype: "q8",
  elapsedSeconds: Math.round((Date.now() - started) / 1000),
  results,
};
writeFileSync(
  new URL("../../local-ai-smoke-results.json", import.meta.url),
  JSON.stringify(record, null, 2),
);
console.log("Real local inference completed without an API key.");
