import Papa from "papaparse";
export interface FigureRow {
  label: string;
  value: number;
}
export function parseFigureData(text: string): {
  rows: FigureRow[];
  errors: string[];
} {
  if (!text.trim()) return { rows: [], errors: [] };
  if (text.length > 200000)
    return {
      rows: [],
      errors: ["Custom figure data must be under 200,000 characters."],
    };
  const parsed = Papa.parse<string[]>(text, {
    delimiter: text.includes("\t") ? "\t" : ",",
    skipEmptyLines: "greedy",
  });
  const errors = parsed.errors.map(
    (error) => `Row ${(error.row ?? 0) + 1}: ${error.message}`,
  );
  const rows: FigureRow[] = [];
  const header = parsed.data[0];
  const hasHeader =
    header?.length === 2 &&
    /^(?:label|term|word)$/i.test(header[0].trim()) &&
    /^(?:value|count|frequency|per million)$/i.test(header[1].trim());
  parsed.data.forEach((row, i) => {
    if (i === 0 && hasHeader) return;
    const label = row[0]?.trim(),
      raw = row[1]?.trim();
    if (
      row.length !== 2 ||
      !label ||
      label.length > 200 ||
      !raw ||
      !/^\+?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw) ||
      !Number.isFinite(Number(raw)) ||
      Number(raw) < 0
    )
      errors.push(
        `Row ${i + 1}: use one label (up to 200 characters) and one finite, non-negative number.`,
      );
    else rows.push({ label, value: Number(raw) });
  });
  if (!rows.length && !errors.length)
    errors.push("Add at least one data row after the header.");
  return { rows, errors };
}
export function wrapLabel(text: string, size: number) {
  const chars = [
    ...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text),
  ].map((p) => p.segment);
  const lines: string[] = [];
  for (let i = 0; i < chars.length; i += size)
    lines.push(chars.slice(i, i + size).join(""));
  return lines.length ? lines : [""];
}
export async function pngFromSvg(svg: SVGSVGElement): Promise<Blob> {
  const url = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(svg)], {
      type: "image/svg+xml;charset=utf-8",
    }),
  );
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    const box = svg.viewBox.baseVal;
    canvas.width = Math.ceil(box.width * 2);
    canvas.height = Math.ceil(box.height * 2);
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error(
        "PNG export is unavailable in this browser. Use SVG instead.",
      );
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error("Could not create PNG. Use SVG instead.")),
        "image/png",
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
