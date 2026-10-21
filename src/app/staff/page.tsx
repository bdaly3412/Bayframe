import { redirect } from "next/navigation";
import Link from "next/link";
import { getStaffMemberships, StaffAccessError } from "@/auth/access";
import { StaffShell } from "../staff-shell";

export const dynamic = "force-dynamic";
export default async function StaffHome({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { denied } = await searchParams;
  const memberships = await getStaffMemberships().catch((error: unknown) => {
    if (error instanceof StaffAccessError && error.status === 401) redirect("/login");
    throw error;
  });
  return <StaffShell current="workshops"><header className="page-header"><div><h1>Your workshops</h1><p>Choose an active workshop to open its schedule and work orders.</p></div></header>
    {denied && <p role="alert" className="error">Access denied. Your current workshop role does not permit that operation.</p>}
    {!memberships.length ? <p className="empty">No active workshop membership. Contact the workshop manager.</p> : <ul className="workshop-list">{memberships.map((member) => <li key={member.id}><h2>{member.workshopName}</h2><p>{member.role}</p><div className="actions"><Link href={`/staff/schedule?workshop=${member.workshopId}`} prefetch={false} className="button-link">Schedule</Link><Link href={`/staff/schedule?workshop=${member.workshopId}&view=work`} prefetch={false}>Work orders</Link>{member.role !== "technician" && <Link href={`/staff/resources?workshop=${member.workshopId}`} prefetch={false}>Resources</Link>}</div></li>)}</ul>}
  </StaffShell>;
}
