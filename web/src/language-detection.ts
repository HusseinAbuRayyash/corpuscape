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
export function draftLanguageNotice(text: string, requested: string): string {
  if (text.length < 100 || !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(requested))
    return "";
  let expected: string;
  try {
    expected = Intl.getCanonicalLocales(requested)[0].split("-")[0];
  } catch {
    return "";
  }
  const kana = (text.match(/[\p{Script=Hiragana}\p{Script=Katakana}]/gu) ?? [])
    .length;
  const han = (text.match(/\p{Script=Han}/gu) ?? []).length;
  const latin = (text.match(/\p{Script=Latin}/gu) ?? []).length;
  if (
    ((expected === "ja" && kana > 0) ||
      (expected === "zh" && han > 0 && kana === 0)) &&
    latin > han + kana
  )
    return `The draft mixes ${expected === "ja" ? "Japanese" : "Chinese"} script with substantial Latin-script text. Review whether the requested language is used throughout; short numeric lists do not support a reliable whole-draft language label.`;
  // Labels and numerical lists can be long in characters yet too short for trigram inference.
  if ((text.match(/\p{Letter}/gu) ?? []).length < 120) return "";
  const detected = detectLanguage(text);
  if (detected.tag === "und" || detected.tag.split("-")[0] === expected)
    return "";
  const name =
    new Intl.DisplayNames(["en"], { type: "language" }).of(expected) ??
    requested;
  return `Language check suggests ${detected.name}; the draft requested ${name}. Review the language or try the larger model. This statistical check is a suggestion, especially for mixed text.`;
}
