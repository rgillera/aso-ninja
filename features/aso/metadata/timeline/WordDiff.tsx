type Op = { type: "same" | "add" | "del"; text: string };

// Each token is a word plus the whitespace after it, so line breaks in a
// description survive; words are compared without that whitespace.
function tokenize(s: string): string[] {
  return s.match(/\S+\s*/g) ?? [];
}

// Word-level diff: trims the common start and end, then a longest-common-
// subsequence pass over the middle, so only the words that actually changed
// are marked, even when edits are scattered through a long description.
function diffWords(before: string, after: string): Op[] {
  const b = tokenize(before);
  const a = tokenize(after);
  const word = (t: string) => t.trimEnd();

  let start = 0;
  while (start < b.length && start < a.length && word(b[start]) === word(a[start])) start++;
  let end = 0;
  while (end < b.length - start && end < a.length - start && word(b[b.length - 1 - end]) === word(a[a.length - 1 - end])) end++;

  const bm = b.slice(start, b.length - end);
  const am = a.slice(start, a.length - end);
  const n = bm.length;
  const m = am.length;

  // lcs[i][j] = common-subsequence length of bm[i..] and am[j..], flattened.
  const lcs = new Uint16Array((n + 1) * (m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i * (m + 1) + j] = word(bm[i]) === word(am[j])
        ? lcs[(i + 1) * (m + 1) + j + 1] + 1
        : Math.max(lcs[(i + 1) * (m + 1) + j], lcs[i * (m + 1) + j + 1]);
    }
  }

  const ops: Op[] = a.slice(0, start).map(text => ({ type: "same", text }));
  let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && word(bm[i]) === word(am[j])) { ops.push({ type: "same", text: am[j] }); i++; j++; }
    // On a tie the removal goes first, so a replacement reads old then new.
    else if (j < m && (i === n || lcs[i * (m + 1) + j + 1] > lcs[(i + 1) * (m + 1) + j])) { ops.push({ type: "add", text: am[j] }); j++; }
    else { ops.push({ type: "del", text: bm[i] }); i++; }
  }
  ops.push(...a.slice(a.length - end).map(text => ({ type: "same" as const, text })));

  // Merge runs so a changed phrase is one highlight, not one per word.
  const merged: Op[] = [];
  for (const op of ops) {
    const last = merged[merged.length - 1];
    if (last && last.type === op.type) last.text += op.text; else merged.push({ ...op });
  }
  return merged;
}

// The after text, with added words highlighted and removed words struck
// through where they used to be.
export function WordDiff({ before, after }: { before: string; after: string }) {
  return (
    <span className="whitespace-pre-line">
      {diffWords(before, after).map((op, i) =>
        op.type === "same" ? <span key={i}>{op.text}</span>
        : op.type === "add" ? <span key={i} className="rounded-sm bg-teal-500/20 text-teal-300 light:text-teal-800">{op.text}</span>
        : <span key={i} className="rounded-sm bg-red-500/10 text-red-400 light:text-red-600 line-through decoration-red-400/70">{op.text}</span>
      )}
    </span>
  );
}
