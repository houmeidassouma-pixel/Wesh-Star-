"use client";
import { useEffect, useRef } from "react";

type Props = {
  network: "adsense" | "custom";
  publisherId?: string;
  slotId?: string;
  customCode?: string;
  customHeight?: number;
  label?: string;
  placement?: string;
};

declare global { interface Window { adsbygoogle?: unknown[] } }

// Renders one external ad block. Google AdSense uses its standard <ins> unit;
// codes from other networks run inside a sandboxed iframe so they can never
// touch Wesh Star IA's own page, cookies or sessions.
export default function NetworkAdBlock({ network, publisherId, slotId, customCode, customHeight = 250, label = "Publicité", placement = "page" }: Props) {
  const pushed = useRef(false);
  const box = useRef<HTMLElement | null>(null);
  const counted = useRef(false);

  useEffect(() => {
    if (network !== "adsense" || pushed.current) return;
    pushed.current = true;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* blocked by an ad blocker: ignore */ }
  }, [network]);

  // Count one impression when the block is actually visible on screen (once per page view).
  useEffect(() => {
    const el = box.current;
    if (!el || counted.current || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !counted.current) {
        counted.current = true;
        io.disconnect();
        fetch("/api/ads/network-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ placement }) }).catch(() => {});
      }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [placement]);

  return (
    <aside ref={box} className="mx-auto my-8 w-full max-w-4xl px-4" aria-label={label}>
      <div className="mb-1 text-center text-[10px] uppercase tracking-wide text-zinc-600">{label}</div>
      {network === "adsense" ? (
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={publisherId}
          data-ad-slot={slotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      ) : (
        <iframe
          title={label}
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
          srcDoc={`<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>html,body{margin:0;padding:0;background:transparent}</style></head><body>${customCode || ""}</body></html>`}
          style={{ width: "100%", height: customHeight, border: 0 }}
          loading="lazy"
        />
      )}
    </aside>
  );
}
