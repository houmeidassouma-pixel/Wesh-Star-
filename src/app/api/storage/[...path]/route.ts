import { NextResponse } from "next/server";
import { readStorageFile, verifyLocalToken, localStoragePath, isLocalStorage } from "@/lib/storage";
import { stat } from "fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { path: string[] } }) {
  if (!isLocalStorage()) return NextResponse.json({ error: "local storage is disabled" }, { status: 404 });
  const p = params.path.join("/");
  const url = new URL(req.url);
  const expires = Number(url.searchParams.get("expires"));
  const token = url.searchParams.get("token") || "";
  const download = url.searchParams.has("download");
  if (!verifyLocalToken(p, expires, token, download)) return NextResponse.json({ error: "invalid or expired token" }, { status: 403 });
  try {
    const filePath = localStoragePath(p);
    const info = await stat(filePath);
    const buf = await readStorageFile(p);
    const ext = p.toLowerCase().split(".").pop();
    const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", webm: "video/webm", mov: "video/quicktime", mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", wav: "audio/wav", ogg: "audio/ogg" };
    const contentType = TYPES[ext || ""] || "video/mp4";
    return new NextResponse(buf as any, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(info.size),
        "Cache-Control": "private, max-age=300",
        ...(download ? { "Content-Disposition": `attachment; filename="${p.split("/").pop() || "download"}"` } : {})
      }
    });
  } catch {
    return NextResponse.json({ error: "file not found" }, { status: 404 });
  }
}
