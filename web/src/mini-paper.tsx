import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Download,
  FileText,
  Lock,
  Plus,
  Sparkles,
} from "lucide-react";
import {
  makePaperSnapshot,
  newPaper,
  paperTables,
  paperFigures,
  paperMethods,
  paperResults,
  paperLimitations,
  paperMessages,
  paperDraftIssues,
  paperHtml,
  paperCsvFiles,
  validatePaperBundle,
  paperSectionNames,
  formatPaperCell,
  type PaperProject,
  type PaperSnapshot,
  type PaperSection,
  type PaperDraft,
} from "./paper-model";
import { loadSession, saveSessions, listSessions } from "./library";
import { collectDraftNumbers, unmatchedDraftNumbers, type ReportInput } from "./report-model";
import type { CorpusDocument } from "./engine";
import { ModelConnection, useLocalWriter } from "./local-writer";
import "./mini-paper.css";
import { DraftNumberReview } from "./draft-number-review";
import { APP_VERSION } from "./version";
function download(
  name: string,
  data: Blob | string,
  type = "application/json",
) {
  const url = URL.createObjectURL(
    data instanceof Blob ? data : new Blob([data], { type }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export function MiniPaper(
  input: ReportInput & { reference?: CorpusDocument[] },
) {
  const { client, state: writer } = useLocalWriter();
  const [snapshot, setSnapshot] = useState<PaperSnapshot | null>(null),
    [project, setProject] = useState<PaperProject | null>(null),
    [papers, setPapers] = useState<PaperProject[]>([]),
    [tab, setTab] = useState<"edit" | "preview" | "data">("edit"),
    [busy, setBusy] = useState(false),
    [generating, setGenerating] = useState<PaperSection | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [ready, setReady] = useState(false),
    [maxTokens, setMaxTokens] = useState(256);
  const [includeReference, setIncludeReference] = useState(false),
    [includePairs, setIncludePairs] = useState(false);
  const numbers = useMemo(
    () => collectDraftNumbers(snapshot && {
      ...snapshot.analysis,
      documents: snapshot.source.documents.length,
      comparison: snapshot.comparison,
    }),
    [snapshot],
  );
  const fileInput = useRef<HTMLInputElement>(null),
    projectRef = useRef(project),
    generationRef = useRef<PaperSection | null>(null),
    active = useRef(true);
  projectRef.current = project;
  async function refresh() {
    setPapers(
      (await listSessions<PaperProject>("paper-project:"))
        .map((d) => d.value)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    );
  }
  useEffect(() => {
    active.current = true;
    void (async () => {
      try {
        await refresh();
        const current = await loadSession<string>("paper-current-v1");
        if (current) {
          const p = await loadSession<PaperProject>(`paper-project:${current}`);
          if (p) {
            const s = await loadSession<PaperSnapshot>(
              `paper-snapshot:${p.snapshotId}`,
            );
            if (s && active.current) {
              setProject(p);
              setSnapshot(s);
            }
          }
        }
      } catch (e) {
        if (active.current) setError((e as Error).message);
      } finally {
        if (active.current) setReady(true);
      }
    })();
    return () => {
      active.current = false;
      if (generationRef.current) client.cancel();
      const p = projectRef.current;
      if (p)
        void saveSessions({
          [`paper-project:${p.id}`]: p,
          "paper-current-v1": p.id,
        }).catch(() => {});
    };
  }, [client]);
  useEffect(() => {
    if (!ready || !project) return;
    const timer = setTimeout(() => {
      void saveSessions({
        [`paper-project:${project.id}`]: project,
        "paper-current-v1": project.id,
      })
        .then(() => {
          setNotice("Paper saved on this device.");
          return refresh();
        })
        .catch((e) => setError(e.message));
    }, 600);
    return () => clearTimeout(timer);
  }, [project, ready]);
  function update(patch: Partial<PaperProject>) {
    setProject((old) =>
      old ? { ...old, ...patch, updatedAt: new Date().toISOString() } : old,
    );
  }
  function updateDraft(key: PaperSection, draft: PaperDraft) {
    setProject((old) =>
      old
        ? {
            ...old,
            sections: { ...old.sections, [key]: draft },
            updatedAt: new Date().toISOString(),
          }
        : old,
    );
  }
  async function create() {
    setBusy(true);
    setError("");
    try {
      const s = await makePaperSnapshot(
        {
          name: input.name,
          documents: input.documents,
          options: input.options,
          pairs: includePairs ? (input.pairs ?? []) : [],
          reference: includeReference ? (input.reference ?? []) : [],
        },
        APP_VERSION,
        `${navigator.userAgent}; locale ${Intl.DateTimeFormat().resolvedOptions().locale}`,
        async (documents, options) =>
          await new Promise((resolve, reject) => {
            const worker = new Worker(
              new URL("./analysis.worker.ts", import.meta.url),
              { type: "module" },
            );
            worker.onmessage = ({ data }) => {
              worker.terminate();
              data.error ? reject(new Error(data.error)) : resolve(data.result);
            };
            worker.onerror = () => {
              worker.terminate();
              reject(new Error("The snapshot analysis worker stopped."));
            };
            worker.postMessage({
              id: 1,
              action: "analyze",
              documents,
              options,
            });
          }),
      );
      const p = newPaper(s);
      await saveSessions({
        [`paper-snapshot:${s.id}`]: s,
        [`paper-project:${p.id}`]: p,
        "paper-current-v1": p.id,
      });
      setSnapshot(s);
      setProject(p);
      setTab("edit");
      setNotice(
        "Frozen analysis created. Add your research question and source description.",
      );
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function open(id: string) {
    if (!id) return;
    setBusy(true);
    try {
      const p = await loadSession<PaperProject>(`paper-project:${id}`);
      if (!p) throw new Error("Paper not found.");
      const s = await loadSession<PaperSnapshot>(
        `paper-snapshot:${p.snapshotId}`,
      );
      if (!s)
        throw new Error(
          "Source snapshot not found. Restore the paper JSON backup.",
        );
      setProject(p);
      setSnapshot(s);
      await saveSessions({ "paper-current-v1": p.id });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function generate(key: PaperSection) {
    if (!snapshot || !project) return;
    if (!Number.isSafeInteger(maxTokens) || maxTokens < 1) {
      setError("Choose a positive output-token budget.");
      return;
    }
    setError("");
    const provenance = writer.connection ?? undefined;
    let partial = "";
    const draft: PaperDraft = {
      text: "",
      origin: "local-ai",
      reviewed: false,
      incomplete: true,
      connection: provenance,
      generatedAt: new Date().toISOString(),
      generatedLanguage: project.language,
    };
    generationRef.current = key;
    setGenerating(key);
    updateDraft(key, draft);
    try {
      const result = await client.generate(
        paperMessages(snapshot, project, key),
        maxTokens,
        (delta) => {
          partial += delta;
          updateDraft(key, { ...draft, text: partial });
        },
      );
      updateDraft(key, {
        ...draft,
        text: result.text,
        incomplete: result.incomplete,
        connection: result.connection,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      });
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      generationRef.current = null;
      if (active.current) setGenerating(null);
    }
  }
  async function exported(kind: "html" | "docx" | "json" | "zip" | "print") {
    if (!project || !snapshot) return;
    setBusy(true);
    setError("");
    try {
      const stem = "corpuscape-mini-paper";
      if (kind === "json")
        download(
          `${stem}.json`,
          JSON.stringify({ project, snapshot }, null, 2),
        );
      else if (kind === "html")
        download(
          `${stem}.html`,
          paperHtml(snapshot, project),
          "text/html;charset=utf-8",
        );
      else if (kind === "print") {
        const url = URL.createObjectURL(
          new Blob([paperHtml(snapshot, project)], {
            type: "text/html;charset=utf-8",
          }),
        );
        const win = window.open(url, "_blank");
        if (!win)
          throw new Error(
            "Allow this site to open the print preview, or download HTML and use its Print / save PDF button.",
          );
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        setNotice(
          "Print preview opened. Choose Print / save PDF in the manuscript.",
        );
      } else if (kind === "docx")
        download(
          `${stem}.docx`,
          await (await import("./paper-export")).paperDocx(snapshot, project),
        );
      else {
        const { zipSync, strToU8 } = await import("fflate"),
          { svgToPng, paperDocx } = await import("./paper-export");
        const files: Record<string, Uint8Array> = {
          "manuscript.html": strToU8(paperHtml(snapshot, project)),
          "paper-project.json": strToU8(
            JSON.stringify({ snapshot, project }, null, 2),
          ),
          "README.txt": strToU8(
            "Open manuscript.html for a self-contained manuscript and Print / save PDF. Word tables and prose are editable. CSV files contain ALL result rows, independently of selected manuscript rows. Figures include vector SVG and 2× PNG. Source texts and settings are included in paper-project.json. AI prose needs researcher review. Do not share private source texts without permission.",
          ),
        };
        for (const [name, text] of Object.entries(
          paperCsvFiles(snapshot, project),
        ))
          files[`data/${name}`] = strToU8(text);
        for (const f of paperFigures(snapshot, project.top)) {
          files[`figures/${f.id}.svg`] = strToU8(f.svg);
          files[`figures/${f.id}.png`] = await svgToPng(f.svg);
        }
        files["manuscript.docx"] = new Uint8Array(
          await (await paperDocx(snapshot, project)).arrayBuffer(),
        );
        download(`${stem}.zip`, new Blob([zipSync(files)]));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const tables = useMemo(
    () => (snapshot && project ? paperTables(snapshot, project.top) : []),
    [snapshot, project?.top],
  );
  const figures = useMemo(
    () => (snapshot && project ? paperFigures(snapshot, project.top) : []),
    [snapshot, project?.top],
  );
  return (
    <section className="research-page paper-page">
      <header className="research-heading">
        <div>
          <h1>Mini paper</h1>
          <p>
            Turn a frozen analysis into a manuscript with editable writing,
            computed tables and publication figures.
          </p>
        </div>
        <button
          className="research-button primary"
          disabled={busy || !!generating || !input.documents.length}
          onClick={create}
        >
          <Plus size={16} />
          {busy ? "Working…" : "New from current corpus"}
        </button>
      </header>
      <div className="paper-toolbar">
        <label>
          Saved paper
          <select
            value={project?.id ?? ""}
            disabled={busy || !!generating}
            onChange={(e) => void open(e.target.value)}
          >
            <option value="">Choose a saved paper</option>
            {papers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <button
          className="research-button"
          disabled={busy || !!generating}
          onClick={() => fileInput.current?.click()}
        >
          Restore paper JSON
        </button>
        {((input.reference?.length ?? 0) > 0 ||
          (input.pairs?.length ?? 0) > 0) && (
          <fieldset className="paper-includes">
            <legend>Optional evidence for a new paper</legend>
            {!!input.reference?.length && (
              <label className="research-check">
                <input
                  type="checkbox"
                  checked={includeReference}
                  disabled={busy || !!generating}
                  onChange={(e) => setIncludeReference(e.target.checked)}
                />
                Include reference comparison ({input.reference.length}{" "}
                documents)
              </label>
            )}
            {!!input.pairs?.length && (
              <label className="research-check">
                <input
                  type="checkbox"
                  checked={includePairs}
                  disabled={busy || !!generating}
                  onChange={(e) => setIncludePairs(e.target.checked)}
                />
                Include parallel units ({input.pairs.length} pairs)
              </label>
            )}
            <small>
              Choose before creating a new frozen analysis. Existing papers keep
              their original evidence.
            </small>
          </fieldset>
        )}
        <input
          hidden
          ref={fileInput}
          type="file"
          accept=".json"
          onChange={async (e) => {
            const file = e.currentTarget.files?.[0];
            e.currentTarget.value = "";
            if (!file) return;
            setBusy(true);
            try {
              const b = await validatePaperBundle(
                JSON.parse(await file.text()),
              );
              const s = { ...b.snapshot, id: crypto.randomUUID() },
                p = { ...b.project, id: crypto.randomUUID(), snapshotId: s.id };
              await saveSessions({
                [`paper-snapshot:${s.id}`]: s,
                [`paper-project:${p.id}`]: p,
                "paper-current-v1": p.id,
              });
              setSnapshot(s);
              setProject(p);
              await refresh();
              setNotice(
                "Paper restored as a new copy. All computed results were recalculated.",
              );
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
      </div>
      {error && (
        <p role="alert" className="research-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="research-notice">
          {notice}
        </p>
      )}
      {!project || !snapshot ? (
        <div className="paper-empty research-card">
          <BookOpen size={40} />
          <h2>Your analysis, ready for a paper</h2>
          <p>
            Load a corpus, then create a frozen analysis. Add your question and
            source details; draft an abstract, introduction and discussion with
            local AI or write them yourself.
          </p>
          <p>
            Tables, numerical results and methods come from the measured data.
            Export Word, a printable manuscript, and a complete data package.
          </p>
        </div>
      ) : (
        <>
          <div className="paper-snapshot">
            <Lock size={16} />
            <div>
              <strong>{snapshot.source.name}</strong>
              <span>
                {snapshot.source.documents.length} documents ·{" "}
                {snapshot.analysis.words.toLocaleString()} tokens · frozen{" "}
                {new Date(snapshot.createdAt).toLocaleString()}
              </span>
            </div>
            <details>
              <summary>Source fingerprint</summary>
              <code>{snapshot.fingerprint}</code>
              <p>
                New workspace edits do not change this paper. Create a new
                snapshot to use updated data.
              </p>
            </details>
          </div>
          <div
            className="paper-tabs"
            role="tablist"
            aria-label="Paper views"
            onKeyDown={(e) => {
              const keys = ["edit", "preview", "data"] as const;
              const index = keys.indexOf(tab);
              const next =
                e.key === "ArrowRight"
                  ? (index + 1) % 3
                  : e.key === "ArrowLeft"
                    ? (index + 2) % 3
                    : e.key === "Home"
                      ? 0
                      : e.key === "End"
                        ? 2
                        : -1;
              if (next < 0) return;
              e.preventDefault();
              setTab(keys[next]);
              e.currentTarget
                .querySelectorAll<HTMLButtonElement>("button")
                [next]?.focus();
            }}
          >
            {(["edit", "preview", "data"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                id={`paper-tab-${t}`}
                tabIndex={tab === t ? 0 : -1}
                aria-controls={`paper-panel-${t}`}
                aria-selected={tab === t}
                onClick={() => setTab(t)}
              >
                {t === "edit"
                  ? "Write & review"
                  : t === "preview"
                    ? "Manuscript preview"
                    : "Tables & figures"}
              </button>
            ))}
          </div>
          <div
            role="tabpanel"
            id={`paper-panel-${tab}`}
            aria-labelledby={`paper-tab-${tab}`}
          >
            {tab === "edit" ? (
              <div className="paper-layout">
                <aside className="research-card paper-settings">
                  <h2>Paper details</h2>
                  <label>
                    Paper title
                    <input
                      value={project.title}
                      disabled={!!generating}
                      onChange={(e) => update({ title: e.target.value })}
                    />
                  </label>
                  <label>
                    Author / affiliation
                    <input
                      value={project.author}
                      onChange={(e) => update({ author: e.target.value })}
                    />
                  </label>
                  <label>
                    Research question
                    <textarea
                      rows={3}
                      value={project.question}
                      disabled={!!generating}
                      onChange={(e) => update({ question: e.target.value })}
                    />
                  </label>
                  <label>
                    Focus word / phrase (optional)
                    <input
                      value={project.focusTerm ?? ""}
                      disabled={!!generating}
                      placeholder="Include real concordance examples in AI evidence"
                      onChange={(e) => update({ focusTerm: e.target.value })}
                    />
                  </label>
                  <label>
                    Sources & preparation
                    <textarea
                      rows={5}
                      value={project.sourceNote}
                      disabled={!!generating}
                      placeholder="Describe sources, permissions, sampling and text preparation."
                      onChange={(e) => update({ sourceNote: e.target.value })}
                    />
                  </label>
                  <label>
                    AI narrative language
                    <input
                      value={project.language}
                      disabled={!!generating}
                      placeholder="en, es, fr, ru, zh, ja, ar…"
                      onChange={(e) => update({ language: e.target.value })}
                    />
                  </label>
                  <label>
                    Manuscript rows per term table · 0 = all
                    <input
                      type="number"
                      min="0"
                      value={project.top}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (Number.isSafeInteger(n) && n >= 0)
                          update({ top: n });
                      }}
                    />
                  </label>
                  <label>
                    AI output tokens per section
                    <input
                      type="number"
                      min="1"
                      value={maxTokens}
                      disabled={!!generating}
                      onChange={(e) => setMaxTokens(Number(e.target.value))}
                    />
                  </label>
                  <hr />
                  <ModelConnection />
                </aside>
                <div className="paper-editor">
                  {(Object.keys(paperSectionNames) as PaperSection[]).map(
                    (key) => {
                      const d = project.sections[key],
                        issues = paperDraftIssues(d);
                      return (
                        <article className="research-card" key={key}>
                          <div className="paper-section-heading">
                            <h2>{paperSectionNames[key]}</h2>
                            <button
                              className="research-button"
                              disabled={
                                writer.phase !== "ready" || !!generating
                              }
                              onClick={() => void generate(key)}
                            >
                              <Sparkles size={14} />
                              Draft with AI
                            </button>
                          </div>
                          {d.origin === "local-ai" && (
                            <DraftNumberReview text={d.text} findings={unmatchedDraftNumbers(d.text, numbers)} />
                          )}
                          <textarea
                            aria-label={`${paperSectionNames[key]} text`}
                            rows={key === "discussion" ? 10 : 7}
                            dir="auto"
                            value={d.text}
                            disabled={!!generating}
                            onChange={(e) =>
                              updateDraft(key, {
                                ...d,
                                text: e.target.value,
                                reviewed: false,
                              })
                            }
                            placeholder={`Write the ${key}, or connect a model to draft it.`}
                          />
                          {generating === key && (
                            <p role="status">
                              Writing locally…{" "}
                              <button
                                className="research-text-button"
                                onClick={() => client.cancel()}
                              >
                                Stop generation
                              </button>
                            </p>
                          )}
                          <label className="research-check">
                            <input
                              type="checkbox"
                              checked={d.reviewed}
                              disabled={!!generating}
                              onChange={(e) =>
                                updateDraft(key, {
                                  ...d,
                                  reviewed: e.target.checked,
                                })
                              }
                            />
                            I reviewed this section against the evidence
                          </label>
                          {d.origin === "local-ai" && !generating && (
                            <DraftLanguageNotice
                              text={d.text}
                              language={project.language}
                            />
                          )}{" "}
                          {d.connection && (
                            <small>
                              {d.connection.repo} · {d.connection.runtime} ·{" "}
                              {d.incomplete ? "Incomplete" : "Generated"} ·{" "}
                              {d.outputTokens ?? "?"} output tokens
                            </small>
                          )}
                          {issues.length > 0 && (
                            <ul className="paper-review-notices">
                              {issues.map((i) => (
                                <li key={i}>{i}</li>
                              ))}
                            </ul>
                          )}
                        </article>
                      );
                    },
                  )}
                  <article className="research-card paper-locked">
                    <h2>
                      <Lock size={16} />
                      Computed methods and results
                    </h2>
                    <p>{paperMethods(snapshot)}</p>
                    <p>{paperResults(snapshot)}</p>
                    <p className="research-muted">{paperLimitations}</p>
                  </article>
                </div>
              </div>
            ) : tab === "preview" ? (
              <iframe
                className="paper-preview"
                title="Mini paper manuscript preview"
                sandbox=""
                srcDoc={paperHtml(snapshot, project, false)}
              />
            ) : (
              <div className="paper-data">
                {tables.map((t) => (
                  <article className="research-card" key={t.id}>
                    <h2>
                      {t.id}. {t.title}
                    </h2>
                    <div className="paper-table-scroll">
                      <table>
                        <thead>
                          <tr>
                            {t.headers.map((h) => (
                              <th key={h}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {t.rows.map((row, i) => (
                            <tr key={i}>
                              {row.map((c, j) => (
                                <td dir="auto" key={j}>
                                  {formatPaperCell(t, c, j)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="research-muted">{t.note}</p>
                  </article>
                ))}
                {figures.map((f) => (
                  <figure className="research-card" key={f.id}>
                    <div dangerouslySetInnerHTML={{ __html: f.svg }} />
                    <figcaption>
                      {f.id}. {f.caption}
                    </figcaption>
                    <button
                      className="research-button"
                      onClick={() =>
                        download(`${f.id}.svg`, f.svg, "image/svg+xml")
                      }
                    >
                      Download SVG
                    </button>
                  </figure>
                ))}
              </div>
            )}
          </div>
          <footer className="paper-export-bar">
            <div>
              <strong>Export your manuscript</strong>
              <small>
                Word · self-contained HTML / print PDF · full data and editable
                project
              </small>
            </div>
            <div>
              {(["docx", "html", "print", "json", "zip"] as const).map((k) => (
                <button
                  className={`research-button ${k === "zip" ? "primary" : ""}`}
                  disabled={busy || !!generating}
                  key={k}
                  onClick={() => void exported(k)}
                >
                  <Download size={14} />
                  {k === "docx"
                    ? "Word"
                    : k === "html"
                      ? "HTML"
                      : k === "print"
                        ? "Print / PDF"
                        : k === "json"
                          ? "Project JSON"
                          : "Complete ZIP"}
                </button>
              ))}
            </div>
          </footer>
        </>
      )}
    </section>
  );
}

function DraftLanguageNotice({
  text,
  language,
}: {
  text: string;
  language: string;
}) {
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    setNotice("");
    if (text.length < 100) return;
    const timer = setTimeout(() => {
      void import("./language-detection")
        .then(({ draftLanguageNotice }) => {
          if (active) setNotice(draftLanguageNotice(text, language));
        })
        .catch(() => {});
    }, 500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [text, language]);
  return notice ? <p className="research-notice">{notice}</p> : null;
}
