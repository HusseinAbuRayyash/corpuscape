# Changelog

## 2.4.0

### Added

- Add the MIT license and citation metadata.
- Use the package version as the source for the app's `APP_VERSION` constant.
- Add share previews, a touch icon, and discovery metadata for the public site.
- Document the repository history cleanup procedure.
- Add an English–Arabic teaching sample, labelled research previews, live
  workspace screenshots, and author and citation details to the landing page.
- Add optional Arabic term normalisation and experimental prefix splitting,
  with eleven editable Stopwords ISO lists.
- Align parallel texts by sentence length or subtitle timestamps, with editable
  pairs, review flags, undo and timed exports.

### Changed

- Concordance right-context sorting now compares words, ignoring punctuation, spacing and capitalisation, matching left-context sorting. Hit counts are unchanged; only the order of some lines differs from 2.3.0.
- Add token patterns, position sorts, directional collocation windows and four additional collocation measures.
- Add DP, DPnorm and Juilland’s D, selectable normalised frequency units, and filters for keyness results.

### Fixed

- Explain optional on-device models and OCR in the landing page FAQ.
- Preserve word spacing in mobile headings and use one logo across the landing
  page, workspace, and favicon.
- Align workspace search controls and use the direction of the query text.
- Use the same ten teaching languages for the preview count, strip, and tabs.
- Improve mobile landing navigation, tap targets, contrast, and concordance
  context alignment.
- Group workspace tools by research task, improve bidirectional results and
  chart labels, and load specialist tools on demand.
- Ignore invisible direction and joiner controls in matching terms while
  retaining original source text.
- Add HSTS and a report-only Content Security Policy.

### Removed

- Remove the unused legacy workspace styles and illustration component.

- Remove `attached_assets/` from the source tree and ignore future uploads to
  that folder.

## 2.3.0

- Add Mini paper with frozen analysis, editable local AI drafts, tables, figures,
  and manuscript exports.
- Add shared local model controls, corpus metadata mapping, and workspace and
  paper archives.
- Improve multilingual text extraction, parallel review, figure recovery, and
  report provenance.
