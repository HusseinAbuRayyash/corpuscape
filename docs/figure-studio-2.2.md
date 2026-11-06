# Corpuscape 2.2 verification record

## Implemented

1. Replaced Figure Studio with a dedicated chart library, artboard and properties inspector.
2. Added 12 actual Vega-Lite charts: horizontal bars, columns, grouped columns, stacked bars, line, area, scatter, lollipop, heatmap, donut, histogram and box plot.
3. Added multiple series, editable data rows/columns, sorting, filtering, field mapping, optional focus and all-items display.
4. Added real corpus frequencies, n-grams, document measures, comparisons, collocations and parallel lengths as chart sources.
5. Added CSV/TSV/XLSX data import and worksheet selection; numeric, malformed-row and interval validation.
6. Added themes, palettes, typography, grid/legend/labels, axis titles, captions and source notes.
7. Added real SVG, high-resolution PNG and multilingual raster PDF exports, complete CSV, project JSON and Vega-Lite specification export.
8. Added undo/redo, keyboard shortcuts and local figure recovery; literal dotted/bracketed column names remain literal data keys.
9. Connected Qwen3 and SmolLM2 through a dedicated Transformers.js worker, with real public model weights and no API key.
10. Added CPU/WebGPU selection, compatibility checks, automatic GPU fallback, download progress, worker cancellation and cache clearing.
11. Added evidence-based reports, custom output languages, editable streaming drafts, exact corpus facts, unknown/missing citation notices, model provenance and draft history.
12. Added exact statistical reports independent of AI, Markdown/HTML exports and validated report backup restoration.
13. Added local Tesseract OCR for multiple images/scanned PDFs, selectable-text PDF fallback, selected languages, editable page results and corpus handoff.
14. Added statistical language suggestions with explicit user acceptance; automatic segmentation alone still does not identify language.
15. Removed old 25 MB file, 100-document, 2M-character, 10,000-pair, 500-result and 1,000-result product quotas.
16. Added custom concordance context and collocation windows; the interface still paginates full results.
17. Added whole-workspace recovery/backup, atomic bundle restoration and persistent autosave preference.
18. Added approximate chi-square df=1 p-values, stable log probabilities and BH adjustment over the full comparison family.
19. Bundled browser runtime assets and retained dependency license notices. Model weights and OCR language data download only on demand.

## Evidence

- 168 automated tests, including ten-language known-answer cases and real Vega grammar compilation/rendering for every chart type.
- Independent chi-square reference values at p=.05, .01 and .001 and a small BH reference family.
- Full retention beyond the former 500/1,000 result limits; backups beyond 100 documents / 2M characters.
- Browser-rendered ten-language, two-series figure; downloaded SVG, 2700×2175 PNG and a valid one-page PDF. SVG text includes Cyrillic, Arabic, Chinese, Japanese, French and the caption.
- Real Qwen3-0.6B CPU inference in both Node and the browser, without API credentials. Numeric overview tests preserved the ten-document teaching corpus totals. Small-model writing quality varied and invented IDs were observed; these are surfaced for review rather than called verified research findings.
- Real Tesseract English+French recognition of a PNG and an image-only PDF: both recovered “Le français ouvre des fenêtres.” and “Exact sample number: 2026.” The two outputs were loaded into Corpus Explorer.
- Production compilation, test summary, deployment revision and live screenshot are recorded with the release.

## Remaining practical constraints

- Hardware memory, CPU/GPU time, browser storage and each model's context window are finite. No software can honestly promise unbounded capacity on every device. Large-file parsers and chart rendering can still affect responsiveness.
- Compact local models vary by language and task. Citation-ID checks detect unknown references, not all incorrect reasoning. Human review remains necessary; the deterministic engine provides exact counts.
- OCR depends on scan quality, layout and language data. Language suggestions are rankings, not calibrated confidence or certified linguistic annotations.
- Universal POS tagging, lemmatization, semantic alignment, translation-quality scoring, remote website scraping and audio transcription are not presented as implemented. Model review suggestions do not establish their correctness. Saved HTML can be imported; arbitrary browser cross-origin restrictions are not bypassed.
- Free public hosting and model-file distributors have their own availability and service policies. Domain registration still requires normal renewal fees. Corpus texts and prompts are not sent to hosted inference services.
