import type { BlogBlock } from "./posts";

export default function BlogArticle({ content }: { content: BlogBlock[] }) {
  return (
    <div className="space-y-6">
      {content.map((block, i) => {
        switch (block.type) {
          case "heading":
            return (
              <h2 key={i} className="pt-4 text-2xl font-semibold tracking-tight text-gray-900">
                {block.text}
              </h2>
            );
          case "paragraph":
            return (
              <p key={i} className="text-base leading-relaxed text-gray-600">
                {block.text}
              </p>
            );
          case "bullets":
            return (
              <ul key={i} className="list-disc space-y-2 pl-5">
                {block.items.map((item, j) => (
                  <li key={j} className="text-base leading-relaxed text-gray-600">
                    {item}
                  </li>
                ))}
              </ul>
            );
          case "table":
            return (
              <div key={i} className="overflow-x-auto rounded-xl shadow-clay ring-1 ring-black/5">
                <table className="w-full min-w-[640px] divide-y divide-black/[0.06] text-left text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {block.headers.map((header) => (
                        <th key={header} className="px-4 py-3 font-semibold text-gray-900">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.06] bg-white">
                    {block.rows.map((row, r) => (
                      <tr key={r} className={r === block.rows.length - 1 ? "bg-indigo-50" : undefined}>
                        {row.map((cell, c) => (
                          <td
                            key={c}
                            className={
                              c === 0
                                ? "px-4 py-3 font-medium text-gray-900 whitespace-nowrap"
                                : "px-4 py-3 text-gray-600"
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
              <div key={i} className="mt-4 rounded-2xl bg-white p-8 text-center shadow-clay ring-1 ring-black/5">
                <h3 className="text-lg font-semibold text-gray-900">{block.heading}</h3>
                <p className="mt-2 text-sm text-gray-600">{block.body}</p>
                <a
                  href={block.href}
                  className="mt-6 inline-flex rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-clay-btn transition-colors hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
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
