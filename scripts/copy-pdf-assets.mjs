import { cpSync, existsSync, mkdirSync } from "node:fs";
// Retain the license notices in the downloadable/static distribution too.
cpSync(
  new URL("../THIRD_PARTY_NOTICES.txt", import.meta.url),
  new URL("../dist/THIRD_PARTY_NOTICES.txt", import.meta.url),
);
const licenseDirectory = new URL("../dist/licenses/", import.meta.url);
mkdirSync(licenseDirectory, { recursive: true });
cpSync(new URL("../licenses/", import.meta.url), licenseDirectory, {
  recursive: true,
});
for (const [file, name] of [
  ["@fontsource-variable/inter/LICENSE", "Inter-OFL.txt"],
  ["motion/LICENSE.md", "Motion.txt"],
  ["framer-motion/LICENSE.md", "Framer-Motion.txt"],
  ["motion-dom/LICENSE.md", "Motion-DOM.txt"],
  ["motion-utils/LICENSE.md", "Motion-Utils.txt"],
  ["parse5/LICENSE", "parse5-MIT.txt"],
  ["entities/LICENSE", "entities-BSD.txt"],
  ["vega/LICENSE", "Vega.txt"],
  ["vega-lite/LICENSE", "Vega-Lite.txt"],
  ["vega-embed/LICENSE", "Vega-Embed.txt"],
  ["@huggingface/transformers/LICENSE", "Transformers-JS.txt"],
  ["tesseract.js/LICENSE.md", "Tesseract-JS.txt"],
  ["tesseract.js-core/LICENSE", "Tesseract-Core.txt"],
  ["jspdf/LICENSE", "jsPDF.txt"],
  ["@mlc-ai/web-llm/LICENSE", "WebLLM.txt"],
  ["docx/LICENSE", "docx.txt"],
  ["fflate/LICENSE", "fflate.txt"],
]) {
  cpSync(
    new URL(`../node_modules/${file}`, import.meta.url),
    new URL(name, licenseDirectory),
  );
}
for (const folder of ["cmaps", "standard_fonts", "wasm", "iccs"]) {
  const source = new URL(
    `../node_modules/pdfjs-dist/${folder}`,
    import.meta.url,
  );
  if (!existsSync(source)) continue;
  const destination = new URL(`../dist/pdf-support/${folder}`, import.meta.url);
  mkdirSync(destination, { recursive: true });
  cpSync(source, destination, { recursive: true });
}
const aiRuntime = new URL("../dist/ai-runtime/", import.meta.url);
mkdirSync(aiRuntime, { recursive: true });
for (const file of [
  "ort-wasm-simd-threaded.wasm",
  "ort-wasm-simd-threaded.jsep.wasm",
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.jsep.mjs",
]) {
  cpSync(
    new URL(`../node_modules/onnxruntime-web/dist/${file}`, import.meta.url),
    new URL(file, aiRuntime),
  );
}
const ocrRuntime = new URL("../dist/ocr-runtime/", import.meta.url);
mkdirSync(ocrRuntime, { recursive: true });
cpSync(
  new URL("../node_modules/tesseract.js/dist/worker.min.js", import.meta.url),
  new URL("worker.min.js", ocrRuntime),
);
cpSync(
  new URL("../node_modules/tesseract.js-core/", import.meta.url),
  new URL("core/", ocrRuntime),
  { recursive: true },
);
