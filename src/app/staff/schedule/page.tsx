import Link from "next/link";
import { requireStaffPage } from "@/auth/access";
import { workspace } from "@/workshop/service";
import { displayTime, localDay, uuid } from "@/workshop/rules";
import { z } from "zod";
import { ActionForm } from "../../action-form";
import { StaffShell } from "../../staff-shell";
import { Table } from "../../table";
import { Button } from "../../controls";
import { ResourceTimeline } from "./timeline";
import { WorkOrders } from "./work-orders";

export const dynamic = "force-dynamic";
type Query = { workshop?: string; day?: string; view?: string; state?: string; work?: string };

export default async function SchedulePage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams, parsed = uuid.safeParse(query.workshop);
  if (!parsed.success) return <StaffShell current="schedule"><h1>Choose a workshop</h1><p className="lead">Open a schedule from your active workshop memberships.</p><Link href="/staff">Return to staff home</Link></StaffShell>;
  const actor = await requireStaffPage(parsed.data, ["manager", "adviser", "technician"]);
  const data = await workspace(actor), workshopId = actor.workshopId, operator = actor.role !== "technician";
  const day = z.iso.date().safeParse(query.day);
  const selectedDay = day.success ? day.data : localDay(new Date(), data.workshop.timezone);
  const view = query.view === "work" ? "work" : actor.role === "manager" && ["history", "absences"].includes(query.view ?? "") ? query.view as "history" | "absences" : "schedule";
  const base = `/staff/schedule?workshop=${workshopId}`;
  const states = ["all", "requested", "confirmed", "checked-in", "cancelled", "rejected"];
  const state = states.includes(query.state ?? "") ? query.state! : "all";
  const bookings = data.bookings.filter((booking) => state === "all" || booking.state === state);
  return <StaffShell workshopId={workshopId} workshopName={data.workshop.name} role={actor.role} current={view}>
    {view === "schedule" && <>
      <header className="page-header"><div><h1>Schedule</h1><p>{data.workshop.timezone} · 60-minute reservations</p></div>{operator && <form method="get" className="day-filter"><input type="hidden" name="workshop" value={workshopId} /><label>Workshop day<input name="day" type="date" defaultValue={selectedDay} required /></label><Button type="submit" tone="secondary">Show day</Button><Link href={base} className="today-link">Today</Link></form>}</header>
      {operator ? <>
        <section aria-labelledby="timeline-heading"><div className="section-header"><div><h2 id="timeline-heading">Resource timeline</h2><p>One booking, one bay and one technician.</p></div><span className="status">{selectedDay}</span></div><ResourceTimeline workshopId={workshopId} day={selectedDay} timezone={data.workshop.timezone} resources={data.resources} allocations={data.allocations} absences={data.absences} bookings={data.bookings} /></section>
        <section aria-labelledby="appointments-heading"><div className="section-header"><div><h2 id="appointments-heading">Appointment requests and schedule</h2><p>All appointment dates · {bookings.length} {bookings.length === 1 ? "appointment" : "appointments"}</p></div><form method="get" className="toolbar"><input type="hidden" name="workshop" value={workshopId} /><input type="hidden" name="day" value={selectedDay} /><label>Booking state<select name="state" defaultValue={state}>{states.map((value) => <option key={value} value={value}>{value === "all" ? "All states" : value}</option>)}</select></label><Button type="submit" tone="secondary">Filter</Button></form></div>
          {!bookings.length ? <p className="empty">{state === "all" ? "No appointment requests yet. Send a request to begin; it reserves nothing until staff confirm." : `No ${state} appointments. Choose All states to see the full schedule.`}</p> : <Table regionLabel="Scrollable appointments" className="booking-table"><caption>Appointments ordered by start time</caption><thead><tr><th scope="col">Appointment</th><th scope="col">Contact / vehicle</th><th scope="col">Bay / technician</th><th scope="col">State</th><th scope="col">Next action</th></tr></thead><tbody>{bookings.map((booking) => {
            const work = data.workOrders.find((item) => item.bookingId === booking.id);
            const pair = data.allocations.filter((item) => item.bookingId === booking.id).map((allocation) => data.resources.find((resource) => resource.id === allocation.resourceId)).filter((resource) => resource !== undefined);
            return <tr key={booking.id}><td id={`booking-${booking.id}`} tabIndex={-1}><strong>{displayTime(booking.startAt, data.workshop.timezone)}</strong><small>60 minutes · {booking.id.slice(0,8)}</small></td><td><span className="registration">{booking.registration}</span><br />{booking.name}<br /><small>{booking.email}</small></td><td><div className="allocation-pair">{pair.length ? pair.map((resource) => <span key={resource.id}>{resource.name}<small>{resource.type}</small></span>) : <span className="muted">{booking.state === "requested" ? "Not allocated" : "No active reservation"}</span>}</div></td><td><span className="status" data-state={booking.state}>{booking.state}</span></td><td>
              {["requested", "confirmed"].includes(booking.state) && <details><summary>{booking.state === "requested" ? "Confirm / resolve" : "Change booking"}</summary><ActionForm command={booking.state === "requested" ? "confirm" : "reschedule"} id={booking.id} workshopId={workshopId} label={booking.state === "requested" ? "Confirm booking" : "Reschedule atomically"}><ResourceSelect name="bayId" label="Bay" items={data.resources.filter((r) => r.type === "bay" && r.active)} /><ResourceSelect name="technicianId" label="Technician" items={data.resources.filter((r) => r.type === "technician" && r.active)} />{booking.state === "confirmed" && <label>New absolute start<input name="startAt" autoComplete="off" defaultValue={booking.startAt.toISOString()} required /></label>}</ActionForm><div className="danger-zone"><ActionForm command="cancel" id={booking.id} workshopId={workshopId} label="Cancel booking" />{booking.state === "requested" && <ActionForm command="reject" id={booking.id} workshopId={workshopId} label="Reject request" />}</div></details>}
              {booking.state === "confirmed" && <ActionForm command="check-in" id={booking.id} workshopId={workshopId} label="Check in / create work order" />}
              {work && <Link href={`${base}&view=work&work=${work.id}`}>Open work order</Link>}
              {["cancelled", "rejected"].includes(booking.state) && <span className="muted">No action needed</span>}
            </td></tr>;
          })}</tbody></Table>}
          <details className="policy"><summary>Reservation and overrun policy</summary><p>Availability is advisory. Confirmation reserves a bay and technician together. Overruns require explicit rescheduling before check-in; planned reservations do not track physical bay occupancy.</p></details>
        </section>
      </> : <section><h2>Your scheduled appointments</h2>{!data.assignedSchedule.length ? <p className="empty">No current reservations assigned to you. Open Work orders for your existing jobs.</p> : <ul className="task-list">{data.assignedSchedule.map((booking) => <li key={booking.bookingId}><strong>{displayTime(booking.startAt, data.workshop.timezone)} – {displayTime(booking.endAt, data.workshop.timezone)}</strong><p>Booking {booking.bookingId.slice(0,8)} · {booking.state}</p>{data.workOrders.find((work) => work.bookingId === booking.bookingId) && <Link href={`${base}&view=work&work=${data.workOrders.find((work) => work.bookingId === booking.bookingId)!.id}`}>Open assigned work</Link>}</li>)}</ul>}<Link href={`${base}&view=work`}>View your assigned work</Link></section>}
    </>}
    {view === "work" && <WorkOrders data={data} workshopId={workshopId} operator={operator} selectedId={query.work} />}
    {view === "absences" && <><header className="page-header"><div><h1>Resource absences</h1><p>Availability exceptions · {data.workshop.timezone}</p></div></header><div className="absence-layout"><section className="panel"><h2>Recorded absences</h2>{!data.absences.length ? <p className="empty">No resource absences recorded.</p> : <ul className="task-list">{data.absences.map((absence) => <li key={absence.id}><strong>{data.resources.find((r) => r.id === absence.resourceId)?.name}</strong><p>{displayTime(absence.startAt, data.workshop.timezone)} – {displayTime(absence.endAt, data.workshop.timezone)}</p></li>)}</ul>}</section><section className="panel"><h2>Record an absence</h2><p className="lead">Reschedule or cancel overlapping reservations first. Existing bookings are protected.</p><ActionForm command="absence" workshopId={workshopId} label="Record absence" reset><ResourceSelect name="resourceId" label="Resource" items={data.resources} /><label>Start (ISO 8601 with offset)<input name="startAt" autoComplete="off" required placeholder="2026-10-26T09:00:00+00:00" /></label><label>End (ISO 8601 with offset)<input name="endAt" autoComplete="off" required placeholder="2026-10-26T10:00:00+00:00" /></label></ActionForm></section></div></>}
    {view === "history" && <><header className="page-header"><div><h1>Recent audit history</h1><p>Actor, time and exact record references · {data.workshop.timezone}</p></div></header>{!data.audit.length ? <p className="empty">No business events recorded yet.</p> : <Table regionLabel="Scrollable audit history" className="audit-table"><caption>Latest 100 business events</caption><thead><tr><th scope="col">Time</th><th scope="col">Action</th><th scope="col">Record / task</th><th scope="col">Actor</th></tr></thead><tbody>{data.audit.map((event) => <tr key={event.id}><td>{displayTime(event.createdAt, data.workshop.timezone)}</td><td>{event.action}</td><td><AuditReference event={event} base={base} /></td><td>{event.actorId?.slice(0,8) ?? "Customer / request"}</td></tr>)}</tbody></Table>}</>}
  </StaffShell>;
}

function ResourceSelect({ name, label, items }: { name: string; label: string; items: { id: string; name: string }[] }) {
  return <label>{label}<select name={name} required defaultValue=""><option value="" disabled>Choose {label.toLowerCase()}</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>;
}
function AuditReference({ event, base }: { base: string; event: { bookingId: string | null; workOrderId: string | null; estimateId: string | null; resourceId: string | null; details: Record<string, string> } }) {
  const workUrl = `${base}&view=work&work=${event.workOrderId}`;
  const record = event.estimateId ? { label: "Estimate", href: `${workUrl}#estimate-${event.estimateId}`, id: event.estimateId } : event.workOrderId ? { label: "Work order", href: `${workUrl}#work-${event.workOrderId}`, id: event.workOrderId } : event.bookingId ? { label: "Booking", href: `${base}#booking-${event.bookingId}`, id: event.bookingId } : event.resourceId ? { label: "Resource", href: `${base}#resource-${event.resourceId}`, id: event.resourceId } : undefined;
  return <>{record && <a href={record.href}>{record.label} {record.id.slice(0,8)}</a>}{event.details.taskId && <><br /><a href={`${workUrl}#task-${event.details.taskId}`}>Task {event.details.taskId.slice(0,8)}</a></>}</>;
}
