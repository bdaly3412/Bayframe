import { redirect } from "next/navigation";
import Link from "next/link";
import { getStaffMemberships, StaffAccessError } from "@/auth/access";
import { logout } from "../logout/actions";

export const dynamic = "force-dynamic";

export default async function StaffHome({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { denied } = await searchParams;
  const memberships = await getStaffMemberships().catch((error: unknown) => {
    if (error instanceof StaffAccessError && error.status === 401) redirect("/login");
    throw error;
  });
  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex items-center justify-between gap-4 border-b border-stone-300 pb-6">
        <h1 className="text-3xl font-semibold">Your workshops</h1>
        <form action={logout}><button type="submit" className="underline">Sign out</button></form>
      </header>
      {denied && <p role="alert" className="mt-6 text-red-800">Access denied. Your current workshop role does not permit that operation.</p>}
      {memberships.length === 0 ? <p className="mt-8">No active workshop membership. Contact the workshop manager.</p> : (
        <ul className="divide-y divide-stone-300">
          {memberships.map((member) => <li key={member.id} className="py-6">
            <h2 className="text-xl font-semibold">{member.workshopName}</h2>
            <p className="mt-2 capitalize text-stone-600">{member.role}</p>
            <div className="mt-4 flex flex-wrap gap-6">
              <Link href={`/staff/schedule?workshop=${member.workshopId}`} prefetch={false} className="underline">Schedule</Link>
              {member.role !== "technician" && <Link href={`/staff/resources?workshop=${member.workshopId}`} prefetch={false} className="underline">Resources</Link>}
            </div>
          </li>)}
        </ul>
      )}
    </main>
  );
}
