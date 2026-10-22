import { NextResponse } from "next/server";
import { synthesizeSpeech } from "@/lib/tts-provider";
import { createClient } from "@/lib/account/server";

export async function POST(req: Request) {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const text = String(body?.text || "").trim();
    const voice = String(body?.voice || "aria");
    const speed = Number(body?.speed || 1);
    if (!text) return NextResponse.json({ error: "Text is required" }, { status: 400 });
    if (text.length > 5000) return NextResponse.json({ error: "Text too long" }, { status: 400 });
    return NextResponse.json(await synthesizeSpeech(text, voice, Math.max(0.5, Math.min(2, speed))));
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 503 });
  }
}
