# Corpuscape 2.3: verification and gap ledger

Audit date: 6 November 2026. This release adds a frozen-source manuscript workspace, shared local inference, portable research exports, table metadata mapping and fixes found during multilingual testing.

## Corpus matrix

Ten distinct collections contain 26 documents and 85,242 word tokens. Alice and Pepita are full public-domain books obtained from Project Gutenberg; the other eight are small original teaching/test collections. They exercise scripts and workflows, not representativeness or linguistic validity in every language. Counts below use the audit's browser ICU segmentation and recorded document language tags.

| Collection                       | Mode                 | Languages                                                                               | Tokens | Types |
| -------------------------------- | -------------------- | --------------------------------------------------------------------------------------- | -----: | ----: |
| Alice's Adventures in Wonderland | Monolingual book     | English                                                                                 | 26,775 | 2,747 |
| Pepita Jimenez                   | Monolingual book     | Spanish                                                                                 | 56,684 | 9,517 |
| French teaching texts            | Monolingual          | French                                                                                  |    215 |   142 |
| Russian teaching texts           | Monolingual          | Russian                                                                                 |    158 |   139 |
| Chinese teaching texts           | Monolingual          | Chinese                                                                                 |    206 |   150 |
| Japanese teaching texts          | Monolingual          | Japanese                                                                                |    236 |   129 |
| Arabic teaching texts            | Monolingual          | Arabic                                                                                  |    156 |   142 |
| Research translation test        | Parallel             | English, Spanish                                                                        |    142 |   106 |
| Library texts                    | Bilingual comparable | French, English                                                                         |    178 |   136 |
| Languages in conversation        | Multilingual         | English, Spanish, French, Russian, Chinese, Japanese, Arabic, German, Portuguese, Hindi |    492 |   404 |

Original fixture text is in `tests/fixtures/research-corpora.ts`. Book body hashes after Gutenberg marker removal and LF normalization: Alice `4e04ea77acf3b0215cae2089c977bc07526fc834597a1d463598d895354ba41d`; Pepita `2741408cecae191b5111cefbe228e6b3e4fa6fb66146c2bf8d7516238a17cadd`. Gutenberg license and front matter are retained in the audit inputs. Full books are not bundled into the application.

## Checks executed

- Automated suite: 219 passing tests, including numerical functions, concordance, import, archives, paper validation, model cancellation/fallback contracts and figure recovery. `npm test` and `npm run build` pass.
- Independent audit script: all ten corpora, word counts, frequency totals, document statistics, 2/3/4-grams, concordance, collocations, comparison, CSV round trips and paper source validation; 120 real Vega chart renders. See `scripts/audit-ten-corpora.ts`.
- Browser: all ten corpora through core analysis tabs, concordance sort choices, all n-gram sizes, collocations, document tables, comparisons, computed reports and actual local AI generation. All ten frequency CSV downloads were parsed and their sums checked. The English four-gram download contained 16,862 rows.
- Figures: all twelve chart types rendered with compatible mappings; missing heatmap series correctly blocked. Actual SVG, PNG, PDF, CSV, editable project and Vega-Lite downloads were opened or parsed. Mapping, intervals, local recovery and complete-data exports have automated coverage in addition to browser checks.
- Real import files: CSV with per-row name/language mapping, a two-sheet Russian XLSX with explicit sheet selection, French DOCX, saved Chinese HTML excluding navigation/scripts, Japanese selectable-text PDFs and scanned Arabic PDF OCR. Existing parser tests also cover Markdown, TSV, subtitles and tagged TMX.
- Japanese PDF: raw layout breaks produced 242 tokens; explicit reversible reflow restored the known 236 tokens, 129 types and 13 sentences. A punctuation-boundary defect found during this check was fixed. Undo restored the raw text.
- Arabic OCR: actual recognition was run, raw text downloaded, source corrections made in editable outputs, reviewed text downloaded and handed to the corpus. OCR confidence is not an accuracy guarantee. Separate image tests measured character error rates of 2.93% and 1.53% against the known originals with diacritics retained.
- Mini paper: monolingual, parallel and multilingual snapshots; editable narrative, model cancellation, output/context failure, source hashes, computed tables/figures, project restoration, Word/HTML/ZIP exports and reviewed example manuscripts. Export validation records accompany the delivered examples.

## Defects found and resolved

| Observed gap                                          | Resulting behavior                                                                                                                                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No manuscript workflow                                | New Mini paper workspace freezes sources/settings and recomputes results; editable writing plus Word, HTML, print/PDF, full-data ZIP and project JSON.                                           |
| Reconnecting models between tools                     | Reports and Mini paper share one local worker and connection. Cancellation settles pending operations and releases memory.                                                                       |
| GPU initialization failure                            | Automatic mode retries a pinned compact CPU model in a fresh worker; explicit GPU mode reports incompatibility. Contract tested; no-GPU hardware was not available for a physical-device test.   |
| Invented model numbers                                | Advisory numeric checks compare against frozen evidence, accepting raw precision as well as formatted values and normalizing common digit scripts. Mini-paper numerical results remain computed. |
| False ratio/translation claims                        | Added checks for observed TTR/rare-word misuse and unsupported duplicate flags; supplied review flags and relevant evidence to the prompt.                                                       |
| Old AI draft relabeled with current corpus            | Draft display/export uses its original title, language, source evidence, model provenance and review notices.                                                                                    |
| CSV/XLSX losing names/language tags                   | Explicit text/name/language columns and row-as-document controls; BCP47 validation.                                                                                                              |
| PDF line breaks splitting CJK forms and punctuation   | Optional reversible cleanup in Documents and Text extraction, with visible explanation.                                                                                                          |
| Re-pairing losing review notes                        | Unchanged segment pairs preserve notes, including repeated occurrences. Search does not trim pair exports.                                                                                       |
| Collocation figure lost when navigating               | Retains matching results across analysis tabs and saves recovered figures with frozen editable data and query provenance.                                                                        |
| Thin bars for distinct document/language combinations | Series offsets are used only for actual grouped categories.                                                                                                                                      |
| Figure inspector cramped on medium screens            | Inspector moves below the artboard at the medium breakpoint.                                                                                                                                     |
| q-value floating point below p-value                  | Clamp local adjusted values to at least their p-value.                                                                                                                                           |
| Paper tables rounded away tiny p/q values             | Compact manuscript notation plus full-precision CSV and log-probability data.                                                                                                                    |
| Partial backup                                        | Version 2 whole-workspace archives include saved corpora and paper projects/snapshots; atomic restoration uses new IDs.                                                                          |
| Stale navigation count                                | Dashboard/search now include all seven research workspaces.                                                                                                                                      |

## Practical boundaries

The browser automation policy blocked the manuscript Print/PDF navigation. No bypass was attempted. Downloaded Word and self-contained HTML were verified, and the delivered PDF was rendered locally from Word using the official LibreOffice renderer. The native print dialog was not certified by this audit. All pages of the monolingual, parallel and multilingual Word examples were visually inspected.

Grouped manuscript citations such as `[T2, T3]` initially triggered an irrelevant numeric warning; the checker now handles grouped table/figure references and retains unknown-ID checks. A browser reload confirmed that the reviewed example no longer produced that false warning.

To reproduce the core corpus audit, run `python scripts/download-qa-corpora.py`, `npx tsx scripts/prepare-corpus-audit.ts` and `npx tsx scripts/audit-ten-corpora.ts` after `npm ci`. Scripts use a sibling `corpus-qa` directory; the engine audit writes to the task's `outputs` directory. Keep the downloaded originals and their license notices. File-format and OCR scripts require the separately generated real input files used in the audit; they are not a claim of an unattended browser test suite.

There are no application-level file/document/character/pair/result quotas. Browsers, memory, device storage and model context remain finite. Whole-file parsing or very large in-memory analyses can exhaust a device. First-time inference and OCR require downloading model assets; network access and compatible hardware are needed. The analysis works without loading a model.

The 1.5B WebGPU model was executed on all ten corpora. It sometimes invented numerical expansions, misunderstood ratios, mixed languages or proposed unsupported translation issues. Guards catch some errors; they do not prove meaning, factual accuracy, publication quality or reliable output in every language. Drafts require researcher review and retain model/revision/runtime and incomplete-generation metadata. The supplied example prose was reviewed and edited.

Tokenization uses browser Intl.Segmenter and document locales, not universal morphological analysis. Chinese/Japanese segmentation can vary with ICU version. Multilingual pooled types are orthographic forms, not aligned concepts. Small teaching texts do not support population claims. Collocation and alignment flags support inspection; they do not verify translation quality. Statistical comparisons are exploratory and depend on corpus sampling, tokenization and test assumptions.

OCR is editable and imperfect. A confidence score cannot certify the transcription. Browser storage is local to the origin/profile and can be cleared by the browser; portable backups are the recovery route. External provider credentials from the former server application cannot be revoked through a static-site source change; the restored Vercel environment inventory contained no model secrets.

This is a bounded reproducible audit, not a claim that every possible input, device, language, model response or future browser version is error-free.
