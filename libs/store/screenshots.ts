import type { App } from "@/libs/contracts";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function scrapeIos(storeId: string, country: string): Promise<string[]> {
  const res = await fetch(`https://apps.apple.com/${country.toLowerCase()}/app/id${storeId}`, {
    headers: { "User-Agent": UA }, cache: "no-store",
  });
  const html = await res.text();
  const re = /(https:\/\/is\d+-?ssl\.mzstatic\.com\/image\/thumb\/[^"'\s]+\/)(\d{2,4}x\d{3,4}bb(?:-\d+)?\.(?:webp|jpg|png))/g;
  const EXCLUDE = /Placeholder|AppIcon|Features|\{w\}x\{h\}/i;
  const seen = new Set<string>(); const results: string[] = []; let m;
  while ((m = re.exec(html)) !== null) {
    const base = m[1]; if (EXCLUDE.test(base)) continue;
    const [w, h] = m[2].split("x").map(Number); if (h <= w) continue;
    if (!seen.has(base)) { seen.add(base); results.push(`${base}300x650bb.webp`); }
    if (results.length >= 7) break;
  }
  return results;
}

async function scrapeAndroid(packageId: string, country: string): Promise<string[]> {
  const res = await fetch(
    `https://play.google.com/store/apps/details?id=${packageId}&hl=en&gl=${country}`,
    { headers: { "User-Agent": UA }, cache: "no-store" }
  );
  const html = await res.text();
  const shotRe = /jscontroller="RQJprf"[^>]*><img src="(https:\/\/play-lh\.googleusercontent\.com\/[^"]+)"/g;
  const results: string[] = []; let m;
  while ((m = shotRe.exec(html)) !== null) {
    results.push(m[1].replace(/=[^=\s"']+$/, "") + "=w390-h844-rw");
    if (results.length >= 7) break;
  }
  return results;
}

export async function fetchAppScreenshots(app: App): Promise<string[]> {
  try {
    const country = app.country ?? "US";
    if (app.store === "ios"     && app.store_id)   return await scrapeIos(app.store_id, country);
    if (app.store === "android" && app.bundle_id)  return await scrapeAndroid(app.bundle_id, country);
    return [];
  } catch { return []; }
}
