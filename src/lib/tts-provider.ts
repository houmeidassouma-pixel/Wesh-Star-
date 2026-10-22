const DEFAULT_TTS = "http://tts-worker:8002";

function ttsBase() {
  return String(process.env.SELF_HOSTED_TTS_URL || DEFAULT_TTS).replace(/\/$/, "");
}

function ttsHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = (process.env.SELF_HOSTED_WORKER_TOKEN || process.env.WESH_GPU_WORKER_TOKEN);
  if (!token) throw new Error("SELF_HOSTED_WORKER_TOKEN is not configured");
  return { ...extra, Authorization: "Bearer " + token };
}

export async function synthesizeSpeech(text: string, voice: string, speed = 1) {
  const base = ttsBase();
  const res = await fetch(base + "/v1/synthesize", {
    method: "POST",
    headers: ttsHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ text, voice, speed }),
    signal: AbortSignal.timeout(330_000)
  });
  const body = await res.text();
  if (!res.ok) throw new Error("Wesh Star IA local TTS error " + res.status + ": " + body.slice(0, 500));
  const meta = JSON.parse(body) as { audio_url: string; voice: string; backend: string };
  // The worker is private (token-protected, not published): fetch the WAV
  // server-side and hand the browser a self-contained data URL.
  const audio = await fetch(base + meta.audio_url, { headers: ttsHeaders(), signal: AbortSignal.timeout(60_000) });
  if (!audio.ok) throw new Error("Wesh Star IA local TTS audio fetch error " + audio.status);
  const buf = Buffer.from(await audio.arrayBuffer());
  return { ...meta, audio_url: "data:audio/wav;base64," + buf.toString("base64") };
}

export async function listLocalVoices() {
  const res = await fetch(ttsBase() + "/v1/voices", { cache: "no-store", headers: ttsHeaders(), signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error("Wesh Star IA local TTS voice list error " + res.status);
  return res.json();
}
