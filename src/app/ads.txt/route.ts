import { getSettings } from "@/lib/settings";
import { ADSENSE_PUB_RE } from "@/lib/ads";

export const dynamic = "force-dynamic";

// /ads.txt — generated from the Admin ad settings so it never has to be edited by hand.
// Google requires this file at the site root to authorise your publisher id.
export async function GET() {
  const { site } = await getSettings();
  const ads = site.ads;
  const lines: string[] = [];
  if (ads.enabled && ads.network === "adsense" && ADSENSE_PUB_RE.test(ads.publisherId)) {
    lines.push(`google.com, ${ads.publisherId.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0`);
  }
  if (ads.enabled) {
    for (const l of (ads.adsTxtExtra || "").split(/\r?\n/)) {
      const t = l.trim();
      if (t && !/[<>]/.test(t)) lines.push(t);
    }
  }
  if (!lines.length) return new Response("Not found", { status: 404 });
  return new Response(lines.join("\n") + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" }
  });
}
