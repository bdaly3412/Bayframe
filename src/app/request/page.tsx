import { Brand } from "@/app/brand";
import { ActionForm } from "../action-form";

export const dynamic = "force-dynamic";
export default function RequestPage() {
  const workshopId = process.env.BAYFRAME_WORKSHOP_ID;
  return <main id="main" tabIndex={-1} className="customer-shell">
    <header className="customer-header"><Brand /><span className="muted">Appointment request</span></header>
    <div className="customer-layout">
      <div className="customer-content">
        <header className="page-header"><h1>Request a workshop appointment</h1><p className="lead">Choose a time and tell us which vehicle needs attention. Staff confirmation is required.</p></header>
        {!workshopId ? <p role="status">Local demonstration setup is required before requests can be accepted.</p> : <>
          <section className="request-step"><header className="section-header"><h2>Check a time</h2><p className="muted">Availability is advisory until staff reserve a bay and technician.</p></header><ActionForm command="availability" workshopId={workshopId} label="Check availability"><TimeField id="availability-time-policy" /></ActionForm></section>
          <section className="request-step"><header className="section-header"><h2>Send your request</h2></header><ActionForm command="request" workshopId={workshopId} label="Request appointment" reset>
            <label>Booking contact<input name="name" autoComplete="name" maxLength={120} required /></label>
            <label>Email<input name="email" type="email" autoComplete="email" spellCheck={false} maxLength={254} required /></label>
            <label>Vehicle registration<input name="registration" autoComplete="off" maxLength={20} required /></label><TimeField id="request-time-policy" />
          </ActionForm></section>
        </>}
      </div>
      <aside className="customer-aside"><h2>Before you request</h2><dl><dt>Service length</dt><dd>60 minutes</dd><dt>Workshop hours</dt><dd>Monday–Friday, 09:00–17:00</dd><dt>Time zone</dt><dd>Europe/London</dd></dl><p>Sending this form creates a request. It does not reserve a bay or technician.</p><p className="demo-note">Use synthetic contact and vehicle details. This is a local demonstration; no live workshop service is offered.</p></aside>
    </div>
  </main>;
}
function TimeField({ id }: { id: string }) {
  return <label>Requested start (absolute time)<input name="startAt" type="text" autoComplete="off" required placeholder="2026-10-26T09:00:00+00:00…" aria-describedby={id} /><small id={id}>ISO 8601 with Z or an explicit UTC offset. For example, 2026-10-26T09:00:00+00:00. Ambiguous local times without an offset are rejected.</small></label>;
}
