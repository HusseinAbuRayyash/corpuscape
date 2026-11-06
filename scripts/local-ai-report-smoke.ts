/** Optional real-weight check. Not part of offline CI; downloads on first use. */
import { pipeline, env } from "@huggingface/transformers";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";
import { analyze, defaultOptions } from "../web/src/engine";
import { samples } from "../web/src/samples";
import {
  buildEvidence,
  reportMessages,
  unknownEvidenceReferences,
} from "../web/src/report-model";
delete process.env.HF_TOKEN;
env.allowLocalModels = false;
env.cacheDir = fileURLToPath(
  new URL("../../local-model-cache/", import.meta.url),
);
const documents = samples[1].documents;
const input = {
  name: samples[1].name,
  documents,
  analysis: analyze(documents),
  options: defaultOptions,
};
const evidence = buildEvidence(input).filter((item) => item.id === "C1");
const generator = await pipeline(
  "text-generation",
  "onnx-community/Qwen3-0.6B-ONNX",
  { device: "cpu", dtype: "q8" },
);
const results = [];
for (const language of ["en", "es"]) {
  const messages = reportMessages(
    evidence,
    "Results and interpretation",
    language,
    "State the number of documents, word tokens and unique types in one sentence. Cite [C1].",
  );
  const chatOptions = {
    tokenize: false as const,
    add_generation_prompt: true,
    enable_thinking: false,
  };
  const prompt = generator.tokenizer.apply_chat_template(messages, chatOptions);
  const output = await generator(prompt as string, {
    max_new_tokens: 110,
    do_sample: false,
    return_full_text: false,
  });
  const text = (output as { generated_text: string }[])[0].generated_text;
  const record = {
    language,
    text,
    unknownReferences: unknownEvidenceReferences(text, evidence),
  };
  results.push(record);
  console.log(JSON.stringify(record));
}
await generator.dispose();
writeFileSync(
  new URL("../../local-ai-report-results.json", import.meta.url),
  JSON.stringify({ model: "Qwen3-0.6B-ONNX", evidence, results }, null, 2),
);
