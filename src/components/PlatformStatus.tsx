import { listSocialStatus } from "@/lib/social-tokens";

export default async function PlatformStatus({ settings }: { settings: any }) {
  const pl = settings?.site?.platforms || {};
  const status = await listSocialStatus();
  const cfg: [string, string][] = [
    ["🎵 TikTok", "tiktok"], ["📘 Facebook", "facebook"], ["▶️ YouTube", "youtube"], ["👻 Snapchat", "snapchat"], ["📸 Instagram", "instagram"], ["🟣 Twitch", "twitch"], ["𝕏 X / Twitter", "x"], ["💼 LinkedIn", "linkedin"]
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {cfg.map(([label, key]) => {
        const connected = !!status[key]?.connected;
        const enabled = pl[key] !== false;
        const ok = connected && enabled;
        return (
          <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-center">
            <div className="text-xl">{label}</div>
            <div className={"mt-2 text-xs font-semibold " + (ok ? "text-green-400" : "text-zinc-500")}>
              {ok ? "● prêt (connecté + activé)" : connected ? "○ connecté — activation désactivée" : "○ compte non connecté"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
