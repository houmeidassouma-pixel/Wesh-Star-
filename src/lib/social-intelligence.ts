export type SocialMetric = {
  platform: string; views?: number; likes?: number; comments?: number; shares?: number;
  saves?: number; watch_time_seconds?: number; video_seconds?: number;
};
export function engagementScore(m: SocialMetric): number {
  const views = Math.max(1, Number(m.views || 0));
  const engagement = (Number(m.likes||0) + Number(m.comments||0)*2 + Number(m.shares||0)*3 + Number(m.saves||0)*2) / views;
  const video = Math.max(1, Number(m.video_seconds || 0));
  const completion = Number(m.watch_time_seconds||0) > 0 ? Math.min(1, Number(m.watch_time_seconds)/(views*video)) : 0;
  return Math.round((engagement*100 + completion*100)*100)/100;
}
export function buildOptimizationContext(rows: any[], platform: string): string {
  const top = (rows||[]).filter(r=>r.platform===platform)
    .sort((a,b)=>Number(b.score||0)-Number(a.score||0)).slice(0,5);
  if (!top.length) return "";
  const formats=Array.from(new Set(top.map(r=>r.format_profile).filter(Boolean)));
  const hooks=Array.from(new Set(top.map(r=>r.hook_style).filter(Boolean)));
  const lengths=top.map(r=>Number(r.video_seconds||0)).filter(n=>n>0);
  return [
    "OPTIMISATION BASEE SUR TES PUBLICATIONS PERFORMANTES",
    formats.length ? "formats à privilégier: "+formats.join(", ") : "",
    hooks.length ? "styles d'accroche à privilégier: "+hooks.join(", ") : "",
    lengths.length ? "durée moyenne observée: "+Math.round(lengths.reduce((a,b)=>a+b,0)/lengths.length)+" s" : "",
    "Réutilise uniquement les caractéristiques gagnantes; ne copie aucune vidéo existante."
  ].filter(Boolean).join(". ")+".";
}
