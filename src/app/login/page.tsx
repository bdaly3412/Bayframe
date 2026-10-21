import { Brand } from "@/app/brand";
import { LoginForm } from "./form";

export const dynamic = "force-dynamic";

export default function Login() {
  return <main id="main" tabIndex={-1} className="customer-shell">
    <header className="customer-header"><Brand /><span className="muted">Staff access</span></header>
    <div className="customer-layout">
      <section className="customer-content">
        <header className="page-header"><h1>Staff sign in</h1><p className="lead">Use your workshop staff account.</p></header>
        <LoginForm />
      </section>
      <aside className="customer-aside"><h2>Back to the workshop</h2><p>Bookings, bay and technician allocations, work orders and estimates are available after sign in.</p><p className="demo-note">Local demonstration. Use your synthetic staff account.</p></aside>
    </div>
  </main>;
}
