"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { locales, localeNames } from "@/lib/dictionaries";

export default function Header({ t, lang, email, role }: any) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const setLang = (v: string) => {
    document.cookie = "lang=" + v + ";path=/;max-age=31536000";
    router.refresh();
  };

  const links = [
    { href: "/#features", label: t.nav_features },
    { href: "/#how", label: t.nav_how },
    { href: "/pricing", label: t.pricing_title },
    { href: "/#faq", label: t.nav_faq }
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/70 bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-banana to-yellow-600 text-lg shadow-lg shadow-banana/20">🍌</span>
          <span className="text-lg font-extrabold tracking-tight">{t.site_name}</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-zinc-400 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-banana">{l.label}</Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            aria-label={t.language}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-1.5 py-1 text-xs text-zinc-400 focus:outline-none focus:ring-2 focus:ring-banana/40"
          >
            {locales.map((l) => <option key={l} value={l}>{localeNames[l]}</option>)}
          </select>
          {email ? (
            <>
              {role === "admin" && <span className="badge-yellow">ADMIN</span>}
              <Link href="/dashboard" className="btn-secondary btn-md">{t.dashboard}</Link>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost btn-md">{t.login}</Link>
              <Link href="/login" className="btn-primary btn-md">{t.get_started}</Link>
            </>
          )}
        </div>

        <button
          className="btn-ghost btn-md md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open && (
        <div className="animate-fade-in border-t border-zinc-800/70 bg-zinc-950/95 px-4 pb-4 pt-2 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-900">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex items-center gap-2 border-t border-zinc-800/70 pt-3">
            <select
              value={lang}
              onChange={(e) => { setLang(e.target.value); }}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-1.5 py-2 text-xs text-zinc-400"
            >
              {locales.map((l) => <option key={l} value={l}>{localeNames[l]}</option>)}
            </select>
            {email ? (
              <Link href="/dashboard" onClick={() => setOpen(false)} className="btn-primary btn-md flex-1">{t.dashboard}</Link>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)} className="btn-secondary btn-md flex-1">{t.login}</Link>
                <Link href="/login" onClick={() => setOpen(false)} className="btn-primary btn-md flex-1">{t.get_started}</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
