"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/account/client";

export default function ResetPage() {
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const invited = searchParams.get("invite") === "1";
  const token = searchParams.get("token") || undefined;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setMsg(null); setErr(null);
    const { error } = await createClient().auth.updateUser({ password: pw, token });
    setLoading(false);
    if (error) setErr(error.message);
    else setMsg(invited
      ? "✅ Konto aktiviert — du kannst dich jetzt als Moderator anmelden."
      : "✅ Passwort aktualisiert — bitte mit dem neuen Passwort anmelden.");
  };

  return (
    <div className="grid min-h-[60vh] place-items-center px-4 py-12">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-8">
        <h1 className="text-xl font-bold">{invited ? "🛡️ Wesh Star IA Einladung" : "🔑 Neues Passwort setzen"}</h1>
        {invited && <p className="text-sm text-zinc-400">Du wurdest als Moderator eingeladen. Lege dein Passwort fest, um dein Wesh-Star-Konto zu aktivieren.</p>}
        <input type="password" required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)}
          placeholder="Neues Passwort (mind. 6 Zeichen)" className="input" />
        {msg && <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-400">{msg}</p>}
        {err && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{err}</p>}
        <button disabled={loading} className="btn-primary btn-md w-full">
          {loading ? "…" : "Passwort speichern"}
        </button>
        <Link href="/login" className="block text-center text-sm text-zinc-400 hover:text-banana">→ Zum Login</Link>
      </form>
    </div>
  );
}
