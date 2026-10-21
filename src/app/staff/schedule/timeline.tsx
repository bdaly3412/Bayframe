import { displayTime, timelinePosition } from "@/workshop/rules";

export function ResourceTimeline({ day, timezone, resources, allocations, absences }: {
  day: string; timezone: string;
  resources: { id: string; name: string; type: string; active: boolean }[];
  allocations: { id: string; resourceId: string; bookingId: string; startAt: Date; endAt: Date }[];
  absences: { id: string; resourceId: string; startAt: Date; endAt: Date }[];
}) {
  const hours = Array.from({ length: 8 }, (_, i) => i + 9);
  return <><p id="timeline-help">Confirmed reservations only · {timezone} · scroll horizontally for the full day. Select a reservation to find its booking. Absences are labelled separately.</p>
    <div className="table-scroll" tabIndex={0} role="region" aria-label="Scrollable resource timeline" aria-describedby="timeline-help"><table className="timeline"><caption>Resource reservations for {day}</caption>
      <thead><tr><th scope="col">Resource</th>{hours.map((hour) => <th key={hour} scope="col">{String(hour).padStart(2,"0")}:00</th>)}</tr></thead>
      <tbody>{resources.map((resource) => <tr key={resource.id}><th scope="row">{resource.name}<br /><small>{resource.type}{resource.active ? "" : " · inactive"}</small></th><td colSpan={8}><div className="timeline-track"><div className="timeline-hours" aria-hidden="true">{hours.map((hour) => <span key={hour} />)}</div>
        {allocations.filter((a) => a.resourceId === resource.id).map((allocation) => { const position = timelinePosition(allocation.startAt, allocation.endAt, day, timezone); return position && <a key={allocation.id} className="reservation" href={`#booking-${allocation.bookingId}`} style={{ left: `${position.left}%`, width: `${position.width}%` }} title={`${resource.name}: ${displayTime(allocation.startAt, timezone)} – ${displayTime(allocation.endAt, timezone)}`}><span>Booking {allocation.bookingId.slice(0,8)}</span></a>; })}
        {absences.filter((a) => a.resourceId === resource.id).map((absence) => {
          const position = timelinePosition(absence.startAt, absence.endAt, day, timezone);
          return position && <span key={absence.id} className="reservation absence" style={{ left: `${position.left}%`, width: `${position.width}%` }}>Absent</span>;
        })}
      </div></td></tr>)}</tbody></table></div>
    {!allocations.some((a) => timelinePosition(a.startAt, a.endAt, day, timezone)) && <p className="empty">No confirmed reservations on this day.</p>}
  </>;
}
