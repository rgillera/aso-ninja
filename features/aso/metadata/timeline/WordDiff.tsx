export function WordDiff({ before, after }: { before: string; after: string }) {
  const bw = before.split(/\s+/).filter(Boolean);
  const aw  = after.split(/\s+/).filter(Boolean);

  let pi = 0;
  while (pi < bw.length && pi < aw.length && bw[pi] === aw[pi]) pi++;
  let si = 0;
  while (si < bw.length - pi && si < aw.length - pi && bw[bw.length - 1 - si] === aw[aw.length - 1 - si]) si++;

  const prefix  = bw.slice(0, pi);
  const removed = bw.slice(pi, si > 0 ? bw.length - si : undefined);
  const added   = aw.slice(pi, si > 0 ? aw.length - si : undefined);
  const suffix  = si > 0 ? bw.slice(bw.length - si) : [];

  return (
    <span className="leading-relaxed">
      {prefix.length  > 0 && <span className="text-gray-400">{prefix.join(" ")}</span>}
      {removed.length > 0 && <span className="text-red-400 line-through">{(prefix.length > 0 ? " " : "") + removed.join(" ")}</span>}
      {added.length   > 0 && <span className="text-teal-400">{((removed.length > 0 || prefix.length > 0) ? " " : "") + added.join(" ")}</span>}
      {suffix.length  > 0 && <span className="text-gray-400">{" " + suffix.join(" ")}</span>}
    </span>
  );
}
