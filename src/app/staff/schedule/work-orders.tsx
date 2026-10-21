import Link from "next/link";
import type { workspace } from "@/workshop/service";
import { displayTime, money } from "@/workshop/rules";
import { ActionForm } from "../../action-form";
import { Button } from "../../controls";

export function WorkOrders({ data, workshopId, operator, selectedId }: {
  data: Awaited<ReturnType<typeof workspace>>; workshopId: string; operator: boolean; selectedId?: string;
}) {
  const base = `/staff/schedule?workshop=${workshopId}&view=work`;
  const orders = [...data.workOrders].sort((a, b) => Number(a.state === "closed") - Number(b.state === "closed"));
  const work = selectedId ? orders.find((item) => item.id === selectedId) : orders[0];
  const booking = data.bookings.find((item) => item.id === work?.bookingId);
  const estimates = data.estimates.filter((item) => item.workOrderId === work?.id).toSorted((a, b) => b.version - a.version);
  const tasks = data.tasks.filter((item) => item.workOrderId === work?.id);
  return <><header className="page-header"><div><h1>{operator ? "Work orders" : "Your assigned work"}</h1><p>Tasks, authorization and handover in one job sheet.</p></div><Link href={`/staff/schedule?workshop=${workshopId}`}>View schedule</Link></header>
    {!orders.length ? <p className="empty">No {operator ? "work orders. Check in a confirmed appointment to create one" : "assigned work yet. Your assigned jobs will appear here"}.</p> : <div className="work-layout"><form className="work-picker" method="get"><input type="hidden" name="workshop" value={workshopId} /><input type="hidden" name="view" value="work" /><label>Work order<select name="work" defaultValue={work?.id}>{orders.map((item) => <option key={item.id} value={item.id}>{data.bookings.find((row) => row.id === item.bookingId)?.registration ?? `Job ${item.id.slice(0,8)}`} · {item.state}</option>)}</select></label><Button type="submit" tone="secondary">Open job</Button></form><nav className="work-index" aria-label="Work orders"><h2>{orders.length} {orders.length === 1 ? "job" : "jobs"}</h2><ol>{orders.map((item) => {
      const contact = data.bookings.find((row) => row.id === item.bookingId);
      return <li key={item.id}><Link href={`${base}&work=${item.id}`} prefetch={false} aria-current={work?.id === item.id ? "page" : undefined}><strong className={contact ? "registration" : undefined}>{contact?.registration ?? `Job ${item.id.slice(0,8)}`}</strong><span>{contact?.name ?? `Booking ${item.bookingId.slice(0,8)}`}</span><span className="status" data-state={item.state}>{item.state}</span></Link></li>;
    })}</ol></nav>
      {!work ? <div className="error" role="alert">This work order is unavailable in your current workshop scope. Choose a job from the list.</div> : <article key={work.id} id={`work-${work.id}`} tabIndex={-1} className="work-order"><header><div><h2>Work order {work.id.slice(0,8)}</h2><p>Booking {work.bookingId.slice(0,8)}</p></div><span className="status" data-state={work.state}>{work.state}</span></header>
        {booking && <div className="job-context"><div><small>Vehicle</small><strong className="registration">{booking.registration}</strong></div><div><small>Booking contact</small>{booking.name}</div><div><small>Reserved appointment</small>{displayTime(booking.startAt, data.workshop.timezone)}</div></div>}
        <div className="work-body"><section aria-labelledby="tasks-heading"><div className="section-header"><h3 id="tasks-heading">Work tasks</h3><span className="muted">{tasks.filter((task) => task.done).length} of {tasks.length} complete</span></div>
          {!work.approvalAccepted && !["completed", "closed"].includes(work.state) && <p className="empty">Task completion is waiting for customer approval of the current estimate.</p>}
          {!tasks.length ? <p className="empty">No tasks recorded.{operator && work.canAddTask ? " Add the work to be carried out before preparing the estimate." : " Planning tasks will appear here."}</p> : <ul className="task-list">{tasks.map((task) => <li key={task.id} id={`task-${task.id}`} tabIndex={-1}>{task.done ? "Complete" : "Pending"} · {task.description}{!task.done && work.canMarkTaskComplete && <ActionForm command="task" workshopId={workshopId} id={work.id} label="Mark task complete"><input type="hidden" name="taskId" value={task.id} /></ActionForm>}</li>)}</ul>}
          {operator && work.canAddTask && <details><summary>Add a task</summary><ActionForm command="add-task" workshopId={workshopId} id={work.id} label="Add task" reset><label>Task description<input name="description" autoComplete="off" maxLength={500} required /></label></ActionForm></details>}
          <div className="actions">{work.state === "ready" && <ActionForm command="start" workshopId={workshopId} id={work.id} label="Start work" />}{work.canComplete && <ActionForm command="complete" workshopId={workshopId} id={work.id} label="Complete approved work" />}{operator && work.state === "completed" && <ActionForm command="close" workshopId={workshopId} id={work.id} label="Record handover and close" />}</div>
          {work.state === "closed" && <p className="notice">Handover recorded. This work order is closed.</p>}
        </section>
        {operator && <section aria-labelledby="estimates-heading"><h3 id="estimates-heading">Estimates</h3>
          {!estimates.length && <p className="empty">No estimate prepared. Create a version for the booking contact to review.</p>}
          {estimates.map((estimate, index) => <div key={estimate.id} id={`estimate-${estimate.id}`} tabIndex={-1} className="estimate"><div className="section-header"><strong>Version {estimate.version} · {estimate.state}</strong><span className="muted">{index === 0 ? "Current version" : "Previous version"}</span></div><ul>{data.lines.filter((line) => line.estimateId === estimate.id).map((line) => <li key={line.id}>{line.description} · {line.quantity} × {money(line.unitPrice)}</li>)}</ul><dl className="money-summary"><div><dt>Net</dt><dd>{money(estimate.net)}</dd></div><div><dt>VAT at 20%</dt><dd>{money(estimate.tax)}</dd></div><div className="total"><dt>Total</dt><dd>{money(estimate.total)}</dd></div></dl>{estimate.state === "draft" && <><p className="muted">Issuing freezes this version. The decision link will be shown once.</p><ActionForm command="issue" workshopId={workshopId} id={estimate.id} label="Issue exact version for customer decision" /></>}</div>)}
          {!["completed", "closed"].includes(work.state) && <details><summary>Prepare a new estimate version</summary><p className="muted">A new draft invalidates the prior decision link. Prices exclude VAT; 20% VAT is rounded per line. Issue and share the replacement when ready.</p><ActionForm command="draft" workshopId={workshopId} id={work.id} label="Save draft version" reset><label>Work / parts description<input name="description" autoComplete="off" maxLength={500} required /></label><div className="form-grid"><label>Quantity<input name="quantity" type="number" min="1" max="1000" defaultValue="1" required /></label><label>Unit price (£, excluding VAT)<input name="price" inputMode="decimal" autoComplete="off" placeholder="85.00" required /></label></div></ActionForm></details>}
        </section>}
        </div></article>}
    </div>}
  </>;
}

