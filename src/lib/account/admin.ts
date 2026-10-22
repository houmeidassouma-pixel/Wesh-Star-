import { createDbClient } from "@/lib/db/query";
import { getPool, withTransaction } from "@/lib/db/pool";
import { createAuthToken } from "@/lib/auth/tokens";
import { sendMail } from "@/lib/auth/mailer";

// Wesh Star IA's own server-side "admin" client. Historically this returned a
// Supabase service-role client; it now talks directly to Wesh Star IA's own
// Postgres database. Kept under the same name/path and the same `.from()` /
// `.rpc()` surface so every existing route using createAdminClient() keeps
// working without changes.
export function createAdminClient() {
  const db = createDbClient();
  return {
    ...db,
    auth: {
      admin: {
        // Replaces Supabase's inviteUserByEmail: creates the account (no
        // password yet) and emails a one-time link to set one.
        async inviteUserByEmail(email: string, opts?: { redirectTo?: string }) {
          const normalized = String(email).trim().toLowerCase();
          try {
            const existing = await getPool().query("select id from public.auth_users where email = $1", [normalized]);
            if (existing.rows.length) return { data: null, error: { message: "An account with this email already exists" } };

            const user = await withTransaction(async (client) => {
              const u = await client.query(
                "insert into public.auth_users (email, password_hash, email_verified) values ($1,null,false) returning id, email",
                [normalized]
              );
              await client.query("insert into public.profiles (id, email) values ($1,$2)", [u.rows[0].id, normalized]);
              return u.rows[0];
            });

            const token = await createAuthToken(user.id, "invite");
            const base = (opts?.redirectTo || (process.env.NEXT_PUBLIC_SITE_URL || "") + "/reset?invite=1").replace(/([?&])token=[^&]*/, "");
            const link = base + (base.includes("?") ? "&" : "?") + "token=" + token;
            await sendMail(normalized, "Wesh Star IA — Einladung als Moderator",
              `<p>Sie wurden als Moderator zu Wesh Star IA eingeladen.</p><p>Legen Sie Ihr Passwort fest, um Ihr Konto zu aktivieren:</p><p><a href="${link}">${link}</a></p>`);

            return { data: { user: { id: user.id, email: user.email } }, error: null };
          } catch (e: any) {
            return { data: null, error: { message: e?.message || "invitation failed" } };
          }
        }
      }
    }
  };
}
