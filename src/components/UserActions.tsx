"use client";

import { useRouter } from "next/navigation";

export default function UserActions({ userId, blocked, warnings, verified }: any) {
  const router = useRouter();
  const act = async (action: string) => {
    const res = await fetch("/api/admin/user-action", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action })
    });
    if (res.ok) router.refresh();
    else { const d = await res.json(); alert(d.error || "Fehler"); }
  };
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      <span style={{ fontSize: 11, color: "#fbbf24" }}>⚠️ {warnings || 0}</span>
      <button className="btn-secondary btn-sm" style={{ padding: "4px 8px", fontSize: 10.5 }} title="Verwarnen" onClick={() => act("warn")}>⚠️</button>
      <button className="btn-secondary btn-sm" style={{ padding: "4px 8px", fontSize: 10.5 }} title={blocked ? "Réactiver le compte" : "Désactiver le compte"} onClick={() => act(blocked ? "unblock" : "block")}>{blocked ? "▶️ Activer" : "⏸️ Désactiver"}</button>
      <button className="btn-secondary btn-sm" style={{ padding: "4px 8px", fontSize: 10.5 }} title={verified ? "Retirer le badge bleu" : "Donner le badge bleu"} onClick={() => act(verified ? "unverify" : "verify")}>{verified ? "🔵 Retirer" : "☑️ Certifier"}</button>
    </span>
  );
}
