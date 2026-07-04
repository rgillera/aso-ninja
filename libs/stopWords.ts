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

export const ES_STOP_WORDS = new Set([
  "el","la","los","las","un","una","unos","unas","este","esta","estos","estas","ese","esa","esos","esas",
  "aquel","aquella","aquellos","aquellas","mi","mis","tu","tus","su","sus","nuestro","nuestra","nuestros","nuestras",
  "yo","tú","él","ella","nosotros","nosotras","vosotros","vosotras","ellos","ellas","me","te","se","nos","os",
  "le","les","lo","mí","ti","sí","quien","que","cual","cuales",
  "es","son","era","eran","fue","fueron","ser","estar","está","están","estaba","estaban","hay","había",
  "tener","tiene","tienen","tenía","hacer","hace","hacen","puede","pueden","podría","deber","debe",
  "de","en","a","por","para","con","sin","sobre","entre","desde","hasta","durante","según","contra",
  "y","o","pero","si","porque","aunque","mientras","como","cuando","donde",
  "no","sí","muy","más","menos","ya","aún","todavía","también","tampoco","siempre","nunca","ahora",
  "aquí","allí","así","bien","mal","mucho","poco","algo","nada","todo","todos",
  "app","aplicación","gratis","gratuito","nuevo","mejor","fácil","simple","pro","premium",
]);

export const FR_STOP_WORDS = new Set([
  "le","la","les","un","une","des","ce","cet","cette","ces","mon","ma","mes","ton","ta","tes","son","sa","ses",
  "notre","nos","votre","vos","leur","leurs",
  "je","tu","il","elle","nous","vous","ils","elles","me","te","se","lui","moi","toi","soi","qui","que","quoi","dont","où",
  "être","est","sont","était","étaient","été","avoir","a","ont","avait","avaient","eu","faire","fait","font",
  "peut","peuvent","pourrait","doit","devrait",
  "de","à","en","dans","sur","sous","avec","sans","pour","par","entre","depuis","pendant","contre",
  "et","ou","mais","si","donc","car","comme","quand",
  "ne","pas","non","oui","très","plus","moins","déjà","encore","aussi","toujours","jamais","maintenant",
  "ici","là","bien","trop","peu","tout","tous",
  "application","gratuit","gratuite","nouveau","nouvelle","meilleur","facile","simple","pro","premium",
]);

export const DE_STOP_WORDS = new Set([
  "der","die","das","ein","eine","einen","einem","einer","eines","dieser","diese","dieses",
  "mein","meine","dein","deine","sein","seine","ihr","ihre","unser","unsere","euer","eure",
  "ich","du","er","sie","es","wir","ihr","mich","dich","sich","uns","euch","mir","dir","ihm","ihnen","wer","was","welche",
  "ist","sind","war","waren","gewesen","sein","hat","haben","hatte","hatten","wird","werden","wurde","wurden",
  "kann","können","könnte","muss","müssen","soll","sollte",
  "zu","in","an","auf","mit","ohne","für","von","bei","nach","aus","über","unter","zwischen","während","gegen",
  "und","oder","aber","wenn","weil","obwohl","als","dass","wie","wo",
  "nicht","kein","keine","ja","sehr","mehr","weniger","schon","noch","auch","immer","nie","jetzt","hier","dort",
  "so","gut","viel","wenig","alle","ganz",
  "app","kostenlos","neu","beste","einfach","pro","premium",
]);

export const PT_STOP_WORDS = new Set([
  "o","a","os","as","um","uma","uns","umas","este","esta","estes","estas","esse","essa","esses","essas",
  "aquele","aquela","aqueles","aquelas","meu","minha","teu","tua","seu","sua","nosso","nossa",
  "eu","tu","ele","ela","nós","vós","eles","elas","me","te","se","nos","vos","lhe","lhes","mim","ti","si",
  "é","são","era","eram","foi","foram","ser","estar","está","estão","estava","estavam","há","havia",
  "ter","tem","têm","tinha","fazer","faz","fazem","pode","podem","poderia","deve","deveria",
  "de","em","a","por","para","com","sem","sobre","entre","desde","até","durante","contra",
  "e","ou","mas","se","porque","embora","enquanto","como","quando","onde","quem",
  "não","sim","muito","mais","menos","já","ainda","também","sempre","nunca","agora","aqui","ali","assim",
  "bem","mal","pouco","algo","nada","tudo","todos",
  "aplicativo","app","grátis","gratuito","novo","melhor","fácil","simples","pro","premium",
]);

export const IT_STOP_WORDS = new Set([
  "il","lo","la","i","gli","le","un","uno","una","questo","questa","questi","queste",
  "quello","quella","quelli","quelle","mio","mia","tuo","tua","suo","sua","nostro","nostra","vostro","vostra",
  "io","tu","lui","lei","noi","voi","loro","mi","ti","si","ci","vi","chi","che","cui",
  "è","sono","era","erano","stato","essere","ha","hanno","aveva","avevano","avuto","avere","fa","fanno",
  "può","possono","potrebbe","deve","dovrebbe",
  "di","a","in","su","con","senza","per","da","tra","fra","durante","contro",
  "e","o","ma","se","perché","mentre","come","quando","dove",
  "non","sì","molto","più","meno","già","ancora","anche","sempre","mai","ora","qui","qua","lì","là","così",
  "bene","male","poco","tutto","tutti",
  "app","applicazione","gratis","gratuito","nuovo","migliore","facile","semplice","pro","premium",
]);

export const NL_STOP_WORDS = new Set([
  "de","het","een","deze","dit","die","dat","mijn","jouw","zijn","haar","ons","onze","jullie","hun",
  "ik","jij","je","hij","zij","ze","wij","we","mij","me","jou","hem","hen","wie","wat","welke",
  "is","was","waren","geweest","heeft","hebben","had","hadden","wordt","worden","werd","werden",
  "kan","kunnen","kon","moet","moeten","zou",
  "van","in","op","met","zonder","voor","door","bij","na","uit","over","onder","tussen","tijdens","tegen",
  "en","of","maar","als","omdat","hoewel","dat","wanneer","waar",
  "niet","geen","ja","zeer","heel","meer","minder","al","nog","ook","altijd","nooit","nu","hier","daar","zo",
  "goed","veel","weinig","alle","alles",
  "app","gratis","nieuw","beste","makkelijk","eenvoudig","pro","premium",
]);

export const PL_STOP_WORDS = new Set([
  "ten","ta","to","te","ci","tamten","jego","jej","ich","mój","moja","moje","twój","twoja","twoje",
  "nasz","nasza","nasze","wasz","wasza","wasze",
  "ja","ty","on","ona","ono","my","wy","oni","one","mnie","mi","cię","go","ją","nas","was","im","kto","co","który",
  "jest","są","był","była","było","byli","były","być","ma","mają","miał","miała","mieli","mieć",
  "może","mogą","mógłby","musi","muszą","powinien",
  "w","na","z","do","dla","bez","przez","po","od","o","między","podczas","przeciw",
  "i","lub","ale","jeśli","bo","ponieważ","chociaż","jak","kiedy","gdzie",
  "nie","tak","bardzo","więcej","mniej","już","jeszcze","także","zawsze","nigdy","teraz","tutaj","tam",
  "dobrze","źle","mało","wszystko","wszyscy",
  "aplikacja","app","darmowy","nowy","najlepszy","łatwy","prosty","pro","premium",
]);

export const RU_STOP_WORDS = new Set([
  "я","ты","он","она","оно","мы","вы","они","меня","тебя","его","её","нас","вас","их",
  "мой","моя","моё","твой","твоя","твоё","наш","наша","наше","ваш","ваша","ваше",
  "это","тот","та","то","те","этот","эта","эти","кто","что","который",
  "есть","быть","был","была","было","были","будет","будут","может","могут","должен","должна","нужно","надо",
  "в","на","с","к","от","до","для","по","о","об","за","из","у","при","через","между",
  "и","или","а","но","если","потому","что","чтобы","когда","где",
  "не","да","нет","очень","более","менее","уже","ещё","тоже","также","всегда","никогда","сейчас","здесь","там",
  "хорошо","плохо","много","мало","всё","все",
  "приложение","бесплатно","новый","лучший","простой","легкий","про","премиум",
]);

export const TR_STOP_WORDS = new Set([
  "bu","şu","o","bunlar","şunlar","onlar","benim","senin","onun","bizim","sizin","onların",
  "ben","sen","biz","siz","beni","seni","onu","bizi","sizi","kim","ne","hangi",
  "dir","dır","idi","olan","olur","olabilir","oldu","var","yok","gerekir","gerek",
  "ve","veya","ile","için","gibi","kadar","ama","fakat","çünkü","eğer","iken","nerede",
  "değil","evet","hayır","çok","daha","az","hala","henüz","de","da","her zaman","asla","şimdi","burada","orada",
  "iyi","kötü","biraz","hepsi","tüm",
  "uygulama","app","ücretsiz","yeni","en iyi","kolay","basit","pro","premium",
]);

export const AR_STOP_WORDS = new Set([
  "هذا","هذه","ذلك","تلك","هؤلاء","أولئك","الذي","التي","الذين","اللواتي",
  "أنا","أنت","أنتِ","هو","هي","نحن","أنتم","أنتن","هم","هن","لي","لك","له","لها","لنا","لكم","لهم","من","ما","ماذا","أي",
  "كان","كانت","يكون","تكون","يوجد","توجد","ليس","ليست","يجب","يمكن",
  "في","على","إلى","عن","مع","بدون","بين","خلال","ضد","و","أو","لكن","إذا","لأن","بينما","عندما","أين","كيف",
  "لا","نعم","جدا","أكثر","أقل","بالفعل","أيضا","دائما","أبدا","الآن","هنا","هناك","جيد","سيء","قليل","كثير","كل",
  "تطبيق","مجاني","جديد","أفضل","سهل","بسيط","برو","بريميوم",
]);

export const ID_STOP_WORDS = new Set([
  "ini","itu","para","sebuah","saya","aku","kamu","anda","dia","ia","kami","kita","kalian","mereka","ku","mu","nya",
  "adalah","ialah","merupakan","ada","sudah","telah","akan","sedang","bisa","dapat","harus","perlu","mau",
  "di","ke","dari","untuk","dengan","tanpa","pada","oleh","tentang","antara","selama","terhadap",
  "dan","atau","tetapi","tapi","jika","karena","meskipun","ketika","saat","dimana","yang",
  "tidak","bukan","ya","sangat","lebih","kurang","masih","juga","selalu","tidak pernah","sekarang",
  "di sini","di sana","baik","buruk","sedikit","banyak","semua",
  "aplikasi","app","gratis","baru","terbaik","mudah","simpel","pro","premium",
]);

export const VI_STOP_WORDS = new Set([
  "này","đó","kia","những","các","tôi","bạn","anh","chị","em","họ","chúng tôi","chúng ta","nó","ai","gì","nào",
  "là","có","đã","đang","sẽ","được","bị","phải","cần","nên","có thể",
  "ở","trong","ngoài","trên","dưới","với","không có","cho","bởi","về","giữa","trong khi",
  "và","hoặc","nhưng","nếu","vì","mặc dù","khi","ở đâu",
  "không","rất","hơn","kém","vẫn","còn","cũng","luôn luôn","không bao giờ","bây giờ","đây","tốt","xấu","ít","nhiều","tất cả",
  "ứng dụng","app","miễn phí","mới","tốt nhất","dễ","đơn giản","pro","premium",
]);

export const TH_STOP_WORDS = new Set([
  "นี้","นั้น","โน้น","ฉัน","ผม","คุณ","เขา","เธอ","พวกเรา","พวกเขา","ใคร","อะไร","ไหน",
  "คือ","เป็น","อยู่","มี","ได้","จะ","กำลัง","ต้อง","ควร","สามารถ",
  "ใน","บน","ที่","กับ","โดย","สำหรับ","ระหว่าง","และ","หรือ","แต่","ถ้า","เพราะ","ขณะที่","เมื่อ","ที่ไหน",
  "ไม่","ใช่","มาก","มากกว่า","น้อยกว่า","แล้ว","ยัง","ก็","เสมอ","ไม่เคย","ตอนนี้","ที่นี่","ที่นั่น","ดี","แย่","น้อย","ทั้งหมด",
  "แอป","แอปพลิเคชัน","ฟรี","ใหม่","ดีที่สุด","ง่าย","พรีเมียม",
]);

// Korean particles/copulas suffer the same Intl.Segmenter fragmentation issue
// documented above for Japanese — attached particles and conjugated endings
// surface as separate tokens.
export const KO_STOP_WORDS = new Set([
  "이","그","저","이것","그것","저것","나","너","당신","그들","우리","저희","누구","무엇","어느",
  "은","는","을","를","의","에","에서","으로","로","와","과","도","만","부터","까지","이다","있다","없다","하다","되다",
  "그리고","그러나","하지만","만약","왜냐하면","동안","언제","어디서",
  "아니","네","매우","더","덜","이미","아직","또한","항상","절대","지금","여기","거기","좋다","나쁘다","조금","많이","모두",
  "앱","어플","무료","신규","최고","쉬운","간단한","프로","프리미엄",
]);

export const ZH_STOP_WORDS = new Set([
  "这","那","这个","那个","这些","那些","我","你","他","她","它","我们","你们","他们","谁","什么","哪",
  "是","有","在","会","能","可以","应该","必须","要","了","的","地","得",
  "从","到","对","和","与","或","但","如果","因为","虽然","当","哪里",
  "不","没","很","更","太","已经","还","也","总是","从不","现在","这里","那里","好","坏","一点","很多","所有","都",
  "应用","应用程序","免费","新","最好","简单","容易","专业版","高级版",
]);

// Union of every language's stop words — used wherever we don't know (or
// don't want to branch on) which language a term came from, since app-store
// metadata can be in any of ~150 storefront locales.
export const ALL_STOP_WORDS = new Set([
  ...STOP_WORDS, ...JP_STOP_WORDS, ...ES_STOP_WORDS, ...FR_STOP_WORDS, ...DE_STOP_WORDS,
  ...PT_STOP_WORDS, ...IT_STOP_WORDS, ...NL_STOP_WORDS, ...PL_STOP_WORDS, ...RU_STOP_WORDS,
  ...TR_STOP_WORDS, ...AR_STOP_WORDS, ...ID_STOP_WORDS, ...VI_STOP_WORDS, ...TH_STOP_WORDS,
  ...KO_STOP_WORDS, ...ZH_STOP_WORDS,
]);
