import Link from "next/link";
import { Brand } from "@/app/brand";

export default function Home() {
  return <main id="main" tabIndex={-1} className="customer-shell">
    <header className="customer-header"><Brand /><span className="muted">Workshop operations</span></header>
    <div className="customer-content">
      <header className="page-header"><h1>Your next step</h1><p className="lead">Appointments, workshop work and customer decisions in one place.</p></header>
      <nav aria-label="Application" className="entry-routes">
        <Link href="/request" className="entry-route"><h2>Request an appointment</h2><p>Send your vehicle details and preferred time for staff confirmation.</p><span className="text-link">Start a request</span></Link>
        <Link href="/login" className="entry-route"><h2>Staff sign in</h2><p>Plan the day, allocate resources and manage work and estimates.</p><span className="text-link">Open the workshop</span></Link>
      </nav>
      <p className="demo-note">Local workshop demonstration. Use synthetic data only; no live workshop service is offered.</p>
    </div>
  </main>;
}
