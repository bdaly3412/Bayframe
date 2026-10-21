import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "./brand";
import { logout } from "./logout/actions";
import { Button } from "./controls";
import { RecordFocus } from "./record-focus";

export function StaffShell({ children, workshopId, workshopName, role, current }: {
  children: ReactNode; workshopId?: string; workshopName?: string; role?: string;
  current: "workshops" | "schedule" | "work" | "resources" | "history" | "absences";
}) {
  const schedule = `/staff/schedule?workshop=${workshopId}`;
  const links = workshopId ? [
    ["schedule", "Schedule", schedule], ["work", "Work orders", `${schedule}&view=work`],
    ...(role !== "technician" ? [["resources", "Resources", `/staff/resources?workshop=${workshopId}`]] : []),
    ...(role === "manager" ? [["absences", "Absences", `${schedule}&view=absences`], ["history", "History", `${schedule}&view=history`]] : []),
  ] : [];
  const destinations = [...links, ["workshops", "Workshops", "/staff"]];
  const currentLabel = destinations.find(([key]) => key === current)?.[1] ?? "Workshops";
  const navigation = <nav aria-label="Staff navigation">{destinations.map(([key, label, href]) => <Link key={key} href={href} prefetch={false} aria-current={current === key ? "page" : undefined}>{label}</Link>)}</nav>;
  const account = <div className="nav-footer"><Link href="/request" prefetch={false}>Request appointment</Link><form action={logout}><Button type="submit" tone="secondary">Sign out</Button></form><p>Local demonstration<br />Synthetic records only</p></div>;
  return <div className="staff-shell"><aside className="staff-nav"><Brand />
    <div className="workshop-scope"><strong>{workshopName ?? "Workshop operations"}</strong>{role && <span>{role}</span>}</div>
    <div className="desktop-navigation">{navigation}</div><div className="desktop-account">{account}</div>
    <details className="mobile-navigation"><summary>Navigation · {currentLabel}</summary>{navigation}{account}</details>
  </aside><main id="main" tabIndex={-1} className="workspace">{children}<RecordFocus /></main></div>;
}
