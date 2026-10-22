"use client";

import { useState } from "react";
import { createClient } from "@/lib/account/client";

export default function PasswordForm({ t }: { t: Record<string, string> }) {
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setLoading(false);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: t.password_changed });
    if (!error) setPw("");
  };

  return (
    <form onSubmit={submit} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 max-w-md">
      <h2 className="text-xl font-bold">{t.change_password}</h2>
      <input type="password" required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)}
        placeholder={t.new_password}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2" />
      <button disabled={loading}
        className="bg-banana text-black font-semibold rounded-lg px-6 py-2 hover:bg-banana-dark disabled:opacity-50">
        {loading ? "..." : t.save}
      </button>
      {msg && <p className={"text-sm " + (msg.ok ? "text-green-400" : "text-red-400")}>{msg.text}</p>}
    </form>
  );
}
