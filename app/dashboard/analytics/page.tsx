import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export default function Page() {
  return (
    <main className="h-full flex items-center justify-center bg-[#111318] light:bg-[#f5f6f8]">
      <div className="text-center">
        <MagnifyingGlassIcon className="size-10 text-gray-700 light:text-gray-300 mx-auto mb-4" />
        <p className="text-sm font-medium text-gray-400 light:text-gray-600">No apps yet</p>
        <p className="mt-1 text-sm text-gray-600 light:text-gray-400">Use the search bar above to find an app.</p>
      </div>
    </main>
  );
}
