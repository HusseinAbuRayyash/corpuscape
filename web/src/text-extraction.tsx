import React, { useEffect, useRef, useState } from "react";
import {
  ScanText,
  Upload,
  Loader2,
  Square,
  ArrowRight,
  Download,
  FileText,
  Check,
} from "lucide-react";
import {
  extractWithOcr,
  ocrDocuments,
  ocrLanguages,
  type OcrPage,
  type OcrProgress,
} from "./ocr-engine";
import type { CorpusDocument } from "./engine";
import { joinCjkLineWraps } from "./text-cleanup";
import "./research-tools.css";
export function TextExtraction({
  initialFile,
  onUse,
}: {
  initialFile?: File | null;
  onUse: (documents: CorpusDocument[]) => void;
}) {
  const [files, setFiles] = useState<File[]>(initialFile ? [initialFile] : []),
    [languages, setLanguages] = useState<string[]>(["eng"]),
    [custom, setCustom] = useState(""),
    [mode, setMode] = useState<"auto" | "ocr">("auto"),
    [pages, setPages] = useState<OcrPage[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [progress, setProgress] = useState<OcrProgress>({
      stage: "Ready",
      page: 0,
      pages: 0,
      progress: 0,
    });
  const input = useRef<HTMLInputElement>(null),
    abort = useRef<AbortController | null>(null);
  const [cleanupUndo, setCleanupUndo] = useState<Record<number, string>>({});
  useEffect(() => {
    if (initialFile) setFiles([initialFile]);
  }, [initialFile]);
  useEffect(() => () => abort.current?.abort(), []);
  const selected = [
    ...new Set([...languages, ...custom.split(/[+\s,]+/).filter(Boolean)]),
  ];
  async function run() {
    if (!files.length) return;
    setBusy(true);
    setError("");
    setPages([]);
    setCleanupUndo({});
    const controller = new AbortController();
    abort.current = controller;
    try {
      const result: OcrPage[] = [];
      for (const file of files) {
        const extracted = await extractWithOcr(
          file,
          selected,
          mode,
          (progress) =>
            setProgress({
              ...progress,
              stage: file.name + " · " + progress.stage,
            }),
          controller.signal,
        );
        result.push(...extracted);
        setPages([...result]);
      }
      if (!result.some((page) => page.text.trim()))
        throw new Error(
          "No readable text was recognized. Try the correct language, a sharper image, or a different scan.",
        );
      setPages(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }
  function exportText() {
    const url = URL.createObjectURL(
      new Blob([pages.map((page) => page.text).join("\n\n")], {
        type: "text/plain;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download =
      (files.length === 1 ? files[0].name : "extracted-corpus") + ".txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  return (
    <section className="research-page">
      <header className="research-heading">
        <div>
          <span className="research-kicker">
            CORPUSCAPE / DOCUMENT PREPARATION
          </span>
          <h1>
            Text extraction
            <span>
              <ScanText size={14} />
              Local OCR
            </span>
          </h1>
          <p>Bring scanned pages and images into your research corpus.</p>
        </div>
        <span className="research-local-badge">
          <span />
          No account · no API key
        </span>
      </header>
      <div className="ocr-layout">
        <aside className="research-card ocr-settings">
          <div className="research-card-heading">
            <ScanText size={17} />
            <h2>Extraction settings</h2>
          </div>
          <input
            ref={input}
            hidden
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp"
            onChange={(e) => {
              setFiles(Array.from(e.target.files ?? []));
              setPages([]);
              setError("");
            }}
          />
          <button
            className="ocr-upload"
            disabled={busy}
            onClick={() => input.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (!busy) {
                setFiles(Array.from(e.dataTransfer.files));
                setPages([]);
              }
            }}
          >
            <Upload size={27} />
            <strong>
              {files.length === 1
                ? files[0].name
                : files.length
                  ? files.length + " documents"
                  : "Choose PDFs or images"}
            </strong>
            <span>
              {files.length
                ? `${(files.reduce((sum, file) => sum + file.size, 0) / 1e6).toFixed(2)} MB`
                : "PDF · PNG · JPEG · WebP · BMP"}
            </span>
          </button>
          <label>
            PDF extraction mode
            <select
              disabled={busy}
              value={mode}
              onChange={(e) => setMode(e.target.value as "auto" | "ocr")}
            >
              <option value="auto">
                Use selectable text; OCR scanned pages
              </option>
              <option value="ocr">OCR every page</option>
            </select>
          </label>
          <h3>Languages on the page</h3>
          <p className="research-muted">
            Choose the languages actually present. Their OCR data downloads on
            first use and is cached by the browser.
          </p>
          <div className="ocr-languages">
            {ocrLanguages.map(([id, name]) => (
              <label key={id} className="research-check">
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={languages.includes(id)}
                  onChange={(e) =>
                    setLanguages((old) =>
                      e.target.checked
                        ? [...old, id]
                        : old.filter((value) => value !== id),
                    )
                  }
                />
                {name}
              </label>
            ))}
          </div>
          <label>
            Additional Tesseract language codes
            <input
              disabled={busy}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="e.g. ind+pol+ell"
            />
          </label>
          <p className="research-muted">
            No fixed page or file quota. Processing uses this device’s memory.
            OCR quality depends on the scan; review the extracted text before
            analysis.
          </p>
          {busy ? (
            <button
              className="research-button full"
              onClick={() => abort.current?.abort()}
            >
              <Square size={14} />
              Cancel extraction
            </button>
          ) : (
            <button
              className="research-button primary full"
              disabled={!files.length || !selected.length}
              onClick={() => void run()}
            >
              <ScanText size={16} />
              Extract text locally
            </button>
          )}
        </aside>
        <div className="ocr-main">
          {error && (
            <div className="research-error" role="alert">
              {error}
            </div>
          )}
          {busy && (
            <div className="research-card ocr-progress" role="status">
              <Loader2 size={23} className="spin" />
              <h2>{progress.stage}</h2>
              <p>
                Page {progress.page} / {progress.pages}
              </p>
              <progress value={progress.progress} max={1} />
              <small>
                {Math.round(progress.progress * 100)}% of current stage
              </small>
            </div>
          )}
          {!busy && !pages.length && (
            <div className="research-card ocr-empty">
              <FileText size={48} />
              <h2>A scan is a starting point.</h2>
              <p>
                Extract selectable text or recognize scanned pages. Review and
                correct the result here, then send it directly to the Corpus
                Explorer.
              </p>
              <div>
                <span>
                  <Check size={13} />
                  Multiple languages
                </span>
                <span>
                  <Check size={13} />
                  Editable output
                </span>
                <span>
                  <Check size={13} />
                  Text stays on your device
                </span>
              </div>
            </div>
          )}
          {pages.length > 0 && (
            <>
              <div className="ocr-result-actions">
                <div>
                  <strong>{pages.length} pages processed</strong>
                  <span>
                    {pages
                      .reduce((sum, page) => sum + page.text.length, 0)
                      .toLocaleString()}{" "}
                    characters
                  </span>
                </div>
                <button
                  className="research-button"
                  disabled={busy}
                  onClick={exportText}
                >
                  <Download size={14} />
                  Download TXT
                </button>
                <button
                  className="research-button primary"
                  disabled={busy}
                  onClick={() => onUse(ocrDocuments(pages, selected))}
                >
                  Use as corpus
                  <ArrowRight size={15} />
                </button>
              </div>
              {pages.map((page, index) => (
                <section key={index} className="research-card ocr-page">
                  <div>
                    <h2>{page.name}</h2>
                    <span>
                      {page.source === "text"
                        ? "Selectable text"
                        : `OCR · engine confidence ${page.confidence?.toFixed(1)}%`}
                    </span>
                  </div>
                  <div className="action-row">
                    <button
                      className="research-text-button"
                      disabled={
                        busy || joinCjkLineWraps(page.text) === page.text
                      }
                      onClick={() => {
                        setCleanupUndo((old) => ({
                          ...old,
                          [index]: page.text,
                        }));
                        setPages((old) =>
                          old.map((p, i) =>
                            i === index
                              ? { ...p, text: joinCjkLineWraps(p.text) }
                              : p,
                          ),
                        );
                      }}
                    >
                      Join CJK line wraps
                    </button>
                    {cleanupUndo[index] !== undefined && (
                      <button
                        className="research-text-button"
                        disabled={busy}
                        onClick={() => {
                          setPages((old) =>
                            old.map((p, i) =>
                              i === index
                                ? { ...p, text: cleanupUndo[index] }
                                : p,
                            ),
                          );
                          setCleanupUndo((old) => {
                            const next = { ...old };
                            delete next[index];
                            return next;
                          });
                        }}
                      >
                        Undo line-wrap cleanup
                      </button>
                    )}
                  </div>
                  <textarea
                    disabled={busy}
                    aria-label={`Extracted text page ${index + 1}`}
                    dir="auto"
                    value={page.text}
                    onChange={(e) => {
                      setCleanupUndo((old) => {
                        const next = { ...old };
                        delete next[index];
                        return next;
                      });
                      setPages((old) =>
                        old.map((item, i) =>
                          i === index
                            ? { ...item, text: e.target.value }
                            : item,
                        ),
                      );
                    }}
                  />
                </section>
              ))}
              <p className="research-muted">
                Engine confidence is a model signal, not verified accuracy.
                Edits are applied when you use or download the extracted corpus.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
