import Link from "next/link";
import { ActionForm } from "../action-form";

export const dynamic = "force-dynamic";
export default function RequestPage() {
  const workshopId = process.env.BAYFRAME_WORKSHOP_ID;
  return <main id="main" tabIndex={-1} className="workspace narrow"><Link href="/">Bayframe</Link><p className="eyebrow">Synthetic demonstration</p><h1>Request a workshop appointment</h1>
    <p>One 60-minute service, Monday–Friday, 09:00–17:00 Europe/London. This form creates a request. Staff confirmation is required.</p>
    <p className="notice">Use synthetic contact and vehicle details. This is a portfolio demonstration, not a live garage.</p>
    {!workshopId ? <p role="status">Local demonstration setup is required before requests can be accepted.</p> : <>
      <section><h2>Check a time</h2><ActionForm command="availability" workshopId={workshopId} label="Check availability"><TimeField id="availability-time-policy" /></ActionForm></section>
      <section><h2>Send your request</h2><ActionForm command="request" workshopId={workshopId} label="Request appointment" reset>
        <label>Booking contact<input name="name" autoComplete="name" maxLength={120} required /></label>
        <label>Email<input name="email" type="email" autoComplete="email" spellCheck={false} maxLength={254} required /></label>
        <label>Vehicle registration<input name="registration" autoComplete="off" maxLength={20} required /></label><TimeField id="request-time-policy" />
      </ActionForm></section></>}
  </main>;
}
function TimeField({ id }: { id: string }) { return <label>Requested start (absolute time)<input name="startAt" type="text" autoComplete="off" required placeholder="2026-10-26T09:00:00+00:00…" aria-describedby={id} /><small id={id}>ISO 8601 with Z or an explicit UTC offset. For example, 2026-10-26T09:00:00+00:00. Ambiguous local times without an offset are rejected.</small></label>; }
