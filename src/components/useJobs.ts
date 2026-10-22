"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Job = {
  id: string;
  prompt: string;
  video_type: string;
  target_seconds: number;
  scenes: number;
  status: string;
  error: string | null;
  created_at: string;
  clips?: { status: string }[];
};

export function doneScenes(job: Job): number {
  return (job.clips || []).filter((c: any) => c.status === "done").length;
}

export function jobPercent(job: Job): number {
  if (job.status === "done") return 100;
  if (job.status === "failed") return Math.round((doneScenes(job) / Math.max(1, job.scenes)) * 100);
  return Math.round((doneScenes(job) / Math.max(1, job.scenes)) * 100);
}

export function useJobs(pollMs = 4000) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const lastFetchAt = useRef(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/generations/list");
      const data = await res.json();
      if (Array.isArray(data.jobs)) setJobs(data.jobs);
    } catch {}
  }, []);

  useEffect(() => {
    load();
    // Keep mobile data/battery use low: pause polling while the tab is hidden,
    // and use a slower cadence when the user enables Data Saver in Settings.
    const intervalMs = Math.max(pollMs, 8000);
    const iv = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      let saver = false;
      try { saver = window.localStorage.getItem("wesh-data-saver") === "1"; } catch {}
      const now = Date.now();
      const cadence = saver ? 25000 : intervalMs;
      if (now - lastFetchAt.current >= cadence) {
        lastFetchAt.current = now;
        load();
      }
    }, 5000);
    const onVisible = () => { if (document.visibilityState === "visible") { lastFetchAt.current = Date.now(); load(); } };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", onVisible); };
  }, [load, pollMs]);

  return { jobs, reload: load };
}
