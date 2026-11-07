import {
  paperTables,
  paperFigures,
  paperMethods,
  paperResults,
  paperLimitations,
  paperSectionNames,
  formatPaperCell,
  paperColumnWeights,
  type PaperSnapshot,
  type PaperProject,
  type PaperSection,
} from "./paper-model";
export async function svgToPng(svg: string, scale = 2): Promise<Uint8Array> {
  const blob = new Blob([svg], { type: "image/svg+xml" }),
    url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image export is unavailable.");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("PNG export failed."))),
        "image/png",
      ),
    );
    return new Uint8Array(await data.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}
export async function paperDocx(
  s: PaperSnapshot,
  p: PaperProject,
): Promise<Blob> {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    WidthType,
    ImageRun,
    BorderStyle,
    AlignmentType,
    TableLayoutType,
    VerticalAlign,
  } = await import("docx");
  const para = (text: string) =>
    text.split(/\n\s*\n/).map(
      (line) =>
        new Paragraph({
          bidirectional: /^[\p{Script=Arabic}\p{Script=Hebrew}]/u.test(
            line.trim(),
          ),
          children: [new TextRun(line)],
          spacing: { after: 140 },
        }),
    );
  const heading = (text: string) =>
    new Paragraph({ text, heading: HeadingLevel.HEADING_1, keepNext: true });
  const tables = paperTables(s, p.top),
    figures = paperFigures(s, p.top);
  const children: (
    | InstanceType<typeof Paragraph>
    | InstanceType<typeof Table>
  )[] = [
    new Paragraph({ text: p.title, style: "Title" }),
    ...para(p.author || "Research draft"),
    ...para(p.question ? `Research question: ${p.question}` : ""),
  ];
  for (const key of ["abstract", "introduction"] as PaperSection[])
    children.push(
      heading(paperSectionNames[key]),
      ...para(p.sections[key].text || "Not drafted."),
    );
  children.push(
    heading("Materials and methods"),
    ...para(paperMethods(s)),
    ...para(p.sourceNote),
    heading("Results"),
    ...para(paperResults(s)),
  );
  const border = { style: BorderStyle.SINGLE, size: 4, color: "D9D9D9" };
  for (const t of tables) {
    children.push(
      new Paragraph({
        text: `${t.id}. ${t.title}`,
        heading: HeadingLevel.HEADING_2,
        keepNext: true,
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED,
        columnWidths: paperColumnWeights(t).map((w) => Math.round(w * 10200)),
        borders: {
          top: border,
          bottom: border,
          left: border,
          right: border,
          insideHorizontal: border,
          insideVertical: border,
        },
        rows: [t.headers, ...t.rows].map(
          (row, i) =>
            new TableRow({
              tableHeader: i === 0,
              cantSplit: true,
              children: row.map(
                (cell, column) =>
                  new TableCell({
                    width: {
                      size: paperColumnWeights(t)[column] * 100,
                      type: WidthType.PERCENTAGE,
                    },
                    verticalAlign: VerticalAlign.CENTER,
                    shading: i === 0 ? { fill: "EEF1F6" } : undefined,
                    margins: { top: 70, bottom: 70, left: 90, right: 90 },
                    children: [
                      new Paragraph({
                        bidirectional:
                          /^[\p{Script=Arabic}\p{Script=Hebrew}]/u.test(
                            String(cell).trim(),
                          ),
                        alignment:
                          typeof cell === "number"
                            ? AlignmentType.RIGHT
                            : undefined,
                        children: [
                          new TextRun({
                            text:
                              i === 0
                                ? String(cell)
                                : formatPaperCell(t, cell, column),
                            bold: i === 0,
                            size: 19,
                          }),
                        ],
                        spacing: { after: 0 },
                      }),
                    ],
                  }),
              ),
            }),
        ),
      }),
      ...para(t.note),
    );
  }
  for (const f of figures) {
    const png = await svgToPng(f.svg, 2);
    const match = f.svg.match(/height="(\d+)"/),
      height = Number(match?.[1] ?? 480),
      width = 600;
    children.push(
      new Paragraph({
        keepNext: true,
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            type: "png",
            data: png,
            transformation: {
              width: Math.min(width, (650 * 960) / height),
              height: Math.min(650, (width * height) / 960),
            },
          }),
        ],
      }),
      new Paragraph({
        text: `${f.id}. ${f.title}. ${f.caption}`,
        style: "Caption",
        spacing: { after: 200 },
      }),
    );
  }
  children.push(
    heading("Discussion"),
    ...para(p.sections.discussion.text || "Not drafted."),
    heading("Limitations"),
    ...para(paperLimitations),
    heading("Data and writing provenance"),
    ...para(
      `Corpuscape ${s.version}; frozen ${s.createdAt}. ${s.environment}. Source SHA-256: ${s.fingerprint}.`,
    ),
  );
  for (const key of Object.keys(p.sections) as PaperSection[]) {
    const d = p.sections[key];
    children.push(
      ...para(
        `${paperSectionNames[key]}: ${d.origin === "local-ai" ? `${d.connection?.repo ?? "Local model"} @ ${d.connection?.revision ?? "unknown revision"}, ${d.connection?.runtime ?? ""}; generated ${d.generatedAt}; requested language ${d.generatedLanguage ?? p.language}; ${d.inputTokens ?? "?"} input / ${d.outputTokens ?? "?"} output tokens` : "Researcher text"}; ${d.reviewed ? "marked reviewed" : "review pending"}${d.incomplete ? "; incomplete generation" : ""}.`,
      ),
    );
  }
  children.push(
    ...para(
      "Tables and results are computed from frozen source data. AI prose remains a draft. Add only verified bibliographic references during editorial review.",
    ),
  );
  const doc = new Document({
    creator: p.author || "Corpuscape",
    title: p.title,
    description: "Corpus research mini paper with computed tables and figures",
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 22, color: "000000" },
          paragraph: { spacing: { line: 300 } },
        },
      },
      paragraphStyles: [
        {
          id: "Title",
          name: "Title",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 38, bold: true, color: "000000" },
          paragraph: { spacing: { after: 240 }, keepNext: true },
        },
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 28, bold: true, color: "000000" },
          paragraph: { spacing: { before: 260, after: 140 }, keepNext: true },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 23, bold: true, color: "000000" },
          paragraph: { spacing: { before: 180, after: 100 }, keepNext: true },
        },
        {
          id: "Caption",
          name: "Caption",
          basedOn: "Normal",
          run: { size: 19, color: "536078" },
          paragraph: { spacing: { after: 180 } },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1020, bottom: 1020, left: 1020, right: 1020 },
          },
        },
        children,
      },
    ],
  });
  return Packer.toBlob(doc);
}
