"use client";

const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL;

const links = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Testimonials", href: "/#testimonials" },
    ...(calendlyUrl ? [{ label: "Book a Demo", href: calendlyUrl }] : []),
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Our Story", href: "/our-story" },
    { label: "Contact", href: "/contact" },
  ],
  Others: [
    { label: "Managed ASO", href: "/managed-aso" },
    { label: "App Landing\nPage Generator", href: "https://apppanda.io/" },
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
        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between">
          <div className="max-w-xs">
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
            <div className="mt-4 flex items-center gap-4">
              <a
                href="https://www.linkedin.com/company/app-aso/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="inline-flex text-gray-600 hover:text-gray-300 transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a
                href="mailto:hello@appaso.io"
                aria-label="Email"
                className="inline-flex text-gray-600 hover:text-gray-300 transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M1.5 8.67v8.58a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V8.67l-8.928 5.493a3 3 0 0 1-3.144 0L1.5 8.67Z" />
                  <path d="M22.5 6.908V6.75a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.158l9.714 5.978a1.5 1.5 0 0 0 1.572 0L22.5 6.908Z" />
                </svg>
              </a>
              <button
                type="button"
                onClick={() => window.Tawk_API?.maximize?.()}
                aria-label="Chat with us"
                className="inline-flex text-gray-600 hover:text-gray-300 transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M4.804 21.644A6.707 6.707 0 0 0 6 21.75a6.721 6.721 0 0 0 3.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 0 1-.814 1.686.75.75 0 0 0 .44 1.223Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-4 lg:w-fit lg:gap-x-12">
            {Object.entries(links).map(([group, items]) => (
              <div key={group}>
                <h4 className="text-sm font-semibold text-white">{group}</h4>
                <ul className="mt-4 space-y-3">
                  {items.map((item) => {
                    const external = item.href.startsWith("http");
                    return (
                      <li key={item.label}>
                        <a
                          href={item.href}
                          target={external ? "_blank" : undefined}
                          rel={external ? "noopener noreferrer" : undefined}
                          className="whitespace-pre-line text-sm text-gray-500 hover:text-gray-300 transition-colors"
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
