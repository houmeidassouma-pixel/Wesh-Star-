// Automatic assembly of multiple clips into one long video. Requires the
// ffmpeg binary on the host (VPS / Docker / self-hosted Node). NOT available
// on Vercel serverless -> set ENABLE_FFMPEG=true only where ffmpeg exists.
//
// Production: see Dockerfile (ffmpeg preinstalled) or README "FFmpeg".
import { execFile } from "child_process";
import { mkdirSync, writeFileSync, readFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";

export function ffmpegEnabled(): boolean {
  return process.env.ENABLE_FFMPEG === "true";
}

export async function concatClips(clips: Buffer[]): Promise<Buffer> {
  const dir = path.join(tmpdir(), "nbpm-" + Date.now());
  mkdirSync(dir, { recursive: true });
  const files = clips.map((buf, i) => {
    const f = path.join(dir, "clip-" + i + ".mp4");
    writeFileSync(f, buf);
    return f;
  });
  const list = path.join(dir, "list.txt");
  // One clip path per line for the ffmpeg concat demuxer.
  writeFileSync(list, files.map((f) => "file '" + f + "'").join("\n"));
  const out = path.join(dir, "final.mp4");
  await new Promise<void>((resolve, reject) => {
    execFile(
      "ffmpeg",
      ["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", out],
      (err) => (err ? reject(new Error("ffmpeg failed: " + err.message)) : resolve())
    );
  });
  return readFileSync(out);
}
