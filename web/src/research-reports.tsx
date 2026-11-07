import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  Download,
  Square,
  Cpu,
  Check,
  BookOpen,
  Loader2,
  FileText,
  ChevronDown,
} from "lucide-react";
import {
  buildEvidence,
  exactReport,
  localModels,
  reportMessages,
  unknownEvidenceReferences,
  unsupportedClaimNotice,
  numericClaimNotice,
  reportExport,
  validateReportSession,
  type Evidence,
  type ModelId,
  type ReportInput,
} from "./report-model";
import { loadSession, saveSession } from "./library";
import { xmlEscape } from "./engine";
import { locales } from "./samples";
import { ModelConnection, useLocalWriter } from "./local-writer";
import "./research-tools.css";
type Draft = {
  id: string;
  title: string;
  text: string;
  evidence: Evidence[];
  model: string;
  generatedAt: string;
  language: string;
  task: string;
  inputTokens?: number;
  outputTokens?: number;
  incomplete?: boolean;
};
function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
export function ResearchReports(input: ReportInput) {
  const { client, state: writer } = useLocalWriter();
  const status = writer.phase;
  const [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const [task, setTask] = useState("Results and interpretation"),
    [language, setLanguage] = useState("en"),
    [instructions, setInstructions] = useState(""),
    [evidenceCount, setEvidenceCount] = useState(12),
    [includeExcerpts, setIncludeExcerpts] = useState(false),
    [maxTokens, setMaxTokens] = useState(512);
  const [evidencePage, setEvidencePage] = useState(0);
  const [excerptCharacters, setExcerptCharacters] = useState(1200);
  const [languageNotice, setLanguageNotice] = useState("");
  const [evidenceScope, setEvidenceScope] = useState("overview");
  const [text, setText] = useState(""),
    [evidence, setEvidence] = useState<Evidence[]>([]),
    [drafts, setDrafts] = useState<Draft[]>([]),
    [current, setCurrent] = useState<Draft | null>(null),
    [figure, setFigure] = useState<unknown>(null),
    [saved, setSaved] = useState(false),
    [storageReady, setStorageReady] = useState(false);
  const restoreInput = useRef<HTMLInputElement>(null);
  const textRef = useRef(""),
    evidenceRef = useRef<Evidence[]>([]),
    metadata = useRef({ model: "", language: "en", task: "", inputTokens: 0 });
  const latestSession = useRef({ drafts, text, current, evidence });
  latestSession.current = { drafts, text, current, evidence };
  useEffect(() => {
    let active = true;
    Promise.all([
      loadSession<{
        drafts: Draft[];
        text: string;
        current: Draft | null;
        evidence: Evidence[];
      }>("research-reports-v1"),
      loadSession<unknown>("figure-report-context"),
    ])
      .then(([data, context]) => {
        if (!active) return;
        if (data) {
          setDrafts(data.drafts ?? []);
          setText(data.text ?? "");
          textRef.current = data.text ?? "";
          setCurrent(data.current ?? null);
          setEvidence(data.evidence ?? []);
        }
        setFigure(context ?? null);
        if (context) {
          setTask("Figure caption");
          setText("");
          textRef.current = "";
          setCurrent(null);
          setEvidence([]);
          setNotice(
            "Current figure evidence is selected. Connect a local model to draft its caption.",
          );
          void saveSession("figure-report-context", null).catch(() => {});
        }
      })
      .catch(() =>
        setNotice(
          "Browser storage is unavailable. Export drafts to keep them.",
        ),
      )
      .finally(() => {
        if (active) setStorageReady(true);
      });
    return () => {
      active = false;
      if (client.state.phase === "generating") client.cancel();
      if (latestSession.current.current || latestSession.current.drafts.length)
        void saveSession("research-reports-v1", latestSession.current).catch(
          () => {},
        );
    };
  }, []);
  useEffect(() => {
    if (!storageReady) return;
    setSaved(false);
    const timer = setTimeout(() => {
      saveSession("research-reports-v1", { drafts, text, current, evidence })
        .then(() => setSaved(true))
        .catch(() =>
          setNotice("Could not save locally. Download a report backup."),
        );
    }, 700);
    return () => clearTimeout(timer);
  }, [drafts, text, current, evidence, storageReady]);
  const previewEvidence = useMemo(() => {
    try {
      const records = buildEvidence(
        input,
        evidenceCount,
        includeExcerpts,
        task === "Figure caption" ? figure : undefined,
        excerptCharacters,
      );
      if (task === "Figure caption")
        return records.filter((item) => item.id === "V1");
      if (task === "Translation review suggestions")
        return records.filter(
          (item) =>
            item.id === "M1" || item.id === "C1" || /^[PT]\d+$/.test(item.id),
        );
      return evidenceScope === "overview"
        ? records.filter(
            (item) =>
              item.id === "C1" ||
              (task === "Methods section" && item.id === "M1"),
          )
        : records;
    } catch {
      return [];
    }
  }, [
    input.analysis,
    input.documents,
    input.options,
    input.comparison,
    input.pairs,
    evidenceCount,
    includeExcerpts,
    excerptCharacters,
    figure,
    task,
    evidenceScope,
  ]);
  useEffect(() => setEvidencePage(0), [evidence, previewEvidence]);
  useEffect(() => {
    let active = true;
    setLanguageNotice("");
    if (
      status === "generating" ||
      !current ||
      current.model.includes("Deterministic") ||
      text.length < 100
    )
      return;
    const timer = setTimeout(() => {
      void import("./language-detection")
        .then(({ draftLanguageNotice }) => {
          if (active)
            setLanguageNotice(draftLanguageNotice(text, current.language));
        })
        .catch(() => {});
    }, 600);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [text, status, current]);
  const unknown = useMemo(
    () => unknownEvidenceReferences(text, evidence),
    [text, evidence],
  );
  const claimNotice = useMemo(
    () =>
      current?.model.includes("Deterministic")
        ? ""
        : [
            unsupportedClaimNotice(text, evidence),
            numericClaimNotice(text, evidence),
          ]
            .filter(Boolean)
            .join(" "),
    [text, evidence, current?.model],
  );
  const factRecord = (current ? evidence : previewEvidence).find(
    (item) => item.id === "C1",
  );
  const factValue = factRecord?.value as Record<string, unknown> | undefined;
  const facts =
    factValue &&
    ["documents", "tokens", "types"].every(
      (key) =>
        typeof factValue[key] === "number" && Number.isFinite(factValue[key]),
    )
      ? {
          documents: Number(factValue.documents),
          tokens: Number(factValue.tokens),
          types: Number(factValue.types),
        }
      : null;
  function stop() {
    client.cancel();
  }
  async function generate() {
    if (!input.analysis && task !== "Figure caption") {
      setError(
        "Load a corpus first, or choose a figure caption with figure evidence.",
      );
      return;
    }
    if (!previewEvidence.length) {
      setError("Choose a valid positive number of evidence rows.");
      return;
    }
    if (!Number.isSafeInteger(maxTokens) || maxTokens < 1) {
      setError("Choose a positive draft length.");
      return;
    }
    evidenceRef.current = previewEvidence;
    setEvidence(previewEvidence);
    metadata.current = {
      model: writer.connection
        ? `${writer.connection.repo}@${writer.connection.revision} · ${writer.connection.runtime}`
        : "",
      language,
      task,
      inputTokens: 0,
    };
    textRef.current = "";
    setText("");
    setError("");
    setCurrent({
      id: crypto.randomUUID(),
      title: input.name,
      text: "",
      evidence: previewEvidence,
      model: metadata.current.model,
      generatedAt: new Date().toISOString(),
      language,
      task,
      incomplete: true,
    });
    try {
      const result = await client.generate(
        reportMessages(previewEvidence, task, language, instructions),
        maxTokens,
        (delta) => {
          textRef.current += delta;
          setText(textRef.current);
        },
      );
      const draft: Draft = {
        id: crypto.randomUUID(),
        title: input.name,
        text: result.text,
        evidence: evidenceRef.current,
        model: metadata.current.model,
        generatedAt: new Date().toISOString(),
        language: metadata.current.language,
        task: metadata.current.task,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        incomplete: result.incomplete,
      };
      setText(result.text);
      textRef.current = result.text;
      setCurrent(draft);
      setDrafts((old) => [draft, ...old]);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    }
  }

  const exportMetadata = current ?? {
    title: input.name,
    model: "Manual draft",
    generatedAt: new Date().toISOString(),
    language,
  };
  const exportNotices = [
    claimNotice,
    languageNotice,
    unknown.length ? `Unknown evidence references: ${unknown.join(", ")}` : "",
    current &&
    !current.model.includes("Deterministic") &&
    !/\[[A-Z]\d+\]/.test(text)
      ? "No bracketed evidence citations were found."
      : "",
  ].filter(Boolean);
  function computed() {
    const all = buildEvidence(input, Math.max(1, input.documents.length));
    const draft: Draft = {
      id: crypto.randomUUID(),
      title: input.name,
      text: exactReport(input),
      evidence: all,
      model: "Deterministic statistics · no model",
      generatedAt: new Date().toISOString(),
      language: "en",
      task: "Exact statistical report",
    };
    setText(draft.text);
    textRef.current = draft.text;
    setEvidence(all);
    setCurrent(draft);
    setDrafts((old) => [draft, ...old]);
  }
  return (
    <section className="research-page">
      <header className="research-heading">
        <div>
          <span className="research-kicker">CORPUSCAPE / RESEARCH WRITING</span>
          <h1>
            Research reports
            <span>
              <Sparkles size={14} />
              Local AI
            </span>
          </h1>
          <p>Connect your evidence to a clear, editable research draft.</p>
        </div>
        <span className="research-local-badge">
          <span />
          No API key · no account · local inference
        </span>
      </header>
      <div className="research-report-layout">
        <aside className="research-card report-settings">
          <ModelConnection />
          <h2>Draft settings</h2>
          <p className="research-muted">
            New reports use the current corpus: <strong>{input.name}</strong>.
            Saved drafts keep their own evidence.
          </p>
          <label>
            Research task
            <select
              value={task}
              onChange={(e) => {
                setTask(e.target.value);
                if (/Linguistic|Translation/.test(e.target.value)) {
                  setEvidenceScope("tables");
                  setIncludeExcerpts(true);
                }
              }}
            >
              {[
                "Results and interpretation",
                "Methods section",
                "Discussion and next research questions",
                "Figure caption",
                "Linguistic observations and annotation suggestions",
                "Translation review suggestions",
              ].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Output language
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {locales
                .filter(([id]) => id !== "und")
                .map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Custom output language / BCP 47 code
            <input
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="e.g. Swahili or sw"
            />
          </label>
          <label>
            Your research question / instructions
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="What do these patterns suggest about the language of…?"
            />
          </label>
          <label>
            Evidence selection
            <select
              value={evidenceScope}
              onChange={(e) => setEvidenceScope(e.target.value)}
            >
              <option value="overview">Corpus overview · exact totals</option>
              <option value="tables">Selected tables and excerpts</option>
            </select>
          </label>
          <div className="research-two">
            <label>
              Evidence rows per table
              <input
                type="number"
                min="1"
                value={evidenceCount}
                disabled={
                  evidenceScope === "overview" || task === "Figure caption"
                }
                onChange={(e) => setEvidenceCount(Number(e.target.value))}
              />
            </label>
            <label>
              Draft output tokens
              <input
                type="number"
                min="1"
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
              />
            </label>
          </div>
          <label className="research-check">
            <input
              type="checkbox"
              checked={includeExcerpts}
              disabled={
                evidenceScope === "overview" || task === "Figure caption"
              }
              onChange={(e) => setIncludeExcerpts(e.target.checked)}
            />
            Include original excerpts / parallel pairs
          </label>
          <p className="research-muted">
            Evidence selection is explicit. Models have a finite context window;
            oversized prompts are rejected rather than silently truncated. Set
            excerpt length to zero to include complete documents.
          </p>
          {includeExcerpts && evidenceScope === "tables" && (
            <label>
              Excerpt characters · 0 = full text
              <input
                type="number"
                min="0"
                value={excerptCharacters}
                onChange={(e) => setExcerptCharacters(Number(e.target.value))}
              />
            </label>
          )}
          <button
            className="research-button primary full"
            onClick={generate}
            disabled={status !== "ready" || !previewEvidence.length}
          >
            <Sparkles size={15} />
            Generate research draft
          </button>
          <button
            className="research-button full"
            onClick={computed}
            disabled={!input.analysis || status === "generating"}
          >
            <FileText size={15} />
            Build exact statistical report
          </button>
        </aside>
        <div className="report-main">
          <input
            ref={restoreInput}
            hidden
            type="file"
            accept=".json"
            onChange={async (e) => {
              const element = e.currentTarget;
              try {
                const file = element.files?.[0];
                if (!file) return;
                const raw = JSON.parse(await file.text());
                if (raw.format !== "corpuscape-report-v1")
                  throw new Error("Choose a Corpuscape report backup.");
                const data = validateReportSession({
                  drafts: [raw],
                  text: raw.text,
                  current: raw,
                  evidence: raw.evidence,
                });
                const draft = data.current as Draft;
                setCurrent(draft);
                setText(data.text);
                textRef.current = data.text;
                setEvidence(data.evidence);
                setDrafts((old) => [
                  draft,
                  ...old.filter((d) => d.id !== draft.id),
                ]);
                setNotice("Report backup restored.");
              } catch (error) {
                setError(
                  error instanceof Error ? error.message : String(error),
                );
              } finally {
                element.value = "";
              }
            }}
          />
          <div className="report-backup-actions">
            <button
              className="research-text-button"
              disabled={status === "generating"}
              onClick={() => restoreInput.current?.click()}
            >
              Restore report backup
            </button>
          </div>
          {facts && (
            <div
              className="report-facts"
              aria-label="Corpus facts in selected evidence"
            >
              <span>
                <strong>{facts.documents.toLocaleString()}</strong> {facts.documents===1?'document':'documents'}
              </span>
              <span>
                <strong>{facts.tokens.toLocaleString()}</strong> word tokens
              </span>
              <span>
                <strong>{facts.types.toLocaleString()}</strong> types
              </span>
              <small>
                {factRecord?.label} ·{" "}
                {current ? "frozen draft evidence" : "current analysis"} ·
                independent of AI text
              </small>
            </div>
          )}
          {notice && <div className="research-notice">{notice}</div>}
          {current?.incomplete && status !== "generating" && (
            <div className="research-notice">
              This model generation reached its token budget or was stopped.
              Check the ending before using the draft; you can edit the text or
              request a longer generation.
            </div>
          )}
          {languageNotice && (
            <div className="research-notice" role="status">
              {languageNotice}
            </div>
          )}
          {claimNotice && (
            <div className="research-error" role="alert">
              {claimNotice} AI drafts require human review; these checks do not
              verify every statement.
            </div>
          )}
          {error && (
            <div className="research-error" role="alert">
              {error}
            </div>
          )}
          <section className="research-card report-editor">
            <div className="report-editor-toolbar">
              <div>
                <span
                  className={
                    status === "generating"
                      ? "report-generating"
                      : "report-state"
                  }
                >
                  {status === "generating" ? (
                    <Loader2 size={13} className="spin" />
                  ) : (
                    <Check size={13} />
                  )}{" "}
                  {status === "generating"
                    ? "Writing locally…"
                    : saved
                      ? "Saved on this device"
                      : "Editable draft"}
                </span>
                {current && (
                  <small>
                    {current.model.includes("Deterministic")
                      ? "Computed report"
                      : current.model.split("@")[0].split("/").at(-1)}
                  </small>
                )}
              </div>
              <div>
                {status === "generating" && (
                  <button className="research-button" onClick={stop}>
                    <Square size={13} />
                    Stop
                  </button>
                )}
                <button
                  className="research-button"
                  disabled={!text}
                  onClick={() =>
                    download(
                      "corpuscape-research-report.md",
                      reportExport(
                        text,
                        evidence,
                        exportMetadata,
                        exportNotices,
                        "md",
                      ),
                      "text/markdown;charset=utf-8",
                    )
                  }
                >
                  <Download size={14} />
                  Markdown
                </button>
                <button
                  className="research-button"
                  disabled={!text}
                  onClick={() =>
                    download(
                      "corpuscape-research-report.html",
                      reportExport(
                        text,
                        evidence,
                        exportMetadata,
                        exportNotices,
                        "html",
                      ),
                      "text/html;charset=utf-8",
                    )
                  }
                >
                  HTML / print PDF
                </button>
                <button
                  className="research-button"
                  disabled={!text}
                  onClick={() =>
                    download(
                      "corpuscape-report-backup.json",
                      JSON.stringify(
                        {
                          format: "corpuscape-report-v1",
                          ...(current ?? {
                            id: crypto.randomUUID(),
                            title: input.name,
                            model: "Manual draft",
                            generatedAt: new Date().toISOString(),
                            language,
                            task,
                          }),
                          text,
                          evidence,
                        },
                        null,
                        2,
                      ),
                      "application/json",
                    )
                  }
                >
                  Backup
                </button>
              </div>
            </div>
            <textarea
              aria-label="Editable research report"
              dir="auto"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                textRef.current = e.target.value;
              }}
              placeholder="Your evidence-based draft will appear here. Connect a local model for AI writing, or build an exact statistical report without downloading a model."
            />
            <div className="report-editor-footer">
              <span>
                {text.length.toLocaleString()} characters · {evidence.length}{" "}
                evidence records
              </span>
              <span>
                AI drafts need review; corpus statistics remain computed by the
                analysis engine.
              </span>
            </div>
          </section>
          {text &&
            current &&
            !current.model.includes("Deterministic") &&
            !/\[[A-Z]\d+\]/.test(text) && (
              <div className="research-notice">
                This draft has no bracketed evidence citations. Check its claims
                against the records below before using it.
              </div>
            )}
          {unknown.length > 0 && (
            <div className="research-error" role="alert">
              Check unrecognized evidence references: {unknown.join(", ")}.
              These IDs do not exist in the supplied data.
            </div>
          )}
          <section className="research-card evidence-panel">
            <div className="research-card-heading">
              <BookOpen size={17} />
              <h2>Evidence behind the words</h2>
              <span>
                {(evidence.length ? evidence : previewEvidence).length} records
              </span>
            </div>
            <p className="research-muted">
              Drafts cite these IDs. Open a record to inspect the exact values
              supplied to the model.
            </p>
            <div className="evidence-list">
              {(evidence.length ? evidence : previewEvidence)
                .slice(evidencePage * 50, evidencePage * 50 + 50)
                .map((item) => (
                  <details key={item.id}>
                    <summary>
                      <code>{item.id}</code>
                      <span>{item.label}</span>
                      <ChevronDown size={13} />
                    </summary>
                    <pre dir="auto">
                      {typeof item.value === "string"
                        ? item.value
                        : JSON.stringify(item.value, null, 2)}
                    </pre>
                  </details>
                ))}
            </div>
            <div className="report-evidence-pages">
              <button
                disabled={!evidencePage}
                onClick={() => setEvidencePage(evidencePage - 1)}
              >
                Previous
              </button>
              <span>
                Page {evidencePage + 1} /{" "}
                {Math.max(
                  1,
                  Math.ceil(
                    (evidence.length ? evidence : previewEvidence).length / 50,
                  ),
                )}
              </span>
              <button
                disabled={
                  (evidencePage + 1) * 50 >=
                  (evidence.length ? evidence : previewEvidence).length
                }
                onClick={() => setEvidencePage(evidencePage + 1)}
              >
                Next
              </button>
            </div>
          </section>
          {drafts.length > 0 && (
            <section className="research-card report-history">
              <div className="research-card-heading">
                <h2>Saved drafts</h2>
                <span>{drafts.length}</span>
              </div>
              {drafts.map((draft) => (
                <button
                  key={draft.id}
                  onClick={() => {
                    setCurrent(draft);
                    setText(draft.text);
                    textRef.current = draft.text;
                    setEvidence(draft.evidence);
                  }}
                >
                  <div>
                    <strong>{draft.task}</strong>
                    <small>
                      {draft.title} ·{" "}
                      {new Date(draft.generatedAt).toLocaleString()}
                    </small>
                  </div>
                  <span>
                    {draft.model.includes("Deterministic")
                      ? "Computed"
                      : "Local AI"}
                  </span>
                </button>
              ))}
            </section>
          )}
        </div>
      </div>
    </section>
  );
}
