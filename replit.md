# TransCorpus AI

AI-powered corpus linguistics lab for translation studies, rebuilt from Python/Streamlit to React/Express/TypeScript.

## Architecture

- **Frontend:** React + TypeScript, Vite, shadcn/ui, Tailwind CSS, wouter routing, TanStack Query, Recharts
- **Backend:** Express + TypeScript, multer for file uploads, in-memory corpus storage
- **AI:** Google Gemini via Replit AI Integration (`@google/genai`), hardcoded — no user API key needed
- **Theme:** Teal primary (168 76%) with indigo/purple accents per track

## Key Directories

```
client/src/pages/       - Home, Monolingual, Bilingual, AI Insights pages
client/src/components/  - AppSidebar, FileUpload, MarkdownRender, ThemeProvider
server/                 - Express routes, corpus processing, AI integration, storage
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

## Environment

- `AI_INTEGRATIONS_GEMINI_API_KEY` and `AI_INTEGRATIONS_GEMINI_BASE_URL` provided by Replit integration
- `SESSION_SECRET` for session management
- Port 5000

## Dependencies

- `@google/genai`, `multer`, `mammoth`, `pdf-parse`, `xlsx`
- `react-markdown`, `remark-gfm`, `recharts`
- `p-limit`, `p-retry`
