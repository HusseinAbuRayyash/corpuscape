import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText, FileDown } from "lucide-react";

interface MarkdownRenderProps {
  content: string;
  className?: string;
  showDownload?: boolean;
  downloadFilename?: string;
}

function parseMarkdownTables(markdown: string): { headers: string[]; rows: string[][] }[] {
  const tables: { headers: string[]; rows: string[][] }[] = [];
  const lines = markdown.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.startsWith("|") && line.endsWith("|")) {
      const headerLine = line;
      const separatorLine = (lines[i + 1] || "").trim();
      if (separatorLine.startsWith("|") && separatorLine.includes("-")) {
        const headers = headerLine.split("|").filter(Boolean).map(s => s.trim());
        const rows: string[][] = [];
        let j = i + 2;
        while (j < lines.length) {
          const rowLine = lines[j].trim();
          if (!rowLine.startsWith("|") || !rowLine.endsWith("|")) break;
          rows.push(rowLine.split("|").filter(Boolean).map(s => s.trim()));
          j++;
        }
        if (rows.length > 0) {
          tables.push({ headers, rows });
        }
        i = j;
        continue;
      }
    }
    i++;
  }
  return tables;
}

async function downloadTableExcel(tables: { headers: string[]; rows: string[][] }[], filename: string) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  tables.forEach((table, idx) => {
    const sheetData = [table.headers, ...table.rows];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws["!cols"] = table.headers.map((h, ci) => {
      const maxLen = Math.max(h.length, ...table.rows.map(r => (r[ci] || "").length));
      return { wch: Math.min(maxLen + 4, 50) };
    });
    XLSX.utils.book_append_sheet(wb, ws, tables.length > 1 ? `Table ${idx + 1}` : "Data");
  });
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

function stripMarkdownFormatting(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1");
}

interface ParsedBlock {
  type: "h1" | "h2" | "h3" | "paragraph" | "bullet" | "numbered" | "table" | "hr";
  text?: string;
  items?: string[];
  table?: { headers: string[]; rows: string[][] };
}

function parseMarkdownToBlocks(markdown: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const lines = markdown.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { i++; continue; }

    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      blocks.push({ type: "h1", text: trimmed.slice(2).trim() });
      i++;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      blocks.push({ type: "h2", text: trimmed.slice(3).trim() });
      i++;
      continue;
    }
    if (trimmed.startsWith("### ")) {
      blocks.push({ type: "h3", text: trimmed.slice(4).trim() });
      i++;
      continue;
    }

    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const separatorLine = (lines[i + 1] || "").trim();
      if (separatorLine.startsWith("|") && separatorLine.includes("-")) {
        const headers = trimmed.split("|").filter(Boolean).map(s => s.trim());
        const rows: string[][] = [];
        let j = i + 2;
        while (j < lines.length) {
          const rowLine = lines[j].trim();
          if (!rowLine.startsWith("|") || !rowLine.endsWith("|")) break;
          rows.push(rowLine.split("|").filter(Boolean).map(s => s.trim()));
          j++;
        }
        blocks.push({ type: "table", table: { headers, rows } });
        i = j;
        continue;
      }
    }

    if (/^[-*+]\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*+]\s+/, ""));
        i++;
      }
      blocks.push({ type: "bullet", items });
      continue;
    }

    if (/^\d+[.)]\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+[.)]\s+/, ""));
        i++;
      }
      blocks.push({ type: "numbered", items });
      continue;
    }

    let paragraphText = trimmed;
    i++;
    while (i < lines.length && lines[i].trim() && !lines[i].trim().startsWith("#") && !lines[i].trim().startsWith("|") && !/^[-*+]\s/.test(lines[i].trim()) && !/^\d+[.)]\s/.test(lines[i].trim()) && lines[i].trim() !== "---") {
      paragraphText += " " + lines[i].trim();
      i++;
    }
    blocks.push({ type: "paragraph", text: paragraphText });
  }

  return blocks;
}

function createRichTextRuns(text: string, docx: any, baseSize: number = 22, baseFont: string = "Calibri"): any[] {
  const runs: any[] = [];
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(new docx.TextRun({
        text: part.slice(2, -2),
        bold: true,
        font: baseFont,
        size: baseSize,
      }));
    } else if (part.startsWith("*") && part.endsWith("*")) {
      runs.push(new docx.TextRun({
        text: part.slice(1, -1),
        italics: true,
        font: baseFont,
        size: baseSize,
      }));
    } else if (part.startsWith("`") && part.endsWith("`")) {
      runs.push(new docx.TextRun({
        text: part.slice(1, -1),
        font: "Consolas",
        size: baseSize - 2,
        shading: { type: docx.ShadingType.CLEAR, fill: "f0f0f0" },
      }));
    } else {
      runs.push(new docx.TextRun({
        text: part,
        font: baseFont,
        size: baseSize,
      }));
    }
  }

  return runs;
}

async function downloadFullWord(content: string, filename: string) {
  const docx = await import("docx");
  const { saveAs } = await import("file-saver");

  const blocks = parseMarkdownToBlocks(content);
  const children: any[] = [];

  children.push(
    new docx.Paragraph({
      children: [new docx.TextRun({
        text: filename.replace(/_/g, " "),
        bold: true,
        font: "Calibri",
        size: 36,
        color: "1e3a5f",
      })],
      spacing: { after: 100 },
    })
  );
  children.push(
    new docx.Paragraph({
      children: [new docx.TextRun({
        text: `Corpuscape AI Analysis · ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
        font: "Calibri",
        size: 18,
        italics: true,
        color: "888888",
      })],
      spacing: { after: 200 },
      border: { bottom: { style: docx.BorderStyle.SINGLE, size: 6, color: "e2e8f0" } },
    })
  );
  children.push(new docx.Paragraph({ children: [], spacing: { after: 100 } }));

  for (const block of blocks) {
    switch (block.type) {
      case "h1":
        children.push(new docx.Paragraph({
          children: [new docx.TextRun({
            text: stripMarkdownFormatting(block.text || ""),
            bold: true,
            font: "Calibri",
            size: 32,
            color: "1e3a5f",
          })],
          spacing: { before: 300, after: 120 },
        }));
        break;

      case "h2":
        children.push(new docx.Paragraph({
          children: [new docx.TextRun({
            text: stripMarkdownFormatting(block.text || ""),
            bold: true,
            font: "Calibri",
            size: 28,
            color: "2d4a6f",
          })],
          spacing: { before: 240, after: 100 },
        }));
        break;

      case "h3":
        children.push(new docx.Paragraph({
          children: [new docx.TextRun({
            text: stripMarkdownFormatting(block.text || ""),
            bold: true,
            font: "Calibri",
            size: 24,
            color: "374151",
          })],
          spacing: { before: 200, after: 80 },
        }));
        break;

      case "paragraph":
        children.push(new docx.Paragraph({
          children: createRichTextRuns(block.text || "", docx, 22),
          spacing: { after: 120 },
        }));
        break;

      case "bullet":
        for (const item of (block.items || [])) {
          children.push(new docx.Paragraph({
            children: createRichTextRuns(item, docx, 22),
            bullet: { level: 0 },
            spacing: { after: 60 },
          }));
        }
        break;

      case "numbered":
        for (const item of (block.items || [])) {
          children.push(new docx.Paragraph({
            children: createRichTextRuns(item, docx, 22),
            numbering: { reference: "default-numbering", level: 0 },
            spacing: { after: 60 },
          }));
        }
        break;

      case "hr":
        children.push(new docx.Paragraph({
          children: [],
          border: { bottom: { style: docx.BorderStyle.SINGLE, size: 4, color: "d1d5db" } },
          spacing: { before: 150, after: 150 },
        }));
        break;

      case "table":
        if (block.table) {
          const headerRow = new docx.TableRow({
            tableHeader: true,
            height: { value: 400, rule: docx.HeightRule.ATLEAST },
            children: block.table.headers.map(h =>
              new docx.TableCell({
                shading: { fill: "1e3a5f", type: docx.ShadingType.CLEAR },
                margins: { top: 60, bottom: 60, left: 100, right: 100 },
                children: [new docx.Paragraph({
                  children: [new docx.TextRun({
                    text: stripMarkdownFormatting(h),
                    bold: true,
                    color: "ffffff",
                    font: "Calibri",
                    size: 20,
                  })],
                })],
                verticalAlign: docx.VerticalAlign.CENTER,
              })
            ),
          });

          const dataRows = block.table.rows.map((row, idx) =>
            new docx.TableRow({
              height: { value: 360, rule: docx.HeightRule.ATLEAST },
              children: block.table!.headers.map((_, ci) =>
                new docx.TableCell({
                  shading: idx % 2 === 0 ? { fill: "f8fafc", type: docx.ShadingType.CLEAR } : { fill: "ffffff", type: docx.ShadingType.CLEAR },
                  margins: { top: 50, bottom: 50, left: 100, right: 100 },
                  children: [new docx.Paragraph({
                    children: createRichTextRuns(row[ci] || "", docx, 20),
                  })],
                  verticalAlign: docx.VerticalAlign.CENTER,
                })
              ),
            })
          );

          children.push(new docx.Paragraph({ children: [], spacing: { after: 80 } }));
          children.push(new docx.Table({
            rows: [headerRow, ...dataRows],
            width: { size: 100, type: docx.WidthType.PERCENTAGE },
          }));
          children.push(new docx.Paragraph({ children: [], spacing: { after: 120 } }));
        }
        break;
    }
  }

  children.push(new docx.Paragraph({ children: [], spacing: { before: 200 } }));
  children.push(new docx.Paragraph({
    children: [new docx.TextRun({
      text: "Generated by Corpuscape — Corpus Compilation & Analysis Lab for Translation Studies Research",
      font: "Calibri",
      size: 16,
      italics: true,
      color: "9ca3af",
    })],
    border: { top: { style: docx.BorderStyle.SINGLE, size: 4, color: "e2e8f0" } },
    spacing: { before: 200 },
  }));

  const doc = new docx.Document({
    numbering: {
      config: [{
        reference: "default-numbering",
        levels: [{
          level: 0,
          format: docx.LevelFormat.DECIMAL,
          text: "%1.",
          alignment: docx.AlignmentType.START,
        }],
      }],
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        },
      },
      children,
    }],
  });

  const blob = await docx.Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
}

async function downloadPDF(content: string, filename: string) {
  const html2canvas = (await import("html2canvas")).default;

  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;width:800px;padding:48px;background:#fff;font-family:Calibri,Arial,sans-serif;color:#1a1a1a;line-height:1.6;font-size:14px;";

  const blocks = parseMarkdownToBlocks(content);
  let html = `<div style="border-bottom:2px solid #e2e8f0;padding-bottom:12px;margin-bottom:20px;">
    <h1 style="font-size:24px;color:#1e3a5f;margin:0 0 4px 0;font-weight:700;">${filename.replace(/_/g, " ")}</h1>
    <p style="font-size:12px;color:#888;margin:0;font-style:italic;">Corpuscape AI Analysis · ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
  </div>`;

  for (const block of blocks) {
    switch (block.type) {
      case "h1":
        html += `<h1 style="font-size:22px;color:#1e3a5f;margin:20px 0 8px;font-weight:700;">${stripMarkdownFormatting(block.text || "")}</h1>`;
        break;
      case "h2":
        html += `<h2 style="font-size:18px;color:#2d4a6f;margin:16px 0 6px;font-weight:700;">${stripMarkdownFormatting(block.text || "")}</h2>`;
        break;
      case "h3":
        html += `<h3 style="font-size:15px;color:#374151;margin:14px 0 6px;font-weight:600;">${stripMarkdownFormatting(block.text || "")}</h3>`;
        break;
      case "paragraph": {
        let t = block.text || "";
        t = t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
        html += `<p style="margin:0 0 10px;line-height:1.7;">${t}</p>`;
        break;
      }
      case "bullet":
        html += `<ul style="margin:0 0 10px;padding-left:24px;">`;
        for (const item of (block.items || [])) {
          let t = item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
          html += `<li style="margin:0 0 4px;">${t}</li>`;
        }
        html += `</ul>`;
        break;
      case "numbered":
        html += `<ol style="margin:0 0 10px;padding-left:24px;">`;
        for (const item of (block.items || [])) {
          let t = item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
          html += `<li style="margin:0 0 4px;">${t}</li>`;
        }
        html += `</ol>`;
        break;
      case "hr":
        html += `<hr style="border:none;border-top:1px solid #d1d5db;margin:16px 0;">`;
        break;
      case "table":
        if (block.table) {
          html += `<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px;">`;
          html += `<thead><tr>`;
          for (const h of block.table.headers) {
            html += `<th style="background:#1e3a5f;color:#fff;padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">${stripMarkdownFormatting(h)}</th>`;
          }
          html += `</tr></thead><tbody>`;
          for (let ri = 0; ri < block.table.rows.length; ri++) {
            const bg = ri % 2 === 0 ? "#f8fafc" : "#ffffff";
            html += `<tr>`;
            for (let ci = 0; ci < block.table.headers.length; ci++) {
              let cellText = (block.table.rows[ri][ci] || "").replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
              html += `<td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;background:${bg};">${cellText}</td>`;
            }
            html += `</tr>`;
          }
          html += `</tbody></table>`;
        }
        break;
    }
  }

  html += `<div style="border-top:1px solid #e2e8f0;margin-top:24px;padding-top:10px;">
    <p style="font-size:11px;color:#9ca3af;font-style:italic;margin:0;">Generated by Corpuscape — Corpus Compilation & Analysis Lab for Translation Studies Research</p>
  </div>`;

  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    document.body.removeChild(container);

    const imgWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 0;
    const contentWidth = imgWidth - margin * 2;
    const imgHeight = (canvas.height * contentWidth) / canvas.width;

    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF("p", "pt", "a4");

    let position = 0;
    let remainingHeight = imgHeight;
    const pageContentHeight = pageHeight - margin * 2;

    while (remainingHeight > 0) {
      if (position > 0) pdf.addPage();

      const sourceY = (position * canvas.width) / contentWidth;
      const sourceHeight = Math.min((pageContentHeight * canvas.width) / contentWidth, canvas.height - sourceY);

      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = sourceHeight;
      const ctx = pageCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
      }

      const pageImgData = pageCanvas.toDataURL("image/jpeg", 0.95);
      const drawHeight = (sourceHeight * contentWidth) / canvas.width;
      pdf.addImage(pageImgData, "JPEG", margin, margin, contentWidth, drawHeight);

      position += pageContentHeight;
      remainingHeight -= pageContentHeight;
    }

    pdf.save(`${filename}.pdf`);
  } catch {
    document.body.removeChild(container);
  }
}

export function MarkdownRender({ content, className = "", showDownload = true, downloadFilename = "AI_Results" }: MarkdownRenderProps) {
  const tables = parseMarkdownTables(content);
  const hasTable = tables.length > 0;

  return (
    <div className={`space-y-3 ${className}`}>
      {showDownload && content.trim().length > 0 && (
        <div className="flex justify-end gap-1.5" data-testid="ai-download-buttons">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => downloadFullWord(content, downloadFilename)}
            data-testid="button-ai-download-word"
          >
            <FileText className="w-3.5 h-3.5" />
            Word
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => downloadPDF(content, downloadFilename)}
            data-testid="button-ai-download-pdf"
          >
            <FileDown className="w-3.5 h-3.5" />
            PDF
          </Button>
          {hasTable && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => downloadTableExcel(tables, downloadFilename)}
              data-testid="button-ai-download-excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel
            </Button>
          )}
        </div>
      )}
      <div className="prose prose-sm dark:prose-invert max-w-none markdown-content" data-testid="text-markdown-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            table: ({ children }) => (
              <div className="overflow-x-auto rounded-lg border border-border/60 my-4">
                <table className="w-full text-sm border-collapse min-w-[400px]">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-muted/60 dark:bg-muted/30">
                {children}
              </thead>
            ),
            th: ({ children }) => (
              <th className="py-2.5 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-foreground/80 border-b border-border/60 whitespace-nowrap">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="py-2 px-3 text-sm border-b border-border/30 text-foreground/90">
                {children}
              </td>
            ),
            tr: ({ children }) => (
              <tr className="hover:bg-muted/20 transition-colors">
                {children}
              </tr>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-foreground">{children}</strong>
            ),
            h1: ({ children }) => (
              <h1 className="text-xl font-bold mt-5 mb-3 text-foreground">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-lg font-bold mt-4 mb-2 text-foreground">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base font-semibold mt-3 mb-2 text-foreground">{children}</h3>
            ),
            p: ({ children }) => (
              <p className="text-sm leading-relaxed text-foreground/85 mb-3">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="list-disc pl-5 space-y-1 text-sm text-foreground/85 mb-3">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-5 space-y-1 text-sm text-foreground/85 mb-3">{children}</ol>
            ),
            li: ({ children }) => (
              <li className="leading-relaxed">{children}</li>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
