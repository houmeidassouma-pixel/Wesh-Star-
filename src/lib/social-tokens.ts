import { createAdminClient } from "./account/admin";

export type Platform = "tiktok" | "facebook" | "snapchat" | "youtube" | "instagram" | "twitch" | "x" | "linkedin";

export type SocialAccount = {
  platform: Platform;
  access_token: string | null;
  refresh_token: string | null;
  account_name: string | null;
  page_id: string | null;
  connected: boolean;
  connected_at: string | null;
};

// Server-only. Never import this file from a client component — it uses the
// service-role key and returns raw tokens.
export async function getSocialAccount(platform: Platform, userId?: string, fallbackGlobal = true): Promise<SocialAccount | null> {
  const admin = createAdminClient();
  // A user-specific account is preferred. The legacy/global row (user_id=NULL)
  // remains the fallback for the existing admin autopilot deployment.
  if (userId) {
    const { data: own } = await admin.from("social_accounts")
      .select("platform, access_token, refresh_token, account_name, page_id, connected, connected_at")
      .eq("platform", platform).eq("user_id", userId).maybeSingle();
    if (own) return own as SocialAccount;
    if (!fallbackGlobal) return null;
  }
  if (!fallbackGlobal && userId) return null;
  const { data } = await admin.from("social_accounts")
    .select("platform, access_token, refresh_token, account_name, page_id, connected, connected_at")
    .eq("platform", platform).is("user_id", null).maybeSingle();
  return (data as SocialAccount) || null;
}

// Status-only view. Optional userId returns only that user's accounts.
// Without userId it returns the existing admin/global account status.
export async function listSocialStatus(userId?: string): Promise<Record<Platform, { connected: boolean; account_name: string | null }>> {
  const admin = createAdminClient();
  let q = admin.from("social_accounts").select("platform, connected, account_name, user_id");
  q = userId ? q.eq("user_id", userId) : q.is("user_id", null);
  const { data } = await q;
  const out: any = {
    tiktok: { connected: false, account_name: null },
    facebook: { connected: false, account_name: null },
    snapchat: { connected: false, account_name: null },
    youtube: { connected: false, account_name: null },
    instagram: { connected: false, account_name: null },
    twitch: { connected: false, account_name: null },
    x: { connected: false, account_name: null },
    linkedin: { connected: false, account_name: null }
  };
  for (const row of data || []) out[row.platform] = { connected: row.connected, account_name: row.account_name };
  return out;
}

export async function saveSocialAccount(platform: Platform, fields: Partial<SocialAccount>, userId?: string) {
  const admin = createAdminClient();
  const payload: any = {
    platform, user_id: userId || null, ...fields,
    connected: fields.connected ?? true,
    connected_at: new Date().toISOString()
  };
  let existingQuery = admin.from("social_accounts").select("id").eq("platform", platform);
  existingQuery = userId ? existingQuery.eq("user_id", userId) : existingQuery.is("user_id", null);
  const { data: existing } = await existingQuery.maybeSingle();
  const { error } = existing?.id
    ? await admin.from("social_accounts").update(payload).eq("id", existing.id)
    : await admin.from("social_accounts").insert(payload);
  if (error) throw new Error(error.message);
}

export async function disconnectSocialAccount(platform: Platform, userId?: string) {
  const admin = createAdminClient();
  const q = userId
    ? admin.from("social_accounts").update({
        access_token: null, refresh_token: null, account_name: null, page_id: null, connected: false
      }).eq("platform", platform).eq("user_id", userId)
    : admin.from("social_accounts").update({
        access_token: null, refresh_token: null, account_name: null, page_id: null, connected: false
      }).eq("platform", platform).is("user_id", null);
  await q;
}

// Token used to protect the state param in OAuth flows against CSRF.
// Not a secret store — just a signed-ish random nonce checked on callback.
export function newOAuthState(): string {
  return Buffer.from(crypto.randomUUID() + ":" + Date.now()).toString("base64url");
}
