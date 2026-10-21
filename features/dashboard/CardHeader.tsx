import type { ReactNode } from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

type Props = {
  title: ReactNode;
  /** Shown after the title as "· 24", e.g. how many rows the card holds. */
  count?: number;
  /** One short line under the title, e.g. "Last 30 days". */
  subtitle?: ReactNode;
  /** A size-4 icon element, colored however the card needs. */
  icon?: ReactNode;
  /** Native tooltip on an info icon next to the title. */
  info?: string;
  /** Right-aligned controls: buttons, toggles, a loading spinner. */
  children?: ReactNode;
  /** Drop the bottom hairline, e.g. when the card is collapsed. */
  divider?: boolean;
};

// The title bar every dashboard card with a distinct block of content uses,
// matching the Keyword Suggestions panel: title on the left, actions on the
// right, hairline underneath. Use it when a card holds a table, chart or list
// that shares the page with other cards. Skip it on a page's only card (the
// page header already names it), on stat tiles, on settings cards
// (SettingsCard has its own icon + title), and on list rows.
export function CardHeader({ title, count, subtitle, icon, info, children, divider = true }: Props) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 ${
        divider ? "border-b border-white/[0.07] light:border-black/[0.08]" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        {icon && <span className="flex shrink-0">{icon}</span>}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold text-white light:text-gray-900">{title}</h3>
            {count != null && (
              <span className="text-xs tabular-nums text-gray-500">· {count.toLocaleString()}</span>
            )}
            {info && (
              <span title={info} className="text-gray-600 light:text-gray-400">
                <InformationCircleIcon className="size-4" />
              </span>
            )}
          </div>
          {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}
