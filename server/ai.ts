import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

const MODEL = "gemini-2.5-flash";

export async function generateContent(prompt: string, text: string, maxChars: number = 200000): Promise<string> {
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
  maxChars: number = 200000
): Promise<string> {
  let prompt = ANALYSIS_PROMPTS[analysisType] || ANALYSIS_PROMPTS["Custom"];
  if (customInstructions && customInstructions.trim()) {
    prompt += `\n\nAdditional instructions: ${customInstructions}`;
  }
  return generateContent(prompt, text, maxChars);
}

export async function generateChartData(
  text: string,
  prompt: string,
  maxChars: number = 80000
): Promise<{ title: string; data: { label: string; value: number }[] }> {
  const systemPrompt = `You are a corpus analysis assistant. The user wants to visualize specific data from a corpus as a chart.
Based on their request, analyze the corpus text and produce chart-ready data.

User request: ${prompt}

IMPORTANT: Respond ONLY with a valid JSON object in this exact format, no markdown fences, no explanation:
{"title":"Chart Title Here","data":[{"label":"Category 1","value":42},{"label":"Category 2","value":28}]}

Rules:
- The corpus may include a DATASET STRUCTURE section with pre-computed column value frequencies. USE THESE EXACT COUNTS — do not estimate or approximate when exact data is provided.
- If the user asks for "top N" items, return exactly N items (or all items if fewer than N exist)
- If the user asks to "list all", "show all", or "every", return ALL matching items found — do NOT limit or truncate
- Otherwise return up to 100 data points, sorted by value descending unless order matters (e.g. chronological)
- Labels must be short (1-5 words) and descriptive
- Values must be positive numbers (counts, percentages, scores — whatever fits the request)
- The title should clearly describe what the chart shows
- When COLUMN data is provided with exact frequencies, use those exact numbers — do not recount from raw text
- Be exhaustive and precise: include every matching item from the data`;

  const raw = await generateContent(systemPrompt, text, maxChars);
  try {
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.title || !Array.isArray(parsed.data) || parsed.data.length === 0) {
      throw new Error("Invalid chart data structure");
    }
    const filteredData = parsed.data
      .map((d: any) => ({
        label: String(d.label || "").trim(),
        value: Number(d.value) || 0,
      }))
      .filter((d: any) => d.label && d.value > 0);
    if (filteredData.length === 0) {
      throw new Error("AI could not extract quantifiable data for this prompt. Try a more specific request.");
    }
    return { title: parsed.title, data: filteredData };
  } catch (e: any) {
    throw new Error(e.message || "Failed to generate chart data");
  }
}

export async function summarizeCorpus(text: string, maxChars: number = 200000): Promise<string> {
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
  return generateContent(prompt, text);
}

export async function extractTerminology(text: string): Promise<string> {
  const prompt = `Extract ALL domain-specific terms from this corpus (as many as you can find). For each term provide:
- The term
- Frequency estimate (high/medium/low)
- Example sentence from the text
- Domain classification

Format as a markdown table:
| Term | Frequency | Example | Domain |
|------|-----------|---------|--------|`;
  return generateContent(prompt, text);
}

function segmentSentences(text: string): string[] {
  const sentenceEnders = /(?<=[.!?؟。！？\n])\s+/;
  const raw = text.split(sentenceEnders).map(s => s.trim()).filter(s => s.length > 5);

  if (raw.length <= 2 && text.length > 100) {
    const byNewline = text.split(/\n+/).map(s => s.trim()).filter(s => s.length > 5);
    if (byNewline.length > raw.length) return byNewline;
  }

  return raw;
}

export async function alignSentences(source: string, target: string): Promise<any[]> {
  const srcTrimmed = source.slice(0, 100000);
  const tgtTrimmed = target.slice(0, 100000);

  const prompt = `You are a professional bilingual sentence alignment expert for translation studies.

TASK: Align the source text with the target text at the SENTENCE level.

STEP 1 — CLEAN: Remove noise from both texts:
- Strip URLs, page numbers, timestamps, dates, agency codes (SPA, SPR, SAAS, WAS, ESPRE, etc.)
- Strip repeated headers/footers, navigation text, logos text
- Keep ONLY actual content: headlines, subheadings, body sentences

STEP 2 — SEGMENT: Split cleaned text into individual sentences:
- Split at sentence-ending punctuation: . ! ? ؟ 。
- Each headline or subheading is its own segment
- Never merge multiple sentences into one segment

STEP 3 — ALIGN: Match each source sentence to its target translation:
- A source headline should match the target headline
- A source body sentence should match the corresponding target body sentence
- If a sentence has no equivalent, leave the other field as ""
- Never duplicate — each sentence appears in exactly ONE pair
- Similarity: 1.0 = exact translation, 0.7-0.9 = close, 0.3-0.6 = partial, 0.0 = no match

SOURCE TEXT:
${srcTrimmed}

TARGET TEXT:
${tgtTrimmed}

Return ONLY a valid JSON array. Each element: {"source": "exact source sentence", "target": "exact target sentence", "similarity": 0.85}
No markdown, no explanation, just the JSON array.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    });
    const raw = response.text || "";
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p: any) => ({
          source: (p.source || "").trim(),
          target: (p.target || "").trim(),
          similarity: typeof p.similarity === "number" ? p.similarity : 0.5,
        }));
      }
    }
  } catch (err) {
    console.error("AI alignment error:", err);
  }

  const srcSents = segmentSentences(source);
  const tgtSents = segmentSentences(target);
  const maxPairs = Math.max(srcSents.length, tgtSents.length);
  return Array.from({ length: maxPairs }, (_, i) => ({
    source: srcSents[i] || "",
    target: tgtSents[i] || "",
    similarity: 0.5,
  }));
}

export async function labelStrategies(pairs: any[]): Promise<string[]> {
  const BATCH_SIZE = 50;
  const allLabels: string[] = [];

  for (let start = 0; start < pairs.length; start += BATCH_SIZE) {
    const batch = pairs.slice(start, start + BATCH_SIZE);
    const pairsText = batch.map((p: any, i: number) => 
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
    while (labels.length < batch.length) labels.push("");
    allLabels.push(...labels.slice(0, batch.length));
  }

  return allLabels;
}

export async function analyzeUniversals(pairs: any[]): Promise<string> {
  const pairsText = pairs.map((p: any, i: number) => 
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
  const pairsText = pairs.map((p: any, i: number) => 
    `${i + 1}. SRC: ${p.source} | TGT: ${p.target} | Strategy: ${p.strategy || "N/A"}`
  ).join("\n");

  const prompt = `Analyze the translation strategies in these aligned pairs. Identify dominant strategies (domestication, explicitation, etc.), discuss patterns, and provide a summary analysis suitable for academic writing.`;

  return generateContent(prompt, pairsText);
}

export async function chatWithCorpus(
  text: string,
  message: string,
  history: { role: string; content: string }[] = [],
  maxChars: number = 200000
): Promise<string> {
  const historyText = history.length > 0
    ? "\n\nConversation so far:\n" + history.map(h => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`).join("\n")
    : "";
  const prompt = `You are an expert corpus linguistics assistant analyzing a specific corpus of text. Answer questions about the corpus with precision, citing specific examples from the text when possible. Be concise but thorough. Format your response with markdown.${historyText}\n\nUser's question: ${message}`;
  return generateContent(prompt, text, maxChars);
}

export async function backTranslate(
  pairs: { source: string; target: string }[],
  srcLang: string = "en",
  tgtLang: string = "ar"
): Promise<{ source: string; target: string; backTranslation: string; driftNotes: string }[]> {
  const BATCH_SIZE = 30;
  const allResults: { source: string; target: string; backTranslation: string; driftNotes: string }[] = [];

  for (let start = 0; start < pairs.length; start += BATCH_SIZE) {
    const batch = pairs.slice(start, start + BATCH_SIZE);
    const pairsText = batch.map((p, i) =>
      `${i + 1}. TARGET: ${p.target}`
    ).join("\n");

    const prompt = `Translate each numbered target text back into ${srcLang}. For each, provide:
1. The back-translation
2. Brief notes on any semantic drift compared to how a typical original ${srcLang} text would phrase this

IMPORTANT: Return ONLY a valid JSON array, no markdown fences:
[{"index":1,"backTranslation":"...","driftNotes":"..."}]`;

    const raw = await generateContent(prompt, pairsText);
    try {
      const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON array found");
      const parsed = JSON.parse(jsonMatch[0]);
      for (let i = 0; i < batch.length; i++) {
        allResults.push({
          source: batch[i].source,
          target: batch[i].target,
          backTranslation: parsed[i]?.backTranslation || "",
          driftNotes: parsed[i]?.driftNotes || "",
        });
      }
    } catch {
      for (const p of batch) {
        allResults.push({
          source: p.source,
          target: p.target,
          backTranslation: "",
          driftNotes: "Could not generate back-translation",
        });
      }
    }
  }

  return allResults;
}

export async function generateGlossary(
  pairs: { source: string; target: string }[]
): Promise<{ sourceTerm: string; targetTerm: string; definition: string; example: string }[]> {
  const BATCH_SIZE = 40;
  const allTerms: { sourceTerm: string; targetTerm: string; definition: string; example: string }[] = [];
  const seenTerms = new Set<string>();

  for (let start = 0; start < pairs.length; start += BATCH_SIZE) {
    const batch = pairs.slice(start, start + BATCH_SIZE);
    const pairsText = batch.map((p, i) =>
      `${i + 1}. SRC: ${p.source} | TGT: ${p.target}`
    ).join("\n");

    const prompt = `Extract a comprehensive bilingual glossary from ALL these aligned translation pairs. Identify as many key terms and their translations as you can find.

IMPORTANT: Return ONLY a valid JSON array, no markdown fences:
[{"sourceTerm":"...","targetTerm":"...","definition":"Brief definition in source language","example":"Short usage example from the corpus"}]

Rules:
- Focus on domain-specific, technical, or culturally significant terms
- Each term should appear in the provided pairs
- Definitions should be concise (1 sentence)
- Examples should be brief quotes from the corpus text`;

    const raw = await generateContent(prompt, pairsText);
    try {
      const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON array found");
      const parsed = JSON.parse(jsonMatch[0]);
      for (const item of parsed) {
        const key = `${String(item.sourceTerm || "").toLowerCase()}|${String(item.targetTerm || "").toLowerCase()}`;
        if (!seenTerms.has(key)) {
          seenTerms.add(key);
          allTerms.push({
            sourceTerm: String(item.sourceTerm || ""),
            targetTerm: String(item.targetTerm || ""),
            definition: String(item.definition || ""),
            example: String(item.example || ""),
          });
        }
      }
    } catch {
      // skip failed batch
    }
  }

  return allTerms;
}

export function generateResearchReport(
  stats?: any,
  keywords?: any[],
  alignedPairs?: any[],
  aiSummary?: string,
  aiAnalyses?: Array<{ name: string; content: string }>
): string {
  const lines: string[] = [
    "# Traduxa - Research Report",
    "",
    `*Generated: ${new Date().toISOString().split("T")[0]}*`,
    "",
    "---",
    "",
    "## 1. Methodology",
    "",
    "This report was produced using Traduxa, a corpus linguistics lab for translation studies.",
    "Analyses include: corpus statistics, keyword extraction, n-gram analysis, concordancing, and AI-powered insights.",
    "",
    "**Tool citation:** Traduxa. (2026). ATISA Pre-Workshop. Hussein Abu-Rayyash.",
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
    for (const kw of keywords) {
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

  lines.push("## References", "", "Traduxa. (2026). Corpus Compilation & Analysis Lab.", "");
  return lines.join("\n");
}

export function generateTMX(pairs: any[], srcLang: string = "en", tgtLang: string = "ar"): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  let body = "";
  for (const p of pairs) {
    body += `    <tu>\n      <tuv xml:lang="${srcLang}"><seg>${esc(p.source || "")}</seg></tuv>\n      <tuv xml:lang="${tgtLang}"><seg>${esc(p.target || "")}</seg></tuv>\n    </tu>\n`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<tmx version="1.4">\n  <header creationtool="Traduxa" creationtoolversion="1.0" datatype="plaintext" segtype="sentence" adminlang="en" srclang="${srcLang}" o-tmf="unknown">\n    <note>Exported from Traduxa</note>\n  </header>\n  <body>\n${body}  </body>\n</tmx>`;
}
