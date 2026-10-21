import { redirect } from "next/navigation";
import Link from "next/link";
import { StaffAccessError } from "@/auth/access";
import { listResources } from "@/auth/resources";
import { logout } from "../../logout/actions";

export const dynamic = "force-dynamic";

export default async function ResourceList({ searchParams }: { searchParams: Promise<{ workshop?: string }> }) {
  const { workshop } = await searchParams;
  const rows = await listResources(workshop ?? "").catch((error: unknown) => {
    if (error instanceof StaffAccessError) redirect(error.status === 401 ? "/login" : "/staff?denied=1");
    throw error;
  });
  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex items-center justify-between gap-4 border-b border-stone-300 pb-6">
        <div><Link href="/staff" prefetch={false} className="underline">Workshops</Link><h1 className="mt-3 text-3xl font-semibold">Workshop resources</h1></div>
        <form action={logout}><button type="submit" className="underline">Sign out</button></form>
      </header>
      {rows.length === 0 ? <p className="mt-8">No resources configured for this workshop.</p> : (
        <div className="mt-8 overflow-x-auto"><table className="w-full border-collapse text-left">
          <caption className="sr-only">Resources in your selected workshop</caption>
          <thead><tr className="border-b border-stone-400"><th scope="col" className="px-3 py-3">Name</th><th scope="col" className="px-3 py-3">Type</th><th scope="col" className="px-3 py-3">Status</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id} className="border-b border-stone-200"><th scope="row" className="px-3 py-4 font-medium">{row.name}</th><td className="px-3 py-4 capitalize">{row.type}</td><td className="px-3 py-4">{row.active ? "Active" : "Inactive"}</td></tr>)}</tbody>
        </table></div>
      )}
    </main>
  );
}
