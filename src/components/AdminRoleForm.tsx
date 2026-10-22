"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminRoleForm({ userId, currentRole }: { userId: string; currentRole: string }) {
  const [role, setRole] = useState(currentRole);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const save = async () => {
    await fetch("/api/admin/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role })
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  };

  return (
    <span className="flex items-center gap-2">
      <select value={role} onChange={(e) => setRole(e.target.value)}
        className="input !w-auto !px-2 !py-1 text-xs">
        <option value="user">user</option>
        <option value="viewer">viewer</option>
        <option value="editor">editor</option>
        <option value="moderator">moderator</option>
        <option value="admin">admin</option>
      </select>
      <button onClick={save} className="text-xs font-bold text-banana hover:underline">{saved ? "✓" : "→"}</button>
    </span>
  );
}
