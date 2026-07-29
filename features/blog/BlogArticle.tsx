import type { BlogBlock } from "./posts";

export default function BlogArticle({ content }: { content: BlogBlock[] }) {
  return (
    <div className="space-y-6">
      {content.map((block, i) => {
        switch (block.type) {
          case "heading":
            return (
              <h2 key={i} className="pt-4 text-2xl font-semibold tracking-tight text-white">
                {block.text}
              </h2>
            );
          case "paragraph":
            return (
              <p key={i} className="text-base leading-relaxed text-gray-400">
                {block.text}
              </p>
            );
          case "bullets":
            return (
              <ul key={i} className="list-disc space-y-2 pl-5">
                {block.items.map((item, j) => (
                  <li key={j} className="text-base leading-relaxed text-gray-400">
                    {item}
                  </li>
                ))}
              </ul>
            );
          case "table":
            return (
              <div key={i} className="overflow-x-auto rounded-xl ring-1 ring-white/10">
                <table className="w-full min-w-[640px] divide-y divide-white/10 text-left text-sm">
                  <thead className="bg-gray-800/50">
                    <tr>
                      {block.headers.map((header) => (
                        <th key={header} className="px-4 py-3 font-semibold text-white">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {block.rows.map((row, r) => (
                      <tr key={r} className={r === block.rows.length - 1 ? "bg-indigo-500/10" : undefined}>
                        {row.map((cell, c) => (
                          <td
                            key={c}
                            className={
                              c === 0
                                ? "px-4 py-3 font-medium text-white whitespace-nowrap"
                                : "px-4 py-3 text-gray-400"
                            }
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "cta":
            return (
              <div key={i} className="mt-4 rounded-2xl bg-gray-800/50 p-8 text-center ring-1 ring-white/10">
                <h3 className="text-lg font-semibold text-white">{block.heading}</h3>
                <p className="mt-2 text-sm text-gray-400">{block.body}</p>
                <a
                  href={block.href}
                  className="mt-6 inline-flex rounded-md bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                >
                  {block.label}
                </a>
              </div>
            );
        }
      })}
    </div>
  );
}
