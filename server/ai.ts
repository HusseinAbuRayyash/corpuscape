import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

const MODEL = "gemini-2.5-flash";

export async function generateContent(prompt: string, text: string, maxChars: number = 12000): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `${prompt}\n\nText:\n${text.slice(0, maxChars)}`,
    });
    return response.text || "No response generated.";
  } catch (error: any) {
    console.error("Gemini API error:", error);
    return `Error: ${error.message || "Failed to generate response"}`;
  }
}

const ANALYSIS_PROMPTS: Record<string, string> = {
  "Translation Strategies": `Analyze the translation strategies found in this corpus. Identify patterns of:
- Domestication vs. Foreignization
- Explicitation vs. Implicitation  
- Literal vs. Free translation
- Omission and Addition
- Modulation and Transposition
Provide specific examples from the text. Format with clear headings and bullet points.`,

  "Translation Universals": `Analyze this corpus for evidence of translation universals:
1. EXPLICITATION: Is the text more explicit than typical source texts?
2. SIMPLIFICATION: Is vocabulary/syntax simpler than expected?
3. NORMALIZATION: Does the text conform heavily to target-language conventions?
4. LEVELLING OUT: Is stylistic variation reduced?
5. UNIQUE ITEMS: Are target-language-specific features underrepresented?
For each universal, indicate if present (YES/NO) and give 1-2 brief examples. Format as a clear report suitable for a research paper.`,

  "Quality Assessment": `Perform a translation quality assessment of this corpus. Evaluate:
- Accuracy and faithfulness to source meaning
- Fluency and naturalness in the target language
- Terminology consistency
- Style and register appropriateness
- Error typology (omissions, additions, mistranslations, etc.)
Provide a structured report with examples.`,

  "Equivalence Analysis": `Analyze patterns of equivalence in this corpus:
- Formal equivalence (word-for-word correspondence)
- Dynamic equivalence (effect-based correspondence)
- Functional equivalence (purpose-based correspondence)
- Cultural equivalence
Provide examples and assess the dominant approach.`,

  "Norms & Conventions": `Map the translation norms observable in this corpus:
- Initial norms (adequacy vs. acceptability orientation)
- Preliminary norms (translation policy, directness)
- Operational norms (matricial and textual-linguistic decisions)
Provide evidence from the text.`,

  "Industry Mapping": `Map the translation industry landscape from this corpus:
- Key sectors and domains represented
- Service types mentioned
- Technology and tools referenced
- Market trends and patterns
- Professional standards and practices
Format as a structured industry report.`,

  "Job Market Analysis": `Extract job market insights from this corpus:
- Roles and positions mentioned
- Required skills and competencies
- Languages and language pairs
- Industry sectors hiring translators
- Trends in translator employment
Format as a market analysis report with key findings.`,

  "CAT Tool Readiness": `Assess this text's compatibility with CAT tools:
- Segment-level analysis (sentence boundaries, formatting)
- Repetition rate and TM leverage potential
- Terminology consistency and glossary extraction
- Tag and formatting complexity
- Recommended CAT tool workflow`,

  "Localization Assessment": `Evaluate localization requirements:
- Cultural references requiring adaptation
- Date, time, number format issues
- UI/UX text constraints
- Legal/regulatory compliance needs
- Multimedia and layout considerations`,

  "Rate & Pricing Analysis": `Extract pricing and economic insights:
- Rate structures mentioned
- Word/hour/project pricing models
- Market positioning and competition
- Value-added services
- Economic factors affecting translation pricing`,

  "Feminist Translation": `Analyze this corpus through a feminist translation lens:
- Gender representation and bias
- Inclusive language usage
- Power dynamics in gendered language
- Feminist translation strategies applied
- Recommendations for gender-sensitive translation`,

  "Postcolonial Translation": `Examine postcolonial aspects in this corpus:
- Power asymmetries between languages/cultures
- Resistance and subversion strategies
- Hybrid and creolized language use
- Representation of the Other
- Decolonizing translation practices`,

  "Ideology & Power": `Uncover ideological patterns:
- Political framing and bias
- Institutional power dynamics
- Propaganda and persuasion techniques
- Media representation patterns
- Critical discourse analysis findings`,

  "Censorship & Manipulation": `Detect potential censorship or manipulation:
- Omissions and deletions
- Additions and interpolations
- Semantic shifts and distortions
- Euphemistic replacements
- Ideological filtering patterns`,

  "Cultural Mediation": `Analyze cultural mediation strategies:
- Cultural references and their treatment
- Domestication vs. foreignization balance
- Cultural gaps and bridging strategies
- Intercultural communication patterns
- Reader/audience consideration`,

  "Audiovisual Translation": `Analyze AVT-specific features:
- Subtitle length and reading speed constraints
- Condensation and reduction strategies
- Synchronization and timing issues
- Register and dialect treatment
- Multimodal considerations`,

  "Legal Translation": `Examine legal translation aspects:
- Legal terminology precision
- System-specific legal concepts
- Performative and normative language
- Ambiguity and clarity balance
- Cross-jurisdictional challenges`,

  "Medical Translation": `Analyze medical translation features:
- Medical terminology accuracy
- Patient vs. professional register
- Drug names and dosage formats
- Regulatory compliance language
- Cultural sensitivity in health communication`,

  "Literary Translation": `Examine literary translation qualities:
- Style and voice preservation
- Figurative language treatment
- Rhythm and sound patterns
- Cultural allusions and intertextuality
- Creative solutions and compensation strategies`,

  "Scientific Translation": `Analyze scientific discourse features:
- Technical terminology handling
- Hedging and certainty markers
- Citation and reference conventions
- Data presentation formats
- Discipline-specific conventions`,

  "Religious Translation": `Examine religious text translation:
- Sacred terminology treatment
- Theological concept accuracy
- Liturgical language conventions
- Interfaith sensitivity
- Historical translation traditions`,

  "Corpus Design": `Evaluate corpus design quality:
- Representativeness and balance
- Sampling methodology
- Size adequacy for research questions
- Metadata and annotation
- Comparability with reference corpora`,

  "Annotation Scheme": `Suggest annotation categories:
- Relevant linguistic features to annotate
- Translation-specific categories
- Coding scheme recommendations
- Inter-annotator agreement considerations
- Tool recommendations for annotation`,

  "Statistical Significance": `Assess statistical aspects:
- Sample size adequacy
- Distribution patterns
- Key statistical measures to apply
- Potential confounding variables
- Recommended statistical tests`,

  "Methodological Review": `Review methodological aspects:
- Research design strengths/weaknesses
- Data collection appropriateness
- Analysis method suitability
- Validity and reliability
- Suggested improvements`,

  "Literature Mapping": `Map relevant literature:
- Key theoretical frameworks
- Seminal works referenced
- Current research trends
- Gaps in existing literature
- Recommended readings`,

  "MT Post-Editing": `Analyze MT post-editing aspects:
- Error patterns typical of MT output
- Post-editing effort estimation
- Quality vs. productivity trade-offs
- Training data implications
- Best practices for PE workflow`,

  "AI Translation Ethics": `Examine AI translation ethics:
- Bias and fairness concerns
- Data privacy and consent
- Transparency and accountability
- Impact on human translators
- Ethical guidelines and standards`,

  "Terminology Management": `Extract and organize terminology:
- Domain-specific terms (20+ terms)
- Definitions and context
- Frequency and distribution
- Variants and synonyms
- Recommended term base structure`,

  "Parallel Corpus Building": `Guide parallel corpus construction:
- Alignment considerations
- Quality assurance checks
- Metadata requirements
- Format and encoding standards
- Recommended tools and workflows`,

  "Custom": `Analyze the following corpus based on the custom instructions provided. Be thorough and specific. Use examples from the text.`,
};

export async function runAnalysis(
  text: string,
  analysisType: string,
  customInstructions?: string,
  maxChars: number = 12000
): Promise<string> {
  let prompt = ANALYSIS_PROMPTS[analysisType] || ANALYSIS_PROMPTS["Custom"];
  if (customInstructions && customInstructions.trim()) {
    prompt += `\n\nAdditional instructions: ${customInstructions}`;
  }
  return generateContent(prompt, text, maxChars);
}

export async function summarizeCorpus(text: string, maxChars: number = 15000): Promise<string> {
  const prompt = `Summarize this corpus in 3-5 concise paragraphs for a translation studies researcher. Cover: main themes, register/style, key terminology domains, and any notable patterns. Be specific and use examples from the text.`;
  return generateContent(prompt, text, maxChars);
}

export async function extractTopics(text: string, nTopics: number = 8): Promise<string> {
  const prompt = `Extract exactly ${nTopics} main topics/themes from this corpus. For each topic provide:
1. Topic name (2-4 words)
2. Brief description
3. Example keywords from the text

Format as a markdown table:
| Topic | Description | Keywords |
|-------|-------------|----------|`;
  return generateContent(prompt, text, 10000);
}

export async function extractTerminology(text: string): Promise<string> {
  const prompt = `Extract 20 domain-specific terms from this corpus. For each term provide:
- The term
- Frequency estimate (high/medium/low)
- Example sentence from the text
- Domain classification

Format as a markdown table:
| Term | Frequency | Example | Domain |
|------|-----------|---------|--------|`;
  return generateContent(prompt, text, 8000);
}

export async function alignSentences(source: string, target: string): Promise<any[]> {
  const srcSents = source.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 15);
  const tgtSents = target.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 15);

  if (!srcSents.length || !tgtSents.length) {
    return [{ source: source.slice(0, 200), target: target.slice(0, 200), similarity: 0 }];
  }

  const maxPairs = Math.min(srcSents.length, 30);
  const pairsText = srcSents.slice(0, maxPairs).map((s, i) => `${i + 1}. ${s}`).join("\n");
  const targetsText = tgtSents.slice(0, 50).map((s, i) => `${i + 1}. ${s}`).join("\n");

  const prompt = `You are aligning source and target sentences. For each source sentence, find the best matching target sentence.

SOURCE SENTENCES:
${pairsText}

TARGET SENTENCES:
${targetsText}

Return ONLY a JSON array of objects with "source", "target", and "similarity" (0-1 score) fields. Example:
[{"source": "...", "target": "...", "similarity": 0.85}]`;

  try {
    const response = await generateContent(prompt, "", maxPairs * 500);
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    const fallback = srcSents.slice(0, maxPairs).map((s, i) => ({
      source: s,
      target: tgtSents[Math.min(i, tgtSents.length - 1)] || "",
      similarity: 0.5,
    }));
    return fallback;
  } catch {
    return srcSents.slice(0, maxPairs).map((s, i) => ({
      source: s,
      target: tgtSents[Math.min(i, tgtSents.length - 1)] || "",
      similarity: 0.5,
    }));
  }
}

export async function labelStrategies(pairs: any[]): Promise<string[]> {
  const maxPairs = Math.min(pairs.length, 15);
  const pairsText = pairs.slice(0, maxPairs).map((p: any, i: number) => 
    `${i + 1}. SOURCE: ${p.source} | TARGET: ${p.target}`
  ).join("\n");

  const prompt = `For each numbered pair below, identify the PRIMARY translation strategy. Use exactly one of: Domestication, Foreignization, Explicitation, Implicitation, Literal, Omission, Addition, Modulation, Generalization, Specification.
Return ONLY a numbered list: one strategy per line, e.g. "1. Domestication"`;

  const raw = await generateContent(prompt, pairsText);
  const labels: string[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.match(/^\d+\./)) {
      labels.push(trimmed.replace(/^\d+\.\s*/, "").trim());
    }
  }
  while (labels.length < maxPairs) labels.push("");
  return labels.slice(0, maxPairs);
}

export async function analyzeUniversals(pairs: any[]): Promise<string> {
  const pairsText = pairs.slice(0, 15).map((p: any, i: number) => 
    `${i + 1}. SRC: ${p.source} | TGT: ${p.target}`
  ).join("\n");

  const prompt = `Analyze these aligned translation pairs for translation universals.
For each universal, indicate if present (YES/NO) and give 1-2 brief examples:
1. EXPLICITATION
2. SIMPLIFICATION
3. NORMALIZATION
4. LEVELLING OUT
5. UNIQUE ITEMS
Format as a clear bullet-point report suitable for a research paper.`;

  return generateContent(prompt, pairsText);
}

export async function analyzeStrategies(pairs: any[]): Promise<string> {
  const pairsText = pairs.slice(0, 20).map((p: any, i: number) => 
    `${i + 1}. SRC: ${p.source} | TGT: ${p.target} | Strategy: ${p.strategy || "N/A"}`
  ).join("\n");

  const prompt = `Analyze the translation strategies in these aligned pairs. Identify dominant strategies (domestication, explicitation, etc.), discuss patterns, and provide a summary analysis suitable for academic writing.`;

  return generateContent(prompt, pairsText);
}

export function generateResearchReport(
  stats?: any,
  keywords?: any[],
  alignedPairs?: any[],
  aiSummary?: string,
  aiAnalyses?: Array<{ name: string; content: string }>
): string {
  const lines: string[] = [
    "# TransCorpus AI - Research Report",
    "",
    `*Generated: ${new Date().toISOString().split("T")[0]}*`,
    "",
    "---",
    "",
    "## 1. Methodology",
    "",
    "This report was produced using TransCorpus AI, an AI-powered corpus analysis tool for translation studies.",
    "Analyses include: corpus statistics, keyword extraction, n-gram analysis, concordancing, and AI-powered insights.",
    "",
    "**Tool citation:** TransCorpus AI. (2026). ATISA Pre-Workshop. Hussein Abu-Rayyash.",
    "",
    "---",
    "",
  ];

  if (stats) {
    lines.push("## 2. Corpus Statistics", "", "| Metric | Value |", "|--------|-------|");
    for (const [k, v] of Object.entries(stats)) {
      lines.push(`| ${k} | ${v} |`);
    }
    lines.push("", "");
  }

  if (keywords && keywords.length > 0) {
    lines.push("## 3. Top Keywords", "", "| Term | Frequency |", "|------|-----------|");
    for (const kw of keywords.slice(0, 20)) {
      lines.push(`| ${kw.term} | ${kw.frequency} |`);
    }
    lines.push("", "");
  }

  if (alignedPairs && alignedPairs.length > 0) {
    lines.push("## 4. Bilingual Analysis", "", `- **Aligned pairs:** ${alignedPairs.length}`, "");
    const avgSim = alignedPairs.reduce((s: number, p: any) => s + (p.similarity || 0), 0) / alignedPairs.length;
    lines.push(`- **Average similarity:** ${avgSim.toFixed(3)}`, "");
  }

  let sectionNum = 5;
  if (aiSummary) {
    lines.push(`## ${sectionNum}. AI Corpus Summary`, "", aiSummary, "", "---", "");
    sectionNum++;
  }

  if (aiAnalyses) {
    for (const { name, content } of aiAnalyses) {
      if (content?.trim()) {
        lines.push(`## ${sectionNum}. AI Analysis: ${name}`, "", content.trim(), "", "---", "");
        sectionNum++;
      }
    }
  }

  lines.push("## References", "", "TransCorpus AI. (2026). AI-Powered Corpus Lab for Translation Studies. ATISA Pre-Workshop.", "");
  return lines.join("\n");
}

export function generateTMX(pairs: any[], srcLang: string = "en", tgtLang: string = "ar"): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  let body = "";
  for (const p of pairs) {
    body += `    <tu>\n      <tuv xml:lang="${srcLang}"><seg>${esc(p.source || "")}</seg></tuv>\n      <tuv xml:lang="${tgtLang}"><seg>${esc(p.target || "")}</seg></tuv>\n    </tu>\n`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<tmx version="1.4">\n  <header creationtool="TransCorpus AI" creationtoolversion="1.0" datatype="plaintext" segtype="sentence" adminlang="en" srclang="${srcLang}" o-tmf="unknown">\n    <note>Exported from TransCorpus AI</note>\n  </header>\n  <body>\n${body}  </body>\n</tmx>`;
}
