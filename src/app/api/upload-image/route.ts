import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { uploadVideo } from "@/lib/storage";
import { isSupportedImage } from "@/lib/upload-validation";

// Upload an optional basis image for video creation (max ~8 MB).
// Stored privately; only the job pipeline receives a signed URL.
export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!rateLimit("imgup:" + clientKey(req, access.user.id), 20, 60_000)) {
    return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  }
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "Too large (max 8 MB)" }, { status: 400 });

  const path = access.user.id + "/inputs/" + Date.now() + "-" + file.name.replace(/[^a-z0-9.\-]/gi, "_").slice(-40);
  const buf = Buffer.from(await file.arrayBuffer());
  if (!isSupportedImage(buf)) return NextResponse.json({ error: "Invalid image content" }, { status: 400 });
  try {
    await uploadVideo(path, buf, file.type);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Storage upload failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, path });
}
