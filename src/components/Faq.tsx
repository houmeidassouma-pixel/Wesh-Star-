"use client";

import { useState } from "react";

export default function Faq({ t }: { t: Record<string, string> }) {
  const [open, setOpen] = useState<number | null>(0);
  const items = [1, 2, 3, 4, 5].map((i) => ({
    q: t["faq" + i + "_q"],
    a: t["faq" + i + "_a"]
  }));

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="card overflow-hidden">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-center justify-between px-5 py-4 text-left font-medium transition-colors hover:text-banana"
          >
            <span>{item.q}</span>
            <span className={"text-banana transition-transform duration-200 " + (open === i ? "rotate-45" : "")}>＋</span>
          </button>
          {open === i && (
            <div className="animate-fade-in px-5 pb-4 text-sm text-zinc-400">
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
