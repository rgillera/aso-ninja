import type { ComponentType, ReactNode, SVGProps } from "react";

type Props = {
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  description?: ReactNode;
  // Right-aligned slot in the header row (a badge, count, or button).
  action?: ReactNode;
  tone?: "default" | "danger";
  id?: string;
  className?: string;
  children?: ReactNode;
};

// Shared card shell for Account and Workspace settings so both pages read as
// one system: icon tile + title/description header, optional header action,
// and a body that sits under a hairline divider.
export function SettingsCard({
  icon: Icon,
  title,
  description,
  action,
  tone = "default",
  id,
  className = "",
  children,
}: Props) {
  const danger = tone === "danger";
  return (
    <section
      id={id}
      className={`flex flex-col scroll-mt-4 rounded-2xl bg-[#1a1d24] light:bg-white ring-1 shadow-sm shadow-black/10 ${
        danger ? "ring-red-500/20" : "ring-white/[0.06] light:ring-black/[0.06]"
      } ${className}`}
    >
      {/* With no body, center the header so a card stretched to match its
          row neighbour doesn't leave empty space hanging below it. */}
      <div className={`flex items-start justify-between gap-4 p-6 ${children ? "" : "my-auto"}`}>
        <div className="flex min-w-0 items-start gap-3.5">
          {Icon && (
            <div
              className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                danger
                  ? "bg-red-500/10 text-red-400 light:text-red-600"
                  : "bg-indigo-500/10 text-indigo-400 light:text-indigo-600"
              }`}
            >
              <Icon className="size-[18px]" />
            </div>
          )}
          <div className="min-w-0">
            <h2
              className={`text-[15px] font-semibold ${description ? "leading-6" : "leading-9"} ${danger ? "text-red-400 light:text-red-600" : "text-white light:text-gray-900"}`}
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-gray-400 light:text-gray-600">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="flex shrink-0 items-center gap-3">{action}</div>}
      </div>
      {children && (
        <div className="flex-1 border-t border-white/[0.06] light:border-black/[0.06] p-6">{children}</div>
      )}
    </section>
  );
}

export function SettingsHeader({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="mb-8">
      <a
        href="/dashboard"
        className="text-sm text-gray-500 hover:text-white light:hover:text-gray-900 transition-colors"
      >
        ← Back to dashboard
      </a>
      <h1 className="mt-4 text-2xl font-semibold text-white light:text-gray-900">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-gray-400 light:text-gray-600">{subtitle}</p>}
    </div>
  );
}
