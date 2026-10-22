"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4 py-20 text-center">
      <div className="animate-fade-up">
        <div className="text-6xl">⚠️</div>
        <h1 className="mt-4 text-2xl font-extrabold">Error</h1>
        <p className="mt-2 text-zinc-400">Something went wrong.</p>
        <button onClick={reset} className="btn-primary btn-md mt-6">↻ Retry</button>
      </div>
    </div>
  );
}
