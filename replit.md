# Corpuscape

## Overview
Corpuscape is an AI-powered corpus linguistics lab for translation studies. It provides a comprehensive suite of tools for monolingual and bilingual corpus analysis, web scraping, corpus comparison, and advanced figure creation. The platform aims to serve researchers, students, and professionals in translation studies by offering sophisticated analytical capabilities, AI-driven insights, and professional reporting features. The project is rebuilt using a modern React/Express/TypeScript stack.

## User Preferences
Not specified.

## System Architecture

**Frontend:**
-   **Framework:** React + TypeScript, Vite
-   **UI Library:** shadcn/ui, Tailwind CSS
-   **Routing:** wouter
-   **State Management/Data Fetching:** TanStack Query
-   **Charting:** Recharts
-   **Animations:** Framer Motion
-   **Key Pages:** Home, Monolingual, Bilingual, Scraper, Compare, FigureMaker, Library
-   **Theming:** Teal primary (168 76%) with gradient mesh background, dark sidebar, indigo/teal/amber track accents. Font: Playfair Display (titles), Inter (body).
-   **Reusable Components:**
    -   `AIAnalysisPanel`: Embeddable AI analysis with 31 specialized analyses, Chart Generator, Domain Classification, Comparative Metrics, Term Clusters, Corpus Chat.
    -   `CorpusChat`: Multi-turn conversational AI about corpus content.
    -   `WordCloud`: Canvas-based, proportional sizing, 12 palettes, PNG download.
    -   `ReportGenerator`: Comprehensive Word/PDF report generation with branded styling.
    -   `StopListManager`: Manages stop words (manual, file upload, presets).
    -   `CorpusFilter`: Filters corpora by keyword, column, or date range.
    -   `MarkdownRender`: Enhanced markdown renderer with download options.
    -   `EditableChart`: 8 chart types with editable elements and PNG download.
    -   `TableDownload`: Excel/Word download for table data.

**Backend:**
-   **Framework:** Express + TypeScript
-   **File Uploads:** multer
-   **Web Scraping:** cheerio
-   **Corpus Storage:** In-memory `Corpus Registry` (`server/corpusStorage.ts`) for managing corpus data and metadata.
-   **Library Storage:** PostgreSQL `library_corpora` table using Drizzle ORM.
-   **AI Integration:** Google Gemini via Replit AI Integration (`@google/genai`)—hardcoded, no user API key needed.

**Core Features:**

1.  **Monolingual Track:** File upload (TXT, DOCX, PDF, Excel), Dataset Viewer, corpus statistics, Stop List Manager, keyword extraction with visualization, collocation analysis, KWIC concordance, N-gram extraction, Word Cloud, Sub-corpus Segments, AI summary and terminology, AI Insights (31 analyses, Chart Generator, Corpus Chat), Research report export.
2.  **Bilingual Track:** Source/target file upload with AI sentence alignment, pre-aligned file mode, translation strategy/universals analysis, Back-Translation Check (AI semantic drift), Bilingual Concordance, AI Glossary Builder, Annotation Mode, AI Insights, multiple export formats (CSV, TMX, Report).
3.  **Web Scraper:** URL scraping, content viewing/editing/cleaning, Word Cloud, full research report, direct analysis integration, send to Monolingual track.
4.  **Corpus Comparison:** Side-by-side corpus upload, statistics comparison, keyword overlap analysis, side-by-side visualizations (bar charts, word clouds), AI comparative analysis, ReportGenerator.
5.  **Corpus Library:** Centralized management of "My Corpora" (user-saved), "Sample Corpora" (23 developer-seeded built-in corpora covering 11 bilingual en↔ar domains + 7 monolingual en/ar domains), and "Public Datasets" (36 external corpora). Features search, filter, preview, analyze, and save functionalities.
6.  **Figure Maker:** Standalone tool for creating 18 types of charts from user data (paste/CSV/TSV). Offers 47 color palettes, 14 font families, 9 academic format presets, extensive styling, annotations, and export options (PNG, PDF, Word, SVG, Python/R code). Includes AI tools for caption generation, chart recommendation, and results paragraph writing.

**AI Processing Philosophy:**
-   **No Truncation Policy:** All AI functions process full corpus data.
-   **Smart Chunking:** For large texts (>180K chars), text is split into overlapping chunks, processed independently, and then synthesized.
-   **Pair Batching:** For translation pairs, batches are processed independently and synthesized.

## External Dependencies

-   **AI:** Google Gemini (`@google/genai`)
-   **File Processing:** multer, mammoth, pdf-parse, xlsx
-   **Web Scraping:** cheerio
-   **PDF/Image Generation:** jspdf, html2canvas
-   **Utility:** p-limit, p-retry
-   **UI/Charting:** react-markdown, remark-gfm, recharts, framer-motion
-   **Document Generation:** docx, file-saver
-   **Database:** PostgreSQL (via Drizzle ORM)