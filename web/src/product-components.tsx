import type { ReactNode } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Columns2,
  FileText,
  FolderOpen,
  Globe2,
  Languages,
  Library,
  Plus,
  Upload,
} from "lucide-react";
import { samples } from "./samples";

const pageNames: Record<string, { title: string; section: string }> = {
  "MONOLINGUAL LAB": { title: "Corpus explorer", section: "ANALYZE" },
  "BILINGUAL LAB": { title: "Parallel workspace", section: "ALIGN & REVIEW" },
  "CORPUS COMPARISON": { title: "Compare corpora", section: "COMPARE" },
  "FIGURE STUDIO": { title: "Figure studio", section: "VISUALIZE" },
  "YOUR LOCAL LIBRARY": { title: "Corpus library", section: "YOUR DATA" },
  "METHODS & PRIVACY": { title: "Methods & privacy", section: "DOCUMENTATION" },
};
export function ToolHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  const page = pageNames[eyebrow];
  return (
    <div className="page-heading">
      <div className="page-heading-main">
        <div className="section-kicker">{page?.section ?? eyebrow}</div>
        <h1>{page?.title ?? title}</h1>
        <p>{description}</p>
      </div>
      <span className="page-context">
        <span className="status-dot" />
        Local workspace
      </span>
    </div>
  );
}
export function SampleList({
  onSample,
  compact = false,
}: {
  onSample: (index: number) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "dataset-list compact" : "dataset-list"}>
      {samples.map((sample, index) => (
        <button
          key={sample.name}
          onClick={() => onSample(index)}
          className="dataset-row"
        >
          <span className={`dataset-file dataset-file-${index}`}>
            {index ? <Languages size={19} /> : <FileText size={19} />}
          </span>
          <span className="dataset-info">
            <strong>{sample.name}</strong>
            <small>
              {sample.documents.length} documents<span>·</span>
              {index ? "Multilingual" : "English"}
              <span>·</span>Teaching dataset
            </small>
          </span>
          {!compact && (
            <span className="dataset-languages">
              {index ? (
                <>
                  <b>ES</b>
                  <b>FR</b>
                  <b>RU</b>
                  <b>+7</b>
                </>
              ) : (
                <b>EN</b>
              )}
            </span>
          )}
          <span className="dataset-open">
            Open <ArrowUpRight size={14} />
          </span>
        </button>
      ))}
    </div>
  );
}
export function CorpusStart({
  onUpload,
  onSample,
}: {
  onUpload: () => void;
  onSample: (index: number) => void;
}) {
  return (
    <div className="explorer-empty">
      <section className="panel empty-import">
        <div className="file-stack" aria-hidden="true">
          <FileText size={32} />
          <span>+</span>
        </div>
        <h2>Add a corpus to start exploring</h2>
        <p>
          Import one document or a collection. Your files are processed on this
          device.
        </p>
        <button className="button primary" onClick={onUpload}>
          <Upload size={16} />
          Import corpus
        </button>
        <small>
          Documents, tables, subtitles, scanned PDFs and images · no fixed file
          quota
        </small>
      </section>
      <section className="panel dataset-panel">
        <div className="panel-head">
          <div>
            <h2>Try a sample dataset</h2>
            <p>Explore the tools with a ready-to-use collection.</p>
          </div>
          <BookOpen size={18} />
        </div>
        <SampleList onSample={onSample} />
      </section>
    </div>
  );
}
type DashboardView =
  | "overview"
  | "workspace"
  | "analysis"
  | "bilingual"
  | "compare"
  | "figures"
  | "reports"
  | "papers"
  | "ocr"
  | "library"
  | "methods";
export function Dashboard({
  input,
  onNavigate,
  onSample,
  activeName,
  documents,
  tokens,
}: {
  input: ReactNode;
  onNavigate: (view: DashboardView) => void;
  onSample: (index: number) => void;
  activeName: string;
  documents: number;
  tokens?: number;
}) {
  const tools = [
    {
      id: "analysis" as const,
      name: "Corpus explorer",
      detail: "Frequencies, concordance, n-grams and collocations.",
      icon: FileText,
      code: "01",
    },
    {
      id: "bilingual" as const,
      name: "Parallel workspace",
      detail: "Review translations side by side and export TMX.",
      icon: Languages,
      code: "02",
    },
    {
      id: "compare" as const,
      name: "Compare corpora",
      detail: "Compare distributions and distinctive vocabulary.",
      icon: Columns2,
      code: "03",
    },
    {
      id: "figures" as const,
      name: "Figure studio",
      detail: "Create editable charts from your research data.",
      icon: BarChart3,
      code: "04",
    },
    {
      id: "reports" as const,
      name: "Research reports",
      detail: "Evidence-based drafts with local open models. No API key.",
      icon: BookOpen,
      code: "05",
    },
    {
      id: "papers" as const,
      name: "Mini paper",
      detail:
        "Frozen analyses, manuscript drafts, tables, figures and Word exports.",
      icon: BookOpen,
      code: "06",
    },
    {
      id: "ocr" as const,
      name: "Text extraction",
      detail: "Turn scanned PDFs and images into editable corpus text.",
      icon: FileText,
      code: "07",
    },
  ];
  return (
    <>
      <div className="dashboard-heading">
        <div>
          <span className="section-kicker">CORPUSCAPE / WORKSPACE</span>
          <h1>Your corpus workspace</h1>
          <p>Import texts, run analyses, and manage your corpora.</p>
        </div>
        <div className="workspace-stamp">
          <span className="stamp-icon">
            <Globe2 size={20} />
          </span>
          <div>
            <strong>Multilingual analysis</strong>
            <small>Local processing · No account required</small>
          </div>
        </div>
      </div>
      <div className="dashboard-grid">
        {input}
        <section className="quick-tools">
          <div className="section-label">
            <h2>Research tools</h2>
            <span>{tools.length} workspaces</span>
          </div>
          <div className="tool-grid">
            {tools.map((tool) => (
              <button
                className="tool-card"
                key={tool.id}
                onClick={() => onNavigate(tool.id)}
              >
                <span className="tool-card-top">
                  <span className="tool-card-icon">
                    <tool.icon size={20} />
                  </span>
                  <span className="tool-code">{tool.code}</span>
                </span>
                <strong>{tool.name}</strong>
                <p>{tool.detail}</p>
                <span className="tool-card-bottom">
                  Open workspace <ArrowRight size={15} />
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
      {documents > 0 && (
        <button
          className="active-dataset"
          onClick={() => onNavigate("analysis")}
        >
          <span className="active-dataset-icon">
            <FolderOpen size={21} />
          </span>
          <span>
            <small>ACTIVE CORPUS</small>
            <strong>{activeName}</strong>
          </span>
          <span className="active-dataset-count">
            {documents} documents
            {tokens !== undefined && <> · {tokens.toLocaleString()} tokens</>}
          </span>
          <ArrowRight size={17} />
        </button>
      )}
      <section className="panel dataset-panel">
        <div className="panel-head">
          <div>
            <h2>Sample datasets</h2>
            <p>Original teaching texts for exploring the workspace.</p>
          </div>
          <span className="tag">INCLUDED</span>
        </div>
        <SampleList onSample={onSample} />
      </section>
      <div className="workspace-principles">
        <span>
          <span className="status-dot" />
          Processed on your device
        </span>
        <span>Unicode text support</span>
        <button onClick={() => onNavigate("methods")}>
          Methods & privacy <ArrowUpRight size={13} />
        </button>
      </div>
    </>
  );
}
export function FigureSource({
  name,
  count,
  custom,
}: {
  name: string;
  count: number;
  custom: boolean;
}) {
  return (
    <div className="figure-source">
      <FileText size={16} />
      <span>
        <small>DATA SOURCE</small>
        <strong>{custom ? "Custom data" : name}</strong>
      </span>
      <b>{count} items</b>
    </div>
  );
}
export function LibraryStart({ onStart }: { onStart: () => void }) {
  return (
    <section className="panel library-empty">
      <span className="library-empty-icon">
        <Library size={28} />
      </span>
      <h2>Your library is empty</h2>
      <p>
        Import a corpus and choose “Save to library” to keep a copy in this
        browser.
      </p>
      <button className="button primary" onClick={onStart}>
        <Plus size={16} />
        Add a corpus
      </button>
      <div className="library-empty-footer">
        <span>
          <Library size={15} />
          Stored in this browser
        </span>
        <span>
          <ArrowDownToLine size={15} />
          Portable JSON backups
        </span>
      </div>
    </section>
  );
}
export function ChartStyles({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="chart-styles">
      <legend>Chart type</legend>
      <div className="chart-style-options">
        {[
          ["bar", "Bar"],
          ["column", "Column"],
          ["lollipop", "Lollipop"],
        ].map(([kind, label]) => (
          <button
            type="button"
            aria-pressed={value === kind}
            key={kind}
            onClick={() => onChange(kind)}
          >
            <span
              aria-hidden="true"
              className={`chart-glyph chart-glyph-${kind}`}
            >
              <i />
              <i />
              <i />
            </span>
            {label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
export function ColorPalette({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      className="color-swatches"
      role="group"
      aria-label="Figure colour presets"
    >
      {[
        ["#4f46e5", "Cobalt"],
        ["#18181b", "Charcoal"],
        ["#0891b2", "Cyan"],
        ["#db2777", "Rose"],
        ["#d97706", "Amber"],
      ].map(([color, label]) => (
        <button
          key={color}
          aria-label={label}
          aria-pressed={value === color}
          style={{ backgroundColor: color }}
          onClick={() => onChange(color)}
        />
      ))}
    </div>
  );
}
