// "Highlight repeated keywords": words that show up in more than one app's
// text. Shared by the Report's metadata comparison (titles/subtitles of the
// app vs its competitors) and Keyword Inspector (titles of a keyword's top
// search results).
//
// Unicode-aware (\p{L}\p{N}), not [a-z0-9]: an ASCII-only split drops every
// non-Latin word (Japanese, Korean, Arabic, accented letters...), so those
// titles could never show a highlight.
const NON_WORD = /[^\p{L}\p{N}]+/gu;

// 3+ characters only, so connectors like "a"/"to"/"of" never count as "repeated".
function tokenize(text: string): string[] {
  return text.toLowerCase().split(NON_WORD).filter((w) => [...w].length >= 3);
}

// A word only counts once per app even if it repeats within that app's own
// text, so "repeated" means shared *across* apps, not reused within one.
export function computeRepeatedWords(texts: string[]): Set<string> {
  const counts = new Map<string, number>();
  for (const text of texts) {
    for (const word of new Set(tokenize(text))) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return new Set([...counts.entries()].filter(([, c]) => c >= 2).map(([w]) => w));
}

export function HighlightedText({ text, repeated, active }: { text: string; repeated: Set<string>; active: boolean }) {
  if (!active) return <>{text}</>;
  return (
    <>
      {text.split(/(\s+)/).map((part, i) => {
        const clean = part.toLowerCase().replace(NON_WORD, "");
        return [...clean].length >= 3 && repeated.has(clean) ? (
          <mark key={i} className="rounded bg-indigo-500/25 text-indigo-200 light:text-indigo-800">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </>
  );
}
