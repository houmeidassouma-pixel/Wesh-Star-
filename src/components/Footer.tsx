import Link from "next/link";

export default function Footer({ t, name }: { t: Record<string, string>; name: string }) {
  const cols = [
    { title: t.footer_product, links: [
      { href: "/#features", label: t.nav_features },
      { href: "/#how", label: t.nav_how },
      { href: "/pricing", label: t.pricing_title }
    ]},
    { title: t.footer_account, links: [
      { href: "/login", label: t.login },
      { href: "/dashboard", label: t.dashboard },
      { href: "/generate", label: t.nav_generate }
    ]},
    { title: t.footer_legal, links: [
      { href: "/legal/impressum", label: "Impressum" },
      { href: "/legal/datenschutz", label: "Datenschutz" },
      { href: "/legal/agb", label: "AGB" },
      { href: "/legal/widerruf", label: "Widerruf" },
      { href: "/legal/kontakt", label: "Kontakt" }
    ]}
  ];

  return (
    <footer className="border-t border-zinc-800/70 bg-zinc-950">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-4 md:px-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-banana to-yellow-600 text-lg">🍌</span>
            <span className="text-lg font-extrabold">{name}</span>
          </div>
          <p className="mt-3 text-sm text-zinc-500">{t.tagline}</p>
        </div>
        {cols.map((col) => (
          <div key={col.title}>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{col.title}</h4>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-zinc-400 transition-colors hover:text-banana">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-zinc-800/70 py-5 text-center text-xs text-zinc-600">
        © 2026 {name}. {t.footer_rights}.
      </div>
    </footer>
  );
}
