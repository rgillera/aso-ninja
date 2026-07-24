import Link from "next/link";

function workspaceInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function WorkspacePicker({ workspaces }: { workspaces: { id: string; name: string }[] }) {
  return (
    <main className="mx-auto max-w-md">
      <header className="border-b border-white/[0.06] px-5 py-5">
        <h1 className="text-base font-medium text-gray-100">Choose a workspace</h1>
        <p className="mt-0.5 text-sm text-gray-600">Rankings</p>
      </header>

      <ul className="divide-y divide-white/[0.06]">
        {workspaces.map((ws) => (
          <li key={ws.id}>
            <Link href={`/mobile/${ws.id}`} className="flex items-center gap-3 px-5 py-4 active:bg-white/[0.04]">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-indigo-500/60 text-sm font-bold text-white">
                {workspaceInitial(ws.name)}
              </div>
              <span className="truncate text-sm text-gray-200">{ws.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
