import { z } from "zod";
import { pgTable, serial, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const libraryCorpora = pgTable("library_corpora", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  origin: text("origin").notNull().default("user"),
  sourceTrack: text("source_track"),
  languagePair: text("language_pair"),
  domain: text("domain"),
  sizeLabel: text("size_label"),
  license: text("license"),
  externalUrl: text("external_url"),
  samplePairs: jsonb("sample_pairs"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLibraryCorpusSchema = createInsertSchema(libraryCorpora).omit({ id: true, createdAt: true });
export type InsertLibraryCorpus = typeof insertLibraryCorpusSchema._type;
export type LibraryCorpus = typeof libraryCorpora.$inferSelect;

export interface CorpusStats {
  characters: number;
  words: number;
  uniqueWords: number;
  sentences: number;
  typeTokenRatio: number;
  avgWordsPerSentence: number;
}

export interface KeywordResult {
  term: string;
  frequency: number;
}

export interface NgramResult {
  ngram: string;
  frequency: number;
}

export interface CollocationResult {
  collocate: string;
  frequency: number;
  mi: number;
  dice: number;
}

export interface ConcordanceResult {
  left: string;
  match: string;
  right: string;
}

export interface SamplePair {
  source: string;
  target?: string;
  similarity?: number;
  strategy?: string;
}

export interface AlignedPair {
  source: string;
  target: string;
  similarity: number;
  strategy?: string;
}

export type LibraryLoadResponse =
  | { type: "monolingual"; corpusId: string; stats: CorpusStats; name: string }
  | { type: "bilingual"; corpusId: string; pairs: AlignedPair[]; name: string };

export interface AnalysisCategory {
  name: string;
  types: string[];
}

export interface AnalysisPreset {
  icon: string;
  category: string;
  description: string;
}

export const AI_ANALYSIS_CATEGORIES: AnalysisCategory[] = [
  {
    name: "Core Translation Studies",
    types: [
      "Translation Strategies",
      "Translation Universals",
      "Quality Assessment",
      "Equivalence Analysis",
      "Norms & Conventions",
    ],
  },
  {
    name: "Industry & Professional",
    types: [
      "Industry Mapping",
      "Job Market Analysis",
      "CAT Tool Readiness",
      "Localization Assessment",
      "Rate & Pricing Analysis",
    ],
  },
  {
    name: "Critical & Cultural Studies",
    types: [
      "Feminist Translation",
      "Postcolonial Translation",
      "Ideology & Power",
      "Censorship & Manipulation",
      "Cultural Mediation",
    ],
  },
  {
    name: "Specialized Domains",
    types: [
      "Audiovisual Translation",
      "Legal Translation",
      "Medical Translation",
      "Literary Translation",
      "Scientific Translation",
      "Religious Translation",
    ],
  },
  {
    name: "Research & Methodology",
    types: [
      "Corpus Design",
      "Annotation Scheme",
      "Statistical Significance",
      "Methodological Review",
      "Literature Mapping",
    ],
  },
  {
    name: "Digital & Technology",
    types: [
      "MT Post-Editing",
      "AI Translation Ethics",
      "Terminology Management",
      "Parallel Corpus Building",
      "Custom",
    ],
  },
];

export const AI_ANALYSIS_PRESETS: Record<string, AnalysisPreset> = {
  "Translation Strategies": {
    icon: "arrows-right-left",
    category: "Core Translation Studies",
    description: "Identify domestication, foreignization, explicitation, implicitation patterns",
  },
  "Translation Universals": {
    icon: "globe",
    category: "Core Translation Studies",
    description: "Detect simplification, explicitation, normalization, levelling out",
  },
  "Quality Assessment": {
    icon: "check-circle",
    category: "Core Translation Studies",
    description: "Evaluate accuracy, fluency, adequacy, and error typology",
  },
  "Equivalence Analysis": {
    icon: "scale",
    category: "Core Translation Studies",
    description: "Analyze formal, dynamic, and functional equivalence patterns",
  },
  "Norms & Conventions": {
    icon: "book-open",
    category: "Core Translation Studies",
    description: "Map initial, preliminary, and operational norms in translation",
  },
  "Industry Mapping": {
    icon: "building",
    category: "Industry & Professional",
    description: "Map translation industry landscape from corpus evidence",
  },
  "Job Market Analysis": {
    icon: "briefcase",
    category: "Industry & Professional",
    description: "Extract job roles, skills, and market trends from text",
  },
  "CAT Tool Readiness": {
    icon: "wrench",
    category: "Industry & Professional",
    description: "Assess text compatibility with CAT tools and TM leverage",
  },
  "Localization Assessment": {
    icon: "map-pin",
    category: "Industry & Professional",
    description: "Evaluate localization needs and cultural adaptation requirements",
  },
  "Rate & Pricing Analysis": {
    icon: "dollar-sign",
    category: "Industry & Professional",
    description: "Extract pricing models, rates, and economic factors",
  },
  "Feminist Translation": {
    icon: "heart",
    category: "Critical & Cultural Studies",
    description: "Analyze gender representation and feminist translation strategies",
  },
  "Postcolonial Translation": {
    icon: "landmark",
    category: "Critical & Cultural Studies",
    description: "Examine power dynamics and postcolonial translation approaches",
  },
  "Ideology & Power": {
    icon: "shield",
    category: "Critical & Cultural Studies",
    description: "Uncover ideological manipulation and power relations in translation",
  },
  "Censorship & Manipulation": {
    icon: "eye-off",
    category: "Critical & Cultural Studies",
    description: "Detect censorship, omission, and textual manipulation patterns",
  },
  "Cultural Mediation": {
    icon: "users",
    category: "Critical & Cultural Studies",
    description: "Analyze cultural transfer and mediation strategies",
  },
  "Audiovisual Translation": {
    icon: "film",
    category: "Specialized Domains",
    description: "Analyze subtitling, dubbing, and AVT-specific constraints",
  },
  "Legal Translation": {
    icon: "gavel",
    category: "Specialized Domains",
    description: "Examine legal terminology, precision, and normative language",
  },
  "Medical Translation": {
    icon: "stethoscope",
    category: "Specialized Domains",
    description: "Analyze medical terminology and patient-facing language",
  },
  "Literary Translation": {
    icon: "book-text",
    category: "Specialized Domains",
    description: "Examine style, voice, and literary devices in translation",
  },
  "Scientific Translation": {
    icon: "flask-conical",
    category: "Specialized Domains",
    description: "Analyze scientific terminology and discourse conventions",
  },
  "Religious Translation": {
    icon: "church",
    category: "Specialized Domains",
    description: "Examine sacred text translation and theological terminology",
  },
  "Corpus Design": {
    icon: "database",
    category: "Research & Methodology",
    description: "Evaluate corpus representativeness, balance, and sampling",
  },
  "Annotation Scheme": {
    icon: "tag",
    category: "Research & Methodology",
    description: "Suggest annotation categories and coding schemes",
  },
  "Statistical Significance": {
    icon: "bar-chart",
    category: "Research & Methodology",
    description: "Assess statistical validity and significance of findings",
  },
  "Methodological Review": {
    icon: "clipboard-list",
    category: "Research & Methodology",
    description: "Review and suggest methodological improvements",
  },
  "Literature Mapping": {
    icon: "map",
    category: "Research & Methodology",
    description: "Map relevant literature and theoretical frameworks",
  },
  "MT Post-Editing": {
    icon: "bot",
    category: "Digital & Technology",
    description: "Analyze MT output quality and post-editing effort",
  },
  "AI Translation Ethics": {
    icon: "brain",
    category: "Digital & Technology",
    description: "Examine ethical implications of AI in translation",
  },
  "Terminology Management": {
    icon: "list",
    category: "Digital & Technology",
    description: "Extract and organize domain-specific terminology",
  },
  "Parallel Corpus Building": {
    icon: "layers",
    category: "Digital & Technology",
    description: "Guide parallel corpus construction and alignment",
  },
  "Custom": {
    icon: "settings",
    category: "Digital & Technology",
    description: "Define your own analysis with custom instructions",
  },
};

export const uploadSchema = z.object({
  corpusId: z.string(),
  stats: z.object({
    characters: z.number(),
    words: z.number(),
    uniqueWords: z.number(),
    sentences: z.number(),
    typeTokenRatio: z.number(),
    avgWordsPerSentence: z.number(),
  }),
});

export type UploadResponse = z.infer<typeof uploadSchema>;
