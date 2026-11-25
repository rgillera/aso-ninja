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

// Play writes a listing's release date in the language it was fetched in
// ("17.05.2019", "17 mai 2019", "17 de mai. de 2019", "17‏/05‏/2019"), and
// Date.parse only reads English ones. Missing it silently dropped non-English
// Android apps out of the installs-based download estimate.
const monthNameCache = new Map<string, Map<string, number>>();

function monthNames(lang: string): Map<string, number> {
  let names = monthNameCache.get(lang);
  if (names) return names;
  names = new Map();
  const add = (s: string, m: number) => {
    const key = s.toLowerCase().replace(/\.$/, "");
    if (key && !names!.has(key)) names!.set(key, m);
  };
  try {
    for (let m = 0; m < 12; m++) {
      const d = new Date(Date.UTC(2020, m, 15));
      for (const month of ["long", "short"] as const) {
        add(new Intl.DateTimeFormat(lang, { month, timeZone: "UTC" }).format(d), m);
        // In-date forms differ in some languages (Russian "мая" vs "май").
        const part = new Intl.DateTimeFormat(lang, { day: "numeric", month, timeZone: "UTC" })
          .formatToParts(d).find((p) => p.type === "month");
        if (part) add(part.value, m);
      }
    }
  } catch {
    // Unknown locale: numeric dates still parse.
  }
  monthNameCache.set(lang, names);
  return names;
}

// True when this language writes numeric dates day-first (17/05/2019).
function dayFirst(lang: string): boolean {
  try {
    const parts = new Intl.DateTimeFormat(lang, { day: "numeric", month: "numeric", year: "numeric", timeZone: "UTC" })
      .formatToParts(new Date(Date.UTC(2020, 4, 17)));
    return parts.findIndex((p) => p.type === "day") < parts.findIndex((p) => p.type === "month");
  } catch {
    return true;
  }
}

export function parsePlayDate(text: string | null | undefined, lang: string): number | undefined {
  if (!text) return undefined;
  const clean = text
    .replace(/[\u200e\u200f\u061c]/g, "")
    .replace(/[\u0660-\u0669]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (c) => String(c.charCodeAt(0) - 0x06f0));
  const nums = (clean.match(/\d+/g) ?? []).map(Number);
  const yearIdx = nums.findIndex((n) => n >= 1000);
  if (yearIdx !== -1) {
    let year = nums[yearIdx];
    if (year > 2400) year -= 543; // Thai Buddhist era
    const rest = nums.filter((_, i) => i !== yearIdx);
    let month: number | undefined;
    let day: number | undefined;
    const names = monthNames(lang);
    // Dots inside a word are kept for abbreviations like Thai "พ.ค.".
    const word = (clean.match(/[\p{L}\p{M}][\p{L}\p{M}.]*/gu) ?? [])
      .map((w) => w.toLowerCase().replace(/\.$/, ""))
      .find((w) => names.has(w));
    if (word !== undefined && rest.length >= 1) {
      month = names.get(word)!;
      day = rest[0];
    } else if (rest.length >= 2) {
      // Year first (2019/05/17, 2019. 5. 17., 2019年5月17日) is always y-m-d.
      const [a, b] = rest;
      [day, month] = yearIdx === 0 || !dayFirst(lang) ? [b, a - 1] : [a, b - 1];
    }
    if (month !== undefined && day !== undefined && month >= 0 && month < 12 && day >= 1 && day <= 31) {
      return Date.UTC(year, month, day);
    }
  }
  const fallback = Date.parse(clean);
  return Number.isNaN(fallback) ? undefined : fallback;
}
