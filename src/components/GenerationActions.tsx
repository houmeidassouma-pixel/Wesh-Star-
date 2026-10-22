"use client";

import { useRouter } from "next/navigation";

export default function GenerationActions({ jobId, t, disabled }: { jobId: string; t: Record<string, string>; disabled?: boolean }) {
  const router = useRouter();

  const act = async (action: string) => {
    if (action === "delete" && !confirm("Delete this generation?")) return;
    await fetch("/api/admin/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, action })
    });
    router.refresh();
  };

  return (
    <span className="flex flex-wrap gap-2">
      <button onClick={() => act("retry")} disabled={disabled} className="btn-secondary btn-sm">{t.retry}</button>
      <button onClick={() => act("delete")} disabled={disabled} className="btn-danger btn-sm">{t.delete}</button>
    </span>
  );
}
