"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAuthClient } from "@/auth/server";

const credentials = z.object({ email: z.email().max(254), password: z.string().min(1).max(256) });

export async function login(_previous: string, form: FormData): Promise<string> {
  const parsed = credentials.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return "Sign in failed. Check your credentials and try again.";
  try {
    const client = await createAuthClient();
    const { error } = await client.auth.signInWithPassword(parsed.data);
    if (error) return "Sign in failed. Check your credentials and try again.";
  } catch {
    return "Sign in is unavailable. Your email is preserved. Try again.";
  }
  redirect("/staff");
}
