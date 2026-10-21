import { login } from "./actions";
import Link from "next/link";
import { SubmitButton } from "../submit-button";

export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-lg px-6 py-12">
      <Link href="/" prefetch={false}>Bayframe</Link>
      <h1 className="mt-8 text-3xl font-semibold">Staff sign in</h1>
      <p className="mt-3 text-stone-600">Use your workshop staff account.</p>
      {error && <p role="alert" className="mt-6 text-red-800">Sign in failed. Check your credentials and try again.</p>}
      <form action={login} className="mt-8 grid gap-5">
        <label className="grid gap-2">Email<input name="email" type="email" autoComplete="username" spellCheck={false} required maxLength={254} className="border border-stone-400 bg-white p-3" /></label>
        <label className="grid gap-2">Password<input name="password" type="password" autoComplete="current-password" required maxLength={256} className="border border-stone-400 bg-white p-3" /></label>
        <SubmitButton>Sign in</SubmitButton>
      </form>
    </main>
  );
}
