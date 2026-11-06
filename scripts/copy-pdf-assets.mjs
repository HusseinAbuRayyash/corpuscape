import { cpSync, existsSync, mkdirSync } from "node:fs";
// Retain the license notices in the downloadable/static distribution too.
cpSync(
  new URL("../THIRD_PARTY_NOTICES.txt", import.meta.url),
  new URL("../dist/THIRD_PARTY_NOTICES.txt", import.meta.url),
);
const licenseDirectory = new URL("../dist/licenses/", import.meta.url);
mkdirSync(licenseDirectory, { recursive: true });
for (const [file, name] of [
  ["@fontsource-variable/inter/LICENSE", "Inter-OFL.txt"],
  ["motion/LICENSE.md", "Motion.txt"],
  ["framer-motion/LICENSE.md", "Framer-Motion.txt"],
  ["motion-dom/LICENSE.md", "Motion-DOM.txt"],
  ["motion-utils/LICENSE.md", "Motion-Utils.txt"],
  ["parse5/LICENSE", "parse5-MIT.txt"],
  ["entities/LICENSE", "entities-BSD.txt"],
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
