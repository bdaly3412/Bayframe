export default function Home() {
  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-12 sm:px-10 sm:py-20">
      <header className="border-b border-stone-300 pb-10">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Bayframe</h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-stone-700">
          Workshop operations and resource scheduling for independent automotive garages.
        </p>
      </header>

      <section aria-labelledby="status-heading" className="py-10">
        <h2 id="status-heading" className="text-xl font-semibold">Project status</h2>
        <p className="mt-4 font-medium text-amber-900">In development · Foundation stage</p>
        <p className="mt-3 leading-relaxed text-stone-700">
          The application foundation is in place. This public page describes the
          project; it does not accept bookings or hold customer records.
        </p>
      </section>

      <section aria-labelledby="scope-heading" className="border-t border-stone-300 py-10">
        <h2 id="scope-heading" className="text-xl font-semibold">Planned workflow</h2>
        <p className="mt-4 leading-relaxed text-stone-700">
          Appointment requests, staff confirmation and resource allocation, work
          orders, estimates and customer decisions. The initial scope is one workshop.
        </p>
        <p className="mt-4 leading-relaxed text-stone-700">
          These features are not available yet. Database persistence, staff access
          and scheduling guarantees have not been implemented or verified.
        </p>
      </section>

      <footer className="border-t border-stone-300 pt-6 text-sm leading-relaxed text-stone-600">
        Portfolio engineering project. No live workshop service is offered.
      </footer>
    </main>
  );
}
