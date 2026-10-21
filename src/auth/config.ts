import "server-only";

export function authConfig() {
  const url = process.env.SUPABASE_URL ?? "http://127.0.0.1:55421";
  if (url !== "http://127.0.0.1:55421") throw new Error("Only the local authentication service is configured.");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!key) throw new Error("Local authentication key is missing.");
  return { url, key };
}

// This local application has no browser auth client; session cookies stay server-only.
export const authCookieOptions = { httpOnly: true, sameSite: "lax", path: "/" } as const;
