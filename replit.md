# Traduxa

AI-powered corpus linguistics lab for translation studies, rebuilt from Python/Streamlit to React/Express/TypeScript.

## Architecture

- **Frontend:** React + TypeScript, Vite, shadcn/ui, Tailwind CSS, wouter routing, TanStack Query, Recharts, Framer Motion
- **Backend:** Express + TypeScript, multer for file uploads, cheerio for web scraping, in-memory corpus storage
- **AI:** Google Gemini via Replit AI Integration (`@google/genai`), hardcoded — no user API key needed
- **Theme:** Teal primary (168 76%) with gradient mesh background, dark sidebar, indigo/teal/purple/amber track accents

## Key Directories

```
client/src/pages/       - Home, Monolingual, Bilingual, AI Insights, Scraper pages
client/src/components/  - AppSidebar, FileUpload, MarkdownRender, ThemeProvider, Logo
server/                 - Express routes, corpus processing, AI integration, scraper, storage
shared/schema.ts        - Shared types and analysis category definitions
```

## Features (4 Tracks)

### Monolingual Track
- File upload (TXT, DOCX, PDF, Excel) + sample corpus
- Corpus statistics (words, unique, sentences, TTR)
- Keyword extraction with bar chart visualization
- Collocation analysis (frequency, MI, Dice)
- KWIC concordance search
- N-gram extraction (bigrams, trigrams, 4-grams)
- AI corpus summary & terminology extraction
- Export: Research report (MD), Keywords CSV

### Bilingual Track
- Source/target file upload with AI sentence alignment
- Translation strategy labeling (domestication, foreignization, etc.)
- Translation universals analysis
- Strategy analysis
- Export: CSV, TMX (CAT tool format)

### AI Insights Lab
- 31 specialized analysis types across 6 categories
- Domain classification (topic extraction)
- Comparative metrics
- Term cluster extraction
- Custom analysis with user-defined prompts

### Web Scraper
- Add multiple URLs to scrape
- Extract article text with cheerio
- View, edit, and clean scraped content
- Remove individual articles or clear all
- Send cleaned text directly to Monolingual analysis pipeline

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

## Environment

- `AI_INTEGRATIONS_GEMINI_API_KEY` and `AI_INTEGRATIONS_GEMINI_BASE_URL` provided by Replit integration
- `SESSION_SECRET` for session management
- Port 5000

## Dependencies

- `@google/genai`, `multer`, `mammoth`, `pdf-parse`, `xlsx`
- `react-markdown`, `remark-gfm`, `recharts`, `framer-motion`
- `cheerio` (web scraping)
- `p-limit`, `p-retry`
