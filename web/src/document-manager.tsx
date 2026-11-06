import React, { useState } from "react";
import type { CorpusDocument } from "./engine";
import { locales } from "./samples";

export function DocumentManager({
  documents,
  onChange,
}: {
  documents: CorpusDocument[];
  onChange: (next: CorpusDocument[]) => void;
}) {
  const [index, setIndex] = useState(-1);
  const [draft, setDraft] = useState<CorpusDocument>({ name: "", text: "" });
  const [error, setError] = useState("");
  const edit = (i: number) => {
    setIndex(i);
    setDraft(i < 0 ? { name: "", text: "" } : { ...documents[i] });
    setError("");
  };
  return (
    <div className="document-manager">
      <h3>Manage documents</h3>
      <p className="fine">
        A document language overrides the workspace language. Automatic uses the
        browser’s ICU defaults; it does not detect a language. Assign languages
        separately for mixed collections.
      </p>
      <div className="action-row">
        <button className="button secondary small" onClick={() => edit(-1)}>
          New document
        </button>
        {documents.map((doc, i) => (
          <button
            className="button secondary small"
            key={i}
            onClick={() => edit(i)}
          >
            Edit {doc.name}
          </button>
        ))}
      </div>
      <label>
        Document name
        <input
          aria-label="Document name"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </label>
      <label>
        Document language
        <select
          value={draft.locale ?? "inherit"}
          onChange={(e) =>
            setDraft({
              ...draft,
              locale: e.target.value === "inherit" ? undefined : e.target.value,
            })
          }
        >
          <option value="inherit">Use workspace language</option>
          {locales.map(([tag, name]) => (
            <option key={tag} value={tag}>
              {name}
            </option>
          ))}
          {draft.locale && !locales.some(([tag]) => tag === draft.locale) && (
            <option value={draft.locale}>{draft.locale}</option>
          )}
        </select>
      </label>
      <label>
        Custom document language code
        <input
          placeholder="Optional BCP 47 code, e.g. sw"
          value={draft.locale ?? ""}
          onChange={(e) =>
            setDraft({ ...draft, locale: e.target.value || undefined })
          }
        />
      </label>
      <label>
        Document text
        <textarea
          dir="auto"
          aria-label="Document text"
          value={draft.text}
          onChange={(e) => setDraft({ ...draft, text: e.target.value })}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <div className="action-row">
        <button
          className="button primary small"
          onClick={() => {
            if (!draft.name.trim() || !draft.text.trim()) {
              setError("Enter a document name and readable text.");
              return;
            }
            try {
              if (draft.locale) Intl.getCanonicalLocales(draft.locale);
            } catch {
              setError("Enter a valid document language code.");
              return;
            }
            const next = [...documents];
            if (index < 0) next.push(draft);
            else next[index] = draft;
            onChange(next);
          }}
        >
          {" "}
          {index < 0 ? "Add document" : "Apply document changes"}
        </button>
        {index >= 0 && (
          <button
            className="button secondary small"
            onClick={() => onChange(documents.filter((_, i) => i !== index))}
          >
            Remove document
          </button>
        )}
      </div>
    </div>
  );
}
