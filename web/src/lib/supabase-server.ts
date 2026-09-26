import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Supabase auth client for server components and route handlers, backed by the
// request cookies. Only used for signing Davide into /admin.
export async function supabaseAuth() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server components can't write cookies; proxy.ts refreshes the session instead.
        }
      },
    },
  });
}
