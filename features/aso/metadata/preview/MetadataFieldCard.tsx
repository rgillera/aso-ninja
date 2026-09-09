import { QuestionMarkCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";

export function CharBadge({ count, limit }: { count: number; limit: number }) {
  const ratio = count / limit;
  const exceeded = count > limit;
  const status: "green" | "yellow" | "red" =
    count === 0 || exceeded ? "red" : ratio >= 0.7 ? "green" : "yellow";

  const styles = {
    green: "bg-green-500/10 text-green-400 light:text-green-700 ring-1 ring-green-500/20",
    yellow: "bg-yellow-500/10 text-yellow-400 light:text-yellow-700 ring-1 ring-yellow-500/20",
    red: "bg-red-500/10 text-red-400 light:text-red-600 ring-1 ring-red-500/20",
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

export function MetadataSection({
  title,
  value,
  limit,
  placeholder,
  rows = 2,
  originalValue,
  onChange,
}: {
  title: string;
  value: string;
  limit: number;
  placeholder: string;
  rows?: number;
  originalValue?: string;
  onChange: (value: string) => void;
}) {
  const exceeded = value.length > limit;
  const showCurrentValue = originalValue !== undefined && originalValue !== "" && originalValue !== value;

  return (
    <div className="rounded-2xl bg-[#1a1d24] light:bg-white overflow-hidden shadow-lg shadow-black/20 light:shadow-black/10">
      {/* Card header */}
      <div className="flex items-center gap-1.5 px-5 pt-4 pb-3">
        <h3 className="text-sm font-semibold text-white light:text-gray-900">{title}</h3>
        <QuestionMarkCircleIcon className="size-4 text-gray-600 light:text-gray-400" />
      </div>

      {exceeded && (
        <div className="flex items-center gap-1.5 px-5 pb-2 text-xs text-red-400 light:text-red-600">
          <ExclamationCircleIcon className="size-4 shrink-0" />
          {title} can&rsquo;t have more than {limit} characters
        </div>
      )}

      {/* Inner content area — this is our own editing UI, not the simulated
          store screen (see PhonePreview, which has its own real dark/light
          toggle for that), so it follows the site theme like any other
          recessed input well. */}
      <div className={`mx-4 rounded-xl bg-[#0d0f14] light:bg-gray-50 ${exceeded ? "ring-1 ring-red-500/40" : ""} ${showCurrentValue ? "mb-2" : "mb-4"}`}>
        <div className="px-4 pt-3 pb-2">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="w-full resize-none bg-transparent text-sm text-white light:text-gray-900 leading-relaxed outline-none placeholder:italic placeholder:text-gray-600 light:placeholder:text-gray-400"
          />
        </div>
        <div className="px-4 pb-3">
          <CharBadge count={value.length} limit={limit} />
        </div>
      </div>

      {showCurrentValue && (
        <div className="px-5 pb-4">
          <p className="mb-2 text-xs text-gray-500">Current {title}:</p>
          <div className="max-h-48 overflow-y-auto rounded-xl bg-white/[0.03] light:bg-black/[0.03] px-4 py-3">
            <p className="text-sm text-gray-400 light:text-gray-600 leading-relaxed whitespace-pre-line">{originalValue}</p>
          </div>
        </div>
      )}
    </div>
  );
}
