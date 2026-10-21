import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { authConfig, authCookieOptions } from "./config";

export async function createAuthClient() {
  const store = await cookies();
  const { url, key } = authConfig();
  return createServerClient(url, key, {
    cookieOptions: authCookieOptions,
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        try {
          for (const { name, value, options } of values) store.set(name, value, options);
        } catch {
          // Server Component cookie writes are handled by the session-refresh proxy.
        }
      },
    },
  });
}
