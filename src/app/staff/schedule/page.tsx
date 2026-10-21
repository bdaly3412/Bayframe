import Link from "next/link";
import { requireStaffPage } from "@/auth/access";
import { workspace } from "@/workshop/service";
import { displayTime, localDay, money, uuid } from "@/workshop/rules";
import { z } from "zod";
import { ActionForm } from "../../action-form";
import { ResourceTimeline } from "./timeline";

export const dynamic = "force-dynamic";
export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ workshop?: string; day?: string }> }) {
  const query = await searchParams, parsed = uuid.safeParse(query.workshop);
  if (!parsed.success) return <main id="main" className="workspace"><h1>Choose a workshop</h1><Link href="/staff">Return to staff home</Link></main>;
  const actor = await requireStaffPage(parsed.data, ["manager", "adviser", "technician"]), data = await workspace(actor), workshopId = actor.workshopId;
  const operator = actor.role !== "technician";
  const day = z.iso.date().safeParse(query.day);
  const selectedDay = day.success ? day.data : localDay(new Date(), data.workshop.timezone);
  return <main id="main" tabIndex={-1} className="workspace">
    <nav aria-label="Staff navigation"><Link href="/staff">Workshops</Link>{operator && <Link href={`/staff/resources?workshop=${workshopId}`}>Resources</Link>}<Link href="/request">Request appointment</Link></nav>
    <header className="page-header"><div><p className="eyebrow">Workshop operations · {actor.role}</p><h1>{data.workshop.name}</h1><p>Schedule and work · {data.workshop.timezone}</p></div><span className="status">Local demonstration</span></header>
    {operator && <section aria-labelledby="timeline-heading"><h2 id="timeline-heading">Resource timeline</h2><form method="get" className="day-filter"><input type="hidden" name="workshop" value={workshopId} /><label>Workshop day<input name="day" type="date" defaultValue={selectedDay} required /></label><button type="submit">Show day</button></form><ResourceTimeline day={selectedDay} timezone={data.workshop.timezone} resources={data.resources} allocations={data.allocations} absences={data.absences} /></section>}
    {operator && <section><h2>Appointment requests and schedule</h2><p>Availability is advisory. A confirmation reserves one bay and technician together. Overruns require explicit rescheduling before the slot ends; the schedule does not track physical bay occupancy.</p>
      {!data.bookings.length ? <p className="empty">No appointments. Submit a synthetic request to begin.</p> : <div className="table-scroll"><table><caption>Appointments ordered by start time</caption><thead><tr><th scope="col">Start / duration</th><th scope="col">Contact / vehicle</th><th scope="col">State</th><th scope="col">Actions</th></tr></thead><tbody>{data.bookings.map((booking) => <tr key={booking.id}>
        <td id={`booking-${booking.id}`} tabIndex={-1}><strong>{displayTime(booking.startAt, data.workshop.timezone)}</strong><br />60 minutes<br /><small>{booking.id.slice(0,8)}</small></td><td>{booking.name}<br />{booking.registration}<br /><small>{booking.email}</small></td><td><span className="status">{booking.state}</span></td><td>
          {["requested", "confirmed"].includes(booking.state) && <details><summary>{booking.state === "requested" ? "Confirm / resolve" : "Change booking"}</summary>
            <ActionForm command={booking.state === "requested" ? "confirm" : "reschedule"} id={booking.id} workshopId={workshopId} label={booking.state === "requested" ? "Confirm booking" : "Reschedule atomically"}>
              <ResourceSelect name="bayId" label="Bay" items={data.resources.filter((r) => r.type === "bay" && r.active)} /><ResourceSelect name="technicianId" label="Technician" items={data.resources.filter((r) => r.type === "technician" && r.active)} />
              {booking.state === "confirmed" && <label>New absolute start<input name="startAt" autoComplete="off" defaultValue={booking.startAt.toISOString()} required /></label>}
            </ActionForm>
            <ActionForm command="cancel" id={booking.id} workshopId={workshopId} label="Cancel booking" />
            {booking.state === "requested" && <ActionForm command="reject" id={booking.id} workshopId={workshopId} label="Reject request" />}
          </details>}
          {booking.state === "confirmed" && <ActionForm command="check-in" id={booking.id} workshopId={workshopId} label="Check in / create work order" />}
        </td></tr>)}</tbody></table></div>}
    </section>}
    {!operator && <section><h2>Your scheduled appointments</h2>{!data.assignedSchedule.length ? <p className="empty">No current reservations assigned to you.</p> : <ul className="task-list">{data.assignedSchedule.map((booking) => <li key={booking.bookingId}><strong>{displayTime(booking.startAt, data.workshop.timezone)} – {displayTime(booking.endAt, data.workshop.timezone)}</strong><br />Booking {booking.bookingId.slice(0,8)} · {booking.state}</li>)}</ul>}</section>}
    <section><h2>{operator ? "Work orders" : "Your assigned work"}</h2>{!data.workOrders.length && <p className="empty">No {operator ? "work orders" : "assigned work"} yet.</p>}
      {data.workOrders.map((work) => <article key={work.id} className="work-order"><header><h3>Work order {work.id.slice(0,8)}</h3><span className="status">{work.state}</span></header>
        <p>Booking {work.bookingId.slice(0,8)}</p>
        <ul className="task-list">{data.tasks.filter((t) => t.workOrderId === work.id).map((task) => <li key={task.id}>{task.done ? "Complete" : "Pending"} · {task.description}{!task.done && work.state === "in-progress" && <ActionForm command="task" workshopId={workshopId} id={work.id} label="Mark task complete"><input type="hidden" name="taskId" value={task.id} /></ActionForm>}</li>)}</ul>
        {operator && ["ready", "in-progress"].includes(work.state) && <details><summary>Add a task</summary><ActionForm command="add-task" workshopId={workshopId} id={work.id} label="Add task" reset><label>Task description<input name="description" autoComplete="off" maxLength={500} required /></label></ActionForm></details>}
        <div className="actions">{work.state === "ready" && <ActionForm command="start" workshopId={workshopId} id={work.id} label="Start work" />}{work.state === "in-progress" && <ActionForm command="complete" workshopId={workshopId} id={work.id} label="Complete approved work" />}{operator && work.state === "completed" && <ActionForm command="close" workshopId={workshopId} id={work.id} label="Record handover and close" />}</div>
        {operator && <><h4>Estimates</h4>{data.estimates.filter((e) => e.workOrderId === work.id).map((estimate) => <div key={estimate.id} className="estimate"><strong>Version {estimate.version} · {estimate.state}</strong><p>Net {money(estimate.net)} · VAT {money(estimate.tax)} · Total <strong>{money(estimate.total)}</strong></p><ul>{data.lines.filter((l) => l.estimateId === estimate.id).map((l) => <li key={l.id}>{l.description} · {l.quantity} × {money(l.unitPrice)}</li>)}</ul>{estimate.state === "draft" && <ActionForm command="issue" workshopId={workshopId} id={estimate.id} label="Issue exact version for customer decision" />}</div>)}
          {!["completed", "closed"].includes(work.state) && <details><summary>Prepare a new estimate version</summary><p>GBP, integer quantity, price excluding VAT. VAT is 20%, rounded to the nearest penny per line. A new draft invalidates the prior decision link; issue and share the new version.</p><ActionForm command="draft" workshopId={workshopId} id={work.id} label="Save draft version" reset><label>Work / parts description<input name="description" autoComplete="off" maxLength={500} required /></label><label>Quantity<input name="quantity" type="number" min="1" max="1000" defaultValue="1" required /></label><label>Unit price (£, excluding VAT)<input name="price" inputMode="decimal" autoComplete="off" placeholder="85.00…" required /></label></ActionForm></details>}</>}
      </article>)}
    </section>
    {actor.role === "manager" && <><section><h2>Resource absences</h2><p>Existing reservations must be rescheduled or cancelled before adding an overlapping absence.</p><ul>{data.absences.map((a) => <li key={a.id}>{data.resources.find((r) => r.id === a.resourceId)?.name} · {displayTime(a.startAt)} – {displayTime(a.endAt)}</li>)}</ul><details><summary>Record an absence</summary><ActionForm command="absence" workshopId={workshopId} label="Record absence" reset><ResourceSelect name="resourceId" label="Resource" items={data.resources} /><label>Start (ISO 8601 with offset)<input name="startAt" autoComplete="off" required /></label><label>End (ISO 8601 with offset)<input name="endAt" autoComplete="off" required /></label></ActionForm></details></section>
      <section><h2>Recent audit history</h2><div className="table-scroll"><table><caption>Latest 100 business events</caption><thead><tr><th scope="col">Time</th><th scope="col">Action</th><th scope="col">Actor</th></tr></thead><tbody>{data.audit.map((e) => <tr key={e.id}><td>{displayTime(e.createdAt)}</td><td>{e.action}</td><td>{e.actorId?.slice(0,8) ?? "Customer / request"}</td></tr>)}</tbody></table></div></section></>}
  </main>;
}
function ResourceSelect({ name, label, items }: { name: string; label: string; items: { id: string; name: string }[] }) { return <label>{label}<select name={name} required defaultValue=""><option value="" disabled>Choose {label.toLowerCase()}</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>; }
