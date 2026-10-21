import { redirect } from "next/navigation";
import Link from "next/link";
import { StaffAccessError, requireStaffPage } from "@/auth/access";
import { listResources } from "@/auth/resources";
import { StaffShell } from "../../staff-shell";
import { Table } from "../../table";

export const dynamic = "force-dynamic";
export default async function ResourceList({ searchParams }: { searchParams: Promise<{ workshop?: string }> }) {
  const { workshop } = await searchParams;
  const rows = await listResources(workshop ?? "").catch((error: unknown) => {
    if (error instanceof StaffAccessError) redirect(error.status === 401 ? "/login" : "/staff?denied=1");
    throw error;
  });
  const actor = await requireStaffPage(workshop ?? "", ["manager", "adviser"]);
  return <StaffShell current="resources" workshopId={workshop} role={actor.role}><header className="page-header"><div><h1>Workshop resources</h1><p>Bays and linked technicians available for allocation.</p></div><Link href={`/staff/schedule?workshop=${workshop}`}>View schedule</Link></header>
    {!rows.length ? <p className="empty">No resources configured for this workshop. Contact the workshop manager before confirming appointments.</p> : <Table regionLabel="Scrollable workshop resources" className="resource-table"><caption>Resources in your selected workshop</caption><thead><tr><th scope="col">Name</th><th scope="col">Type</th><th scope="col">Status</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><th scope="row">{row.name}</th><td>{row.type}</td><td><span className="status" data-state={row.active ? "confirmed" : "cancelled"}>{row.active ? "Active" : "Inactive"}</span></td></tr>)}</tbody></Table>}
    <p className="lead">Only active, eligible resources can be reserved. Confirmation checks availability again and reserves a bay and technician together.</p>
  </StaffShell>;
}
