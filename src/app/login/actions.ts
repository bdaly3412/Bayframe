"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAuthClient } from "@/auth/server";

const credentials = z.object({ email: z.email().max(254), password: z.string().min(1).max(256) });

export async function login(form: FormData) {
  const parsed = credentials.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) redirect("/login?error=1");
  const client = await createAuthClient();
  const { error } = await client.auth.signInWithPassword(parsed.data);
  if (error) redirect("/login?error=1");
  redirect("/staff");
}
