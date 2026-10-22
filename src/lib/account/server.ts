import { cookies } from "next/headers";
import { createDbClient } from "@/lib/db/query";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";

// Server-side "user" client (Next.js server components / route handlers).
// Historically an RLS-scoped Supabase client; now reads Wesh Star IA's own
// signed session cookie for identity and uses the same direct-Postgres
// query surface as the admin client — every route already checks
// role/ownership itself (see src/lib/access.ts), so this preserves that
// exact same authorization behavior without Supabase.
export function createClient() {
  const db = createDbClient();
  return {
    ...db,
    auth: {
      async getUser() {
        const token = cookies().get(SESSION_COOKIE)?.value;
        const session = await verifySession(token);
        if (!session) return { data: { user: null }, error: null };
        return { data: { user: { id: session.uid, email: session.email } }, error: null };
      }
    }
  };
}
