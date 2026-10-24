"use client";

const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL;

const links = {
  Product: [
    { label: "How it works", href: "/#how-it-works" },
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Testimonials", href: "/#testimonials" },
    ...(calendlyUrl ? [{ label: "Book a Demo", href: calendlyUrl }] : []),
  ],
  Services: [
    { label: "Growth Sprint", href: "/growth-sprint" },
    { label: "Growth Retainer", href: "/growth-retainer" },
  ],
  Company: [
    { label: "Our Story", href: "/our-story" },
    { label: "Blog Posts", href: "/blog" },
  ],
  Legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
};

const addresses = [
  { country: "United States", lines: ["1309 Coffeen Avenue STE 1200", "Sheridan, Wyoming 82801"] },
  { country: "Philippines", lines: ["812 Cebu North Road, Pitogo", "Consolacion, Cebu 6001"] },
];

export default function PortalFooter() {
  return (
    <footer className="bg-gray-50 border-t border-black/[0.06]">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between">
          <div className="max-w-xs">
            <span className="flex items-center gap-3">
              <span className="flex items-end gap-1 rounded-xl bg-gray-950 p-2.5 pb-3.5">
                <span className="h-4 w-1.5 rounded-sm bg-indigo-500" />
                <span className="h-6 w-1.5 rounded-sm bg-indigo-400" />
                <span className="h-8 w-1.5 rounded-sm bg-indigo-300" />
              </span>
              <span className="text-3xl font-bold text-gray-900 tracking-tight">
                App<span className="text-indigo-600">ASO</span>
              </span>
            </span>
            <p className="mt-4 text-sm text-gray-500 max-w-xs">
              App Store Optimization intelligence for modern app teams.
            </p>
            <p className="mt-4 text-sm text-gray-400">
              Support:{" "}
              <a
                href="mailto:hello@appaso.io"
                className="text-gray-600 underline-offset-2 transition-colors hover:text-gray-900 hover:underline"
              >
                hello@appaso.io
              </a>
            </p>
            <div className="mt-5 flex items-center gap-2">
              <a
                href="https://www.linkedin.com/company/app-aso/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="inline-flex size-9 items-center justify-center rounded-full bg-gray-950/[0.04] text-gray-500 transition-colors hover:bg-gray-950/[0.08] hover:text-gray-900"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a
                href="mailto:hello@appaso.io"
                aria-label="Email"
                className="inline-flex size-9 items-center justify-center rounded-full bg-gray-950/[0.04] text-gray-500 transition-colors hover:bg-gray-950/[0.08] hover:text-gray-900"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M1.5 8.67v8.58a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V8.67l-8.928 5.493a3 3 0 0 1-3.144 0L1.5 8.67Z" />
                  <path d="M22.5 6.908V6.75a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.158l9.714 5.978a1.5 1.5 0 0 0 1.572 0L22.5 6.908Z" />
                </svg>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-4 lg:w-fit lg:gap-x-12">
            {Object.entries(links).map(([group, items]) => (
              <div key={group}>
                <h4 className="text-sm font-semibold text-gray-900">{group}</h4>
                <ul className="mt-4 space-y-3">
                  {items.map((item) => {
                    const external = item.href.startsWith("http");
                    return (
                      <li key={item.label}>
                        <a
                          href={item.href}
                          target={external ? "_blank" : undefined}
                          rel={external ? "noopener noreferrer" : undefined}
                          className="whitespace-pre-line text-sm text-gray-500 hover:text-gray-900 transition-colors"
                        >
                          {item.label}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-start gap-x-10 gap-y-4 border-t border-black/[0.06] pt-8">
          {addresses.map(({ country, lines }) => (
            <details key={country} className="group text-sm text-gray-400">
              <summary className="flex cursor-pointer list-none items-center gap-2 transition-colors hover:text-gray-900 [&::-webkit-details-marker]:hidden">
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="m11.54 22.351.07.04.028.016a.76.76 0 0 0 .723 0l.028-.015.071-.041a16.975 16.975 0 0 0 1.144-.742 19.58 19.58 0 0 0 2.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 0 0-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 0 0 2.682 2.282 16.975 16.975 0 0 0 1.145.742ZM12 13.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                    clipRule="evenodd"
                  />
                </svg>
                {country}
                <svg className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </summary>
              <address className="mt-2 pl-6 not-italic">
                {lines.map((line, i) => (
                  <span key={line}>
                    {i > 0 && <br />}
                    {line}
                  </span>
                ))}
              </address>
            </details>
          ))}
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} AppASO.io - Free ASO tool. All rights reserved.
          </p>
          <p className="text-sm text-gray-400">
            Built for iOS &amp; Android
          </p>
        </div>
      </div>
    </footer>
  );
}
