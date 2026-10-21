export default function PortalEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-gray-950/10 bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm">
      <span className="size-1.5 rounded-full bg-indigo-500" />
      {children}
    </span>
  );
}
