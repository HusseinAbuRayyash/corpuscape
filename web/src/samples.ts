import type { CorpusDocument } from "./engine";
export const samples: {
  name: string;
  locale: string;
  description: string;
  documents: CorpusDocument[];
}[] = [
  {
    name: "Translation & language",
    locale: "en",
    description: "English · 3 original teaching texts",
    documents: [
      {
        name: "Translation as practice",
        text: "Translation connects people across languages. A translator studies context, audience, and purpose. Translation is more than replacing one word with another. Each language offers a different way of describing experience. A good translation preserves meaning while respecting the conventions of the target language. Researchers compare translations to understand recurring choices. These choices reveal patterns in language and translation practice.",
      },
      {
        name: "Learning with corpora",
        text: "A corpus is a collection of texts. Corpus analysis makes patterns in language visible. Researchers use a corpus to study word frequency, collocations, and meaning in context. A concordance shows how a word appears in different texts. Comparing corpora can reveal differences in language use. Frequency alone does not explain meaning. Researchers interpret patterns alongside context and their research questions.",
      },
      {
        name: "Open research",
        text: "Open tools make research more accessible. Students can explore language with a small corpus before working with a larger collection. Transparent methods help researchers understand how results were produced. Research should respect the people represented in texts. Private analysis keeps research texts on the researcher’s device. Accessible tools support teaching, translation, and the study of language.",
      },
    ],
  },
  {
    name: "Languages in conversation",
    locale: "und",
    description: "10 languages · original teaching examples",
    documents: [
      {
        name: "Español",
        locale: "es",
        text: "La traducción conecta a las personas. El lenguaje cambia con el contexto. Estudiamos las palabras y sus significados. La traducción requiere atención al contexto y a la cultura.",
      },
      {
        name: "Français",
        locale: "fr",
        text: "La traduction relie les personnes. La langue évolue selon le contexte. Nous étudions les mots et leurs usages. La traduction respecte le contexte et la culture.",
      },
      {
        name: "Русский",
        locale: "ru",
        text: "Перевод объединяет людей. Язык меняется в зависимости от контекста. Мы изучаем слова и их значения. Перевод требует внимания к языку и культуре.",
      },
      {
        name: "中文",
        locale: "zh",
        text: "翻译连接不同文化的人们。语言随着语境而变化。我们研究词语及其意义。翻译需要理解语言和文化。语言研究帮助我们理解世界。",
      },
      {
        name: "日本語",
        locale: "ja",
        text: "翻訳は人と人をつなぎます。言語は文脈によって変化します。私たちは言葉の意味を研究します。翻訳には言語と文化の理解が必要です。",
      },
      {
        name: "العربية",
        locale: "ar",
        text: "الترجمة تربط بين الناس والثقافات. تتغير اللغة بحسب السياق. ندرس الكلمات ومعانيها في النصوص. تتطلب الترجمة فهم اللغة والثقافة والسياق.",
      },
      {
        name: "Deutsch",
        locale: "de",
        text: "Übersetzung verbindet Menschen. Sprache verändert sich mit dem Kontext. Wir untersuchen Wörter und ihre Bedeutungen. Übersetzung erfordert Verständnis für Sprache und Kultur.",
      },
      {
        name: "Português",
        locale: "pt",
        text: "A tradução conecta pessoas e culturas. A língua muda com o contexto. Estudamos palavras e seus significados. A tradução exige atenção à língua e à cultura.",
      },
      {
        name: "हिन्दी",
        locale: "hi",
        text: "अनुवाद लोगों को जोड़ता है। भाषा संदर्भ के साथ बदलती है। हम शब्दों और उनके अर्थों का अध्ययन करते हैं। अनुवाद के लिए भाषा और संस्कृति को समझना आवश्यक है।",
      },
      {
        name: "한국어",
        locale: "ko",
        text: "번역은 사람들을 연결합니다. 언어는 문맥에 따라 달라집니다. 우리는 단어와 의미를 연구합니다. 번역에는 언어와 문화에 대한 이해가 필요합니다.",
      },
    ],
  },
];
export const multilingualSampleDocuments = samples[1].documents.filter(
  (document): document is CorpusDocument & { locale: string } =>
    Boolean(document.locale),
);

export const locales = [
  ["und", "Automatic / mixed languages"],
  ["en", "English"],
  ["es", "Español"],
  ["fr", "Français"],
  ["ru", "Русский"],
  ["zh", "中文"],
  ["ja", "日本語"],
  ["ar", "العربية"],
  ["de", "Deutsch"],
  ["pt", "Português"],
  ["it", "Italiano"],
  ["ko", "한국어"],
  ["hi", "हिन्दी"],
  ["tr", "Türkçe"],
  ["fa", "فارسی"],
  ["he", "עברית"],
  ["th", "ไทย"],
  ["vi", "Tiếng Việt"],
  ["id", "Bahasa Indonesia"],
  ["pl", "Polski"],
  ["uk", "Українська"],
];
