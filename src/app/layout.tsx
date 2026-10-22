import type { Metadata } from "next";
import "./globals.css";
import { getLang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getAccess } from "@/lib/access";
import { getSettings } from "@/lib/settings";
import PwaRegister from "@/components/PwaRegister";
import Script from "next/script";
import type { CSSProperties } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const brand = settings.site.name || "Wesh Star IA";
  return {
  title: `${brand} — AI Video Generator`,
  description: settings.site.tagline || `Create stunning AI videos with ${brand}. Video credits, community, gifts and LIVE features.`,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: "/icons/icon-192.png"
  },
  appleWebApp: {
    capable: true,
    title: brand,
    statusBarStyle: "black-translucent"
  },
  formatDetection: { telephone: false }
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const lang = getLang() || settings.site.defaultLocale;
  const t = getDictionary(lang);
  const access = await getAccess();
  const maintenance = settings.site.maintenance && access.role !== "admin";

  const themeBackgrounds: Record<string, string> = { midnight: "#09090b", ocean: "#071827", violet: "#170d24", forest: "#071b14" };
  const themeBackground = themeBackgrounds[String(settings.site.themePreset || "midnight")] || themeBackgrounds.midnight;

  return (
    <html lang={lang} dir={["ar", "fa", "he", "ur"].includes(lang) ? "rtl" : "ltr"}>
      <body style={{ "--weshstar-accent": settings.site.accentColor || "#facc15", backgroundColor: themeBackground } as CSSProperties} className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
        <PwaRegister />
        {settings.site.ads.enabled && settings.site.ads.network === "adsense" && /^ca-pub-[0-9]+$/.test(settings.site.ads.publisherId) ? (
          <Script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${settings.site.ads.publisherId}`} crossOrigin="anonymous" strategy="afterInteractive" />
        ) : null}
        {maintenance ? (
          <div className="grid flex-1 place-items-center px-6 py-24 text-center">
            <div className="animate-fade-up">
              <div className="text-5xl">🍌</div>
              <h1 className="mt-4 text-3xl font-bold">{t.maintenance_title}</h1>
              <p className="mt-3 text-zinc-400">{t.maintenance_text}</p>
            </div>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
