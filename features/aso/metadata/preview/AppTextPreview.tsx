import { QuestionMarkCircleIcon, ClockIcon, EyeIcon } from "@heroicons/react/24/outline";
import type { App, StoreData } from "@/libs/contracts";

type Props = {
  app: App;
  storeData: StoreData;
  dark: boolean;
};

function CharBadge({ count, limit }: { count: number; limit: number }) {
  const ok = count <= limit;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${ok ? "bg-green-500/10 text-green-400 ring-1 ring-green-500/20" : "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"}`}>
      <span className={`size-1.5 rounded-full ${ok ? "bg-green-400" : "bg-red-400"}`} />
      {count} characters
    </span>
  );
}

function LiveSearch({ words }: { words: string[] }) {
  if (!words.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      <span className="text-xs text-gray-600">Live search:</span>
      {words.map((w, i) => (
        <span key={i} className="rounded-md bg-gray-800 px-2 py-0.5 text-xs text-gray-400 ring-1 ring-white/10">
          {w}
        </span>
      ))}
    </div>
  );
}

function MetadataSection({
  title,
  value,
  limit,
  placeholder,
  dark,
}: {
  title: string;
  value: string;
  limit: number;
  placeholder: string;
  dark: boolean;
}) {
  const words = value.trim() ? value.trim().split(/\s+/).slice(0, 12) : [];

  return (
    <div className="rounded-2xl bg-[#1a1d24] ring-1 ring-white/[0.08] overflow-hidden shadow-lg shadow-black/20">
      {/* Card header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <QuestionMarkCircleIcon className="size-4 text-gray-600" />
        </div>
        <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
          <ClockIcon className="size-3.5" />
          Metadata history
        </button>
      </div>

      {/* Inner content area */}
      <div className={`mx-4 mb-4 rounded-xl ring-1 ring-white/[0.06] ${dark ? "bg-[#0d0f14]" : "bg-[#13151b]"}`}>
        <div className="px-4 pt-3 pb-2 min-h-[60px]">
          {value ? (
            <p className="text-sm text-white leading-relaxed whitespace-pre-line">{value}</p>
          ) : (
            <p className="text-sm text-gray-600 italic">{placeholder}</p>
          )}
        </div>
        <div className="flex items-center justify-between px-4 pb-3">
          <CharBadge count={value.length} limit={limit} />
          <EyeIcon className="size-4 text-gray-600 cursor-pointer hover:text-gray-400 transition-colors" />
        </div>
      </div>

      {words.length > 0 && (
        <div className="px-5 pb-4">
          <LiveSearch words={words} />
        </div>
      )}
    </div>
  );
}

export default function AppTextPreview({ app, storeData, dark }: Props) {
  if (app.store === "android") {
    return (
      <>
        <MetadataSection title="App Name" value={app.name} limit={30} placeholder="Enter app name…" dark={dark} />
        <MetadataSection title="Short Description" value={storeData?.subtitle ?? ""} limit={80} placeholder="Enter short description…" dark={dark} />
        <MetadataSection title="Description" value={storeData?.description ?? ""} limit={4000} placeholder="Enter description…" dark={dark} />
      </>
    );
  }

  return (
    <>
      <MetadataSection title="App Name" value={app.name} limit={30} placeholder="Enter app name…" dark={dark} />
      <MetadataSection title="App Subtitle" value={storeData?.subtitle ?? ""} limit={30} placeholder="Enter subtitle…" dark={dark} />
      <MetadataSection title="Promotional Text" value="" limit={170} placeholder="Enter promotional text…" dark={dark} />
      <MetadataSection title="Description" value={storeData?.description ?? ""} limit={4000} placeholder="Enter description…" dark={dark} />
    </>
  );
}
