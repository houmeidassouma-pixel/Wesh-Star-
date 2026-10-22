import { execFile } from "child_process";
import { promisify } from "util";
const run = promisify(execFile);

export type Probe = { duration: number; hasVideo: boolean; hasAudio: boolean };

// Vérifie le contenu réel d'un fichier (pas seulement le type MIME annoncé par le navigateur).
export async function probeMedia(file: string): Promise<Probe | null> {
  try {
    const r = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type", "-of", "json", file], { timeout: 20_000 });
    const j = JSON.parse(r.stdout || "{}");
    const types: string[] = (j.streams || []).map((s: any) => s.codec_type);
    const duration = Number(j.format?.duration);
    return { duration: Number.isFinite(duration) ? duration : 0, hasVideo: types.includes("video"), hasAudio: types.includes("audio") };
  } catch { return null; }
}
