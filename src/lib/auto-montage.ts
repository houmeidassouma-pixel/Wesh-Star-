// Construction pure de la commande FFmpeg du montage automatique (aucune entrée utilisateur dans les filtres).

export const MONTAGE_W = 720;
export const MONTAGE_H = 1280;
export const MONTAGE_FPS = 30;

export type MontageInput = { path: string; hasAudio: boolean; duration: number };
export type MontageOpts = {
  inputs: MontageInput[];
  secondsPerClip: number;
  soundPath?: string | null;
  soundVolume?: number;      // 0..1
  effectFilter?: string;     // filtre FFmpeg fixe venant de BUILTIN_EFFECTS (jamais du navigateur)
  output: string;
};

// Chaque clip : coupé à secondsPerClip, recadré en 9:16 (720x1280), 30 fps, audio normalisé (silence si absent).
// Ensuite concaténé, effet appliqué, puis la musique est mixée (ou remplace l'audio) si fournie.
export function buildMontageArgs(o: MontageOpts): string[] {
  if (!o.inputs.length) throw new Error("Aucun clip");
  const args: string[] = ["-y", "-hide_banner", "-loglevel", "error"];
  const parts: string[] = [];
  const concatIn: string[] = [];
  o.inputs.forEach((inp, i) => {
    const len = Math.max(0.5, Math.min(inp.duration || o.secondsPerClip, o.secondsPerClip));
    args.push("-i", inp.path);
    parts.push(`[${i}:v]trim=duration=${len},setpts=PTS-STARTPTS,scale=${MONTAGE_W}:${MONTAGE_H}:force_original_aspect_ratio=increase,crop=${MONTAGE_W}:${MONTAGE_H},setsar=1,fps=${MONTAGE_FPS},format=yuv420p[v${i}]`);
    if (inp.hasAudio) parts.push(`[${i}:a]atrim=duration=${len},asetpts=PTS-STARTPTS,aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[a${i}]`);
    else parts.push(`anullsrc=r=44100:cl=stereo,atrim=duration=${len},asetpts=PTS-STARTPTS[a${i}]`);
    concatIn.push(`[v${i}][a${i}]`);
  });
  const vf = o.effectFilter ? `,${o.effectFilter}` : "";
  parts.push(`${concatIn.join("")}concat=n=${o.inputs.length}:v=1:a=1[cv][ca]`);
  parts.push(`[cv]null${vf},format=yuv420p[outv]`);
  let audioLabel = "[ca]";
  if (o.soundPath) {
    const idx = o.inputs.length;
    args.push("-stream_loop", "-1", "-i", o.soundPath);
    const vol = Math.max(0, Math.min(1, o.soundVolume ?? 0.6));
    parts.push(`[${idx}:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=${vol}[mus]`);
    parts.push(`[ca][mus]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[outa]`);
    audioLabel = "[outa]";
  }
  args.push("-filter_complex", parts.join(";"), "-map", "[outv]", "-map", audioLabel,
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-shortest", o.output);
  return args;
}
