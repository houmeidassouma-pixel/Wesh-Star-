import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { rateLimit, clientKey } from "@/lib/ratelimit";

const FAQ: [RegExp, string][] = [
  [/preis|€|kosten|tarif|abo|bezahl/i, "Aktuelle Preise siehe /pricing — der Admin kann sie jederzeit anpassen. Der Test ist gratis (2 × 10 Sekunden, keine Karte)."],
  [/stunde|kontingent|quota|limit|dauer/i, "Ihr Kontingent richtet sich nach dem Tarif. Rest & Verbrauch sehen Sie im Dashboard."],
  [/video|generier|studio|bild|foto/i, "Studio: Text eingeben oder KI-Text, Fotos optional, Plattform wählen (Pflicht), dann Generieren. Auch nur-Bild möglich."],
  [/gruppe|person|dialog|charakter|mannequin|stimme/i, "Gruppenmodus: 1–50 Personen. Jede Person bekommt einen eigenen Namen, ein eigenes Mannequin/Aussehen und eine eigene Stimme — automatisch oder manuell wählbar."],
  [/passwort|login|account|konto/i, "Passwort ändern unter Profil. Login-Probleme: 'Passwort vergessen'."],
  [/support|hilfe|problem|fehler|refund/i, "Ich erstelle ein Support-Ticket — Antwort in der Regel innerhalb von 48 h."]
];

export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!rateLimit("assist:" + clientKey(req, access.user.id), 30, 60_000)) {
    return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  }
  const { question } = await req.json();
  const q = String(question || "");
  // Optional: plug in a real LLM via TEXT_API_URL — same request/response shape.
  for (const [re, answer] of FAQ) {
    if (re.test(q)) return NextResponse.json({ ok: true, answer });
  }
  return NextResponse.json({ ok: true, answer: "Ich kann zu Preisen, Kontingent, Videos, Gruppenmodus, Konto und Support helfen — gern genauer formulieren!" });
}
