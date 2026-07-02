import { QuestionMarkCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import type { App, StoreData } from "@/libs/contracts";

type Props = {
  app: App;
  storeData: StoreData;
  dark: boolean;
  promotionalText: string;
  originalName: string;
  originalSubtitle: string;
  originalDescription: string;
  onNameChange: (value: string) => void;
  onSubtitleChange: (value: string) => void;
  onPromotionalTextChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
};

function CharBadge({ count, limit }: { count: number; limit: number }) {
  const ratio = count / limit;
  const exceeded = count > limit;
  const status: "green" | "yellow" | "red" =
    count === 0 || exceeded ? "red" : ratio >= 0.7 ? "green" : "yellow";

  const styles = {
    green:  "bg-green-500/10 text-green-400 ring-1 ring-green-500/20",
    yellow: "bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20",
    red:    "bg-red-500/10 text-red-400 ring-1 ring-red-500/20",
  };
  const dotStyles = {
    green: "bg-green-400",
    yellow: "bg-yellow-400",
    red: "bg-red-400",
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {exceeded ? <ExclamationCircleIcon className="size-3.5" /> : <span className={`size-1.5 rounded-full ${dotStyles[status]}`} />}
      {count} characters
    </span>
  );
}

function MetadataSection({
  title,
  value,
  limit,
  placeholder,
  dark,
  rows = 2,
  originalValue,
  onChange,
}: {
  title: string;
  value: string;
  limit: number;
  placeholder: string;
  dark: boolean;
  rows?: number;
  originalValue?: string;
  onChange: (value: string) => void;
}) {
  const exceeded = value.length > limit;
  const showCurrentValue = originalValue !== undefined && originalValue !== "" && originalValue !== value;

  return (
    <div className="rounded-2xl bg-[#1a1d24] ring-1 ring-white/[0.08] overflow-hidden shadow-lg shadow-black/20">
      {/* Card header */}
      <div className="flex items-center gap-1.5 px-5 pt-4 pb-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <QuestionMarkCircleIcon className="size-4 text-gray-600" />
      </div>

      {exceeded && (
        <div className="flex items-center gap-1.5 px-5 pb-2 text-xs text-red-400">
          <ExclamationCircleIcon className="size-4 shrink-0" />
          {title} can&rsquo;t have more than {limit} characters
        </div>
      )}

      {/* Inner content area */}
      <div className={`mx-4 rounded-xl ring-1 ${exceeded ? "ring-red-500/40" : "ring-white/[0.06]"} ${dark ? "bg-[#0d0f14]" : "bg-[#13151b]"} ${showCurrentValue ? "mb-2" : "mb-4"}`}>
        <div className="px-4 pt-3 pb-2">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="w-full resize-none bg-transparent text-sm text-white leading-relaxed outline-none placeholder:italic placeholder:text-gray-600"
          />
        </div>
        <div className="px-4 pb-3">
          <CharBadge count={value.length} limit={limit} />
        </div>
      </div>

      {showCurrentValue && (
        <p className="px-5 pb-4 text-xs text-gray-500 truncate">
          Current {title}: {originalValue}
        </p>
      )}
    </div>
  );
}

export default function AppTextPreview({
  app,
  storeData,
  dark,
  promotionalText,
  originalName,
  originalSubtitle,
  originalDescription,
  onNameChange,
  onSubtitleChange,
  onPromotionalTextChange,
  onDescriptionChange,
}: Props) {
  if (app.store === "android") {
    return (
      <>
        <MetadataSection title="App Name" value={app.name} limit={30} placeholder="Enter app name…" dark={dark} originalValue={originalName} onChange={onNameChange} />
        <MetadataSection title="Short Description" value={storeData?.subtitle ?? ""} limit={80} placeholder="Enter short description…" dark={dark} rows={3} originalValue={originalSubtitle} onChange={onSubtitleChange} />
        <MetadataSection title="Description" value={storeData?.description ?? ""} limit={4000} placeholder="Enter description…" dark={dark} rows={10} originalValue={originalDescription} onChange={onDescriptionChange} />
      </>
    );
  }

  return (
    <>
      <MetadataSection title="App Name" value={app.name} limit={30} placeholder="Enter app name…" dark={dark} originalValue={originalName} onChange={onNameChange} />
      <MetadataSection title="App Subtitle" value={storeData?.subtitle ?? ""} limit={30} placeholder="Enter subtitle…" dark={dark} originalValue={originalSubtitle} onChange={onSubtitleChange} />
      <MetadataSection title="Promotional Text" value={promotionalText} limit={170} placeholder="Enter promotional text…" dark={dark} rows={3} onChange={onPromotionalTextChange} />
      <MetadataSection title="Description" value={storeData?.description ?? ""} limit={4000} placeholder="Enter description…" dark={dark} rows={10} originalValue={originalDescription} onChange={onDescriptionChange} />
    </>
  );
}
