"use client";

import VideoCard from "./VideoCard";
import { useJobs } from "./useJobs";

export default function VideoGrid({ t, communityEnabled = false }: { t: Record<string, string>; communityEnabled?: boolean }) {
  const { jobs, reload } = useJobs(4000);

  if (jobs.length === 0) {
    return (
      <div className="card grid place-items-center p-12 text-center">
        <div>
          <div className="text-4xl">🎬</div>
          <p className="mt-3 text-zinc-500">{t.studio_empty}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {jobs.map((job) => (
        <VideoCard key={job.id} job={job} t={t} onChanged={reload} communityEnabled={communityEnabled} />
      ))}
    </div>
  );
}
