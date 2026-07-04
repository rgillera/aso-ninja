export const STOP_WORDS = new Set([
  // Articles & determiners
  "the","a","an","this","that","these","those","some","any","each","every","both","few","more","most","other","such",
  // Pronouns
  "i","me","my","myself","we","our","ours","ourselves","you","your","yours","yourself","he","him","his","she","her","hers",
  "it","its","itself","they","them","their","theirs","themselves","who","whom","whose","which","what",
  // Verbs (common)
  "is","are","was","were","be","been","being","have","has","had","do","does","did","will","would","could","should",
  "may","might","shall","must","can","need","dare","ought","used","get","got","go","goes","went","gone","come","came",
  "make","made","take","took","see","saw","let","put","set","keep","kept","give","gave","find","found","know","knew",
  "think","thought","look","want","use","try","ask","seem","feel","leave","call","help","turn","start","show","move",
  "live","play","run","work","need","become","bring","happen","write","provide","sit","stand","lose","pay","meet",
  // Prepositions & conjunctions
  "to","of","in","for","on","with","as","by","at","from","up","about","into","through","during","before","after",
  "above","below","between","among","out","off","over","under","again","further","then","once","here","there","when",
  "where","why","how","and","or","but","so","yet","if","than","because","while","although","though","since","unless",
  // Adverbs & filler
  "not","no","nor","very","just","now","also","too","only","even","back","still","already","soon","often","always",
  "never","ever","else","away","maybe","perhaps","however","therefore","thus","hence","indeed","instead","rather",
  "quite","almost","enough","really","actually","currently","simply","easily","quickly","directly","specifically",
  // Common app-store noise words
  "app","apps","free","new","best","easy","top","pro","plus","lite","premium","full","your","our","all","any","get",
  "use","using","used","make","making","need","needs","help","helps","via","per","way","ways","day","days","time",
  "times","lot","lots","much","many","more","less","same","different","great","good","great","simple","smart",
]);

// Common Japanese particles, copulas, and verb/adjective inflection fragments.
// Intl.Segmenter's word-break iterator segments Japanese by dictionary lookup
// rather than morphology, so conjugated endings (e.g. "しましょう" → "し" +
// "ましょう") show up as separate "word" tokens — this filters the resulting
// grammatical noise the same way STOP_WORDS filters English function words.
export const JP_STOP_WORDS = new Set([
  "の","を","に","は","が","で","と","も","へ","や","ど","な","だ",
  "から","まで","より","ので","のに","なら","たり","だり",
  "です","ます","でし","でした","ません","ない","なく","なかっ",
  "たい","れる","られる","せる","させる","くれる","もらう","あげる",
  "この","その","あの","どの","これ","それ","あれ","どれ",
  "ここ","そこ","あそこ","どこ","こちら","そちら","あちら","どちら",
  "わたし","わたくし","あなた","かれ","かのじょ","私","貴方","彼","彼女","私達",
  "しかし","また","そして","でも","けど","けれど","ため","ように","ような",
  "こと","もの","という","なる","なり","なっ","する","しよう","しましょう",
  "しました","します","ください","くださ","さい","お","ご","さん","ちゃん","くん",
  "し","しま","しょう","たら","れば","ながら","って","という","といった",
]);
