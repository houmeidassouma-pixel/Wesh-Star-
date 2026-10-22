import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { uploadVideo } from "@/lib/storage";
import { isSupportedVideo } from "@/lib/upload-validation";
export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!rateLimit("vidup:" + clientKey(req, access.user.id), 10, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  const form = await req.formData(); const file = form.get("file") as File | null;
  if (!file || !file.type.startsWith("video/")) return NextResponse.json({ error: "Invalid video" }, { status: 400 });
  if (file.size > 300 * 1024 * 1024) return NextResponse.json({ error: "Too large (max 300 MB)" }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  if (!isSupportedVideo(buf)) return NextResponse.json({ error: "Invalid video content" }, { status: 400 });
  const safe = file.name.replace(/[^a-z0-9.\-_]/gi, "_").slice(-80);
  const path = access.user.id + "/inputs/edit-" + Date.now() + "-" + safe;
  await uploadVideo(path, buf, file.type);
  return NextResponse.json({ ok: true, path });
}
