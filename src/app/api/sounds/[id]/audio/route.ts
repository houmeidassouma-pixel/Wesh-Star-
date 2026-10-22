import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { getReusableSound } from "@/lib/creator-db";
import { readStorageFile } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sert le fichier audio d'un son réutilisable, uniquement aux utilisateurs connectés.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const s = await getReusableSound(params.id, access.user.id, access.isAdmin);
  if (!s) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  try {
    const buf = await readStorageFile(s.audio_path);
    return new NextResponse(buf as any, { headers: { "Content-Type": s.mime || "audio/mpeg", "Content-Length": String(buf.length), "Cache-Control": "private, max-age=300" } });
  } catch { return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 }); }
}
