import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { moderateText } from "@/lib/moderation";
import { callLLM } from "@/lib/llm";

export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!rateLimit("ai-improve:" + clientKey(req, access.user.id), 12, 60_000)) {
    return NextResponse.json({ ok: false, error: "RATE_LIMIT" }, { status: 429 });
  }

  let body: any = {};
  try { body = await req.json(); } catch {}
  const text = String(body.text || "").slice(0, 8000);
  const instruction = String(body.instruction || "").slice(0, 500);
  if (!text.trim()) return NextResponse.json({ ok: false, error: "EMPTY_TEXT" }, { status: 400 });

  const mod = moderateText(text);
  if (mod.blocked) return NextResponse.json({ ok: false, error: "BLOCKED" });

  const system =
    "You rewrite/improve short-video dialogue scripts. Keep the same format: one line per speaker, " +
    "'NAME: line'. Keep every character name EXACTLY as given — never rename, merge, drop, or add a " +
    "character unless explicitly instructed to. Output ONLY the rewritten script, nothing else.";

  const userMessage =
    "Current script:\n" + text + "\n\n" +
    "Instruction: " + (instruction || "Improve the writing quality, punch up the dialogue, keep the same length and characters.");

  try {
    const improved = await callLLM(system, userMessage, 2000);
    const outMod = moderateText(improved);
    if (outMod.blocked) return NextResponse.json({ ok: false, error: "BLOCKED" });
    return NextResponse.json({ ok: true, script: improved });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "LLM_ERROR" }, { status: 500 });
  }
}
