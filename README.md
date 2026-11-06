# Corpuscape

A free, multilingual corpus analysis workspace. This browser edition has no accounts, LLM API keys, paid-model SDKs, database server or text upload endpoint. Imported texts are processed locally. Workspace recovery, figure projects and report drafts use the visitor's IndexedDB. Optional open models run on the visitor's device.

## Live website and restoration status

[Open Corpuscape](https://www.corpuscape.com/) — both `www.corpuscape.com` and `corpuscape.com` were restored on November 6, 2026, with the redesigned static edition. The [GitHub Pages mirror](https://husseinaburayyash.github.io/corpuscape/) remains available. Both original domain addresses returned HTTP 200 HTML, and multilingual corpus analysis was verified on the restored domain.

The Vercel project now uses Vite, Node 24, `npm ci`, `npm run build` and `dist`. Its environment-variable inventory was empty, with zero hidden production variables; no model secrets needed deletion there. Separate provider or Replit credentials have not been revoked. The migration and domain observations below describe the earlier state and the available recovery routes.

## Approved interface update

The public homepage adapts Velora UI's free animated SaaS template. The research workspace follows Shadcn Admin's navigation and data layout. Both source projects are MIT licensed; their notices are retained in `THIRD_PARTY_NOTICES.txt`.

The multilingual orbit uses real text and CSS animation, alongside a rotating headline, ambient background movement, sample-data charts and scroll reveals. Visitors can pause motion; device reduced-motion preferences are respected unless the visitor explicitly enables animations. The choice lasts for the browser session. Sample language previews use the same original teaching texts as the analyzer.

The homepage opens at `#overview`, the import dashboard at `#workspace`, and existing direct tool routes remain available. No hosted model, account or API key is added by the design update.

## Run and build

Use Node.js 22.13+ (Node 24 recommended).

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Deploy **the contents of `dist/`**, not server JavaScript or the repository root. The site uses hash navigation and relative assets, so it works at a custom domain or `/corpuscape/` on GitHub Pages. File parsers load only when needed. `npm run build` copies PDF.js language/font/wasm support files into the static output.

## Tools

- Monolingual and multilingual analysis: word counts, types, sentences, type–token ratio, document dispersion, raw and normalized frequencies, whole-word/phrase concordance, contiguous n-grams, window-based collocations, editable case and stop-list settings.
- Corpus comparison: normalized counts, exploratory two-corpus G² and smoothed log₂ ratio, approximate chi-square df=1 p-values and Benjamini–Hochberg q-values across all tested terms.
- Bilingual review: explicit line pairing, table column selection including notes, tagged language-pair selection from multilingual TMX, editable source/target segments, duplicate/identical/missing-segment review flags, CSV and TMX exports with notes. No inferred semantic alignment.
- Figure Studio: a complete three-pane editor with 12 real Vega-Lite chart types, multiple series, interval columns, distributions, heatmaps, scatter zoom, editable data sheets, CSV/TSV/XLSX import, field mapping, themes, fonts, annotations, undo/redo, local recovery, SVG/PNG/PDF exports, full-precision CSV, portable figure projects and Vega-Lite specifications. All-items mode keeps the full dataset.
- Local library: explicit browser saves update the current record; portable JSON backups retain case, stop list and language settings. Version 2 backups still restore. Deletion requires a review dialog. Reports include document languages and resolved segmentation locales and export as self-contained HTML for printing to PDF.
- Import TXT, Markdown, CSV, TSV, DOCX, selectable-text PDF, XLSX (select a worksheet), saved HTML, SRT/VTT subtitle text and TMX (select tagged languages; corpus imports create a document per language). Tables have explicit column and header selection. The Text extraction workspace processes scanned PDFs and images locally with Tesseract; multiple files, selectable-text fallback, editable page outputs, language selection and corpus handoff are included.

## Research upgrade, version 2.2.1

The new Figure Studio replaces the earlier three-chart utility. **Research reports** connects to Qwen3-0.6B or Qwen3-1.7B (multilingual), or SmolLM2-135M (English-focused), through Transformers.js. No API key or hosted inference service is used. Models download only after the visitor requests a connection, and are cached for reuse. The default Qwen download is about 618 MB on CPU / 570 MB on WebGPU; the larger model is about 1.7 GB / 1.4 GB. GPU compatibility is checked, automatic mode falls back to CPU, and cancellation terminates the model worker.

Reporting supports results, methods, discussions, figure captions, linguistic observations and translation-review suggestions. Evidence selection, original excerpts, context-window checks, streaming output, editable drafts, citation-ID checks, local history and portable backups are explicit. Corpus totals remain computed independently. Small models can produce poor prose, copy evidence or invent claims; citation checks do not validate every statement. A deterministic statistical report remains available without loading a model. Human review is required for AI writing, OCR and language-identification suggestions.

The old fixed file/document/character/pair/result quotas have been removed. Whole-workspace backups include corpus settings, comparison reference text, bilingual notes, chart settings and report drafts. Autosave can be paused; the preference persists. Models and OCR language data are downloaded separately rather than embedded in backups.

Run `npm test` for 170 automated checks, including known-answer workflows in ten languages, real Vega compilation and SVG rendering for all 12 chart types, malformed inputs, full-result retention, statistical probability oracles, BH adjustment, project round trips, IndexedDB bundles, Unicode, report-language checks and real import fixtures. Optional real-model checks: `node scripts/local-ai-smoke.mjs` and `npx tsx scripts/local-ai-report-smoke.ts` (download weights on first use). Browser QA has verified actual Qwen CPU inference, SVG/PNG/PDF downloads and bilingual OCR from a PNG and scanned PDF. See [the 2.2 verification record](docs/figure-studio-2.2.md). CI runs tests and the production build.

The earlier [2.1 audit](docs/research-audit-2026-11-06.json) is retained as a historical record; its old quotas and OCR limitations are superseded by 2.2.

## Multilingual methods

All Unicode scripts are accepted, including Latin, Cyrillic, Arabic, CJK and Indic scripts. `Intl.Segmenter` provides locale-specific word and sentence boundaries, including dictionary segmentation for Chinese, Japanese and Thai. Select the workspace language and override it for each document in the Documents tab when working with a multilingual collection. The **Automatic / mixed languages** setting uses the browser's default locale; it does not perform language detection. Other languages can be selected with a BCP 47 locale code. Browser ICU support and version can affect boundaries.

NFC preserves letters and diacritics. Optional locale-aware lowercasing folds case; no stemming, transliteration or accent stripping is applied. Numbers marked word-like by the segmenter count as tokens. Sentence counts include only segments containing word tokens. Character counts use Unicode code points. Exact formulas, limits and privacy details are available in **Methods & privacy** inside the app.

Stop lists filter displayed frequencies, n-grams and collocates while corpus totals remain unchanged. N-grams do not bridge excluded words, sentences or documents. Concordance is token-exact and preserves original offsets; punctuation is ignored for matching. Results are paginated in the interface and exports retain the full result family. Concordance context and collocation windows accept custom sizes.

Collocations use directed symmetric window events: PMI = log₂(fS/NC), Dice = 2f/(N+C), where S is all valid window slots, N slots starting at the node and C slots ending at the collocate. Two-corpus G² uses expected term counts proportional to corpus token totals. Log₂ ratio uses a 0.5 correction to term counts and corpus totals. These are descriptive/exploratory results, not quality judgments or semantic inference. Compare similarly sampled corpora, preferably in the same language. Approximate p-values use chi-square df=1; BH q-values adjust over all tested terms. Independence and large-sample assumptions can fail for sparse or repeated language data; these remain exploratory measures.

There are no fixed application quotas on document count, file size, corpus characters, parallel pairs or result count. Device memory, browser storage, processing power and model context windows remain finite. Analysis runs in a Web Worker. File parsing still consumes device memory and some parsers run on the main thread. Current Chrome, Edge, Firefox and Safari versions with `Intl.Segmenter`, workers and IndexedDB are required.

## Hosting and domain restoration

GitHub Pages is a suitable free static host for this public repository. Build locally and run `npm run deploy:pages` using your own GitHub Git credentials. It updates the `gh-pages` branch without rewriting its history. In repository **Settings → Pages**, publish from `gh-pages`, `/ (root)`. The initial public URL is `https://husseinaburayyash.github.io/corpuscape/` unless GitHub returns a different configured address.

`vercel.json` also configures Vercel to build this static edition with `npm run build` and serve `dist`. Set the Vercel project's root directory to the repository root. An existing project with old dashboard overrides may need those overrides cleared and a fresh production deployment. Do not serve `dist/index.cjs`: the old domain was returning a server bundle with `application/node` instead of HTML when inspected on November 6, 2026.

`corpuscape.com` and `www.corpuscape.com` resolved to `76.76.21.21` (Vercel), with Name.com nameservers. Public registry data reported expiration on March 6, 2027, so the observed problem was deployment configuration, not domain expiry. These observations may change.

To keep the domain on Vercel, reconnect/redeploy the existing project with this static configuration and verify both domain variants serve HTML. To move to GitHub Pages instead:

1. Verify ownership in GitHub Pages first, using GitHub's generated TXT verification record.
2. Add `www.corpuscape.com` as the repository's Pages custom domain.
3. At the DNS provider, replace the conflicting `www` A record with a CNAME pointing to `husseinaburayyash.github.io` (no path).
4. Configure the apex domain according to GitHub's current documented A/AAAA records, or use a provider-supported redirect to `www`. Remove conflicting old apex records only as part of that cutover.
5. Wait for DNS verification and the HTTPS certificate, then enable HTTPS enforcement and test both addresses.

Do not add an unverified `CNAME` file or change DNS until the destination is configured. Domain registration still has its normal renewal charge even when hosting and analysis are free. GitHub Pages and other free hosts have service limits.

References: [GitHub Pages creation](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site), [custom domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site), [Webflow plans](https://webflow.com/pricing), [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/).

## Migration and credentials

The full original app is preserved in `archive/pre-browser-edition-2026-11-06`. Version 2 replaces the server-dependent runtime and retires all paid-model features: corpus chat, generated research interpretations, translation/back-translation, semantic alignment, inferred translation strategies and cloud audio transcription. Version 2.2 adds optional local-model drafting and review suggestions; it does not certify semantic alignment, universal morphology, translation quality or audio transcription. Remote scraping is replaced by importing saved HTML. Earlier sample corpora, advanced chart templates, document exports and server libraries are retained in the archive rather than migrated wholesale.

The production source and dependency manifest contain no paid-provider clients or API-key environment variables. The optional Transformers.js model runtime operates locally. No obvious OpenAI, Google or GitHub credential patterns were detected in the old public response during the initial check, but that bounded scan does not certify Git history or provider accounts. Removing dependencies does **not** revoke old credentials or cancel subscriptions.

In the old Vercel/Replit project, remove any model-related environment secrets and provider integrations that remain configured. Revoke unused provider credentials in their issuing accounts. This requires access to those accounts. Do not copy environment values into repository files. Browser library records from the previous server application are not automatically migrated; export any important previous corpora before deleting server storage.

The only public teaching texts in this edition are original short examples in ten languages. Visitors are responsible for the rights and consent associated with texts they import.
