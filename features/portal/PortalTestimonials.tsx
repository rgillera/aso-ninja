import PortalEyebrow from "./PortalEyebrow";

const testimonials = [
  {
    quote:
      "AppASO cut our keyword research time in half, and tracking weekly rank changes told us exactly which terms were actually moving the needle.",
    name: "Aarav Sharma",
    title: "Growth Lead, Lumio Apps",
    avatar: "AS",
  },
  {
    quote:
      "Keyword research told us which terms to go after, and keyword combinations surfaced long-tail variants we would've never thought to search for. Adding them for tracking is very convenient.",
    name: "Maya Chen",
    title: "Founder, Habitly",
    avatar: "MC",
  },
];

export default function PortalTestimonials() {
  return (
    <section id="testimonials" className="border-t border-gray-950/5 bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <PortalEyebrow>Testimonials</PortalEyebrow>
          <h2 className="mt-4 text-balance text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
            Trusted by app teams{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">worldwide</span>
          </h2>
        </div>

        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:mt-20 lg:max-w-5xl lg:grid-cols-2">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="flex flex-col rounded-3xl bg-white p-8 ring-1 ring-gray-950/10 transition-shadow hover:shadow-clay sm:p-10"
            >
              <svg aria-hidden="true" viewBox="0 0 32 24" className="h-6 w-8 fill-indigo-500">
                <path d="M0 24V14.4C0 6.4 4.27 1.6 12.8 0l1.6 3.2C10.13 4.53 8 7.2 8 11.2h6.4V24H0Zm17.6 0V14.4C17.6 6.4 21.87 1.6 30.4 0L32 3.2c-4.27 1.33-6.4 4-6.4 8h6.4V24H17.6Z" />
              </svg>
              <blockquote className="mt-6 flex-1 text-lg leading-8 tracking-tight text-gray-900">
                <p>{t.quote}</p>
              </blockquote>
              <figcaption className="mt-8 flex items-center gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold text-white">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-950">{t.name}</div>
                  <div className="text-sm text-gray-500">{t.title}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
