"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { locales, localeNames } from "@/lib/dictionaries";
import LogoutButton from "./LogoutButton";

export default function AppShell({
  t,
  lang,
  email,
  role,
  siteName,
  logoUrl,
  logoEmoji = "⭐",
  communityEnabled = false,
  socialNetworkEnabled = false,
  remainingSeconds,
  purchasedCreditSeconds = 0,
  children
}: any) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const setLang = (v: string) => {
    document.cookie = "lang=" + v + ";path=/;max-age=31536000";
    router.refresh();
  };

  const items = [
    { href: "/dashboard", icon: "📊", label: t.nav_overview },
    { href: "/generate", icon: "🎬", label: t.nav_generate, highlight: true },
    { href: "/videos", icon: "🎞️", label: t.nav_videos },
    { href: "/promote", icon: "📣", label: "Sponsoriser" },
    { href: "/shop", icon: "🛍️", label: "Wesh Star Shop" },
    { href: "/messages", icon: "💬", label: "Messages privés" },
    { href: "/pricing", icon: "💎", label: t.nav_subscription },
    { href: "/billing", icon: "💳", label: t.billing_nav || "Abonnement & paiements" },
    { href: "/coins", icon: "🪙", label: "Pièces & cadeaux" },
    { href: "/settings", icon: "⚙️", label: t.nav_settings },
    { href: "/v5", icon: "🚀", label: t.v5_nav || "Wesh Star IA V5" }
  ];

  if (communityEnabled || socialNetworkEnabled) {
    items.push({ href: "/community", icon: "🌟", label: "Wesh Star Feed", highlight: false });
    items.push({ href: "/live", icon: "📡", label: "LIVE", highlight: false });
  }

  if (role === "admin") {
    items.push({ href: "/admin", icon: "🛡️", label: t.admin, highlight: false });
  }
  if (role === "admin" || role === "moderator") {
    items.push({ href: "/moderator", icon: "🔍", label: t.nav_moderation, highlight: false });
  }

  const nav = (onNavigate?: () => void) => (
    <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4">
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 " +
              (active
                ? "bg-gradient-to-r from-violet-600/20 via-violet-500/15 to-indigo-600/10 text-violet-300 border border-violet-500/30 shadow-md shadow-violet-950/20"
                : item.highlight
                ? "bg-violet-950/30 text-zinc-200 hover:bg-violet-900/40 hover:text-white border border-violet-500/20"
                : "text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-100")
            }
          >
            <span className="text-lg transition-transform duration-200 group-hover:scale-110">
              {item.icon}
            </span>
            <span className="truncate">{item.label}</span>
            {item.href === "/admin" && (
              <span className="badge-yellow ml-auto text-[10px]">ADMIN</span>
            )}
            {item.href === "/generate" && (
              <span className="badge-violet ml-auto text-[10px]">STUDIO</span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const creditsDisplay =
    remainingSeconds === null
      ? "∞"
      : `${Math.floor(Number(remainingSeconds || 0) / 10)} crédits`;

  const userCard = (
    <div className="border-t border-zinc-800/80 p-3 bg-zinc-950/60 backdrop-blur-md">
      <Link
        href="/billing"
        className="mb-2 flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/60 px-3 py-2 text-xs transition hover:border-violet-500/40 hover:bg-zinc-900"
      >
        <span className="text-zinc-400">🪙 Crédits vidéo</span>
        <span className="font-bold text-violet-300">{creditsDisplay}</span>
      </Link>
      {remainingSeconds !== null && Number(purchasedCreditSeconds || 0) > 0 && (
        <Link
          href="/billing"
          className="mb-2 flex items-center justify-between rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs transition hover:border-amber-400/40"
        >
          <span className="text-zinc-400">🎁 Crédits achetés</span>
          <span className="font-bold text-amber-300">
            {Math.floor(Number(purchasedCreditSeconds || 0) / 10)} crédits
          </span>
        </Link>
      )}
      <div className="card flex items-center gap-2 p-2.5 bg-zinc-900/90 border-zinc-800">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-600/20 text-violet-300 text-sm border border-violet-500/30">
          👤
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-zinc-300">
          {email}
        </span>
        <LogoutButton label="⏻" title={t?.logout || "Logout"} ariaLabel={t?.logout || "Logout"} />
      </div>
    </div>
  );

  const brand = (
    <Link
      href="/"
      className="flex h-16 items-center gap-3 border-b border-zinc-800/80 px-4 bg-zinc-950/80 backdrop-blur-md"
    >
      <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 via-violet-500 to-amber-400 text-xl shadow-lg shadow-violet-600/30">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Logo"
            className="h-full w-full object-contain"
          />
        ) : (
          logoEmoji
        )}
      </span>
      <div className="flex flex-col">
        <span className="font-extrabold tracking-tight text-white text-base leading-tight">
          {siteName || t.site_name}
        </span>
        <span className="text-[10px] font-semibold text-violet-400 tracking-wider uppercase">
          Studio IA & Social
        </span>
      </div>
    </Link>
  );

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-zinc-800/80 bg-zinc-950/95 backdrop-blur-xl lg:flex">
        {brand}
        {nav()}
        {userCard}
      </aside>

      {/* Desktop top bar header */}
      <header className="fixed inset-x-0 top-0 z-20 hidden lg:flex h-16 items-center justify-between border-b border-zinc-800/60 bg-zinc-950/80 pl-72 pr-8 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-zinc-400">
            Plateforme vidéo IA & Réseau Social Rémunéré
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/generate"
            className="btn-primary btn-sm"
          >
            ✦ Créer une vidéo IA
          </Link>
          <div className="h-4 w-px bg-zinc-800" />
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            aria-label={t.language}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300 focus:border-violet-500 focus:outline-none"
          >
            {locales.map((l) => (
              <option key={l} value={l}>
                {localeNames[l]}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Mobile topbar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-zinc-800/80 bg-zinc-950/95 px-4 backdrop-blur-xl lg:hidden">
        <button
          className="btn-ghost btn-md p-2"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? "✕" : "☰"}
        </button>
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-violet-600 to-amber-400 text-base shadow-md shadow-violet-600/30">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="h-full w-full object-contain"
              />
            ) : (
              logoEmoji
            )}
          </span>
          <span className="font-extrabold text-sm text-white">{siteName || t.site_name}</span>
        </Link>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          aria-label={t.language}
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-1.5 py-1 text-xs text-zinc-300"
        >
          {locales.map((l) => (
            <option key={l} value={l}>
              {localeNames[l]}
            </option>
          ))}
        </select>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="animate-fade-in fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-zinc-800 bg-zinc-950">
            {brand}
            {nav(() => setOpen(false))}
            {userCard}
          </aside>
        </div>
      )}

      {/* Mobile bottom navigation bar */}
      <nav
        aria-label="Navigation mobile"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-zinc-800/80 bg-zinc-950/95 px-1 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-2xl lg:hidden"
      >
        {[
          { href: communityEnabled || socialNetworkEnabled ? "/community" : "/dashboard", icon: "⌂", label: "Accueil" },
          { href: "/videos", icon: "◉", label: "Découvrir" },
          { href: "/generate", icon: "✦", label: "Studio IA", isStudio: true },
          { href: "/shop", icon: "🛍️", label: "Shop" },
          { href: "/messages", icon: "💬", label: "Chat" },
          { href: "/settings", icon: "👤", label: "Profil" }
        ].map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/community" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-0.5 py-1 text-[10px] font-medium transition ${
                active ? "text-violet-300" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span
                className={`grid h-7 min-w-7 place-items-center rounded-xl text-base ${
                  item.isStudio
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/40 px-2 font-bold scale-105"
                    : ""
                }`}
              >
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Content Container */}
      <div
        className={`flex-1 px-4 ${
          socialNetworkEnabled || communityEnabled ? "pb-24" : "pb-12"
        } pt-20 md:px-8 lg:pb-12 lg:pl-72 lg:pt-20`}
      >
        <div className="mx-auto max-w-6xl animate-fade-up">{children}</div>
      </div>
    </div>
  );
}
