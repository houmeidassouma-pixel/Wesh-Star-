import { createHmac, timingSafeEqual } from "crypto";
import { mkdir, readFile, writeFile, unlink, stat } from "fs/promises";
import path from "path";

/**
 * Wesh Star IA native storage.
 * All user uploads, generated clips and final videos are stored directly on
 * the Wesh Star IA server filesystem (normally a persistent Docker volume).
 * No third-party object-storage service is used by this module.
 */
const root = () => process.env.WESH_STORAGE_ROOT || "/app/storage";
const secret = () => {
  const v = process.env.WESH_STORAGE_SIGNING_SECRET || "";
  // Placeholder/short values would make signed URLs forgeable: treat as unset (verification then fails closed).
  return v.length < 16 || /^change-me|^replace-with/i.test(v) ? "" : v;
};
const publicBase = () => String(process.env.SELF_HOSTED_PUBLIC_BASE_URL || "").replace(/\/$/, "");

function safePath(p: string): string {
  const normalized = p.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..") || normalized.includes("\0")) throw new Error("Invalid storage path");
  return normalized.split("/").map(s => s.replace(/[^a-zA-Z0-9._-]/g, "_")).join("/");
}
function localFile(p: string): string { return path.join(root(), safePath(p)); }
function tokenFor(p: string, exp: number, download = false): string {
  const payload = `${safePath(p)}|${exp}|${download ? 1 : 0}`;
  return createHmac("sha256", secret()).update(payload).digest("hex");
}
export function verifyLocalToken(p: string, exp: number, token: string, download = false): boolean {
  if (!secret() || !token || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = tokenFor(p, exp, download);
  try { return timingSafeEqual(Buffer.from(expected), Buffer.from(token)); } catch { return false; }
}

export async function uploadVideo(pathName: string, buf: Buffer, contentType = "video/mp4") {
  void contentType;
  const file = localFile(pathName);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, buf);
}

export async function createSignedVideoUrl(pathName: string, expiresIn = 3600, download = false): Promise<string> {
  if (!publicBase()) throw new Error("SELF_HOSTED_PUBLIC_BASE_URL is required for local storage URLs");
  const p = safePath(pathName);
  const exp = Math.floor(Date.now() / 1000) + Math.max(1, Math.floor(expiresIn));
  const token = tokenFor(p, exp, download);
  return `${publicBase()}/api/storage/${p}?expires=${exp}&token=${token}${download ? "&download=1" : ""}`;
}

export async function readStorageFile(pathName: string): Promise<Buffer> {
  return readFile(localFile(pathName));
}

export async function deleteStorageFile(pathName: string): Promise<void> {
  try { await unlink(localFile(pathName)); } catch (e: any) { if (e?.code !== "ENOENT") throw e; }
}

export async function storageFileExists(pathName: string): Promise<boolean> {
  try { await stat(localFile(pathName)); return true; } catch { return false; }
}

export async function downloadFile(url: string): Promise<Buffer> {
  const headers: Record<string, string> = {};
  const workerUrls = String(process.env.SELF_HOSTED_VIDEO_URL || "")
    .split(",").map(x => x.trim().replace(/\/$/, "")).filter(Boolean);
  if ((process.env.SELF_HOSTED_WORKER_TOKEN || process.env.WESH_GPU_WORKER_TOKEN) && workerUrls.some(base => url.startsWith(base + "/"))) {
    headers.Authorization = "Bearer " + (process.env.SELF_HOSTED_WORKER_TOKEN || process.env.WESH_GPU_WORKER_TOKEN);
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error("Download failed: HTTP " + res.status);
  return Buffer.from(await res.arrayBuffer());
}

export async function downloadStorageFile(pathName: string): Promise<Buffer> {
  return readStorageFile(pathName);
}

/** URL that external publishers can fetch. It points to the Wesh Star IA server's own storage route. */
export function publicVideoUrl(pathName: string): string {
  // Publishing is normally called immediately after finalization. Use a long
  // token so a social platform has time to fetch the video.
  const exp = Math.floor(Date.now() / 1000) + 24 * 3600;
  const p = safePath(pathName);
  const token = tokenFor(p, exp, false);
  if (!publicBase()) throw new Error("SELF_HOSTED_PUBLIC_BASE_URL is required for publishing");
  return `${publicBase()}/api/storage/${p}?expires=${exp}&token=${token}`;
}

export function isLocalStorage() { return true; }
export function localStoragePath(p: string) { return localFile(p); }
