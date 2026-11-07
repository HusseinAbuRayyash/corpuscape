// Homepage structure and motion adapted from Velora UI's free SaaS template.
// The research workspace follows Shadcn Admin's navigation and data layout.
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  Columns2,
  FileText,
  Github,
  Globe2,
  Languages,
  LockKeyhole,
  Menu,
  Pause,
  Play,
  Search,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { Aurora, OrbitingWords, Reveal } from "./motion-primitives";
import { analyze, compare, defaultOptions } from "./engine";
import { BrandMark } from "./product-components";
import { multilingualSampleDocuments, samples } from "./samples";
import { previewStopWords, translationPreview } from "./landing-sample";
import { author, citation } from "./about";
import { APP_VERSION } from "./version";

export type Page =
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
const source = "https://github.com/HusseinAbuRayyash/corpuscape";
function savedMotionChoice() {
  try {
    return sessionStorage.getItem("corpuscape-motion");
  } catch {
    return null;
  }
}
const previewDocuments = multilingualSampleDocuments.map((d, i) => ({
  ...d,
  id: `preview-${i}`,
}));
const previewOptions = { ...defaultOptions, stopWords: previewStopWords };
const preview = analyze(translationPreview, previewOptions);
const terms = preview.frequencies.slice(0, 6);
const keyness = compare(
  analyze(samples[0].documents, previewOptions),
  analyze(translationPreview.slice(0, 1), previewOptions),
).slice(0, 5);
const keynessScale = Math.max(...keyness.map((row) => Math.abs(row.logRatio)));
const screenshots = [
  { file: "frequencies", title: "Word frequencies", alt: "Live Corpus Explorer showing multilingual sample totals and ranked frequencies" },
  { file: "concordance", title: "Concordance", alt: "Live concordance table showing the Arabic word for translation in context" },
  { file: "parallel", title: "Parallel workspace", alt: "Live parallel workspace pairing three English sentences with Arabic translations" },
];
const tools = [
  {
    id: "analysis",
    icon: Search,
    title: "Read between the words.",
    label: "Corpus explorer",
    body: "Move from word frequencies to concordance, recurring phrases and the company words keep.",
    number: "01",
  },
  {
    id: "bilingual",
    icon: Languages,
    title: "Two texts. One perspective.",
    label: "Parallel workspace",
    body: "Review source and translation side by side. Edit aligned segments and work with TMX.",
    number: "02",
  },
  {
    id: "compare",
    icon: Columns2,
    title: "See what makes a corpus different.",
    label: "Corpus comparison",
    body: "Compare vocabulary and normalized frequencies across two collections.",
    number: "03",
  },
  {
    id: "figures",
    icon: BarChart3,
    title: "Give your findings a form.",
    label: "Figure studio",
    body: "Build and customize charts, then export your tables, figures and research reports.",
    number: "04",
  },
] as const;

function RotatingWord({
  paused,
  forceMotion,
}: {
  paused: boolean;
  forceMotion: boolean;
}) {
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();
  const words = ["patterns.", "connections.", "possibilities."];
  useEffect(() => {
    if (paused || (reduced && !forceMotion)) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % words.length),
      3600,
    );
    return () => clearInterval(timer);
  }, [paused, reduced, forceMotion]);
  return (
    <span
      className="lp-rotate"
    >
      <span aria-hidden="true">
        <AnimatePresence mode="wait">
          <motion.span
            key={index}
            initial={
              reduced ? false : { y: 30, opacity: 0, filter: "blur(8px)" }
            }
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ y: -25, opacity: 0, filter: "blur(8px)" }}
            transition={{ duration: 0.4 }}
          >
            {words[index]}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}

export function LanguageOrbit({ paused }: { paused: boolean }) {
  return (
    <div
      className={`language-orbit ${paused ? "motion-paused" : ""}`}
      role="img"
      aria-label="Words in English, Spanish, French, Russian, Arabic, Chinese and Japanese orbit a search symbol"
    >
      <div className="orbit-ambient" />
      <div className="orbit-system" aria-hidden="true">
        <OrbitingWords radius={190} duration={90}>
          <span lang="en">meaning</span>
          <span lang="zh">语言</span>
          <span lang="es">palabras</span>
          <span lang="ru">язык</span>
        </OrbitingWords>
        <OrbitingWords radius={120} duration={65} reverse>
          <span lang="ja">言葉</span>
          <span lang="ar" dir="rtl">
            معنى
          </span>
          <span lang="fr">langue</span>
        </OrbitingWords>
        <div className="orbit-core">
          <Search strokeWidth={1.6} />
          <span className="orbit-core-pulse" />
        </div>
      </div>
      <span className="orbit-caption top">WORDS BECOME DISCOVERIES</span>
      <span className="orbit-caption bottom">
        MANY LANGUAGES. ONE WORKSPACE.
      </span>
    </div>
  );
}

export function Landing({
  onNavigate,
  onSample,
}: {
  onNavigate: (page: Page) => void;
  onSample: (index: number) => void;
}) {
  const [paused, setPaused] = useState(() => savedMotionChoice() === "off");
  const [forceMotion, setForceMotion] = useState(
    () => savedMotionChoice() === "on",
  );
  const [menu, setMenu] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const prefersReduced = useReducedMotion();
  const reduced = prefersReduced && !forceMotion;
  const effectivePaused = paused || !!reduced;
  const [language, setLanguage] = useState("es");
  const snippet =
    previewDocuments.find((d) => d.locale === language) ?? previewDocuments[0];
  const go = (page: Page) => {
    setMenu(false);
    onNavigate(page);
  };
  const toggleMotion = () => {
    if (effectivePaused) {
      setForceMotion(true);
      setPaused(false);
    } else setPaused(true);
    try {
      sessionStorage.setItem(
        "corpuscape-motion",
        effectivePaused ? "on" : "off",
      );
    } catch {
      /* The motion control still works when storage is unavailable. */
    }
  };
  return (
    <div
      className={`landing ${forceMotion ? "motion-enabled" : ""} ${effectivePaused ? "motion-paused" : ""}`}
    >
      <header className="lp-header">
        <a className="lp-brand" href="#overview" aria-label="Corpuscape home">
          <BrandMark className="lp-mark" />
          corpuscape<span className="lp-brand-dot">.</span>
        </a>
        <nav
          className={menu ? "lp-nav is-open" : "lp-nav"}
          aria-label="Website navigation"
        >
          <a
            href="#tools"
            onClick={(e) => {
              e.preventDefault();
              setMenu(false);
              document.getElementById("tools")?.scrollIntoView({
                behavior: paused || reduced ? "instant" : "smooth",
              });
            }}
          >
            The tools
          </a>
          <a
            href="#languages"
            onClick={(e) => {
              e.preventDefault();
              setMenu(false);
              document.getElementById("languages")?.scrollIntoView({
                behavior: paused || reduced ? "instant" : "smooth",
              });
            }}
          >
            The languages
          </a>
          <button onClick={() => go("methods")}>Our approach</button>
          <a
            href={source}
            target="_blank"
            rel="noreferrer"
            className="lp-github"
            aria-label="Corpuscape source on GitHub"
          >
            <Github size={19} />
          </a>
          <button
            className="lp-motion-header"
            title={effectivePaused ? "Enable motion" : "Pause motion"}
            onClick={toggleMotion}
            aria-pressed={!effectivePaused}
          >
            {effectivePaused ? <Play size={15} /> : <Pause size={15} />}
            <span>{effectivePaused ? "Enable motion" : "Pause motion"}</span>
          </button>
        </nav>
        <button
          className="lp-button lp-button-small"
          onClick={() => go("workspace")}
        >
          Open workspace <ArrowUpRight size={15} />
        </button>
        <button
          className="lp-menu"
          aria-label={
            menu ? "Close website navigation" : "Open website navigation"
          }
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>
      </header>

      <section className="lp-hero">
        <Aurora />
        <div className="lp-grid" aria-hidden="true" />
        <div className="lp-container lp-hero-content">
          <Reveal>
            <div className="lp-pill">
              <span className="lp-live-dot" /> Free tools. Every language. Your
              device.
            </div>
          </Reveal>
          <h1>
            <span className="sr-only">Explore language. Discover patterns.</span>
            <span aria-hidden="true">
            Explore language.{" "}
            <br />
            Discover{" "}
            <RotatingWord paused={effectivePaused} forceMotion={forceMotion} />
            </span>
          </h1>
          <p className="lp-lead">
            A little closer to the words.{" "}
            <br className="lp-mobile-break" />
            A whole new view of the text.{" "}
            <br />
            Your open workspace for multilingual corpus research.
          </p>
          <Reveal delay={0.15}>
            <div className="lp-actions">
              <button
                className="lp-button lp-shimmer"
                onClick={() => go("workspace")}
              >
                Start exploring <ArrowRight size={18} />
              </button>
              <button
                className="lp-button lp-button-ghost"
                onClick={() => onSample(1)}
              >
                Try a multilingual sample <Globe2 size={18} />
              </button>
            </div>
            <div className="lp-facts">
              {["No account", "No API keys", "Texts stay on your device"].map(
                (t) => (
                  <span key={t}>
                    <Check size={14} />
                    {t}
                  </span>
                ),
              )}
            </div>
          </Reveal>
          <Reveal delay={0.25} className="lp-product-reveal">
            <div className="lp-product-window">
              <div className="lp-window-bar">
                <div className="lp-window-dots">
                  <i />
                  <i />
                  <i />
                </div>
                <span>corpuscape / a window into language</span>
                <span className="lp-window-live">
                  <i /> Interactive preview
                </span>
              </div>
              <div className="lp-product-grid">
                <div className="lp-preview-analysis">
                  <div className="lp-preview-label">
                    <FileText size={16} /> ENGLISH–ARABIC PARALLEL SAMPLE
                  </div>
                  <h2>
                    Small texts.{" "}
                    <br />
                    Shared discoveries.
                  </h2>
                  <div className="lp-preview-metrics">
                    <span>
                      <strong>{preview.words}</strong>word tokens
                    </span>
                    <span>
                      <strong>{preview.types}</strong>unique types
                    </span>
                    <span>
                      <strong>{translationPreview.length}</strong>
                      languages
                    </span>
                  </div>
                  <div
                    className="lp-word-chart"
                    aria-label="Word frequencies from the included teaching sample"
                  >
                    {terms.map((r, i) => (
                      <div className="lp-chart-row" key={r.term}>
                        <span dir="auto">{r.term}</span>
                        <div>
                          <motion.i
                            initial={reduced ? false : { scaleX: 0 }}
                            whileInView={{ scaleX: 1 }}
                            viewport={{ once: true }}
                            transition={{
                              duration: paused || reduced ? 0 : 0.9,
                              delay: i * 0.08,
                            }}
                            style={{
                              width: `${(r.count / terms[0].count) * 100}%`,
                            }}
                          />
                        </div>
                        <b>{r.count}</b>
                      </div>
                    ))}
                  </div>
                  <p className="lp-preview-note">Stop words hidden in this preview.</p>
                  <button className="lp-text-link" onClick={() => onSample(2)}>
                    Explore this real dataset <ArrowRight size={16} />
                  </button>
                </div>
                <LanguageOrbit paused={effectivePaused} />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section
        className="lp-language-strip"
        aria-label="Languages in the teaching sample"
      >
        <div>
          {multilingualSampleDocuments.map(({ name, locale }) => (
            <span dir="auto" lang={locale} key={locale}>
              {name}
            </span>
          ))}
        </div>
      </section>

      <section className="lp-section lp-container" id="tools">
        <Reveal>
          <div className="lp-section-intro">
            <span className="lp-eyebrow">
              THE RESEARCH, WITHOUT THE FRICTION
            </span>
            <h2>
              From a single word{" "}
              <br />
              to the bigger picture.
            </h2>
            <p>
              Four connected workspaces. One place to follow your questions.
            </p>
          </div>
        </Reveal>
        <div className="lp-tools-grid">
          {tools.map((t, i) => (
            <Reveal key={t.id} delay={i * 0.07}>
              <button
                className={`lp-tool-card lp-tool-${i}`}
                onClick={() => go(t.id)}
              >
                <span className="lp-tool-top">
                  <t.icon size={23} />
                  <span>
                    {t.number} / {t.label}
                  </span>
                  <ArrowUpRight size={18} />
                </span>
                <div className="lp-tool-art" aria-hidden="true">
                  {i === 0 ? (
                    <div className="lp-kwic">
                      {[
                        ["we learn", "through people"],
                        ["patterns in", "reveal context"],
                        ["the words of", "connect us"],
                      ].map(([left, right]) => (
                        <div className="lp-kwic-line" key={left}>
                          <span className="lp-kwic-left"><span>{left}</span></span>
                          <b>language</b>
                          <span className="lp-kwic-right">{right}</span>
                        </div>
                      ))}
                    </div>
                  ) : i === 1 ? (
                    <div className="lp-parallel">
                      <span>El lenguaje conecta.</span>
                      <span>Language connects.</span>
                      <i />
                      <span>Les mots voyagent.</span>
                      <span>Words travel.</span>
                    </div>
                  ) : i === 2 ? (
                    <div className="lp-compare-art">
                      <strong>Keyness · log₂ frequency ratio</strong>
                      <small>Corpus A ← 0 → Corpus B</small>
                      {keyness.map((row) => (
                        <div className="lp-keyness-row" key={row.term}>
                          <span>{row.term}</span>
                          <div className="lp-keyness-axis">
                            <i style={{ width: `${row.logRatio > 0 ? row.logRatio / keynessScale * 50 : 0}%` }} />
                            <b style={{ width: `${row.logRatio < 0 ? -row.logRatio / keynessScale * 50 : 0}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="lp-figure-art">
                      <strong>Frequent terms in the preview</strong>
                      <div className="lp-mini-plot">
                        <small>Token count</small>
                        {terms.slice(0, 3).map((row) => (
                          <span key={row.term}><i style={{ height: `${row.count / terms[0].count * 100}%` }} /><b dir="auto">{row.term}</b></span>
                        ))}
                      </div>
                      <small>Term</small>
                    </div>
                  )}
                </div>
                <h3>{t.title}</h3>
                <p>{t.body}</p>
                <span className="lp-tool-open">
                  Open {t.label.toLowerCase()} <ArrowRight size={15} />
                </span>
              </button>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="lp-section lp-container lp-screens" aria-labelledby="live-workspace">
        <h2 id="live-workspace">See it in action</h2>
        <div className="lp-screen-grid">
          {screenshots.map(({ file, title, alt }) => (
            <figure key={file}>
              <a href={`${import.meta.env.BASE_URL}screens/${file}.webp`}>
                <img src={`${import.meta.env.BASE_URL}screens/${file}.webp`} alt={alt}
                  loading="lazy" width={1140} height={642} />
              </a>
              <figcaption>{title}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="lp-language-section" id="languages">
        <div className="lp-container lp-language-layout">
          <Reveal>
            <span className="lp-eyebrow">
              BUILT FOR THE WAY THE WORLD WRITES
            </span>
            <h2>
              Language has{" "}
              <br />
              many forms.{" "}
              <br />
              <span>Curiosity is universal.</span>
            </h2>
            <p>
              Work with texts across writing systems. Accents, scripts and
              right-to-left text belong here.
            </p>
            <p className="lp-language-note">
              Unicode segmentation supports many languages. Word boundaries and
              linguistic accuracy vary by language; you can inspect the method
              and adjust the settings.
            </p>
            <button className="lp-text-link" onClick={() => go("methods")}>
              Read the methods <ArrowUpRight size={16} />
            </button>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="lp-language-demo">
              <div
                className="lp-language-tabs"
                role="group"
                aria-label="Preview a sample language"
              >
                {multilingualSampleDocuments.map(({ name, locale }) => (
                  <button
                    key={locale}
                    lang={locale}
                    dir="auto"
                    aria-pressed={language === locale}
                    onClick={() => setLanguage(locale)}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <div className="lp-language-paper">
                <span className="lp-eyebrow">
                  ORIGINAL TEACHING TEXT · EXCERPT
                </span>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={language}
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: paused || reduced ? 0 : 0.2 }}
                    dir="auto"
                    lang={language}
                  >
                    {snippet.text.slice(0, 225)}
                  </motion.p>
                </AnimatePresence>
                <div className="lp-paper-bottom">
                  <BookOpen size={17} />
                  <span>Your language. Your research.</span>
                </div>
              </div>
              <button className="lp-text-link" onClick={() => onSample(1)}>
                Open the multilingual collection <ArrowRight size={16} />
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="lp-section lp-container lp-workflow">
        <Reveal>
          <div className="lp-section-intro">
            <span className="lp-eyebrow">A STRAIGHTFORWARD WORKFLOW</span>
            <h2>
              Bring your texts.{" "}
              <br />
              Follow the evidence.
            </h2>
          </div>
        </Reveal>
        <div className="lp-steps">
          {[
            {
              icon: Upload,
              title: "Bring a collection",
              body: "Import documents, tables, subtitles or translation memories. Or start by pasting a text.",
              formats: "TXT · DOCX · PDF · CSV · XLSX · HTML · SRT · VTT · TMX",
            },
            {
              icon: Search,
              title: "Explore the patterns",
              body: "Filter words, examine context, compare collections and inspect the settings behind the numbers.",
              formats: "FREQUENCIES → CONTEXT → COMPARISON",
            },
            {
              icon: BarChart3,
              title: "Make it yours",
              body: "Export your results, customize a figure, or save a corpus in your browser library.",
              formats: "CSV · SVG · HTML REPORTS · JSON BACKUPS",
            },
          ].map((s, i) => (
            <Reveal key={s.title} delay={i * 0.12}>
              <div className="lp-step">
                <div className="lp-step-track">
                  <span>
                    <s.icon size={21} />
                  </span>
                  <i />
                </div>
                <small>0{i + 1}</small>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
                <span className="lp-step-format">{s.formats}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="lp-privacy lp-container">
        <Reveal>
          <div className="lp-privacy-inner">
            <div className="lp-lock">
              <LockKeyhole size={30} />
              <i />
              <i />
            </div>
            <span className="lp-eyebrow">
              LOCAL BY DESIGN. OPEN TO EVERYONE.
            </span>
            <h2>
              Keep your texts close.{" "}
              <br />
              Keep your possibilities open.
            </h2>
            <p>
              Analysis happens in your browser. No account to create, no model
              key to supply, no subscription to start researching.
            </p>
            <button className="lp-button" onClick={() => go("workspace")}>
              Open the workspace <ArrowRight size={18} />
            </button>
            <button className="lp-text-link" onClick={() => go("methods")}>
              How your data is handled <ArrowUpRight size={15} />
            </button>
          </div>
        </Reveal>
      </section>

      <section className="lp-about lp-container" aria-labelledby="about-corpuscape">
        <div>
          <h2 id="about-corpuscape">About Corpuscape</h2>
          <p>{author.name}<br />{author.affiliation}<br /><a href={author.orcid}>ORCID profile</a></p>
        </div>
        <div id="cite">
          <h2>How to cite</h2>
          <p>{citation}</p>
          <button className="lp-text-link" onClick={async () => {
            try {
              await navigator.clipboard.writeText(citation);
              setCopyStatus("Citation copied.");
            } catch {
              setCopyStatus("Select the citation text to copy it.");
            }
          }}>Copy citation</button>
          <span role="status">{copyStatus}</span>
        </div>
      </section>
      <section className="lp-faq lp-container">
        <h2>A few practical questions.</h2>
        {[
          [
            "Does this use an LLM?",
            "The core analysis does not. Frequencies, concordance, n-grams, collocations and corpus comparison use Unicode segmentation and standard corpus statistics. Research reports are an optional extra. If you turn them on, a small open model (Qwen or SmolLM, Apache 2.0) downloads once to your browser and runs on your device. Your texts are never sent to a server.",
          ],
          [
            "Where are my documents stored?",
            "Imported texts are processed on your device. If you choose Save to library, a copy is stored in this browser’s IndexedDB. Clearing browser data removes those saved corpora, so export a JSON backup for anything you want to keep.",
          ],
          [
            "Can I use Chinese, Japanese or Arabic?",
            "Yes. Multiple scripts and right-to-left text are supported. Segmentation and case handling vary across languages. Choose a language in the tool settings and read the methods before interpreting results.",
          ],
          [
            "Does it translate or transcribe?",
            "No. The parallel workspace helps you review and edit translations you already have. Text extraction can read scanned PDFs and images with OCR, but it does not translate them.",
          ],
        ].map(([q, a]) => (
          <details key={q}>
            <summary>
              {q}
              <ChevronDown size={18} />
            </summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
      <footer className="lp-footer lp-container">
        <a className="lp-brand" href="#overview">
          <BrandMark className="lp-mark" />
          corpuscape.
        </a>
        <span>{author.name} · Kent State University · v{APP_VERSION}</span>
        <div>
          <a href="#cite" onClick={(event) => {
            event.preventDefault();
            document.getElementById("cite")?.scrollIntoView({ block: "center" });
          }}>How to cite</a>
          <a href={`${source}/blob/main/LICENSE`}>MIT license</a>
          <button onClick={() => go("methods")}>Methods & privacy</button>
          <a href={source} target="_blank" rel="noreferrer">
            GitHub <ArrowUpRight size={14} />
          </a>
          <a href={`${source}/issues`}>Contact</a>
        </div>
      </footer>
    </div>
  );
}
