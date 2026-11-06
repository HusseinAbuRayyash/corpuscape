import {
  ArrowDownToLine,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  Columns2,
  FileText,
  FlaskConical,
  Globe2,
  Languages,
  Library,
  Search,
  Upload,
} from "lucide-react";

const themes: Record<string, { kind: string; label: string; steps: string[] }> =
  {
    "MONOLINGUAL LAB": {
      kind: "analysis",
      label: "A closer reading",
      steps: [
        "Bring your texts",
        "Explore the patterns",
        "Export your findings",
      ],
    },
    "BILINGUAL LAB": {
      kind: "bilingual",
      label: "Across languages",
      steps: [
        "Add parallel texts",
        "Review side by side",
        "Export your memory",
      ],
    },
    "CORPUS COMPARISON": {
      kind: "compare",
      label: "A different perspective",
      steps: [
        "Choose two corpora",
        "Compare distributions",
        "Investigate differences",
      ],
    },
    "FIGURE STUDIO": {
      kind: "figures",
      label: "From evidence to expression",
      steps: ["Choose your data", "Shape your figure", "Download as SVG"],
    },
    "YOUR LOCAL LIBRARY": {
      kind: "library",
      label: "A home for your research",
      steps: ["Save a corpus", "Return to your work", "Keep a backup"],
    },
    "METHODS & PRIVACY": {
      kind: "methods",
      label: "Open methods. Clear answers.",
      steps: [
        "Understand the counts",
        "Inspect the methods",
        "Keep control of your texts",
      ],
    },
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
  const theme = themes[eyebrow] ?? themes["MONOLINGUAL LAB"];
  return (
    <section className={`tool-heading tool-${theme.kind}`}>
      <div className="tool-heading-copy">
        <span className="eyebrow">
          <span className="live-pip" />
          {eyebrow}
        </span>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="tool-heading-foot">
          <Globe2 size={14} />
          <span>Any language</span>
          <span className="heading-dot" />
          <span>On your device</span>
        </div>
      </div>
      <div className="tool-heading-art" aria-hidden="true">
        <WorkspaceArt kind={theme.kind} />
        <span>{theme.label}</span>
      </div>
      <div className="workflow-steps" aria-label="Suggested workflow">
        {theme.steps.map((step, index) => (
          <div key={step}>
            <b>{String(index + 1).padStart(2, "0")}</b>
            <span>{step}</span>
            {index < theme.steps.length - 1 && <ArrowRight size={15} />}
          </div>
        ))}
      </div>
    </section>
  );
}
function WorkspaceArt({ kind }: { kind: string }) {
  if (kind === "bilingual")
    return (
      <div className="parallel-art">
        <div className="art-paper paper-source">
          <span>ORIGINAL</span>
          <strong>
            Every word
            <br />
            opens a world.
          </strong>
          <i />
          <i />
          <i />
        </div>
        <div className="art-paper paper-target">
          <span>TRANSLATION</span>
          <strong>
            Chaque mot
            <br />
            ouvre un monde.
          </strong>
          <i />
          <i />
          <i />
        </div>
        <div className="art-link">
          <Languages size={21} />
        </div>
      </div>
    );
  if (kind === "compare")
    return (
      <div className="comparison-art">
        <div>
          <span>CORPUS A</span>
          {[70, 45, 82, 58, 35].map((width, i) => (
            <i key={i} style={{ width: `${width}%` }} />
          ))}
        </div>
        <Columns2 size={22} />
        <div>
          <span>CORPUS B</span>
          {[45, 70, 55, 80, 45].map((width, i) => (
            <i key={i} style={{ width: `${width}%` }} />
          ))}
        </div>
      </div>
    );
  if (kind === "figures")
    return (
      <div className="studio-art">
        <div className="art-toolbar">
          <i />
          <i />
          <i />
          <BarChart3 size={16} />
        </div>
        <div className="art-columns">
          {[36, 65, 46, 86, 59, 74].map((height, i) => (
            <i key={i} style={{ height: `${height}%` }} />
          ))}
        </div>
        <div className="art-colours">
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>
    );
  if (kind === "library")
    return (
      <div className="books-art">
        <div>
          <BookOpen size={25} />
          <i />
          <i />
        </div>
        <div>
          <FileText size={25} />
          <i />
          <i />
        </div>
        <div>
          <Library size={25} />
          <i />
          <i />
        </div>
        <span />
      </div>
    );
  if (kind === "methods")
    return (
      <div className="methods-art">
        <div className="method-equation">patterns → evidence</div>
        <div className="method-check">
          <Check size={17} />
          Reproducible counts
        </div>
        <div className="method-check">
          <Check size={17} />
          Transparent methods
        </div>
        <div className="method-check">
          <Check size={17} />
          Local processing
        </div>
      </div>
    );
  return (
    <div className="concordance-art">
      <div className="art-search">
        <Search size={15} />
        <span>language</span>
        <span>↵</span>
      </div>
      <div className="art-concordance">
        <span>every</span>
        <b>language</b>
        <span>tells a story</span>
        <span>explore</span>
        <b>language</b>
        <span>in context</span>
        <span>a shared</span>
        <b>language</b>
        <span>of discovery</span>
      </div>
      <div className="art-language-tags">
        <span>Español</span>
        <span>中文</span>
        <span>Русский</span>
        <span>日本語</span>
      </div>
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
    <section className="corpus-start">
      <div className="start-main">
        <span className="start-icon">
          <Upload size={26} />
        </span>
        <span className="eyebrow">YOUR RESEARCH STARTS HERE</span>
        <h2>
          Bring a text.
          <br />
          <em>Find a new perspective.</em>
        </h2>
        <p>
          Import a collection, a single document, or a set of texts in the
          languages you study.
        </p>
        <button className="button primary" onClick={onUpload}>
          Import your corpus <ArrowRight size={17} />
        </button>
        <small>TXT · DOCX · PDF · CSV · XLSX & more</small>
      </div>
      <div className="start-samples">
        <span className="eyebrow">TAKE A LOOK AROUND</span>
        <h3>
          A working example,
          <br />
          one click away.
        </h3>
        <button onClick={() => onSample(0)}>
          <span className="sample-icon mint">
            <BookOpen size={22} />
          </span>
          <span>
            <strong>Language & translation</strong>
            <small>3 English teaching texts</small>
          </span>
          <ArrowUpRightIcon />
        </button>
        <button onClick={() => onSample(1)}>
          <span className="sample-icon lavender">
            <Globe2 size={22} />
          </span>
          <span>
            <strong>Languages in conversation</strong>
            <small>10 languages · multiple scripts</small>
          </span>
          <ArrowUpRightIcon />
        </button>
        <div className="start-promise">
          <Check size={15} />
          <span>Your texts stay in your browser.</span>
        </div>
      </div>
    </section>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight className="sample-arrow" size={18} />;
}
export function ResearchNote({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="research-note">
      <span>
        <FlaskConical size={18} />
      </span>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
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
      <span>
        <FileText size={17} />
      </span>
      <div>
        <small>DATA SOURCE</small>
        <strong>{custom ? "Your custom values" : name}</strong>
      </div>
      <b>{count} items</b>
    </div>
  );
}
export function LibraryStart({ onStart }: { onStart: () => void }) {
  return (
    <section className="library-start">
      <div className="library-shelf" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div>
        <span className="eyebrow">SPACE FOR YOUR NEXT QUESTION</span>
        <h2>Build your own research collection.</h2>
        <p>
          Save an active corpus to return to it here. Export a JSON backup
          whenever you want a portable copy.
        </p>
        <button className="button primary" onClick={onStart}>
          Explore a corpus <ArrowRight size={16} />
        </button>
      </div>
      <div className="library-how">
        <span>
          <Upload size={18} />
          Import
        </span>
        <ArrowRight size={14} />
        <span>
          <Library size={18} />
          Save locally
        </span>
        <ArrowRight size={14} />
        <span>
          <ArrowDownToLine size={18} />
          Back up
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
      <legend>Chart style</legend>
      <div className="chart-style-options">
        {[
          ["bar", "Horizontal"],
          ["column", "Columns"],
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
        ["#357566", "Forest"],
        ["#487aab", "Cobalt"],
        ["#b76d50", "Terracotta"],
        ["#8a6c91", "Plum"],
        ["#b89c55", "Gold"],
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
