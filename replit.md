# Traduxa

AI-powered corpus linguistics lab for translation studies, rebuilt from Python/Streamlit to React/Express/TypeScript.

## Architecture

- **Frontend:** React + TypeScript, Vite, shadcn/ui, Tailwind CSS, wouter routing, TanStack Query, Recharts, Framer Motion
- **Backend:** Express + TypeScript, multer for file uploads, cheerio for web scraping, in-memory corpus storage
- **AI:** Google Gemini via Replit AI Integration (`@google/genai`), hardcoded — no user API key needed
- **Theme:** Teal primary (168 76%) with gradient mesh background, dark sidebar, indigo/teal/amber track accents

## Key Directories

```
client/src/pages/       - Home, Monolingual, Bilingual, Scraper pages
client/src/components/  - AppSidebar, FileUpload, MarkdownRender, ThemeProvider, Logo, AIAnalysisPanel
server/                 - Express routes, corpus processing, AI integration, scraper, storage
shared/schema.ts        - Shared types and analysis category definitions
```

## Features (3 Tracks)

### Monolingual Track
- File upload (TXT, DOCX, PDF, Excel) + sample corpus
- Corpus statistics (words, unique, sentences, TTR)
- Keyword extraction with bar chart visualization
- Collocation analysis (frequency, MI, Dice)
- KWIC concordance search
- N-gram extraction (bigrams, trigrams, 4-grams)
- AI corpus summary & terminology extraction
- **AI Insights tab** — 31 specialized analyses, domain classification, comparative metrics, term clusters
- Export: Research report (MD), Keywords CSV

### Bilingual Track
- Source/target file upload with AI sentence alignment
- Pre-aligned file mode (alternating source/target lines)
- Translation strategy labeling (domestication, foreignization, etc.)
- Translation universals analysis
- Strategy analysis
- **AI Insights section** — appears after alignment, full AI analysis panel
- Export: CSV, TMX (CAT tool format)

### Web Scraper
- Add multiple URLs to scrape
- Extract article text with cheerio
- View, edit, and clean scraped content
- Remove individual articles or clear all
- **Analyze Here** — create corpus and run AI analysis directly in scraper
- Send cleaned text to Monolingual analysis pipeline

## Reusable Components

### AIAnalysisPanel (`client/src/components/ai-analysis-panel.tsx`)
- Embeddable AI analysis component used by all 3 tracks
- Accepts `corpusId` and `theme` (gradient, accent, text color) props
- 5 tabs: Specialized Analysis (31 types), **Chart Generator**, Domain Classification, Comparative Metrics, Term Clusters
- Chart Generator: user types a prompt, AI returns JSON chart data, rendered as interactive EditableChart
- Multiple charts can be generated and stacked; each is removable
- Suggestion chips for quick prompts (word frequency, strategy distribution, etc.)
- Category/type selectors, custom instructions, markdown result rendering
- All results pass `downloadFilename` to MarkdownRender for automatic Excel/Word export

### MarkdownRender (`client/src/components/markdown-render.tsx`)
- Enhanced markdown renderer with custom table styling (bordered, headers, hover rows)
- Full-document Word download: converts entire markdown (headings, paragraphs, lists, bold/italic, tables) into structured .docx with branded header, styled tables, footer
- PDF download: renders markdown to styled HTML, captures via html2canvas, outputs multi-page A4 PDF via jsPDF
- Excel download: auto-detects markdown tables and exports table data to .xlsx
- Tables rendered in scrollable containers to prevent overflow/cut-off
- Custom heading, paragraph, list, and strong text styling
- Markdown parser: `parseMarkdownToBlocks()` for full document structure, `parseMarkdownTables()` for table extraction

### EditableChart (`client/src/components/editable-chart.tsx`)
- 8 chart types, 18 monochromatic color palettes (incl. B&W)
- Toolbar: horizontally scrollable with `overflow-x-auto scrollbar-hide min-w-max` to prevent button overlap
- Editable title, axes labels, data labels (None/Values/%/Both)
- PNG download via html2canvas

### TableDownload (`client/src/components/table-download.tsx`)
- Excel (.xlsx) and Word (.docx) download for structured table data
- Styled Word documents with branded headers and alternating row shading

### Corpus Registry (`server/corpusStorage.ts`)
- In-memory corpus storage with metadata registry
- Tracks corpus source (monolingual, bilingual, scraper), name, word count
- `resolveCorpusText()` helper resolves text for both monolingual and bilingual corpora
- `GET /api/corpora` lists all registered corpora

## Design System

- **Name:** Traduxa (one-word brand name evoking translation)
- Gradient mesh background (teal/indigo/purple radials)
- Dark sidebar (slate-900) with text-gradient brand name
- Custom CSS classes: `.metric-card`, `.polished-card`, `.polished-table`, `.section-header`, `.empty-state`, `.page-header-icon`, `.upload-zone`
- Metric cards with gradient top-bar on hover, lift effect
- Polished cards with subtle border glow on hover
- Tables with gradient header backgrounds and uppercase headers
- CSS + Framer Motion animations (fade-in, slide-up, stagger, scale)
- Custom SVG logo with gradient
- Text gradient for brand name
- Real layered shadows
- Inter font family
- Consistent page headers with gradient icon badges per track
- Track colors: Monolingual=indigo/blue, Bilingual=teal/emerald, Web Scraper=amber/orange

## Environment

- `AI_INTEGRATIONS_GEMINI_API_KEY` and `AI_INTEGRATIONS_GEMINI_BASE_URL` provided by Replit integration
- `SESSION_SECRET` for session management
- Port 5000

## Dependencies

- `@google/genai`, `multer`, `mammoth`, `pdf-parse`, `xlsx`
- `react-markdown`, `remark-gfm`, `recharts`, `framer-motion`
- `cheerio` (web scraping)
- `p-limit`, `p-retry`
