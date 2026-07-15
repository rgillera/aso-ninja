const links = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
  ],
  Service: [
    { label: "Managed ASO", href: "/managed-aso" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Our Story", href: "/our-story" },
    { label: "Contact", href: "/contact" },
  ],
  Legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
};

export default function PortalFooter() {
  return (
    <footer className="bg-gray-950 border-t border-white/10">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-1">
            <span className="flex items-center gap-2">
              <span className="flex items-end gap-0.5 rounded-md bg-gray-900 ring-1 ring-white/10 p-1.5">
                <span className="h-2.5 w-1 rounded-sm bg-indigo-500" />
                <span className="h-4 w-1 rounded-sm bg-indigo-400" />
                <span className="h-5 w-1 rounded-sm bg-indigo-300" />
              </span>
              <span className="text-xl font-bold text-white tracking-tight">
                App<span className="text-indigo-400">ASO</span>
              </span>
            </span>
            <p className="mt-4 text-sm text-gray-500 max-w-xs">
              App Store Optimization intelligence for modern app teams.
            </p>
          </div>

          {Object.entries(links).map(([group, items]) => (
            <div key={group}>
              <h4 className="text-sm font-semibold text-white">{group}</h4>
              <ul className="mt-4 space-y-3">
                {items.map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-600">
            &copy; {new Date().getFullYear()} AppASO. All rights reserved.
          </p>
          <p className="text-sm text-gray-600">
            Built for iOS &amp; Android
          </p>
        </div>
      </div>
    </footer>
  );
}
