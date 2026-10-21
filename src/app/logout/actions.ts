"use server";

import { redirect } from "next/navigation";
import { createAuthClient } from "@/auth/server";

export async function logout() {
  const client = await createAuthClient();
  const { error } = await client.auth.signOut({ scope: "local" });
  if (error) throw new Error("Sign out failed. Try again.");
  redirect("/login");
}
