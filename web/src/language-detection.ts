import { francAll } from "franc-all";
export interface LanguageSuggestion {
  tag: string;
  name: string;
  alternatives: { tag: string; name: string }[];
  method: string;
}
export function detectLanguage(text: string): LanguageSuggestion {
  const names = new Intl.DisplayNames(["en"], { type: "language" });
  const name = (tag: string) => names.of(tag) ?? tag;
  const results = francAll(text, { minLength: 30 })
    .filter(([code]) => code !== "und")
    .slice(0, 3);
  const candidates = results.map(([code]) => {
    let tag: string;
    try {
      tag = Intl.getCanonicalLocales(code)[0];
    } catch {
      tag = "und";
    }
    return { tag, name: name(tag) };
  });
  if (!candidates.length)
    return {
      tag: "und",
      name: "Not enough reliable evidence",
      alternatives: [],
      method:
        "Local character-trigram detection; review short or mixed-language documents manually.",
    };
  return {
    ...candidates[0],
    alternatives: candidates.slice(1),
    method:
      "Local character-trigram language suggestion. Ranking is not an accuracy probability; review before applying.",
  };
}
