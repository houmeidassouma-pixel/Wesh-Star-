import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { rateLimit, clientKey } from "@/lib/ratelimit";

// Built-in story generator by version (love/action/comedy/thriller/fantasy).
// For production LLM quality, replace pickStory() with your text API
// (env TEXT_API_URL / TEXT_API_KEY) — the interface stays the same.
const STORIES: Record<string, string[]> = {
  standard: ["Ein junger Entdecker findet eine geheimnisvolle Karte und begibt sich auf ein Abenteuer.", "Zwei Freunde eröffnen ein Café und meistern ihre ersten Herausforderungen."],
  love: ["Zwei Menschen treffen sich an einem regnerischen Tag in einem Café — und vergessen die Zeit.", "Ein Brief, der Jahre unterwegs war, verändert alles zwischen zwei Herzen."],
  action: ["Ein Agent hat 24 Stunden, um eine verschwundene Formel zu finden.", "Ein Stuntfahrer entdeckt eine Verschwörung und wehrt sich."],
  comedy: ["Ein Hund erbt ein Hotel und sorgt für Chaos.", "Zwei Chaoten gründen eine Detektei — der erste Fall wird zum Desaster."],
  thriller: ["Eine Nachbarin verschwindet spurlos.", "Um Mitternacht klingelt das Telefon: Eine fremde Stimme kennt dein Geheimnis."],
  fantasy: ["Ein Portal öffnet sich im Keller.", "Der letzte Drache sucht einen Menschen, dem er sein Geheimnis anvertrauen kann."]
};

export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!rateLimit("aitext:" + clientKey(req, access.user.id), 30, 60_000)) {
    return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  }
  const { version } = await req.json();
  const list = STORIES[String(version || "standard")] || STORIES.standard;
  return NextResponse.json({ ok: true, text: list[Math.floor(Math.random() * list.length)], version: String(version || "standard") });
}
