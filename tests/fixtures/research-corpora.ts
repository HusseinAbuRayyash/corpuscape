import type { CorpusDocument } from "../../web/src/engine";
export interface ResearchCorpus {
  id: string;
  name: string;
  mode: "monolingual" | "bilingual-comparable" | "parallel" | "multilingual";
  locale: string;
  format: string;
  query: string;
  documents: CorpusDocument[];
  pairs?: { source: string; target: string; note: string }[];
  pairLocales?: { source: string; target: string };
  description: string;
}
const pairs = [
  [
    "Language connects people.",
    "La lengua conecta a las personas.",
    "Opening statement",
  ],
  [
    "Researchers examine words in context.",
    "Los investigadores examinan las palabras en contexto.",
    "Context",
  ],
  [
    "A corpus contains texts selected for a purpose.",
    "Un corpus contiene textos seleccionados con un propósito.",
    "Corpus design",
  ],
  [
    "Frequency alone does not explain meaning.",
    "La frecuencia por sí sola no explica el significado.",
    "Interpretation",
  ],
  [
    "The same word can perform different functions.",
    "La misma palabra puede cumplir funciones diferentes.",
    "Variation",
  ],
  [
    "Translation decisions depend on the audience.",
    "Las decisiones de traducción dependen del público.",
    "Audience",
  ],
  [
    "The table reports observed counts.",
    "La tabla presenta los recuentos observados.",
    "Numerical evidence",
  ],
  [
    "A figure should preserve the underlying values.",
    "Una figura debe conservar los valores de los datos.",
    "Figures",
  ],
  [
    "Editors review the text before publication.",
    "Los editores revisan el texto antes de publicarlo.",
    "Review",
  ],
  [
    "Editors review the text before publication.",
    "Los editores revisan el texto antes de publicarlo.",
    "Intentional duplicate for the review flags",
  ],
  [
    "2026",
    "2026",
    "Intentional identical numeric segment, not a quality verdict",
  ],
  [
    "This target segment is intentionally missing.",
    "",
    "Intentional missing segment for preservation and review",
  ],
].map(([source, target, note]) => ({ source, target, note }));
export const originalResearchCorpora: ResearchCorpus[] = [
  {
    id: "03-climat-fr",
    name: "French climate communication",
    mode: "monolingual",
    locale: "fr",
    format: "DOCX",
    query: "climat",
    description:
      "Two original French policy texts; accents, apostrophes and repeated phrases.",
    documents: [
      {
        name: "Conseil municipal",
        locale: "fr",
        text: "Le conseil municipal présente un plan pour le climat. Les habitants demandent des informations précises sur les transports, les bâtiments et les espaces verts. Le rapport explique que le changement climatique transforme les conditions de vie dans la ville. Une réunion publique permet de comparer les propositions et de discuter les priorités. Le climat apparaît dans les titres, mais les mesures concrètes occupent le corps du texte. Les rédacteurs distinguent les observations locales des prévisions générales. Ils décrivent les données disponibles, leurs limites et les choix encore ouverts. Une fréquence élevée ne suffit pas à démontrer une relation causale. La communication publique doit donc relier chaque affirmation à une source identifiable.",
      },
      {
        name: "Lettre aux habitants",
        locale: "fr",
        text: "Notre quartier prépare une rencontre sur le climat et la mobilité. Les associations souhaitent comprendre comment les nouveaux itinéraires modifieront les déplacements quotidiens. Plusieurs habitants évoquent les effets du changement climatique sur les jardins et les cours d'école. D'autres insistent sur le coût des travaux et l'accès aux services. Cette diversité de préoccupations invite à lire les mots dans leur contexte. Le document présente des exemples, puis indique les questions qui nécessitent une enquête complémentaire. Les résultats descriptifs sont séparés des recommandations. Les auteurs ne prétendent pas représenter tous les habitants. Ils proposent une méthode transparente et invitent chacun à vérifier les chiffres publiés.",
      },
    ],
  },
  {
    id: "04-obrazovanie-ru",
    name: "Russian education discussion",
    mode: "monolingual",
    locale: "ru",
    format: "XLSX",
    query: "язык",
    description:
      "Two original Russian texts with a decoy worksheet and explicit text-column selection.",
    documents: [
      {
        name: "Университетский семинар",
        locale: "ru",
        text: "На университетском семинаре студенты обсуждают русский язык и способы изучения текстов. Преподаватель предлагает сравнить научные статьи, письма и короткие сообщения. Каждый жанр использует язык по-своему. Частотный список показывает повторяющиеся слова, но сам по себе не раскрывает их значение. Поэтому участники читают примеры в контексте и сохраняют сведения об источниках. Они проверяют, как длина документа влияет на отношение числа типов к числу слов. Результаты записывают в таблицу и сопровождают ясным описанием метода. В 2026 году группа повторяет анализ, чтобы проверить воспроизводимость подсчётов.",
      },
      {
        name: "Школьная библиотека",
        locale: "ru",
        text: "Школьная библиотека собирает тексты о чтении и переводе. Учителя объясняют, что язык меняется в зависимости от ситуации общения. В одном документе важны точные определения, а в другом — последовательность событий. Исследователи отмечают повторения, проверяют имена файлов и отдельно указывают язык каждого текста. Такой порядок помогает избежать случайного смешения материалов. Таблица должна показывать наблюдаемые значения, а рисунок — сохранять те же данные. Выводы об обществе требуют дополнительных источников. Небольшая учебная коллекция не позволяет делать общие утверждения обо всех читателях.",
      },
    ],
  },
  {
    id: "05-yuyan-zh",
    name: "Chinese research communication",
    mode: "monolingual",
    locale: "zh",
    format: "HTML",
    query: "研究",
    description:
      "Two original Chinese passages in saved HTML; visible text is separated from scripts and navigation.",
    documents: [
      {
        name: "社区语言项目",
        locale: "zh",
        text: "社区图书馆组织了一项语言研究。研究关注居民在通知、访谈和公共说明中使用的词语。工作人员先记录文本来源，再检查日期、标题和段落。不同类型的材料不能简单地当作同一种证据。词频可以帮助发现重复出现的表达，但是理解意义仍然需要阅读上下文。团队把观察结果写入表格，并说明分词方法和资料范围。图中的数值必须与表中的数值一致。研究没有测量个人能力，也没有给翻译质量打分。读者可以根据保存的数据和方法重复分析。",
      },
      {
        name: "学校阅读讨论",
        locale: "zh",
        text: "学校邀请学生讨论阅读经验。研究从真实的文本问题出发，比较说明性文字和叙事性文字中的表达方式。每篇文档都保留独立的名称与语言标签。研究人员检查重复内容，核对标点，并记录修改过程。较长的文本通常包含更多不同的词语，因此不能只比较原始词数。报告应当区分描述、解释和进一步需要验证的假设。公开的教学样本能够展示方法，但不能代表所有学校和所有读者。清楚的表格与图形有助于读者检查结论是否来自数据。",
      },
    ],
  },
  {
    id: "06-kanko-ja",
    name: "Japanese tourism and community",
    mode: "monolingual",
    locale: "ja",
    format: "PDF",
    query: "観光",
    description:
      "Original Japanese selectable-text PDF; CJK font maps and source text are checked.",
    documents: [
      {
        name: "地域の案内",
        locale: "ja",
        text: "地域の図書館は、観光と生活に関する資料を集めています。観光は地域の経済だけでなく、住民の日常にも関係します。調査では案内文、会議の記録、来訪者への説明を別々の文書として保存しました。担当者は資料の出典と言語を確認し、文章の長さを記録しました。頻度の高い語を見つけた後で、その語が使われる文脈を読み直します。表は観察された数値を示し、図は同じデータを見やすく表現します。少数の資料からすべての地域について結論を出すことはできません。",
      },
      {
        name: "住民の話し合い",
        locale: "ja",
        text: "住民の話し合いでは、観光に関する説明の分かりやすさが議題になりました。同じ言葉でも、案内板と行政の報告書では役割が異なる場合があります。研究者は、文書ごとの語数と異なり語数を数え、具体例を保存しました。比較の前には、資料を選んだ基準を明らかにする必要があります。結果の説明では、実際に測定したことと推測したことを区別します。翻訳を評価する場合には、数字だけで判断せず、専門家による文脈の確認も必要です。",
      },
    ],
  },
  {
    id: "07-lugha-ar",
    name: "Arabic institutional communication",
    mode: "monolingual",
    locale: "ar",
    format: "OCR",
    query: "اللغة",
    description:
      "Original Arabic paragraphs, including one diacritic variant; scanned recognition is reviewed against the source.",
    documents: [
      {
        name: "تقرير المكتبة",
        locale: "ar",
        text: "تجمع المكتبة نصوصًا عن اللغة والتواصل في المؤسسات العامة. يوضح التقرير أن اللغة تؤدي وظائف مختلفة في الإعلان والرسالة والتعليمات. يبدأ الباحثون بتوثيق المصادر وتحديد لغة كل وثيقة، ثم يراجعون علامات الترقيم وطول الفقرات. تساعد قوائم التكرار على اختيار أمثلة للقراءة، لكنها لا تفسر المعنى وحدها. لذلك تُحفظ الجملة الأصلية مع كل شاهد، وتُفصل النتائج الوصفية عن التأويل. يحتوي أحد الأمثلة على الصيغة المشكولة «اللُّغة» لكي يظل اختلاف الكتابة ظاهرًا. لا يقيس هذا التحليل جودة الترجمة ولا يثبت علاقة سببية بين الظواهر.",
      },
      {
        name: "دليل التواصل",
        locale: "ar",
        text: "يقدم دليل التواصل خطوات واضحة لإعداد المواد الموجهة إلى الجمهور. يجب أن تراعي اللغة حاجة القارئ والسياق الذي تظهر فيه الرسالة. يذكر المحرر مصدر النص ويحتفظ بنسخة من البيانات قبل التعديل. عند إعداد الجداول، تُراجع الأعداد وتُشرح طريقة العد. وعند إعداد الأشكال، تبقى القيم مطابقة للجدول الذي أُخذت منه. يحتاج تفسير الفروق إلى تصميم بحث مناسب ومصادر إضافية. أما العينة التعليمية الصغيرة فتسمح بشرح الأدوات وتجربة الإجراءات، ولا تمثل جميع المؤسسات أو جميع القراء.",
      },
    ],
  },
  {
    id: "08-parallel-en-es",
    name: "English Spanish parallel research text",
    mode: "parallel",
    locale: "und",
    format: "TMX",
    query: "corpus",
    description:
      "Twelve original aligned units with notes, a deliberate duplicate, an identical number and a missing target.",
    pairs,
    pairLocales: { source: "en", target: "es" },
    documents: [
      {
        name: "English source",
        locale: "en",
        text: pairs.map((pair) => pair.source).join("\n"),
      },
      {
        name: "Spanish target",
        locale: "es",
        text: pairs.map((pair) => pair.target).join("\n"),
      },
    ],
  },
  {
    id: "09-comparable-fr-en",
    name: "French English comparable transport",
    mode: "bilingual-comparable",
    locale: "und",
    format: "CSV",
    query: "transport",
    description:
      "Two independently written topical documents; they are comparable, not sentence-aligned translations.",
    documents: [
      {
        name: "Transport en ville",
        locale: "fr",
        text: "Le transport occupe une place importante dans les consultations publiques. Le premier document présente les propositions des associations de quartier et décrit les difficultés d'accès aux services. Il ne traduit aucun texte anglais. Les exemples portent sur les horaires, la marche et les correspondances entre les lignes. La comparaison lexicale doit tenir compte de cette origine et de la taille des documents. Le mot transport revient dans plusieurs passages, avec des fonctions différentes. Une analyse bilingue peut décrire ces usages, mais elle ne doit pas les présenter comme des équivalences de traduction.",
      },
      {
        name: "Transport consultation",
        locale: "en",
        text: "The transport committee reviews written comments about access to public services. This English document was written independently rather than translated from the French document. Residents discuss evening timetables, safe walking routes and the information available at bus stops. The word transport appears in the title and in several examples. Researchers can compare the documents as topical materials while retaining their separate language labels. Raw lexical differences do not provide a translation quality score. A useful report explains the sampling decisions and distinguishes measured counts from interpretation.",
      },
    ],
  },
  {
    id: "10-multilingual",
    name: "Multilingual library and research collection",
    mode: "multilingual",
    locale: "und",
    format: "JSON/CSV",
    query: "research",
    description:
      "Ten original documents with explicit English, Spanish, French, Russian, Chinese, Japanese, Arabic, German, Portuguese and Hindi tags.",
    documents: [
      {
        name: "Reading room",
        locale: "en",
        text: "The reading room keeps a record of local research projects. Each document has a name, a language label and a clear source description. Researchers read examples before interpreting frequent words. They preserve original spellings and explain how the texts were selected. Tables report computed values, while discussion remains open to review.",
      },
      {
        name: "Sala de lectura",
        locale: "es",
        text: "La sala de lectura conserva materiales de proyectos educativos. Cada documento tiene un nombre y una etiqueta de lengua. El equipo revisa los ejemplos antes de interpretar las palabras frecuentes. También explica cómo se seleccionaron los textos y qué decisiones se tomaron durante la preparación de los datos.",
      },
      {
        name: "Atelier de lecture",
        locale: "fr",
        text: "L'atelier de lecture conserve des documents préparés pour une enquête locale. Chaque texte porte un nom et une indication de langue. Les participants relisent les exemples avant d'interpréter les fréquences. Ils expliquent la sélection des sources et signalent les questions auxquelles les données ne permettent pas de répondre.",
      },
      {
        name: "Читательская встреча",
        locale: "ru",
        text: "На читательской встрече участники обсуждают разные способы работы с текстом. Каждому документу присваивают название и языковую метку. Исследователи сохраняют исходное написание слов и проверяют примеры. Таблицы показывают результаты подсчёта, но выводы о читателях требуют отдельного исследования и ясного описания выборки.",
      },
      {
        name: "阅读工作坊",
        locale: "zh",
        text: "阅读工作坊保存了不同类型的教学材料。每篇文档都有名称、语言标签和来源说明。参与者先阅读具体例子，再解释词语的使用情况。表格记录实际计算的数值。讨论部分说明研究范围，并指出还需要补充哪些证据。",
      },
      {
        name: "読書の記録",
        locale: "ja",
        text: "読書会では、資料の名前と言語を記録します。参加者は具体例を読み、同じ語がどのように使われるかを話し合います。表には計算した数値を示します。結果を説明するときは、資料の範囲と、まだ確認していない点を明らかにします。",
      },
      {
        name: "ورشة القراءة",
        locale: "ar",
        text: "تحفظ ورشة القراءة مواد تعليمية متنوعة. تحمل كل وثيقة اسمًا ووصفًا للمصدر وتحديدًا للغة. يقرأ المشاركون الأمثلة قبل تفسير الكلمات المتكررة، ويراجعون الأعداد الواردة في الجداول. توضح المناقشة حدود العينة والأسئلة التي تحتاج إلى أدلة إضافية قبل الوصول إلى استنتاجات عامة.",
      },
      {
        name: "Lesewerkstatt",
        locale: "de",
        text: "Die Lesewerkstatt sammelt unterschiedliche Unterrichtstexte. Jedes Dokument erhält einen Namen, eine Sprachangabe und eine Beschreibung seiner Herkunft. Die Teilnehmenden lesen Beispiele, bevor sie häufige Wörter interpretieren. Tabellen enthalten berechnete Werte. Die Diskussion beschreibt die Grenzen der Auswahl und die noch offenen Forschungsfragen.",
      },
      {
        name: "Oficina de leitura",
        locale: "pt",
        text: "A oficina de leitura reúne textos de projetos educativos. Cada documento recebe um nome, uma indicação de língua e uma descrição da fonte. Os participantes leem exemplos antes de interpretar palavras frequentes. As tabelas apresentam valores calculados. A discussão explica os limites da seleção e as perguntas que exigem novas evidências.",
      },
      {
        name: "पठन कार्यशाला",
        locale: "hi",
        text: "पठन कार्यशाला में अलग अलग प्रकार के शैक्षिक पाठ रखे जाते हैं। हर दस्तावेज़ का एक नाम, भाषा का संकेत और स्रोत का विवरण होता है। प्रतिभागी बार बार आने वाले शब्दों की व्याख्या करने से पहले उदाहरण पढ़ते हैं। तालिकाएँ गणना के परिणाम दिखाती हैं। चर्चा में नमूने की सीमाएँ और आगे जाँचने वाले प्रश्न स्पष्ट किए जाते हैं।",
      },
    ],
  },
];
