import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Search, X } from "lucide-react";
import type { Page } from "./landing";

const destinations: { id: Page; title: string; detail: string }[] = [
  {
    id: "workspace",
    title: "Workspace",
    detail: "Import documents or paste a text",
  },
  {
    id: "analysis",
    title: "Corpus explorer",
    detail: "Word frequencies, concordance, n-grams, collocations",
  },
  {
    id: "bilingual",
    title: "Parallel workspace",
    detail: "Review bilingual texts and TMX",
  },
  {
    id: "compare",
    title: "Compare corpora",
    detail: "Distinctive words and normalized frequencies",
  },
  {
    id: "figures",
    title: "Figure studio",
    detail: "Charts, SVG exports and custom data",
  },
  {
    id: "reports", title: "Research reports", detail: "Local Qwen AI writing, evidence and statistical reports",
  },
  {
    id: "ocr", title: "Text extraction", detail: "Scanned PDF and image OCR in multiple languages",
  },
  {
    id: "library",
    title: "Corpus library",
    detail: "Locally saved corpora and JSON backups",
  },
  {
    id: "methods",
    title: "Methods & privacy",
    detail: "Segmentation, statistics and local data",
  },
  {
    id: "overview",
    title: "Corpuscape home",
    detail: "The tools and the languages",
  },
];
export function WorkspaceSearch({
  onNavigate,
}: {
  onNavigate: (page: Page) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const results = destinations.filter((x) =>
    `${x.title} ${x.detail}`
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase()),
  );
  const open = () => {
    setQuery("");
    dialog.current?.showModal();
    input.current?.focus();
  };
  const go = (page: Page) => {
    dialog.current?.close();
    onNavigate(page);
  };
  useEffect(() => {
    const keyboard = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (dialog.current?.open) dialog.current.close();
        else open();
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, []);
  return (
    <>
      <button
        className="command-trigger"
        onClick={open}
        aria-label="Search tools"
      >
        <Search size={15} />
        <span>Search tools…</span>
        <kbd>Ctrl K</kbd>
      </button>
      <dialog
        ref={dialog}
        className="command-dialog"
        aria-label="Find a Corpuscape tool"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <div className="command-field">
          <Search size={19} />
          <input
            ref={input}
            aria-label="Search tools"
            placeholder="Where would you like to go?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) go(results[0].id);
            }}
          />
          <button
            aria-label="Close tool search"
            onClick={() => dialog.current?.close()}
          >
            <X size={18} />
          </button>
        </div>
        <div className="command-results">
          {results.map((x) => (
            <button key={x.id} onClick={() => go(x.id)}>
              <span>
                <strong>{x.title}</strong>
                <small>{x.detail}</small>
              </span>
              <ArrowUpRight size={16} />
            </button>
          ))}
          {!results.length && <p>No tools match “{query}”.</p>}
        </div>
        <div className="command-hint">
          Search tools by name or research task <kbd>ESC</kbd>
        </div>
      </dialog>
    </>
  );
}
