"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/account/client";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setMsg(null); setErr(null);
    const site = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: site + "/reset"
    });
    setLoading(false);
    if (error) setErr(error.message);
    else setMsg("Wenn ein Konto mit dieser E-Mail existiert, ist soeben ein Reset-Link unterwegs.");
  };

  return (
    <div className="grid min-h-[60vh] place-items-center px-4 py-12">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-8">
        <h1 className="text-xl font-bold">🔑 Passwort vergessen</h1>
        <p className="text-sm text-zinc-400">Wir senden Ihnen einen Link zum Zurücksetzen.</p>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="ihre@email.de" className="input" />
        {msg && <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-400">{msg}</p>}
        {err && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{err}</p>}
        <button disabled={loading} className="btn-primary btn-md w-full">
          {loading ? "…" : "Reset-Link senden"}
        </button>
        <Link href="/login" className="block text-center text-sm text-zinc-400 hover:text-banana">← Zurück zum Login</Link>
      </form>
    </div>
  );
}
