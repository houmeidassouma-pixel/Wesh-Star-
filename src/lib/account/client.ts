"use client";

// Browser-side auth client. Historically talked directly to Supabase's
// hosted GoTrue API from the browser; now calls Wesh Star IA's own /api/auth/*
// routes instead. Same method names/shapes as before, so LoginForm,
// PasswordForm, LogoutButton and the forgot-password page work unchanged.
async function post(path: string, body: any) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return res.json().catch(() => ({ error: { message: "Unexpected server response" } }));
}

export function createClient() {
  return {
    auth: {
      signInWithPassword: (creds: { email: string; password: string }) => post("/api/auth/login", creds),
      signUp: (creds: { email: string; password: string }) => post("/api/auth/signup", creds),
      resetPasswordForEmail: (email: string, opts?: { redirectTo?: string }) =>
        post("/api/auth/forgot", { email, redirectTo: opts?.redirectTo }),
      // `token` is an addition for the reset/invite email-link flow (no
      // active session yet); a logged-in password change omits it.
      updateUser: (fields: { password: string; token?: string }) => post("/api/auth/set-password", fields),
      signOut: () => post("/api/auth/logout", {})
    }
  };
}
