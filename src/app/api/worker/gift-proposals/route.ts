import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { getEconomy } from "@/lib/creator-db";
import { generateGiftProposals } from "@/lib/gift-proposals";

// À appeler par cron (ex. 1 fois par jour) avec CRON_SECRET. Ne publie jamais rien : crée seulement des propositions à valider.
export async function POST(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await getEconomy()).aiProposalsEnabled) return NextResponse.json({ ok: true, skipped: "AI_PROPOSALS_DISABLED" });
  try { return NextResponse.json({ ok: true, created: await generateGiftProposals() }); }
  catch (e: any) { return NextResponse.json({ error: "LLM_UNAVAILABLE", message: String(e?.message || e).slice(0, 200) }, { status: 502 }); }
}
