// Google Play serves a listing's localization by language (`hl`), not by
// country (`gl`). Without an explicit language, google-play-scraper asks for
// English, so an Italian storefront returned the English listing ("Travel
// Diary" instead of "Diari di Viaggi") and keyword searches ranked apps the
// way an English-language phone in Italy would see them, not an Italian one.
//
// Each country maps to the language most of its users run their phone in.
// Multi-language countries take their majority language (CH→de, BE→nl,
// CA→en, IN→en). Anything unlisted falls back to English.
const PLAY_LANG: Record<string, string> = {
  // Arabic
  AE: "ar", BH: "ar", DZ: "ar", EG: "ar", IQ: "ar", JO: "ar", KW: "ar", LB: "ar",
  MR: "ar", OM: "ar", QA: "ar", SA: "ar", TN: "ar", YE: "ar", TD: "fr",
  // European
  AL: "sq", AT: "de", BE: "nl", BG: "bg", BY: "ru", CH: "de", CY: "el", CZ: "cs",
  DE: "de", DK: "da", EE: "et", ES: "es", FI: "fi", FR: "fr", GR: "el", HR: "hr",
  HU: "hu", IS: "is", IT: "it", LT: "lt", LU: "fr", LV: "lv", MD: "ro", MK: "mk",
  NL: "nl", NO: "no", PL: "pl", PT: "pt-PT", RO: "ro", RU: "ru", SE: "sv", SI: "sl",
  SK: "sk", UA: "uk", XK: "sq",
  // Asia
  AM: "hy", AZ: "az", BN: "ms", CN: "zh-CN", HK: "zh-HK", ID: "id", IL: "iw",
  JP: "ja", KG: "ru", KH: "km", KR: "ko", KZ: "ru", LA: "lo", LK: "si", MN: "mn",
  MO: "zh-HK", MY: "ms", NP: "ne", TH: "th", TJ: "ru", TM: "ru", TR: "tr", TW: "zh-TW",
  UZ: "uz", VN: "vi",
  // Latin America
  AR: "es-419", BO: "es-419", CL: "es-419", CO: "es-419", CR: "es-419", DO: "es-419",
  EC: "es-419", GT: "es-419", HN: "es-419", MX: "es-419", NI: "es-419", PA: "es-419",
  PE: "es-419", PY: "es-419", SV: "es-419", UY: "es-419", VE: "es-419", BR: "pt-BR",
  // Africa
  AO: "pt-PT", BF: "fr", BJ: "fr", CD: "fr", CG: "fr", CI: "fr", CM: "fr", CV: "pt-PT",
  GA: "fr", GW: "pt-PT", MG: "fr", ML: "fr", MZ: "pt-PT", NE: "fr", SN: "fr", ST: "pt-PT",
  // Everything else (US, GB, CA, AU, IN, IE, NZ, SG, PH, PK, ZA, NG, KE, ...) → en
};

export function playLang(country: string | null | undefined): string {
  return PLAY_LANG[(country ?? "").toUpperCase()] ?? "en";
}
