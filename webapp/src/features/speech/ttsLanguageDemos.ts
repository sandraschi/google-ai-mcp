/**
 * BCP-47 language tags align with Gemini TTS supported locales (auto-detected from text).
 * Demo strings use natural-language style cues from the speech-generation prompting guide.
 */

export type TtsLangOption = { code: string; label: string };
export type TtsDemoSnippet = { id: string; label: string; text: string };

export const TTS_LANGUAGE_OPTIONS: TtsLangOption[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "nl", label: "Dutch" },
  { code: "pl", label: "Polish" },
  { code: "sv", label: "Swedish" },
  { code: "ru", label: "Russian" },
  { code: "uk", label: "Ukrainian" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "cmn", label: "Chinese (Mandarin)" },
  { code: "tr", label: "Turkish" },
  { code: "vi", label: "Vietnamese" },
  { code: "id", label: "Indonesian" },
  { code: "th", label: "Thai" },
];

export const TTS_DEMOS_BY_LANG: Record<string, TtsDemoSnippet[]> = {
  en: [
    {
      id: "welcome",
      label: "Welcome",
      text: "Say cheerfully: Welcome to Gemini text to speech. We hope you like how this sounds.",
    },
    {
      id: "news",
      label: "News style",
      text: "Read in a calm news-anchor tone: This is a short demo bulletin. Traffic is light downtown.",
    },
    {
      id: "story",
      label: "Bedtime",
      text: "Read slowly and warmly: Once upon a time, a small studio light flickered on, and the narrator began to speak.",
    },
    {
      id: "multi",
      label: "Two speakers",
      text: 'TTS the following:\nAlex: "Ready when you are."\nSam: "Then let\'s begin."',
    },
  ],
  es: [
    {
      id: "welcome",
      label: "Bienvenida",
      text: "Di con entusiasmo: Bienvenido a la síntesis de voz de Gemini. Esperamos que te guste.",
    },
    {
      id: "travel",
      label: "Viaje",
      text: "Lee con tono informativo y claro: Próxima parada: la plaza mayor. El tiempo será soleado.",
    },
    {
      id: "calm",
      label: "Calma",
      text: "Habla despacio y suavemente: Respira hondo. Todo va a salir bien.",
    },
  ],
  fr: [
    {
      id: "welcome",
      label: "Accueil",
      text: "Dis avec chaleur : Bienvenue dans la synthèse vocale Gemini. Nous espérons que cela vous plaît.",
    },
    {
      id: "guide",
      label: "Musée",
      text: "Parle sur un ton posé de guide : À votre droite, vous verrez une maquette du projet.",
    },
    {
      id: "poetic",
      label: "Poétique",
      text: "Lis avec douceur : La pluie fine tapote la vitre pendant que la ville s’endort.",
    },
  ],
  de: [
    {
      id: "welcome",
      label: "Willkommen",
      text: "Sag freundlich und klar: Willkommen bei Gemini Text-zu-Sprache. Viel Spaß beim Ausprobieren.",
    },
    {
      id: "train",
      label: "Durchsage",
      text: "Sprich in sachlichem Bahnhofston: Der nächste Zug nach Norden fährt in wenigen Minuten ab.",
    },
    {
      id: "soft",
      label: "Sanft",
      text: "Sprich leise und beruhigend: Es ist alles in Ordnung. Du kannst entspannen.",
    },
  ],
  it: [
    {
      id: "welcome",
      label: "Benvenuto",
      text: "Parla con calore: Benvenuto nella sintesi vocale di Gemini. Buon ascolto.",
    },
    {
      id: "kitchen",
      label: "Ricetta",
      text: "Leggi con ritmo chiaro da tutorial: Preriscaldate il forno, poi mescolate gli ingredienti secchi.",
    },
  ],
  pt: [
    {
      id: "welcome",
      label: "Boas-vindas",
      text: "Diga com alegria: Bem-vindo à síntese de voz do Gemini. Esperamos que goste.",
    },
    {
      id: "weather",
      label: "Tempo",
      text: "Leia em tom de boletim: Hoje o céu fica limpo e a brisa vem do oceano.",
    },
  ],
  nl: [
    {
      id: "welcome",
      label: "Welkom",
      text: "Zeg vrolijk: Welkom bij Gemini spraaksynthese. Veel plezier met het uitproberen.",
    },
    {
      id: "bike",
      label: "Verkeer",
      text: "Spreek rustig en duidelijk: Let op fietsers bij de brug; het pad is smal.",
    },
  ],
  pl: [
    {
      id: "welcome",
      label: "Powitanie",
      text: "Powiedz serdecznie: Witaj w syntezie mowy Gemini. Miłego słuchania.",
    },
    {
      id: "soft",
      label: "Cicho",
      text: "Mów spokojnie i cicho: Już prawie koniec dnia. Odpocznij chwilę.",
    },
  ],
  sv: [
    {
      id: "welcome",
      label: "Välkommen",
      text: "Säg muntert: Välkommen till Geminis text-till-tal. Vi hoppas du gillar ljudet.",
    },
    {
      id: "fika",
      label: "Fika",
      text: "Läs lätt och varmt: Kaffet är klart, bullarna står på bordet.",
    },
  ],
  ru: [
    {
      id: "welcome",
      label: "Приветствие",
      text: "Скажи дружелюбно: Добро пожаловать в синтез речи Gemini. Приятного прослушивания.",
    },
    {
      id: "snow",
      label: "Зима",
      text: "Читай спокойным зимним тоном: Снег хрустит под сапогами, ветер тихо воет в проводах.",
    },
  ],
  uk: [
    {
      id: "welcome",
      label: "Вітання",
      text: "Скажи тепло: Ласкаво просимо до синтезу мовлення Gemini. Приємного прослуховування.",
    },
  ],
  ar: [
    {
      id: "welcome",
      label: "ترحيب",
      text: "قل بلهجة مرحبة: أهلاً بك في تحويل النص إلى كلام من جيميني. نتمنى أن يعجبك الصوت.",
    },
  ],
  hi: [
    {
      id: "welcome",
      label: "स्वागत",
      text: "खुश स्वर में बोलो: जेमिनी टेक्स्ट-टू-स्पीच में आपका स्वागत है। आशा है आपको आवाज़ पसंद आएगी।",
    },
  ],
  ja: [
    {
      id: "welcome",
      label: "歓迎",
      text: "明るくはっきり言って: ジェミニのテキスト読み上げへようこそ。よい音声体験をお届けします。",
    },
    {
      id: "station",
      label: "案内",
      text: "落ち着いたアナウンス口調で: まもなく終点です。出口は左側です。",
    },
    {
      id: "soft",
      label: "やさしく",
      text: "やさしくゆっくり: 今日もおつかれさまでした。少し休みましょう。",
    },
  ],
  ko: [
    {
      id: "welcome",
      label: "환영",
      text: "밝고 또렷하게 말해: 제미니 텍스트 음성 변환에 오신 것을 환영합니다. 좋은 경험이 되길 바랍니다.",
    },
    {
      id: "metro",
      label: "안내",
      text: "차분한 안내 방송 톤으로: 다음 역은 시청 앞입니다. 내리실 문은 오른쪽입니다.",
    },
  ],
  cmn: [
    {
      id: "welcome",
      label: "欢迎",
      text: "用热情清晰的语气说：欢迎使用 Gemini 文本转语音。希望您喜欢这段声音。",
    },
    {
      id: "tea",
      label: "茶艺",
      text: "用舒缓的旁白口吻：水刚开，茶叶在杯中慢慢舒展，香气轻轻飘起来。",
    },
  ],
  tr: [
    {
      id: "welcome",
      label: "Hoş geldin",
      text: "Neşeyle söyle: Gemini metinden konuşmaya hoş geldin. İyi dinlemeler.",
    },
  ],
  vi: [
    {
      id: "welcome",
      label: "Chào mừng",
      text: "Nói vui vẻ: Chào mừng bạn đến với chuyển văn bản thành giọng nói của Gemini.",
    },
  ],
  id: [
    {
      id: "welcome",
      label: "Sambutan",
      text: "Ucapkan dengan ramah: Selamat datang di teks-ke-ucapan Gemini. Selamat mendengarkan.",
    },
  ],
  th: [
    {
      id: "welcome",
      label: "ต้อนรับ",
      text: "พูดด้วยน้ำเสียงอบอุ่น: ยินดีต้อนรับสู่การแปลงข้อความเป็นเสียงของ Gemini",
    },
  ],
};

export function defaultTextForLang(code: string): string {
  const list = TTS_DEMOS_BY_LANG[code];
  if (list?.[0]) return list[0].text;
  return TTS_DEMOS_BY_LANG.en[0].text;
}

export function demosForLang(code: string): TtsDemoSnippet[] {
  return TTS_DEMOS_BY_LANG[code] ?? TTS_DEMOS_BY_LANG.en;
}
