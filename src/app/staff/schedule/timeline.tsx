import { displayTime, timelinePosition } from "@/workshop/rules";
import { Table } from "../../table";

export function ResourceTimeline({ day, timezone, resources, allocations, absences, bookings, workshopId }: {
  day: string; timezone: string; workshopId: string;
  resources: { id: string; name: string; type: string; active: boolean }[];
  allocations: { id: string; resourceId: string; bookingId: string; startAt: Date; endAt: Date }[];
  absences: { id: string; resourceId: string; startAt: Date; endAt: Date }[];
  bookings: { id: string; registration: string }[];
}) {
  const hours = Array.from({ length: 8 }, (_, i) => i + 9);
  return <><p id="timeline-help" className="sr-only">Confirmed reservations only. Times in {timezone}. Scroll horizontally for the full day. Select a reservation to find its booking. Absences are labelled separately.</p>
    <Table regionLabel="Scrollable resource timeline" className="timeline" aria-describedby="timeline-help"><caption>Resource reservations for {day}</caption>
      <thead><tr><th scope="col">Resource</th>{hours.map((hour) => <th key={hour} scope="col">{String(hour).padStart(2,"0")}:00</th>)}</tr></thead>
      <tbody>{resources.map((resource) => <tr key={resource.id}><th scope="row" id={`resource-${resource.id}`} tabIndex={-1}>{resource.name}<small>{resource.type}{resource.active ? "" : " · inactive"}</small></th><td colSpan={8}><div className="timeline-track"><div className="timeline-hours" aria-hidden="true">{hours.map((hour) => <span key={hour} />)}</div>
        {allocations.filter((allocation) => allocation.resourceId === resource.id).map((allocation) => {
          const position = timelinePosition(allocation.startAt, allocation.endAt, day, timezone);
          const registration = bookings.find((booking) => booking.id === allocation.bookingId)?.registration;
          const label = `${registration ?? "Booking"} · Booking ${allocation.bookingId.slice(0,8)} · ${resource.name}: ${displayTime(allocation.startAt, timezone)} – ${displayTime(allocation.endAt, timezone)} (${timezone})`;
          return position && <a key={allocation.id} className="reservation" href={`?workshop=${workshopId}&day=${day}#booking-${allocation.bookingId}`} aria-label={label} style={{ left: `${position.left}%`, width: `${position.width}%` }} title={label}><strong>{registration ?? allocation.bookingId.slice(0,8)}</strong><span>{new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit" }).format(allocation.startAt)}</span></a>;
        })}
        {absences.filter((absence) => absence.resourceId === resource.id).map((absence) => {
          const position = timelinePosition(absence.startAt, absence.endAt, day, timezone);
          return position && <span key={absence.id} className="reservation absence" style={{ left: `${position.left}%`, width: `${position.width}%` }}>Absent<span className="sr-only"> · {resource.name}: {displayTime(absence.startAt, timezone)} – {displayTime(absence.endAt, timezone)} ({timezone})</span></span>;
        })}
      </div></td></tr>)}</tbody></Table>
    <div className="timeline-key"><span><i className="key-reservation" aria-hidden="true" />Confirmed reservation</span><span><i className="key-absence" aria-hidden="true" />Resource absence</span><span>Scroll for the full day · Select a booking for details</span></div>
    {absences.some((absence) => timelinePosition(absence.startAt, absence.endAt, day, timezone)) && <ul className="timeline-absences">{absences.filter((absence) => timelinePosition(absence.startAt, absence.endAt, day, timezone)).map((absence) => <li key={absence.id}>{resources.find((resource) => resource.id === absence.resourceId)?.name} · Absent: {displayTime(absence.startAt, timezone)} – {displayTime(absence.endAt, timezone)} ({timezone})</li>)}</ul>}
    {!allocations.some((allocation) => timelinePosition(allocation.startAt, allocation.endAt, day, timezone)) && <p className="empty">No confirmed reservations on this day. Appointment requests below reserve nothing until confirmed.</p>}
  </>;
}
