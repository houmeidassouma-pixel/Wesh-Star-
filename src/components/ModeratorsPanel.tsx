"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Main-admin panel: appoint existing accounts by username, set GRANULAR permissions
// per moderator, edit and remove them. Real state via /api/admin/moderators.
export default function ModeratorsPanel({ moderators, permDefs, t }: any) {
  const [mods, setMods] = useState(moderators || []);
  const [username, setUsername] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  const save = async (userId: string, permissions: string[]) => {
    setMods(mods.map((m: any) => (m.id === userId ? { ...m, permissions } : m)));
    await fetch("/api/admin/moderators", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, permissions, action: "edit" })
    });
    setMsg("💾 Berechtigungen gespeichert");
    setTimeout(() => setMsg(null), 2000);
    router.refresh();
  };

  const appoint = async () => {
    const cleanUsername = username.trim().replace(/^@/, "");
    if (!cleanUsername) return;
    const res = await fetch("/api/admin/moderators", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: cleanUsername, permissions: ["review"], action: "appoint" })
    });
    const data = await res.json();
    if (!res.ok) { setMsg("❌ " + (data.error || "Fehler")); return; }
    setMsg("🛡️ @" + cleanUsername + " est modérateur (droit initial : review)");
    setUsername("");
    setTimeout(() => { setMsg(null); router.refresh(); }, 1500);
  };

  const remove = async (userId: string) => {
    if (!confirm("Moderator entfernen?")) return;
    await fetch("/api/admin/moderators", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: "remove" })
    });
    setMods(mods.filter((m: any) => m.id !== userId));
    router.refresh();
  };

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <b style={{ fontSize: 15 }}>🛡️ Moderatoren-Verwaltung — <span style={{ color: "var(--accent)", fontSize: 12 }}>granulare Berechtigungen</span></b>
      <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
        Moderatoren erhalten <b>nur</b> die angehakten Rechte — niemals Admin-Rechte.
      </p>
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <input className="input" style={{ flex: 1, minWidth: 220 }} placeholder="Nom d’utilisateur du compte…" value={username}
          onChange={(e) => setUsername(e.target.value.replace(/^@/, ""))} />
        <button className="btn-primary btn-sm" style={{ padding: "10px 16px" }} onClick={appoint}>➕ Moderator hinzufügen</button>
      </div>
      {msg && <p style={{ fontSize: 12, marginTop: 8, color: "var(--accent)" }}>{msg}</p>}
      <table style={{ marginTop: 10 }}>
        <thead><tr><th>Nom d’utilisateur</th><th>Berechtigungen (✏️ Häkchen setzen)</th><th></th></tr></thead>
        <tbody>
          {mods.map((m: any) => (
            <tr key={m.id}>
              <td style={{ color: "#c084fc", fontWeight: 600 }}>🛡️ @{m.username || m.email?.split("@")[0]}</td>
              <td>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {permDefs.map((p: any) => (
                    <label key={p.key} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#d4d4d8", cursor: "pointer" }}>
                      <input type="checkbox" checked={(m.permissions || []).includes(p.key)}
                        onChange={(e) => save(m.id, e.target.checked ? [...(m.permissions || []), p.key] : (m.permissions || []).filter((k: string) => k !== p.key))} />
                      {p.label}
                    </label>
                  ))}
                </div>
              </td>
              <td><button className="btn-danger btn-sm" onClick={() => remove(m.id)}>🗑️</button></td>
            </tr>
          ))}
          {mods.length === 0 && <tr><td colSpan={3} style={{ textAlign: "center", color: "var(--muted)" }}>— keine Moderatoren —</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
