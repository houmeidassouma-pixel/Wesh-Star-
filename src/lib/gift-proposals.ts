import { query } from "@/lib/db/pool";
import { callLLM } from "@/lib/llm";
import { parseGiftProposals } from "@/lib/creator-economy";
import { getEconomy } from "@/lib/creator-db";

// Demande à l'IA locale (Ollama) des idées de cadeaux. Tout est inséré en "pending" : RIEN n'est publié sans validation admin.
export async function generateGiftProposals(): Promise<number> {
  const eco = await getEconomy();
  const pending = await query("select count(*)::int n from public.gift_proposals where status='pending'");
  if (pending.rows[0].n >= 30) return 0; // file d'attente pleine : l'admin doit d'abord trier
  const known = new Set<string>([...eco.gifts.map((g) => g.name.toLowerCase())]);
  const ex = await query("select lower(name) n from public.gift_proposals where created_at > now() - interval '60 days'");
  ex.rows.forEach((r: any) => known.add(r.n));
  const text = await callLLM(
    "Tu inventes des cadeaux virtuels pour une plateforme vidéo. Réponds UNIQUEMENT par un tableau JSON, sans texte autour.",
    'Propose 6 nouveaux cadeaux originaux, famille-friendly. Format: [{"name":"Licorne","emoji":"🦄","tokens":7}]. tokens = prix en pièces Wesh (entier de 1 à 100). Évite: ' + [...known].slice(0, 40).join(", "),
    700);
  const drafts = parseGiftProposals(text).filter((d) => !known.has(d.name.toLowerCase()));
  const workerBase = String(process.env.SELF_HOSTED_VIDEO_URL || "http://gpu-worker:8001").replace(/\/$/, "");
  const workerToken = String((process.env.SELF_HOSTED_WORKER_TOKEN || process.env.WESH_GPU_WORKER_TOKEN) || "");
  for (const d of drafts) {
    let imageUrl: string | null = null;
    // GPU generation is queued in the background; the gift remains pending until admin approval.
    if (workerToken) {
      try {
        const resp = await fetch(workerBase + "/v1/assets/generate", {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + workerToken },
          body: JSON.stringify({ prompt: `Premium friendly virtual gift icon representing ${d.name}; bright polished 3D collectible, centered isolated object, transparent-background-ready silhouette, no text, no letters, no watermark.`, width: 768, height: 768 }),
          cache: "no-store",
        });
        if (resp.ok) {
          const job = await resp.json();
          if (/^[a-f0-9]{32}$/i.test(String(job.id || ""))) imageUrl = `/api/video-edit/generate-asset/image?jobId=${job.id}`;
        }
      } catch { /* Text proposal remains usable even if the local GPU is busy/offline. */ }
    }
    await query("insert into public.gift_proposals (name,emoji,tokens,source,image_url) values ($1,$2,$3,'ai',$4)", [d.name, d.emoji, d.tokens, imageUrl]);
  }
  return drafts.length;
}
