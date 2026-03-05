# Traduxa

AI-powered corpus linguistics lab for translation studies, rebuilt from Python/Streamlit to React/Express/TypeScript.

## Architecture

- **Frontend:** React + TypeScript, Vite, shadcn/ui, Tailwind CSS, wouter routing, TanStack Query, Recharts, Framer Motion
- **Backend:** Express + TypeScript, multer for file uploads, cheerio for web scraping, in-memory corpus storage
- **AI:** Google Gemini via Replit AI Integration (`@google/genai`), hardcoded — no user API key needed
- **Theme:** Teal primary (168 76%) with gradient mesh background, dark sidebar, indigo/teal/amber track accents

## Key Directories

```
client/src/pages/       - Home, Monolingual, Bilingual, Scraper, Compare pages
client/src/components/  - AppSidebar, FileUpload, MarkdownRender, ThemeProvider, Logo, AIAnalysisPanel, WordCloud, CorpusChat, ReportGenerator, DatasetViewer, CorpusFilter
server/                 - Express routes, corpus processing, AI integration, scraper, storage
shared/schema.ts        - Shared types and analysis category definitions
```

## Features (4 Tracks)

### Monolingual Track
- File upload (TXT, DOCX, PDF, Excel) + sample corpus
- **Dataset Viewer** — paginated table view of uploaded Excel data with column headers, row numbers, text highlighting, column click-to-highlight, pagination, and export
- Corpus statistics (words, unique, sentences, TTR)
- Keyword extraction with bar chart visualization
- Collocation analysis (frequency, MI, Dice)
- KWIC concordance search
- N-gram extraction (bigrams, trigrams, 4-grams)
- **Word Cloud** — canvas-based word cloud from keywords, 12 color palettes, PNG download, shuffle layout
- **Sub-corpus Segments** — splits corpus by paragraphs, shows word/char counts per segment
- AI corpus summary & terminology extraction
- **AI Insights tab** — 31 specialized analyses, domain classification, comparative metrics, term clusters, **Chart Generator**, **Corpus Chat**
- Export: Research report (Word+PDF via ReportGenerator), Keywords CSV

### Bilingual Track
- Source/target file upload with AI sentence alignment
- Pre-aligned file mode (alternating source/target lines)
- Translation strategy labeling (domestication, foreignization, etc.)
- Translation universals analysis
- Strategy analysis
- **Back-Translation Check** — AI back-translates target segments, shows semantic drift assessment
- **Bilingual Concordance** — search source text, see aligned target in KWIC format
- **AI Glossary Builder** — extracts bilingual glossary with definitions and examples
- **Annotation Mode** — editable comment column on aligned pairs, exportable as annotated CSV
- **AI Insights section** — full AI analysis panel with Chat tab
- Export: CSV, TMX (CAT tool format), Annotated CSV

### Web Scraper
- Add multiple URLs to scrape
- Extract article text with cheerio + Gemini AI fallback
- View, edit, and clean scraped content
- Remove individual articles or clear all
- **Word Cloud** — visualize scraped corpus keywords
- **Full Research Report** — Word and PDF export via ReportGenerator
- **Analyze Here** — create corpus and run AI analysis directly in scraper
- Send cleaned text to Monolingual analysis pipeline

### Corpus Comparison (NEW)
- Two side-by-side upload zones (Corpus A / Corpus B)
- Statistics comparison table (characters, words, TTR, etc.)
- Keyword overlap analysis (shared keywords, unique to A, unique to B)
- Side-by-side keyword bar charts with distinct color schemes
- AI comparative analysis via Gemini

## Reusable Components

### AIAnalysisPanel (`client/src/components/ai-analysis-panel.tsx`)
- Embeddable AI analysis component used by all tracks
- Accepts `corpusId` and `theme` (gradient, accent, text color) props
- 6 tabs: Specialized Analysis (31 types), **Chart Generator**, Domain Classification, Comparative Metrics, Term Clusters, **Corpus Chat**
- Chart Generator: user types a prompt, AI returns JSON chart data, rendered as interactive EditableChart
- Multiple charts can be generated and stacked; each is removable
- Corpus Chat: multi-turn conversational AI about the corpus content

### CorpusChat (`client/src/components/corpus-chat.tsx`)
- Chat-style UI with message bubbles (user right-aligned, assistant left-aligned)
- Multi-turn conversation with history, calls `/api/ai/chat`
- MarkdownRender for AI responses, loading indicators, clear chat button
- Theme-aware styling via `theme` prop

### WordCloud (`client/src/components/word-cloud.tsx`)
- Canvas-based word cloud with proportional sizing, spiral layout, collision avoidance
- 12 preset color palettes, palette picker, shuffle button
- PNG download (3x scale), hover tooltips, dark mode aware
- Props: `words: {text: string, value: number}[]`

### ReportGenerator (`client/src/components/report-generator.tsx`)
- Comprehensive Word (.docx) and PDF report generation
- Accepts stats, keywords, collocations, ngrams, aiResults, pairs, extraSections
- Branded Traduxa header/footer, styled tables, professional formatting

### CorpusFilter (`client/src/components/corpus-filter.tsx`)
- Dataset filtering component — filter corpus to analyze only matching subset
- Two variants: `CorpusFilter` (monolingual/scraper) and `BilingualFilter` (bilingual pairs)
- CorpusFilter: include/exclude paragraphs by keyword, creates new server-side corpus via `/api/corpus/filter`
- **Column-aware filtering**: when Excel files are uploaded, detects column headers and allows filtering by specific column
- **Date range filtering**: auto-detects date/year columns and provides From/To range inputs
- BilingualFilter: filter pairs by source/target text and/or strategy via `/api/bilingual/filter`
- Shows original vs filtered stats comparison with percentage
- Clear filter reverts to original corpus; all analysis results reset on filter change
- Integrated into all 3 tracks: Monolingual (indigo), Bilingual (teal), Scraper (amber)
- `extractExcelStructure()` in `server/corpus.ts` handles duplicate headers and date column detection

### MarkdownRender (`client/src/components/markdown-render.tsx`)
- Enhanced markdown renderer with custom table styling
- Word, PDF, and Excel downloads
- `showDownload` prop to hide download buttons (used in chat context)

### EditableChart (`client/src/components/editable-chart.tsx`)
- 8 chart types, 18 monochromatic color palettes (incl. B&W)
- Editable title, axes labels, data labels (None/Values/%/Both)
- PNG download via html2canvas

### TableDownload (`client/src/components/table-download.tsx`)
- Excel (.xlsx) and Word (.docx) download for structured table data

### Corpus Registry (`server/corpusStorage.ts`)
- In-memory corpus storage with metadata registry
- `resolveCorpusText()` helper resolves text for both monolingual and bilingual corpora

## API Endpoints

### Core
- `POST /api/corpus/upload` — upload and process corpus files
- `POST /api/corpus/sample` — load sample corpus
- `POST /api/corpus/keywords` — extract keywords
- `POST /api/corpus/ngrams` — extract n-grams
- `POST /api/corpus/collocations` — extract collocations
- `POST /api/corpus/concordance` — KWIC concordance search
- `POST /api/corpus/compare` — compare two corpora stats + keywords
- `POST /api/corpus/segment` — split corpus into paragraph segments
- `POST /api/corpus/filter` — filter corpus paragraphs by keyword (include/exclude), returns new filtered corpusId + stats
- `POST /api/corpus/dataset` — fetch paginated Excel dataset rows for display (page, pageSize)

### Bilingual
- `POST /api/bilingual/upload` — upload source/target for alignment
- `POST /api/bilingual/upload-aligned` — upload pre-aligned files
- `POST /api/bilingual/universals` — translation universals analysis
- `POST /api/bilingual/strategies` — strategy analysis
- `POST /api/bilingual/back-translate` — AI back-translation check
- `POST /api/bilingual/concordance` — bilingual concordance search
- `POST /api/bilingual/glossary` — AI bilingual glossary extraction
- `POST /api/bilingual/filter` — filter aligned pairs by text content and/or strategy, returns new filtered corpusId + filtered pairs
- `POST /api/export/tmx` — export TMX

### AI
- `POST /api/ai/summarize` — corpus summary
- `POST /api/ai/terminology` — terminology extraction
- `POST /api/ai/analyze` — specialized analysis (31 types)
- `POST /api/ai/topics` — domain classification
- `POST /api/ai/chart` — AI chart data generation
- `POST /api/ai/chat` — multi-turn corpus chat

### Scraper
- `POST /api/scrape` — scrape URLs
- `POST /api/scrape/to-corpus` — convert scraped text to corpus

## Design System

- **Name:** Traduxa (one-word brand name evoking translation)
- Gradient mesh background (teal/indigo/purple radials)
- Dark sidebar (slate-900) with text-gradient brand name
- Custom CSS classes: `.metric-card`, `.polished-card`, `.polished-table`, `.section-header`, `.empty-state`, `.page-header-icon`, `.upload-zone`
- Track colors: Monolingual=indigo/blue, Bilingual=teal/emerald, Web Scraper=amber/orange, Compare=violet/purple
- Font: Playfair Display (italic, bold) for page/card titles, Inter for body
- CSS + Framer Motion animations

## Environment

- `AI_INTEGRATIONS_GEMINI_API_KEY` and `AI_INTEGRATIONS_GEMINI_BASE_URL` provided by Replit integration
- `SESSION_SECRET` for session management
- Port 5000

## Dependencies

- `@google/genai`, `multer`, `mammoth`, `pdf-parse`, `xlsx`
- `react-markdown`, `remark-gfm`, `recharts`, `framer-motion`
- `cheerio` (web scraping)
- `p-limit`, `p-retry`
- `docx`, `file-saver`, `jspdf`, `html2canvas` (report generation)
