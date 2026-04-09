import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ban, Plus, X, Upload, Download, Trash2, ChevronDown, ChevronUp, FileText, Languages,
} from "lucide-react";

const STOP_WORD_PRESETS: Record<string, string[]> = {
  "English": [
    "the","and","that","this","with","from","have","been","were","they",
    "their","them","there","then","than","these","those","what","when",
    "where","which","while","will","would","could","should","about",
    "after","before","between","into","through","during","each","also",
    "some","other","more","most","only","very","just","over","such",
    "both","even","back","like","well","much","being","does","done",
    "made","make","many","must","need","come","came","goes","going",
    "here","said","same","shall","still","under","upon","your","itself",
    "myself","ourselves","because","without","against","for","are","was",
    "has","had","not","but","all","any","can","its","you","our","one",
    "her","his","she","him","who","how","now","may","too","own",
  ],
  "Arabic": [
    "في","من","على","إلى","عن","هذا","هذه","ذلك","تلك","التي",
    "الذي","الذين","كان","كانت","يكون","تكون","بين","حتى",
    "بعد","قبل","أنه","أنها","لكن","ولكن","ثم","أيضا","عند","كل",
    "بعض","معظم","فقط","مع","أو","قد","لقد","هو","هي","هم","نحن",
    "أنت","أنا","ما","لا","لم","لن","إذا","أن","كما","وقد",
    "عليه","عليها","منه","منها","له","لها","فيه","فيها","وهو","وهي",
    "إلا","غير","حين","خلال","وكان","وكانت","وأن","التي","الذي","عبر",
  ],
  "French": [
    "le","la","les","de","du","des","un","une","et","en","au","aux",
    "à","ce","cet","cette","ces","mon","ma","mes","ton","ta","tes",
    "son","sa","ses","nous","vous","ils","elles","qui","que","quoi",
    "dont","où","pour","par","sur","sous","dans","avec","sans","entre",
    "après","avant","depuis","pendant","tout","tous","toute","toutes",
    "plus","très","bien","aussi","même","encore","déjà","alors","donc",
    "mais","ou","si","car","ni","cependant","ainsi","comme","être",
    "avoir","faire","dire","aller","voir","savoir","pouvoir","vouloir",
  ],
  "Spanish": [
    "el","la","los","las","un","una","unos","unas","de","del","al",
    "y","en","a","por","para","con","sin","sobre","entre","durante",
    "este","esta","estos","estas","ese","esa","esos","esas","que","quien",
    "cual","donde","cuando","como","muy","más","también","ya","así",
    "pero","sino","aunque","porque","pues","luego","entonces","además",
    "nos","me","te","se","le","lo","yo","tú","él","ella","ellos","ellas",
    "nosotros","vosotros","su","sus","mi","mis","tu","tus","ser","estar",
    "tener","hacer","poder","querer","saber","deber","haber","ir","venir",
  ],
  "German": [
    "der","die","das","den","dem","des","ein","eine","einer","einem","eines",
    "und","oder","aber","denn","weil","wenn","als","dass","ob","obwohl",
    "in","an","auf","über","unter","vor","hinter","neben","zwischen","nach",
    "bei","mit","ohne","durch","für","gegen","um","bis","seit","von","zu",
    "ich","du","er","sie","es","wir","ihr","sie","mein","dein","sein","ihr",
    "unser","euer","sich","man","auch","noch","schon","nicht","kein","mehr",
    "sehr","nur","ja","nein","so","wie","was","wer","wo","wann","warum",
    "haben","sein","werden","können","müssen","wollen","sollen","dürfen",
  ],
  "Italian": [
    "il","lo","la","i","gli","le","un","uno","una","di","del","della","dei",
    "degli","delle","a","ad","da","in","con","su","per","tra","fra",
    "e","o","ma","però","anche","ancora","già","sempre","mai","non","si",
    "che","chi","cui","quale","dove","quando","come","molto","poco","più",
    "meno","tutto","tutti","questo","quello","essere","avere","fare","dire",
    "io","tu","lui","lei","noi","voi","loro","mi","ti","ci","vi","lo","la",
    "li","le","ne","se","suo","sua","suoi","sue","mio","mia","tuoi","tue",
  ],
  "Portuguese": [
    "o","a","os","as","um","uma","uns","umas","de","da","do","das","dos",
    "em","na","no","nas","nos","por","para","com","sem","sobre","entre",
    "e","ou","mas","porém","porque","quando","como","que","quem","qual",
    "onde","este","esta","estes","estas","esse","essa","esses","essas",
    "eu","tu","ele","ela","nós","vós","eles","elas","me","te","se","nos",
    "vos","meu","minha","teu","tua","seu","sua","nosso","nossa","muito",
    "mais","também","já","ainda","não","sim","bem","ser","estar","ter",
    "fazer","poder","querer","saber","haver","ir","vir","dar","ver",
  ],
  "Dutch": [
    "de","het","een","van","in","is","op","dat","hij","we","zijn","niet",
    "en","maar","ook","als","er","dan","aan","wat","met","voor","door",
    "uit","over","na","bij","om","zo","nog","zijn","hebben","worden",
    "kunnen","moeten","mogen","willen","zullen","dit","die","deze","dit",
    "mijn","jouw","zijn","haar","ons","onze","hun","ze","ze","zij","ik",
    "jij","u","men","wie","waar","wanneer","hoe","waarom","welke","veel",
    "meer","meest","goed","groot","klein","nieuw","oud","naar","tot",
  ],
  "Russian": [
    "и","в","не","на","что","он","с","как","а","по","его","это","все",
    "она","так","но","да","к","у","же","вы","за","бы","то","от","ее",
    "мне","если","нет","потому","когда","только","еще","уже","ли","до",
    "из","вот","кто","этот","их","более","для","при","со","те","был",
    "была","было","быть","есть","нас","вас","им","её","мы","они","я",
    "мой","твой","его","её","наш","ваш","свой","этот","тот","все","сам",
    "можно","надо","здесь","там","тут","сейчас","теперь","очень","ещё",
  ],
  "Chinese": [
    "的","了","在","是","我","有","和","就","不","人","都","一","一个",
    "上","也","很","到","说","要","去","你","会","着","没有","看","好",
    "自己","这","那","里","来","对","时","年","地","出","得","以","所",
    "从","们","过","后","由","但","他","她","它","我们","你们","他们",
    "这个","那个","什么","哪","谁","怎么","为什么","因为","所以","但是",
    "还是","或者","虽然","如果","已经","可以","应该","需要","可能","比较",
  ],
  "Japanese": [
    "の","に","は","を","が","で","と","も","する","から","まで","より",
    "て","だ","です","ます","ない","ある","いる","この","その","あの",
    "私","あなた","彼","彼女","それ","これ","あれ","ここ","そこ","あそこ",
    "何","どこ","いつ","なぜ","どう","しかし","でも","または","そして",
    "という","ような","ので","ため","など","ところ","ということ","ように",
    "だけ","でも","しかし","ただ","また","さらに","なお","ちなみに",
  ],
  "Korean": [
    "이","가","은","는","을","를","의","에","에서","로","으로","와","과",
    "한","하다","있다","없다","되다","이다","것","그","나","우리","저",
    "들","도","만","까지","부터","처럼","같이","보다","그리고","그러나",
    "하지만","또한","때문에","따라","위해","그것","이것","저것","여기",
    "거기","저기","어디","언제","왜","어떻게","무엇","누구","어느","어떤",
    "수","때","중","등","위","아래","안","밖","앞","뒤","옆","사이",
  ],
  "Turkish": [
    "ve","ile","bu","bir","da","de","için","mi","gibi","ama","veya","ki",
    "çok","daha","en","kadar","sonra","önce","bile","sadece","hem","ya",
    "ben","sen","o","biz","siz","onlar","benim","senin","onun","bizim",
    "sizin","onların","ne","nerede","ne zaman","nasıl","neden","hangi",
    "bu","şu","o","bunlar","şunlar","onlar","burada","şurada","orada",
    "var","yok","olan","olan","etmek","olmak","yapmak","gitmek","gelmek",
  ],
  "Persian": [
    "و","در","به","از","که","این","را","با","است","آن","یک","می","هم",
    "اما","یا","اگر","تا","برای","هر","ما","من","تو","او","آنها","ما",
    "شما","خود","نه","نیست","بود","شد","می‌شود","می‌کند","دارد","دارم",
    "کرد","کرده","بر","پس","چون","زیرا","وقتی","هنگامی","چه","چی",
    "کجا","کی","چطور","چرا","کدام","همه","بعضی","هیچ","چند","بسیار",
  ],
  "Hebrew": [
    "של","את","זה","הוא","לא","על","עם","כי","אל","מה","אם","היה",
    "כל","הם","הן","כן","רק","גם","כבר","עוד","אחד","שני","אבל",
    "אנחנו","אני","אתה","היא","הם","לי","לך","לו","לה","לנו","לכם",
    "מה","מי","איפה","מתי","למה","איך","אשר","שהוא","שהיא","כדי",
    "בין","אחרי","לפני","תחת","מעל","ליד","שם","כאן","שוב","כך",
  ],
  "Hindi": [
    "और","में","की","है","को","एक","से","यह","वह","पर","के","लिए",
    "भी","हैं","था","थी","थे","होता","होती","होते","कि","जो","तो",
    "नहीं","क्या","कब","कहाँ","कैसे","क्यों","कौन","कितना","इस","उस",
    "हम","आप","मैं","तुम","वे","मुझे","तुम्हें","हमें","आपको","उन्हें",
    "मेरा","तेरा","उसका","हमारा","आपका","उनका","यहाँ","वहाँ","अब","तब",
    "बहुत","सब","सभी","कुछ","कोई","हर","ऐसा","वैसा","पहले","बाद",
  ],
  "Swedish": [
    "och","i","att","det","som","en","på","är","av","för","med","till",
    "den","de","han","hon","vi","de","du","jag","man","sig","sin","sitt",
    "sina","men","om","när","vad","var","hur","varför","vilket","vilken",
    "alla","hela","både","eller","även","bara","inte","mer","mycket","lite",
    "ha","har","hade","ska","skulle","kan","kunde","vill","ville","måste",
    "bli","blir","blev","vara","är","var","finns","finnas","ge","ger",
  ],
  "Norwegian": [
    "og","i","det","at","en","på","er","av","for","med","til","den",
    "de","som","vi","ikke","han","hun","å","men","om","når","hva",
    "var","hvor","hvordan","hvorfor","hvilken","alle","begge","eller",
    "også","bare","mer","mye","litt","ha","har","hadde","skal","skulle",
    "kan","kunne","vil","ville","må","bli","ble","bli","være","finnes",
    "nå","da","her","der","dit","hit","jo","ja","nei","si","meg","deg",
  ],
  "Danish": [
    "og","i","det","at","en","på","er","af","for","med","til","den",
    "de","som","vi","ikke","han","hun","at","men","om","når","hvad",
    "var","hvor","hvordan","hvorfor","hvilken","alle","begge","eller",
    "også","bare","mere","meget","lidt","har","havde","skal","skulle",
    "kan","kunne","vil","ville","må","blive","blev","blive","være",
    "nu","da","her","der","jo","ja","nej","sig","sin","sit","sine",
  ],
  "Polish": [
    "i","w","że","na","to","się","z","nie","do","jak","ale","co","o",
    "po","tak","już","też","czy","być","przez","przy","za","przed","pod",
    "nad","między","ze","od","dla","jego","jej","ich","mi","je","je",
    "ten","ta","to","ci","te","który","która","które","więc","jednak",
    "czyli","gdy","kiedy","gdzie","bo","więcej","bardzo","tylko","jeszcze",
    "on","ona","oni","one","my","wy","ja","ty","mój","twój","nasz","wasz",
  ],
  "Finnish": [
    "ja","on","se","ei","olla","kun","niin","ole","hän","en","myös","jo",
    "sitten","ovat","tämä","että","mutta","tai","jos","kuin","vain","minä",
    "sinä","me","te","he","minun","sinun","hänen","meidän","teidän","heidän",
    "tässä","siellä","täällä","missä","milloin","miksi","kuinka","mikä",
    "kuka","joka","kaikki","paljon","vähän","enemmän","vähemmän","aina","ei",
    "mitä","mihin","mistä","mille","miten","minkä","hyvä","suuri","uusi",
  ],
  "Czech": [
    "a","v","na","se","je","to","jak","ale","za","po","do","od","pro",
    "při","ve","ze","že","být","má","jsou","byl","byla","bylo","jeho",
    "její","jejich","tento","tato","toto","který","která","které","jako",
    "nebo","také","jen","už","ještě","tak","když","kde","co","kdo","proč",
    "jak","všechny","každý","další","více","méně","velmi","dobře","špatně",
    "já","ty","on","ona","my","vy","oni","mě","mně","moje","tvoje",
  ],
  "Romanian": [
    "și","în","că","este","cu","de","o","la","pe","din","nu","se","care",
    "sunt","a","dar","sau","mai","ca","când","dacă","după","pentru","prin",
    "la","între","acest","această","acești","aceste","cel","cea","cei","cele",
    "el","ea","ei","ele","eu","tu","noi","voi","îi","le","li","l","îl","o",
    "meu","mea","tău","ta","său","sa","lor","fi","fost","va","vor","poate",
    "tot","toți","toate","fiecare","mulți","puțin","mult","bine","rău",
  ],
};

const LANGUAGE_GROUPS: { label: string; languages: string[] }[] = [
  { label: "Semitic", languages: ["Arabic","Hebrew","Persian"] },
  { label: "Romance", languages: ["French","Spanish","Italian","Portuguese","Romanian"] },
  { label: "Germanic", languages: ["English","German","Dutch","Swedish","Norwegian","Danish"] },
  { label: "Slavic", languages: ["Russian","Polish","Czech"] },
  { label: "Asian", languages: ["Chinese","Japanese","Korean","Hindi","Turkish","Finnish"] },
];

interface StopListManagerProps {
  stopWords: string[];
  onChange: (words: string[]) => void;
  theme?: { gradient: string; text: string };
}

export function StopListManager({ stopWords, onChange, theme }: StopListManagerProps) {
  const [newWord, setNewWord] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedLang, setSelectedLang] = useState("English");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gradient = theme?.gradient || "from-indigo-500 to-blue-600";
  const textColor = theme?.text || "text-indigo-600 dark:text-indigo-400";

  const addWord = () => {
    const word = newWord.trim();
    const lower = word.toLowerCase();
    if (word && !stopWords.includes(word) && !stopWords.includes(lower)) {
      onChange([...stopWords, lower]);
      setNewWord("");
    }
  };

  const addMultiple = (words: string[]) => {
    const cleaned = words
      .map(w => w.trim())
      .filter(w => w.length > 0 && !stopWords.includes(w) && !stopWords.includes(w.toLowerCase()));
    if (cleaned.length > 0) {
      onChange([...stopWords, ...cleaned]);
    }
  };

  const loadPreset = () => {
    const preset = STOP_WORD_PRESETS[selectedLang];
    if (preset) addMultiple(preset);
  };

  const removeWord = (word: string) => {
    onChange(stopWords.filter(w => w !== word));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const words = text
      .split(/[\n\r,;\t|]+/)
      .map(w => w.trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").toLowerCase())
      .filter(w => w.length > 0);

    const unique = [...new Set(words)].filter(w => !stopWords.includes(w));
    if (unique.length > 0) {
      onChange([...stopWords, ...unique]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const exportList = () => {
    const blob = new Blob([stopWords.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stoplist.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const allLanguages = LANGUAGE_GROUPS.flatMap(g => g.languages);

  return (
    <motion.div
      className="polished-card overflow-visible"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={`h-0.5 bg-gradient-to-r ${gradient}`} />
      <div className="p-4">
        <button
          type="button"
          className="flex items-center gap-2 w-full text-left"
          onClick={() => setIsExpanded(!isExpanded)}
          data-testid="button-toggle-stoplist"
        >
          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <Ban className="w-3.5 h-3.5 text-white" />
          </div>
          <h4 className={`text-sm font-bold ${textColor} flex-1`}>Stop List</h4>
          {stopWords.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-[10px] font-bold tabular-nums" data-testid="badge-stopword-count">
              {stopWords.length} word{stopWords.length !== 1 ? "s" : ""}
            </span>
          )}
          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <p className="text-[11px] text-muted-foreground/60 mt-2 mb-3">
                Words in the stop list are excluded from keywords, n-grams, collocations, and word cloud results.
              </p>

              {/* Manual word entry + file upload */}
              <div className="flex gap-2 items-center mb-3">
                <div className="relative flex-1">
                  <Input
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addWord()}
                    placeholder="Type any word in any language…"
                    className="h-8 text-xs pr-8"
                    data-testid="input-stopword"
                  />
                  {newWord.trim() && (
                    <button
                      type="button"
                      onClick={addWord}
                      className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center ${textColor} hover:bg-muted transition-colors`}
                      data-testid="button-add-stopword"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.csv,.tsv,.list"
                  className="hidden"
                  onChange={handleFileUpload}
                  data-testid="input-stoplist-file"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-upload-stoplist"
                >
                  <Upload className="w-3 h-3 mr-1.5" />
                  Upload
                </Button>
              </div>

              {/* Language preset picker */}
              <div className="flex gap-1.5 items-center mb-3">
                <Languages className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <Select value={selectedLang} onValueChange={setSelectedLang}>
                  <SelectTrigger
                    className="h-7 text-[11px] flex-1 rounded-lg"
                    data-testid="select-preset-language"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_GROUPS.map(group => (
                      <div key={group.label}>
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                          {group.label}
                        </div>
                        {group.languages.map(lang => (
                          <SelectItem key={lang} value={lang} className="text-xs pl-4">
                            {lang}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] rounded-lg shrink-0"
                  onClick={loadPreset}
                  data-testid="button-load-preset"
                >
                  + Load preset
                </Button>
              </div>

              {/* Export / Clear */}
              {stopWords.length > 0 && (
                <div className="flex gap-1.5 mb-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] rounded-lg"
                    onClick={exportList}
                    data-testid="button-export-stoplist"
                  >
                    <Download className="w-2.5 h-2.5 mr-1" />
                    Export
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] rounded-lg text-destructive hover:text-destructive"
                    onClick={() => onChange([])}
                    data-testid="button-clear-stoplist"
                  >
                    <Trash2 className="w-2.5 h-2.5 mr-1" />
                    Clear All
                  </Button>
                </div>
              )}

              {stopWords.length > 0 ? (
                <div className="border border-border/40 rounded-xl p-3 bg-muted/20 max-h-44 overflow-y-auto">
                  <div className="flex gap-1.5 flex-wrap">
                    {stopWords.map((word) => (
                      <span
                        key={word}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-[11px] font-medium border border-red-200/60 dark:border-red-800/40 group hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        data-testid={`tag-stopword-${word}`}
                      >
                        {word}
                        <button
                          type="button"
                          onClick={() => removeWord(word)}
                          className="opacity-50 group-hover:opacity-100 transition-opacity rounded-full hover:bg-red-200 dark:hover:bg-red-800/50 p-0.5"
                          data-testid={`button-remove-stopword-${word}`}
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-border/40 rounded-xl p-4 text-center">
                  <FileText className="w-5 h-5 text-muted-foreground/30 mx-auto mb-1.5" />
                  <p className="text-[11px] text-muted-foreground/50">No stop words added yet. Type a word, upload a file, or load a language preset.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
