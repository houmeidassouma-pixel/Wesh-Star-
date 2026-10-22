"use client";
import { useCallback, useEffect, useState } from "react";

type Contact = { id: string; handle: string };
type Message = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string; read_at?: string | null };

export default function PrivateMessagesPanel({ currentUserId }: { currentUserId: string }) {
  const [query, setQuery] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contact, setContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (query.trim().length < 3) { setContacts([]); return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/messages/contacts?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        const data = await r.json(); setContacts(data.contacts || []);
      } catch { /* search may be cancelled while typing */ }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  const refresh = useCallback(async () => {
    if (!contact) return;
    try {
      const r = await fetch(`/api/messages?with=${encodeURIComponent(contact.id)}`, { cache: "no-store" });
      const data = await r.json();
      if (r.ok) setMessages(data.messages || []);
      else setError(data.error || "Impossible de charger les messages.");
    } catch { setError("Connexion au serveur impossible."); }
  }, [contact]);

  useEffect(() => {
    setMessages([]); setError("");
    if (!contact) return;
    void refresh();
    const timer = setInterval(() => void refresh(), 4000);
    return () => clearInterval(timer);
  }, [contact, refresh]);

  async function send() {
    if (!contact || !draft.trim() || busy) return;
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/messages/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipientId: contact.id, body: draft.trim() }) });
      const data = await r.json();
      if (!r.ok) { setError(data.error || "Envoi impossible."); return; }
      setDraft(""); await refresh();
    } catch { setError("Connexion au serveur impossible."); }
    finally { setBusy(false); }
  }

  return <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
    <section className="rounded-2xl border border-zinc-200/10 bg-zinc-900/40 p-4">
      <h2 className="font-bold">Trouver un utilisateur</h2>
      <p className="mt-1 text-xs text-zinc-500">Recherche par début d’adresse e-mail (3 caractères minimum).</p>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Ex. utilisateur@" className="mt-3 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" />
      <div className="mt-3 space-y-2">{contacts.map(c => <button key={c.id} onClick={() => { setContact(c); setQuery(""); setContacts([]); }} className="block w-full rounded-xl bg-zinc-800 px-3 py-2 text-left text-sm hover:bg-zinc-700">{c.handle}</button>)}</div>
      {contact && <div className="mt-4 rounded-xl bg-blue-500/10 p-3 text-sm">Conversation avec <b>{contact.handle}</b><button className="ml-2 underline" onClick={() => setContact(null)}>Fermer</button></div>}
    </section>
    <section className="flex min-h-[420px] flex-col rounded-2xl border border-zinc-200/10 bg-zinc-900/40 p-4">
      <h2 className="font-bold">Messages privés</h2>
      {!contact ? <p className="mt-4 text-sm text-zinc-500">Choisis un utilisateur pour commencer une conversation.</p> : <>
        <div className="mt-3 flex-1 space-y-2 overflow-y-auto rounded-xl bg-zinc-950/70 p-3">{messages.map(m => <div key={m.id} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.sender_id === currentUserId ? "ml-auto bg-blue-600 text-white" : "bg-zinc-800"}`}><p className="whitespace-pre-wrap break-words">{m.body}</p><p className="mt-1 text-[10px] opacity-60">{new Date(m.created_at).toLocaleString()}</p></div>)}</div>
        <div className="mt-3 flex gap-2"><textarea value={draft} onChange={e => setDraft(e.target.value)} maxLength={4000} rows={2} placeholder="Écris un message…" className="min-w-0 flex-1 resize-y rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" /><button disabled={busy || !draft.trim()} onClick={() => void send()} className="btn-primary self-end disabled:opacity-50">Envoyer</button></div>
      </>}
      {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
      <p className="mt-3 text-xs text-zinc-500">Les messages utilisent le serveur Wesh Star IA, pas les crédits vidéo de génération.</p>
    </section>
  </div>;
}
