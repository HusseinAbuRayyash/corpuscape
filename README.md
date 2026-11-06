# Corpuscape

A free, multilingual corpus analysis workspace. This browser edition has no accounts, LLM API keys, paid-model SDKs, database server or text upload endpoint. Imported texts are processed locally; explicitly saved corpora use the visitor's IndexedDB.

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

- Monolingual analysis: word counts, types, sentences, type–token ratio, document dispersion, raw and normalized frequencies, whole-word/phrase concordance, contiguous n-grams, window-based collocations, editable case and stop-list settings.
- Corpus comparison: normalized counts, exploratory two-corpus G² and smoothed log₂ ratio.
- Bilingual review: explicit line pairing, two-column table or TMX import, editable source/target segments, research notes, CSV and TMX exports. No inferred semantic alignment.
- Figure studio: horizontal/vertical bars and lollipop plots; editable title, colour and item count; custom tab-separated data; editable SVG and CSV exports.
- Local library: explicit browser saves and portable JSON backups. Reports export as self-contained HTML for printing to PDF.
- Import TXT, Markdown, CSV, TSV, DOCX, selectable-text PDF, XLSX (first worksheet), saved HTML, SRT/VTT subtitle text and TMX (first two variants). Tables have explicit column and header selection. Scanned PDFs require separate OCR.

## Multilingual methods

All Unicode scripts are accepted, including Latin, Cyrillic, Arabic, CJK and Indic scripts. `Intl.Segmenter` provides locale-specific word and sentence boundaries, including dictionary segmentation for Chinese, Japanese and Thai. Select a language for reproducible language-specific analysis. The **Automatic / mixed languages** setting uses the browser's default locale; it does not perform language detection. Other languages can be selected with a BCP 47 locale code. Browser ICU support and version can affect boundaries.

NFC preserves letters and diacritics. Optional locale-aware lowercasing folds case; no stemming, transliteration or accent stripping is applied. Numbers marked word-like by the segmenter count as tokens. Sentence counts include only segments containing word tokens. Character counts use Unicode code points. Exact formulas, limits and privacy details are available in **Methods & privacy** inside the app.

Stop lists filter displayed frequencies, n-grams and collocates while corpus totals remain unchanged. N-grams do not bridge excluded words, sentences or documents. Concordance is token-exact and preserves original offsets; punctuation is ignored for matching. Results retain the first 1,000 hits and show the full match count. Frequency exports include every term; n-gram/collocate results are capped at 500 and comparison terms at 1,000.

Collocations use directed symmetric window events: PMI = log₂(fS/NC), Dice = 2f/(N+C), where S is all valid window slots, N slots starting at the node and C slots ending at the collocate. Two-corpus G² uses expected term counts proportional to corpus token totals. Log₂ ratio uses a 0.5 correction to term counts and corpus totals. These are descriptive/exploratory results, not quality judgments or semantic inference. Compare similarly sampled corpora, preferably in the same language. No multiple-testing adjustment is applied.

Limits: 100 documents, 25 MB per input file, 2 million extracted characters per corpus and 10,000 parallel pairs. Analysis runs in a Web Worker. File parsing still consumes device memory and some parsers run on the main thread. Current Chrome, Edge, Firefox and Safari versions with `Intl.Segmenter`, workers and IndexedDB are required.

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

The full original app is preserved in `archive/pre-browser-edition-2026-11-06`. Version 2 replaces the server-dependent runtime and retires all paid-model features: corpus chat, generated research interpretations, translation/back-translation, semantic alignment, inferred translation strategies and cloud audio transcription. Browser-based analysis does not claim to reproduce those capabilities. Remote scraping is replaced by importing saved HTML. Earlier sample corpora, advanced chart templates, document exports and server libraries are retained in the archive rather than migrated wholesale.

The production source and dependency manifest no longer contain model clients or API-key environment variables. No obvious OpenAI, Google or GitHub credential patterns were detected in the old public response during the initial check, but that bounded scan does not certify Git history or provider accounts. Removing dependencies does **not** revoke old credentials or cancel subscriptions.

In the old Vercel/Replit project, remove any model-related environment secrets and provider integrations that remain configured. Revoke unused provider credentials in their issuing accounts. This requires access to those accounts. Do not copy environment values into repository files. Browser library records from the previous server application are not automatically migrated; export any important previous corpora before deleting server storage.

The only public teaching texts in this edition are original short examples in ten languages. Visitors are responsible for the rights and consent associated with texts they import.
