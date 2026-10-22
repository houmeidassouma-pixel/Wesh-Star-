import { parseRobustJson } from "./robust-json";

// Wesh Star IA self-hosted video engine.
//
// The application talks only to a Wesh Star IA GPU worker. No Replicate,
// Kling, Hailuo, Runway or other hosted video API is required.
//
// SELF_HOSTED_VIDEO_URL may contain one URL or a comma-separated list of
// Wesh Star IA GPU workers. A deterministic worker index is embedded in the
// prediction id so polling survives Next.js process restarts.

const DEFAULT_TIMEOUT_MS = 30_000;

type WorkerRef = { index: number; baseUrl: string };

function workers(): WorkerRef[] {
  const raw = String(process.env.SELF_HOSTED_VIDEO_URL || "").trim();
  if (!raw) throw new Error("SELF_HOSTED_VIDEO_URL is not configured");
  return raw.split(",").map(s => s.trim()).filter(Boolean).map((baseUrl, index) => ({ index, baseUrl: baseUrl.replace(/\/$/, "") }));
}

function workerTokenHeaders(): Record<string, string> {
  const token = (process.env.SELF_HOSTED_WORKER_TOKEN || process.env.WESH_GPU_WORKER_TOKEN);
  if (!token) throw new Error("SELF_HOSTED_WORKER_TOKEN is not configured");
  return { Authorization: "Bearer " + token, "Content-Type": "application/json" };
}

function encodeRef(index: number, id: string): string {
  return index + ":" + id;
}

function decodeRef(ref: string): { index: number; id: string } {
  const value = String(ref || "");
  const p = value.indexOf(":");
  if (p <= 0 || p === value.length - 1) throw new Error("Invalid self-hosted prediction id");
  const rawIndex = value.slice(0, p);
  if (!/^\d+$/.test(rawIndex)) throw new Error("Invalid self-hosted prediction worker index");
  const index = Number(rawIndex), id = value.slice(p + 1);
  if (!Number.isSafeInteger(index) || !/^[a-zA-Z0-9_-]{1,160}$/.test(id)) throw new Error("Invalid self-hosted prediction id");
  return { index, id };
}

let workerCursor = 0;
function chooseWorker(): WorkerRef {
  const list = workers();
  const configured = String(process.env.SELF_HOSTED_WORKER_INDEX ?? "").trim();
  if (configured !== "") {
    const n = Number(configured);
    return list[Math.max(0, Math.min(list.length - 1, Number.isFinite(n) ? Math.floor(n) : 0))];
  }
  const selected = list[workerCursor % list.length];
  workerCursor += 1;
  return selected;
}

async function fetchWithTimeout(input: string | URL, init: RequestInit = {}) {
  const controller = new AbortController();
  const configured = Number(process.env.SELF_HOSTED_REQUEST_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(configured) ? Math.max(1000, Math.min(120000, Math.floor(configured))) : DEFAULT_TIMEOUT_MS;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export type ClipStatus = {
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  videoUrl?: string;
  error?: string;
};

export type VideoFormatProfile = { key: string; label: string; ratio: string; width: number; height: number };

export const VIDEO_FORMATS: Record<string, VideoFormatProfile> = {
  youtube:   { key: "youtube",   label: "YouTube",        ratio: "16:9", width: 832, height: 480 },
  tiktok:    { key: "tiktok",    label: "TikTok",         ratio: "9:16", width: 480, height: 832 },
  reels:     { key: "reels",     label: "Instagram Reels", ratio: "9:16", width: 480, height: 832 },
  shorts:    { key: "shorts",    label: "YouTube Shorts",  ratio: "9:16", width: 480, height: 832 },
  feed:      { key: "feed",      label: "Instagram Feed",  ratio: "1:1", width: 640, height: 640 },
  x:         { key: "x",         label: "X",               ratio: "16:9", width: 832, height: 480 },
  linkedin:  { key: "linkedin",  label: "LinkedIn",        ratio: "16:9", width: 832, height: 480 },
  facebook:  { key: "facebook",  label: "Facebook",        ratio: "16:9", width: 832, height: 480 },
};

export function getVideoFormat(platform?: string): VideoFormatProfile {
  return VIDEO_FORMATS[String(platform || "").toLowerCase()] || VIDEO_FORMATS.tiktok;
}

export async function createClip(prompt: string, imageUrl?: string, durationSeconds?: number, autoImage = false, platform?: string): Promise<{ id: string }> {
  const configuredWorkers = workers();
  const first = chooseWorker();
  const startIndex = configuredWorkers.findIndex(w => w.index === first.index);
  const orderedWorkers = [...configuredWorkers.slice(Math.max(0, startIndex)), ...configuredWorkers.slice(0, Math.max(0, startIndex))];
  const format = getVideoFormat(platform);
  const body = {
    prompt,
    image_url: imageUrl || null,
    duration_seconds: Math.max(1, Math.floor(Number(durationSeconds) || Number(process.env.SELF_HOSTED_CLIP_SECONDS || 5))),
    width: Math.max(256, Math.floor(Number(process.env.SELF_HOSTED_WIDTH) || format.width)),
    height: Math.max(256, Math.floor(Number(process.env.SELF_HOSTED_HEIGHT) || format.height)),
    aspect_ratio: format.ratio,
    platform: format.key,
    fps: Math.max(8, Math.floor(Number(process.env.SELF_HOSTED_FPS) || 16)),
    auto_image: Boolean(autoImage) && !imageUrl
  };

  const failures: string[] = [];
  for (const worker of orderedWorkers) {
    try {
      const res = await fetchWithTimeout(worker.baseUrl + "/v1/jobs", {
        method: "POST", headers: workerTokenHeaders(), body: JSON.stringify(body)
      });
      const text = await res.text();
      if (!res.ok) throw new Error("HTTP " + res.status + ": " + text.slice(0, 180));
      const data = parseRobustJson<{ id?: unknown }>(text);
      if (typeof data?.id !== "string" || !/^[a-zA-Z0-9_-]{1,160}$/.test(data.id)) throw new Error("Invalid job id in worker response");
      return { id: encodeRef(worker.index, data.id) };
    } catch (error: any) {
      failures.push("worker " + worker.index + ": " + String(error?.message || error).slice(0, 180));
    }
  }
  throw new Error("All configured Wesh Star IA GPU workers failed: " + failures.join("; "));
}

export async function getClip(ref: string): Promise<ClipStatus> {
  const decoded = decodeRef(ref);
  const list = workers();
  const worker = list[decoded.index];
  if (!worker) throw new Error("Wesh Star IA GPU worker index is unavailable: " + decoded.index);

  const res = await fetchWithTimeout(worker.baseUrl + "/v1/jobs/" + encodeURIComponent(decoded.id), {
    headers: workerTokenHeaders()
  });
  if (!res.ok) throw new Error("Wesh Star IA GPU worker poll error " + res.status);
  const data = parseRobustJson<Record<string, unknown>>(await res.text());
  const allowed = new Set(["starting", "processing", "succeeded", "failed", "canceled"]);
  const status = typeof data.status === "string" && allowed.has(data.status) ? data.status as ClipStatus["status"] : "failed";
  return {
    status,
    videoUrl: typeof data.video_url === "string" ? data.video_url : undefined,
    error: typeof data.error === "string" ? data.error : undefined
  };
}
