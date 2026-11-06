import { analyze, concordance, collocations, compare } from "./engine";
self.onmessage = async ({ data }) => {
  try {
    const {
      id,
      action,
      documents,
      options,
      query,
      window,
      minimum,
      reference,
      context,
    } = data;
    let result;
    if (action === "detect") {
      const { detectLanguage } = await import("./language-detection");
      result = documents.map((doc: { text: string }) =>
        detectLanguage(doc.text),
      );
    } else if (action === "analyze") result = analyze(documents, options);
    else if (action === "concordance")
      result = concordance(documents, options, query, context);
    else if (action === "collocations")
      result = collocations(documents, options, query, window, minimum);
    else if (action === "compare") {
      const a = analyze(documents, options),
        b = analyze(reference, options);
      result = { a, b, rows: compare(a, b) };
    } else throw new Error("Unknown analysis");
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({
      id: data.id,
      error: error instanceof Error ? error.message : "Analysis failed",
    });
  }
};
