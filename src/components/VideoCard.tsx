"use client";

import { useState } from "react";
import { jobPercent, doneScenes, type Job } from "./useJobs";
import PublishToWesh from "./PublishToWesh";

export default function VideoCard({ job, t, onChanged, communityEnabled = false }: { job: Job; t: Record<string, string>; onChanged: () => void; communityEnabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const statusBadge: Record<string, React.ReactNode> = {
    pending: <span className="badge-zinc">⏳ {t.st_pending}</span>,
    processing: <span className="badge-yellow"><span className="pulse-dot">●</span> {t.st_processing}</span>,
    done: <span className="badge-green">✓ {t.st_done}</span>,
    failed: <span className="badge-red">✕ {t.st_failed}</span>
  };
  const fmt = (s: number) => (s < 60 ? s + " " + t.sec_unit : s / 60 + " " + t.min_unit);
  const pct = jobPercent(job);

  const act = async (action: string) => {
    if (action === "delete" && !confirm(t.delete_confirm)) return;
    setBusy(true);
    await fetch("/api/generations/" + action, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: job.id })
    });
    setBusy(false);
    setOpen(false);
    onChanged();
  };

  return (
    <>
      <div className="card-hover group overflow-hidden">
        {/* Thumbnail / placeholder */}
        <button
          onClick={() => job.status === "done" && setOpen(true)}
          disabled={job.status !== "done"}
          aria-label={job.status === "done" ? `${t.watch || "Regarder"} : ${job.prompt}` : job.prompt}
          className="relative block aspect-video w-full bg-zinc-900 text-left disabled:cursor-default"
        >
          {job.status === "done" ? (
            <>
              <video preload="metadata" muted playsInline
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                src={"/api/video/" + job.id} />
              <span className="absolute inset-0 grid place-items-center bg-black/0 text-4xl opacity-0 transition-opacity group-hover:bg-black/40 group-hover:opacity-100">▶</span>
            </>
          ) : (
            <span className="grid h-full w-full place-items-center text-3xl">
              {job.status === "failed" ? "⚠️" : "🎬"}
            </span>
          )}
          {job.status === "processing" && (
            <div className="absolute inset-x-0 bottom-0 h-1.5 bg-zinc-800">
              <div className="progress-shimmer h-full bg-banana transition-all" style={{ width: pct + "%" }} />
            </div>
          )}
        </button>

        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 min-h-[2.5rem] flex-1 text-sm font-medium">{job.prompt}</p>
            {statusBadge[job.status]}
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">
            {fmt(job.target_seconds)} · {doneScenes(job)}/{job.scenes} {t.scenes_label} · {new Date(job.created_at).toLocaleDateString()}
          </p>
          {job.status === "failed" && job.error && (
            <p className="mt-2 line-clamp-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-400">{job.error}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {job.status === "done" && (
              <>
                <button onClick={() => setOpen(true)} className="btn-secondary btn-sm">▶ {t.watch}</button>
                <a href={"/api/video/" + job.id + "?download=1"} download className="btn-primary btn-sm">⬇ {t.download}</a>
                {communityEnabled && <PublishToWesh generationId={job.id} />}
              </>
            )}
            {job.status === "failed" && (
              <button onClick={() => act("retry")} disabled={busy} className="btn-secondary btn-sm">↻ {t.retry}</button>
            )}
            <button onClick={() => act("delete")} disabled={busy} className="btn-danger btn-sm">🗑 {t.delete}</button>
          </div>
        </div>
      </div>

      {/* Watch modal */}
      {open && job.status === "done" && (
        <div className="animate-fade-in fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="card w-full max-w-3xl p-4" onClick={(e) => e.stopPropagation()}>
            <video controls autoPlay className="w-full rounded-xl" src={"/api/video/" + job.id} />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p className="mr-auto line-clamp-1 text-sm text-zinc-400">{job.prompt}</p>
              <a href={"/api/video/" + job.id + "?download=1"} download className="btn-primary btn-sm">⬇ {t.download}</a>
                {communityEnabled && <PublishToWesh generationId={job.id} />}
              <button onClick={() => setOpen(false)} aria-label={t.close || "Fermer"} className="btn-secondary btn-sm">✕</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
