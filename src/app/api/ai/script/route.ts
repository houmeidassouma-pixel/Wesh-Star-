import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { moderateText } from "@/lib/moderation";
import { callLLM } from "@/lib/llm";

export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!rateLimit("ai-script:" + clientKey(req, access.user.id), 12, 60_000)) {
    return NextResponse.json({ ok: false, error: "RATE_LIMIT" }, { status: 429 });
  }

  let body: any = {};
  try { body = await req.json(); } catch {}
  const names: string[] = Array.isArray(body.names) ? body.names.map((n: any) => String(n || "").slice(0, 30)).filter(Boolean) : [];
  const style = String(body.style || "").slice(0, 60);
  const emotion = String(body.emotion || "").slice(0, 40);
  const seconds = Math.max(10, Math.min(access.isAdmin || access.isModerator ? 216000 : 600, Math.floor(Number(body.seconds)) || 30));
  const language = String(body.language || "auto").slice(0, 12);
  const videoType = String(body.videoType || "").slice(0, 40);

  const namesLine = names.length
    ? "Named characters, in speaking order as they should appear (reuse these EXACT names, spelled exactly like this, consistently throughout): " + names.join(", ") + "."
    : "No character names were given — invent short, distinct, consistent names for each speaker yourself.";

  const system =
    "You write short-video dialogue scripts for an AI video generator. " +
    "Output ONLY the script itself: one line per spoken line, formatted as 'NAME: line'. " +
    "No scene headings, no camera directions, no markdown, no preamble, no explanation before or after. " +
    "Keep every character's name spelled identically every time it appears — consistency matters more than variety. " +
    "Roughly one spoken line per 5-8 seconds of video.";

  const userMessage =
    namesLine + "\n" +
    "Tone/emotion: " + (emotion || "neutral") + ". " +
    "Style: " + (style || "natural, everyday") + ". " +
    (videoType ? "Video type: " + videoType + ". " : "") +
    "Target video length: ~" + seconds + " seconds. " +
    "Language to write the script in: " + (language === "auto" ? "match the style/tone description's language, default to French" : language) + ".";

  try {
    const script = await callLLM(system, userMessage, 2000);
    const mod = moderateText(script);
    if (mod.blocked) return NextResponse.json({ ok: false, error: "BLOCKED" });
    return NextResponse.json({ ok: true, script });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "LLM_ERROR" }, { status: 500 });
  }
}
