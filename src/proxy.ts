import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig, authCookieOptions } from "./auth/config";

export async function proxy(request: NextRequest) {
  const { url, key } = authConfig();
  let response = NextResponse.next({ request });
  const client = createServerClient(url, key, {
    cookieOptions: authCookieOptions,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, cacheHeaders) {
        for (const { name, value } of values) request.cookies.set(name, value);
        const previousCookies = response.cookies.getAll();
        response = NextResponse.next({ request });
        for (const cookie of previousCookies) response.cookies.set(cookie);
        for (const { name, value, options } of values) response.cookies.set(name, value, options);
        for (const [name, value] of Object.entries(cacheHeaders)) response.headers.set(name, value);
      },
    },
  });
  await client.auth.getUser();
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export const config = { matcher: ["/login", "/logout", "/staff/:path*"] };
