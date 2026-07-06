const testimonials = [
  {
    quote:
      "AppASO cut our keyword research time in half, and tracking daily rank changes told us exactly which terms were actually moving the needle.",
    name: "Mia Chen",
    title: "Growth Lead, Lumio Apps",
    avatar: "MC",
  },
  {
    quote:
      "Keyword research told us which terms to go after, and keyword combinations surfaced long-tail variants we would've never thought to search for. Adding them for tracking is very convenient.",
    name: "Rex Torres",
    title: "Founder, NutriSnap",
    avatar: "DT",
  },
  {
    quote:
      "The workspace model is perfect for our agency. Each client gets their own space and we manage everything from one dashboard.",
    name: "Rodel Gillera",
    title: "ASO Manager, ASO Ninja",
    avatar: "SK",
  },
];

export default function PortalTestimonials() {
  return (
    <section id="testimonials" className="bg-gray-900 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest">Testimonials</p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Trusted by app teams worldwide
          </h2>
        </div>

        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="flex flex-col rounded-2xl bg-gray-800/50 ring-1 ring-white/10 p-8"
            >
              <blockquote className="flex-1 text-base leading-7 text-gray-300">
                <p>&ldquo;{t.quote}&rdquo;</p>
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-semibold text-indigo-300">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{t.name}</div>
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
