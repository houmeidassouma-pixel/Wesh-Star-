"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/account/client";

export default function LoginForm({ t }: { t: Record<string, string> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const db = createClient();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fn = mode === "signin"
      ? db.auth.signInWithPassword({ email, password })
      : db.auth.signUp({ email, password });
    const { error } = await fn;
    setLoading(false);
    if (error) setError(error.message);
    else {
      const requested = searchParams.get("next") || "/";
      // Only allow local relative paths; never redirect to an external URL.
      const destination = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";
      router.push(destination); router.refresh();
    }
  };

  return (
    <form onSubmit={submit} className="card animate-fade-up p-8">
      <div className="mb-6 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-banana to-yellow-600 text-2xl shadow-lg shadow-banana/20">🍌</span>
        <h1 className="mt-4 text-2xl font-extrabold">{mode === "signin" ? t.sign_in : t.sign_up}</h1>
        <p className="mt-1 text-sm text-zinc-500">{t.site_name}</p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="email">{t.email}</label>
          <input id="email" type="email" required placeholder="you@example.com" value={email}
            onChange={(e) => setEmail(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">{t.password}</label>
          <input id="password" type="password" required minLength={6} placeholder="••••••••" value={password}
            onChange={(e) => setPassword(e.target.value)} className="input" />
        </div>
        {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
        <button disabled={loading} className="btn-primary btn-md w-full">
          {loading ? "…" : mode === "signin" ? t.sign_in : t.get_started}
        </button>
        <Link href="/forgot" className="block text-center text-xs text-zinc-500 hover:text-banana">Passwort vergessen?</Link>
        <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="btn-ghost btn-sm w-full">
          {mode === "signin" ? t.no_account : t.have_account}
        </button>
      </div>
    </form>
  );
}
